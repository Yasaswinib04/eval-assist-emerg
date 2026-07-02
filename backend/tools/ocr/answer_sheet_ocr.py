"""Student Answer Sheet OCR Processing Pipeline.

Scanned answer sheet JPEG → extracted per-question student answers.
Multi-stage pipeline using only open-source local models.

Classes:
  Preprocessor      — grayscale, deskew, bleed-through removal, line erasure
  LineSegmenter     — ruled vs free-form segmentation, diagram detection
  AnswerMapper      — Ollama integration, heuristic mapping, grading
  AnswerSheetProcessor — orchestrator with language-aware OCR engine

Supports: English (TrOCR), Hindi/Punjabi (PaddleOCR→EasyOCR)
"""

import json
import math
import os
import re
import sys
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3.2:3b"
DIAGRAM_QUESTION_IDS = {"q15"}


# ═══════════════════════════════════════════════════════════════════════
# Preprocessor
# ═══════════════════════════════════════════════════════════════════════

class Preprocessor:
    """Image preprocessing: deskew, bleed-through removal, ruling-line erasure."""

    def preprocess(self, image_path: str) -> Tuple[np.ndarray, np.ndarray]:
        """Enhance scanned answer sheet.

        Returns:
            binary: Clean binary image for region segmentation (ruling lines erased).
            gray: Contrast-enhanced grayscale for OCR recognition.
        """
        img = self._load_image(image_path)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = self._deskew(gray)

        # ── Bleed-through removal (I2) ──
        gray = self._remove_bleed_through(gray)

        # Detect and erase ruling lines
        gray, ruling_lines = self._erase_ruling_lines(gray)

        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray_enhanced = clahe.apply(gray)

        binary = cv2.adaptiveThreshold(
            gray_enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 15, 8
        )
        binary = cv2.medianBlur(binary, 3)

        return binary, gray_enhanced

    @staticmethod
    def _load_image(path: str) -> np.ndarray:
        pil_img = Image.open(path).convert("RGB")
        rgb = np.array(pil_img)
        return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)

    @staticmethod
    def _deskew(gray: np.ndarray) -> np.ndarray:
        thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)[1]
        coords = cv2.findNonZero(thresh)
        if coords is None:
            return gray
        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle
        if abs(angle) < 0.3:
            return gray
        h, w = gray.shape[:2]
        M = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
        return cv2.warpAffine(gray, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

    @staticmethod
    def _remove_bleed_through(gray: np.ndarray) -> np.ndarray:
        """Remove ink bleed-through from reverse page (I2 step 1).

        Uses morphological opening with a vertical kernel to suppress
        horizontal bleed blobs while preserving text strokes.
        """
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 15))
        opened = cv2.morphologyEx(gray, cv2.MORPH_OPEN, kernel)
        return cv2.addWeighted(gray, 0.75, opened, 0.25, 0)

    @staticmethod
    def _erase_ruling_lines(gray: np.ndarray) -> Tuple[np.ndarray, List[int]]:
        """Detect and erase horizontal ruling lines (I2 step 2-3).

        Returns (cleaned_gray, list_of_line_y_positions).
        """
        inv = 255 - gray
        h_proj = np.mean(inv, axis=1)
        mean_val = np.mean(h_proj)

        # Ruling lines are thin, continuous horizontal lines of high density
        threshold = mean_val * 2.0
        ruling_ys = np.where(h_proj > threshold)[0]

        if len(ruling_ys) < 5:
            return gray, []

        # Cluster adjacent y-positions into line groups
        lines = []
        cluster_start = int(ruling_ys[0])
        prev = int(ruling_ys[0])
        for y in ruling_ys[1:]:
            if y - prev > 3:
                lines.append(cluster_start)
                cluster_start = int(y)
            prev = int(y)
        lines.append(cluster_start)

        if len(lines) < 3:
            return gray, []

        # Erase ruling lines by filling with white
        cleaned = gray.copy()
        for y in lines:
            cv2.line(cleaned, (0, y), (cleaned.shape[1], y), 255, thickness=2)

        return cleaned, lines

    def detect_page_type(self, binary: np.ndarray) -> str:
        """Determine if the page has ruling lines or is free-form."""
        inv = 255 - binary
        h_proj = np.sum(inv, axis=1).astype(float)
        mean_val = np.mean(h_proj)
        if mean_val == 0:
            return "freeform"
        peaks = (h_proj > mean_val).astype(int)
        transitions = np.diff(peaks)
        up_positions = np.where(transitions == 1)[0]
        if len(up_positions) < 3:
            return "freeform"
        spacings = np.diff(up_positions)
        if np.std(spacings) < np.mean(spacings) * 0.6:
            return "ruled"
        return "freeform"


# ═══════════════════════════════════════════════════════════════════════
# LineSegmenter
# ═══════════════════════════════════════════════════════════════════════

class LineSegmenter:
    """Region segmentation: detect answer rows/blocks, detect diagrams."""

    MAX_LINE_HEIGHT = 60
    MERGE_GAP = 2

    def segment_regions(
        self, binary: np.ndarray, page_type: Optional[str] = None
    ) -> List[Tuple[int, int, int, int]]:
        if page_type is None:
            pp = Preprocessor()
            page_type = pp.detect_page_type(binary)
        regions = self._projection_segment(binary)
        regions = self._split_tall_regions(binary, regions)
        return self._merge_close_regions(regions, threshold=self.MERGE_GAP)

    def _projection_segment(self, binary: np.ndarray) -> List[Tuple[int, int, int, int]]:
        inv = 255 - binary
        h_proj = np.mean(inv, axis=1)
        mean_val = np.mean(h_proj)
        threshold = max(2.5, mean_val * 0.12)
        is_text = h_proj > threshold
        height, width = binary.shape[:2]
        regions: List[Tuple[int, int, int, int]] = []
        in_region, start = False, 0
        for y in range(height):
            if is_text[y] and not in_region:
                start, in_region = y, True
            elif not is_text[y] and in_region:
                if y - start >= 8:
                    regions.append((0, start, width, y))
                in_region = False
        if in_region and (height - start) >= 8:
            regions.append((0, start, width, height))
        return regions

    def _split_tall_regions(
        self, binary: np.ndarray, regions: List[Tuple[int, int, int, int]]
    ) -> List[Tuple[int, int, int, int]]:
        short_heights = [r[3] - r[1] for r in regions if 10 < (r[3] - r[1]) <= self.MAX_LINE_HEIGHT]
        estimated_line_h = int(np.median(short_heights)) if short_heights else 28
        result: List[Tuple[int, int, int, int]] = []
        inv = 255 - binary
        for x1, y1, x2, y2 in regions:
            bh = y2 - y1
            if bh <= self.MAX_LINE_HEIGHT:
                result.append((x1, y1, x2, y2))
                continue
            block = inv[y1:y2, x1:x2]
            h_proj = np.mean(block, axis=1)
            block_mean = np.mean(h_proj)
            sub_threshold = max(1.5, block_mean * 0.05)
            is_text = h_proj > sub_threshold
            sub_regions: List[Tuple[int, int, int, int]] = []
            in_sub, sub_start = False, 0
            for row in range(bh):
                if is_text[row] and not in_sub:
                    sub_start, in_sub = row, True
                elif not is_text[row] and in_sub:
                    if row - sub_start >= 6:
                        sub_regions.append((x1, y1 + sub_start, x2, y1 + row))
                    in_sub = False
            if in_sub and (bh - sub_start) >= 6:
                sub_regions.append((x1, y1 + sub_start, x2, y2))
            if len(sub_regions) <= 1:
                num_lines = max(2, round(bh / estimated_line_h))
                line_h = bh / num_lines
                for i in range(num_lines):
                    s = y1 + int(i * line_h)
                    e = y1 + int((i + 1) * line_h) - 3 if i < num_lines - 1 else y2
                    s, e = max(y1, s), min(y2, e)
                    if e > s + 3:
                        result.append((x1, s, x2, e))
            else:
                result.extend(sub_regions)
        return result

    @staticmethod
    def _merge_close_regions(
        regions: List[Tuple[int, int, int, int]], threshold: int
    ) -> List[Tuple[int, int, int, int]]:
        if not regions:
            return regions
        merged = [regions[0]]
        for r in regions[1:]:
            prev = merged[-1]
            if (r[1] - prev[3]) < threshold:
                merged[-1] = (prev[0], prev[1], prev[2], r[3])
            else:
                merged.append(r)
        return merged

    @staticmethod
    def is_diagram_region(crop: np.ndarray) -> bool:
        """Diagram detection (I5): white-space ratio + large irregular contours."""
        if crop.ndim == 3:
            gray_crop = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        else:
            gray_crop = crop
        total = gray_crop.size
        white_pixels = int((gray_crop > 200).sum())
        white_ratio = white_pixels / total if total > 0 else 0

        if white_ratio <= 0.60:
            return False

        _, thresh = cv2.threshold(gray_crop, 200, 255, cv2.THRESH_BINARY_INV)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        large_irregular = 0
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area > 200:
                peri = cv2.arcLength(cnt, True)
                if peri > 0 and area / (peri ** 2) < 0.04:
                    large_irregular += 1
        return large_irregular >= 2


# ═══════════════════════════════════════════════════════════════════════
# AnswerMapper
# ═══════════════════════════════════════════════════════════════════════

class AnswerMapper:
    """Post-processing: Ollama structuring, heuristic mapping, grading."""

    def __init__(self, questions: Optional[List[Dict]] = None):
        self._questions = questions or []
        self._ollama_available: Optional[bool] = None

    @property
    def questions(self) -> List[Dict]:
        return self._questions

    @questions.setter
    def questions(self, v: List[Dict]) -> None:
        self._questions = v

    def load_questions(self, path: str) -> None:
        with open(path) as f:
            self._questions = json.load(f)

    # ── Ollama ──────────────────────────────────────────────────────

    def _check_ollama(self) -> bool:
        if self._ollama_available is not None:
            return self._ollama_available
        import requests
        try:
            r = requests.get("http://localhost:11434/api/tags", timeout=5)
            self._ollama_available = r.status_code == 200
        except Exception:
            self._ollama_available = False
        return self._ollama_available

    def postprocess(
        self, raw_texts: List[str], use_ollama: bool = True, page_merge_hint: str = ""
    ) -> List[Dict[str, Any]]:
        if use_ollama and self._check_ollama():
            return self._postprocess_ollama(raw_texts, page_merge_hint)
        return self._fallback_postprocess(raw_texts)

    def _postprocess_ollama(
        self, raw_texts: List[str], page_merge_hint: str = ""
    ) -> List[Dict[str, Any]]:
        if not self._questions:
            return self._fallback_postprocess(raw_texts)

        q_summaries = []
        for q in self._questions:
            part = f"Q{q['number']} [{q['section']} {q['maxMarks']} mark{'s' if q['maxMarks'] > 1 else ''}] {q['text']}"
            if "options" in q:
                part += f" Options: {', '.join(q['options'])}"
            q_summaries.append(part)

        merge_note = ""
        if page_merge_hint:
            merge_note = f"\nIMPORTANT: {page_merge_hint}\n"

        prompt = f"""You are processing a scanned Class 8 Biology answer sheet. Below are the raw OCR outputs (one per answer region) and the list of questions.{merge_note}
Return ONLY a JSON array. Each element: {{"questionNumber": int, "mcqChoice": "A" or null, "extractedAnswer": "the student's text", "problem": null or description of any issue with this answer}}.

QUESTIONS:
{chr(10).join(q_summaries)}

RAW OCR TEXTS (in page order, one per region):
{chr(10).join(f'[{i+1}] {t}' for i, t in enumerate(raw_texts))}

Return JSON array only, no markdown, no explanation."""

        print("  Sending to Ollama for structuring...")
        return self._call_ollama(prompt)

    def _call_ollama(self, prompt: str) -> List[Dict]:
        import requests
        payload = {"model": OLLAMA_MODEL, "prompt": prompt, "stream": False, "temperature": 0.1}
        try:
            r = requests.post(OLLAMA_URL, json=payload, timeout=120)
            r.raise_for_status()
            resp_text = r.json()["response"].strip()
            json_start = resp_text.find("[")
            json_end = resp_text.rfind("]")
            if json_start >= 0 and json_end > json_start:
                return json.loads(resp_text[json_start:json_end + 1])
        except Exception as e:
            print(f"  Ollama error: {e}")
        return self._fallback_postprocess([])

    def _fallback_postprocess(self, raw_texts: List[str]) -> List[Dict[str, Any]]:
        """Heuristic post-processing when Ollama is unavailable."""
        results: List[Dict[str, Any]] = []
        num_questions = len(self._questions) if self._questions else 17
        mcq_count = sum(1 for q in self._questions if q.get("options") or q.get("section") == "A") if self._questions else 10

        q_index = 0
        for raw in raw_texts:
            text = raw.strip()
            if not text:
                continue
            if q_index >= num_questions:
                break
            mcq_matches = self._parse_mcq_row(text)
            if mcq_matches and len(mcq_matches) >= 2:
                for mcq_num, mcq_letter in mcq_matches.items():
                    if 1 <= mcq_num <= num_questions:
                        results.append({
                            "questionNumber": mcq_num,
                            "extractedAnswer": f"Option {mcq_letter}",
                            "mcqChoice": mcq_letter,
                            "needsReview": False,
                        })
                q_index = max(q_index, max(mcq_matches.keys()))
                continue
            q_index += 1
            q_num = q_index
            if q_num > num_questions:
                break
            if any(r.get("questionNumber") == q_num for r in results):
                continue
            entry: Dict[str, Any] = {
                "questionNumber": q_num,
                "extractedAnswer": text[:300],
                "mcqChoice": None,
                "needsReview": True,
            }
            if q_num <= mcq_count:
                entry["mcqChoice"] = self._extract_mcq_choice(text)
                if entry["mcqChoice"]:
                    entry["needsReview"] = False
            results.append(entry)
        filled = {r.get("questionNumber") for r in results}
        for q_num in range(1, num_questions + 1):
            if q_num not in filled:
                results.append({"questionNumber": q_num, "extractedAnswer": "", "mcqChoice": None, "needsReview": True})
        results.sort(key=lambda r: r.get("questionNumber", 999))
        return results

    @staticmethod
    def _parse_mcq_row(text: str) -> Dict[int, str]:
        cleaned = re.sub(r"[#$%^&*()_=\[\]{}|\\`~<>]", " ", text)
        cleaned = cleaned.replace('"', " ").replace("'", " ")
        found = re.findall(r"(\d{1,2})\s*[.)\s]*\s*([A-Da-d])\b", cleaned)
        result = {}
        for num_str, letter in found:
            num = int(num_str)
            if num not in result:
                result[num] = letter.upper()
        return result if len(result) >= 2 else {}

    @staticmethod
    def _extract_mcq_choice(text: str) -> Optional[str]:
        m = re.search(r"\b([A-Da-d])\b", text)
        return m.group(1).upper() if m else None

    def _get_question(self, number: int) -> Optional[Dict]:
        for q in self._questions:
            if q.get("number") == number:
                return q
        return None

    # ── Grading ─────────────────────────────────────────────────────

    def grade(self, extracted: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        evaluations = []
        q_by_number = {q["number"]: q for q in self._questions}
        for entry in extracted:
            q_num = entry.get("questionNumber")
            q = q_by_number.get(q_num)
            if not q:
                continue
            ev = {
                "qId": q.get("id", f"q{q_num}"),
                "aiMark": 0,
                "confidence": "high",
                "confidenceScore": 0,
                "needsReview": False,
                "studentAnswer": entry.get("extractedAnswer", ""),
                "reasoning": "",
            }
            is_mcq = "options" in q
            if is_mcq:
                ev["aiMark"], ev["confidenceScore"], ev["reasoning"] = self._grade_mcq(entry, q)
            else:
                ev["aiMark"], ev["confidenceScore"], ev["reasoning"] = self._grade_subjective(entry, q)
            ev["confidence"] = self._confidence_label(ev["confidenceScore"])
            ev["needsReview"] = ev["confidence"] in ("low", "medium") or entry.get("needsReview", False)
            evaluations.append(ev)
        return evaluations

    def _grade_mcq(self, entry: Dict, q: Dict) -> Tuple[float, int, str]:
        mcq_choice = entry.get("mcqChoice")
        if not mcq_choice:
            return 0, 30, "Could not determine MCQ choice."
        correct = q.get("correctAnswer", "")
        correct_letter = None
        for i, opt in enumerate(q.get("options", [])):
            if opt == correct:
                correct_letter = chr(ord("A") + i)
                break
        if correct_letter and mcq_choice.upper() == correct_letter:
            return float(q.get("maxMarks", 1)), 95, f"Correct option {mcq_choice}."
        return 0, 70, f"Selected {mcq_choice}; correct is {correct_letter}: {correct}."

    def _grade_subjective(self, entry: Dict, q: Dict) -> Tuple[float, int, str]:
        extracted = (entry.get("extractedAnswer") or "").strip()
        if not extracted:
            return 0, 20, "No text extracted."
        if entry.get("escaped") or extracted == "[DIAGRAM]":
            return 0, 95, "Diagram — manual review."
        if len(extracted) < 3:
            return 0, 40, "Answer too short."
        expected = q.get("expected", "").lower()
        return self._fuzzy_match(extracted.lower(), expected, q.get("maxMarks", 1))

    @staticmethod
    def _fuzzy_match(extracted: str, expected: str, max_marks: int) -> Tuple[float, int, str]:
        ew = set(expected.split())
        exw = set(extracted.split())
        if not ew:
            return float(max_marks), 60, "No expected answer."
        common = ew & exw
        ratio = len(common) / len(ew)
        if ratio >= 0.7:
            return float(max_marks), 85, f"Strong match ({len(common)} keywords)."
        elif ratio >= 0.4:
            return round(max_marks * 0.5, 1), 60, f"Partial ({len(common)}/{len(ew)} keywords)."
        elif exw:
            return round(max_marks * 0.25, 1), 35, "Minimal overlap."
        return 0, 20, "No match."

    @staticmethod
    def _confidence_label(score: int) -> str:
        if score >= 80:
            return "high"
        if score >= 50:
            return "medium"
        return "low"

    @staticmethod
    def compute_review_flags(text: str, mcq_choice: Optional[str], is_mcq: bool, q_id: str = "") -> Dict[str, Any]:
        """Post-OCR review flagging (I4): Ollama-independent checks."""
        flags = {"needsReview": False, "problems": []}
        if "<unk>" in text:
            flags["needsReview"] = True
            flags["problems"].append("unk_tokens")
        if is_mcq:
            if not mcq_choice or mcq_choice not in ("A", "B", "C", "D"):
                flags["needsReview"] = True
                flags["problems"].append("invalid_mcq")
        else:
            clean = re.sub(r"[^a-zA-Z0-9]", "", text)
            if len(clean) < 3:
                flags["needsReview"] = True
                flags["problems"].append("too_short")
        if q_id in DIAGRAM_QUESTION_IDS:
            flags["needsReview"] = True
            flags["problems"].append("diagram_question")
        return flags


# ═══════════════════════════════════════════════════════════════════════
# AnswerSheetProcessor
# ═══════════════════════════════════════════════════════════════════════

class AnswerSheetProcessor:
    """Orchestrator: language-aware OCR, full pipeline, batch processing."""

    def __init__(self, questions_path: Optional[str] = None, language: str = "en"):
        self.language = language
        self.preprocessor = Preprocessor()
        self.segmenter = LineSegmenter()
        self.mapper = AnswerMapper()
        self._ocr_engine: Any = None
        if questions_path:
            self.mapper.load_questions(questions_path)

    @property
    def questions(self) -> List[Dict]:
        return self.mapper.questions

    @questions.setter
    def questions(self, v: List[Dict]) -> None:
        self.mapper.questions = v

    # ── Language-aware OCR engine (I1) ──────────────────────────────

    def _get_ocr_engine(self):
        if self._ocr_engine is not None:
            return self._ocr_engine
        if self.language == "en":
            self._ocr_engine = self._init_trocr()
        else:
            self._ocr_engine = self._init_indic_ocr()
        return self._ocr_engine

    def _init_trocr(self):
        from tools.ocr.handwriting_ocr import handwriting_ocr
        class TrOCREngine:
            def __init__(self, hw):
                self._hw = hw
            def read_line(self, image_path: str) -> Tuple[str, float]:
                return self._hw.read_line_with_confidence(image_path)
        return TrOCREngine(handwriting_ocr)

    def _init_indic_ocr(self):
        lang_map = {"hi": "hi", "te": "te"}
        lang_code = lang_map.get(self.language, "en")

        try:
            from paddleocr import PaddleOCR
            print(f"  Loading PaddleOCR (lang={lang_code})...")
            engine = PaddleOCR(lang=lang_code, use_angle_cls=True, show_log=False)

            class PaddleEngine:
                def __init__(self, ocr):
                    self._ocr = ocr
                def read_line(self, image_path: str) -> Tuple[str, float]:
                    result = self._ocr.ocr(image_path, cls=True)
                    if not result or not result[0]:
                        return ("", 0.0)
                    texts = []
                    confs = []
                    for line in result[0]:
                        if line and len(line) >= 2:
                            texts.append(line[1][0])
                            confs.append(float(line[1][1]))
                    text = " ".join(texts)
                    conf = float(np.mean(confs)) if confs else 0.0
                    return (text.strip(), conf)
            return PaddleEngine(engine)

        except Exception as e:
            print(f"  PaddleOCR failed ({e}), trying EasyOCR fallback...")
            return self._init_easyocr(lang_code)

    def _init_easyocr(self, lang_code: str):
        import easyocr
        print(f"  Loading EasyOCR (lang={lang_code})...")
        reader = easyocr.Reader([lang_code], gpu=False)

        class EasyOCREngine:
            def __init__(self, rdr):
                self._rdr = rdr
            def read_line(self, image_path: str) -> Tuple[str, float]:
                results = self._rdr.readtext(image_path)
                if not results:
                    return ("", 0.0)
                texts = [r[1] for r in results]
                confs = [r[2] for r in results]
                return (" ".join(texts), float(np.mean(confs)))

        return EasyOCREngine(reader)

    # ── Full pipeline ───────────────────────────────────────────────

    def process(
        self,
        image_paths: List[str],
        student_id: Optional[str] = None,
        use_ollama: bool = True,
    ) -> Dict[str, Any]:
        """Run the full pipeline on one or more answer sheet images."""
        all_raw: List[str] = []
        all_confidences: List[float] = []
        page_end_indices: List[int] = []

        engine = self._get_ocr_engine()

        for pi, path in enumerate(image_paths):
            print(f"\n--- Processing: {path} ---")
            binary, gray = self.preprocessor.preprocess(path)
            page_type = self.preprocessor.detect_page_type(binary)
            print(f"  Page type: {page_type}")
            regions = self.segmenter.segment_regions(binary, page_type=page_type)
            print(f"  Regions detected: {len(regions)}")
            page_results = self._ocr_regions(engine, gray, regions)
            for r in page_results:
                all_raw.append(r.get("text", ""))
                all_confidences.append(r.get("confidence", 0.0))
            page_end_indices.append(len(all_raw))

        print(f"\n  Total raw texts extracted: {len(all_raw)}")

        # Multi-page merge check (I3)
        merge_hint = ""
        if len(page_end_indices) >= 2:
            # Check if page 1 ends mid-sentence
            p1_end = page_end_indices[0]
            if p1_end > 0:
                last_text = all_raw[p1_end - 1].strip()
                if last_text and not self._is_sentence_complete(last_text):
                    merge_hint = "Page 2 continues directly from Page 1. Merge them logically."

        structured = self.mapper.postprocess(all_raw, use_ollama=use_ollama, page_merge_hint=merge_hint)

        # Enrich structured results with real OCR confidences
        self._apply_confidence_scores(structured, all_raw, all_confidences)

        evaluations = self.mapper.grade(structured)

        return {
            "studentId": student_id,
            "language": self.language,
            "imagesProcessed": image_paths,
            "rawTexts": all_raw,
            "structured": structured,
            "evaluations": evaluations,
        }

    def _ocr_regions(
        self, engine, gray: np.ndarray, regions: List[Tuple[int, int, int, int]]
    ) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        h, w = gray.shape[:2]
        for i, (x1, y1, x2, y2) in enumerate(regions):
            pad = 6
            y1_c, y2_c = max(0, y1 - pad), min(h, y2 + pad)
            x1_c, x2_c = max(0, x1 - pad), min(w, x2 + pad)
            crop = gray[y1_c:y2_c, x1_c:x2_c]
            if crop.shape[0] < 10 or crop.shape[1] < 10:
                continue

            # Diagram detection (I5)
            if self.segmenter.is_diagram_region(crop):
                results.append({"region_index": i, "bbox": (x1, y1, x2, y2), "text": "[DIAGRAM]", "confidence": 1.0})
                print(f"    [{i+1}] [DIAGRAM]")
                continue

            crop_rgb = cv2.cvtColor(crop, cv2.COLOR_GRAY2RGB)
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                Image.fromarray(crop_rgb).save(tmp.name)
                try:
                    text, confidence = engine.read_line(tmp.name)
                    results.append({"region_index": i, "bbox": (x1, y1, x2, y2), "text": text, "confidence": confidence})
                    if text.strip():
                        print(f"    [{i+1}] {text[:100]}")
                finally:
                    os.unlink(tmp.name)
        return results

    @staticmethod
    def _is_sentence_complete(text: str) -> bool:
        """Check if text ends with terminal punctuation or is a complete sentence."""
        text = text.rstrip()
        if not text:
            return True
        if text[-1] in ".?!" or text.endswith(".") or text.endswith("?"):
            return True
        # Check mid-word break (ends with hyphen or mid-word cut)
        if text[-1] == "-":
            return False
        # If last word is very short (1-2 chars), assume cut-off
        last_word = text.split()[-1] if text.split() else ""
        if len(last_word) <= 2 and len(last_word) > 0 and last_word[-1] != ".":
            return False
        return True

    @staticmethod
    def _apply_confidence_scores(
        structured: List[Dict], raw_texts: List[str], confidences: List[float]
    ) -> None:
        """Set real OCR confidence on structured entries (I4)."""
        if not confidences:
            return
        avg_conf = np.mean(confidences)
        for entry in structured:
            q_num = entry.get("questionNumber", 0)
            idx = q_num - 1 if q_num > 0 else 0
            conf = confidences[min(idx, len(confidences) - 1)] if idx < len(confidences) else avg_conf
            entry["ocrConfidence"] = round(float(conf), 4)

            flags = AnswerMapper.compute_review_flags(
                text=entry.get("extractedAnswer", ""),
                mcq_choice=entry.get("mcqChoice"),
                is_mcq=bool(entry.get("mcqChoice")),
                q_id=f"q{q_num}" if q_num else "",
            )
            if flags["needsReview"]:
                entry["needsReview"] = True

    # ── Batch mode ──────────────────────────────────────────────────

    def process_all(
        self,
        students_json: str,
        answer_sheets_dir: str,
        use_ollama: bool = True,
        output_dir: Optional[str] = None,
    ) -> List[Dict]:
        with open(students_json) as f:
            students = json.load(f)
        all_results = []
        for student in students:
            sid = student["id"]
            images = student.get("imageUrls", [])
            resolved = []
            for img in images:
                fname = os.path.basename(img.split("/")[-1] if "/" in img else img)
                rp = os.path.join(answer_sheets_dir, fname)
                if os.path.exists(rp):
                    resolved.append(rp)
            if not resolved:
                print(f"  No images found for {sid}, skipping.")
                continue
            print(f"\n{'='*60}")
            print(f"  Student: {student.get('name', sid)} ({sid})")
            print(f"  Sheets: {len(resolved)}")
            print(f"{'='*60}")
            result = self.process(resolved, student_id=sid, use_ollama=use_ollama)
            result["studentName"] = student.get("name", sid)
            all_results.append(result)
            if output_dir:
                os.makedirs(output_dir, exist_ok=True)
                out_path = os.path.join(output_dir, f"answers_{sid}.json")
                with open(out_path, "w") as f:
                    json.dump(result, f, indent=2, ensure_ascii=False)
                print(f"  Saved to {out_path}")
        return all_results


answer_sheet_processor = AnswerSheetProcessor()
