"""Handwriting Recognition using TrOCR.
 
Line-level handwriting text extraction (English).
Best results with pre-segmented single text-line images.
 
Model: microsoft/trocr-base-handwritten (MIT, 330M params)
"""
 
import math

from PIL import Image

try:
    import torch
except ImportError:
    torch = None


class HandwritingOCR:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.model = None
        self.processor = None
        self.device = self._pick_device()

    @staticmethod
    def _pick_device():
        if torch is None:
            return "cpu"
        if torch.cuda.is_available():
            return "cuda"
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return "mps"
        return "cpu"

    def _ensure_model(self):
        if self.model is not None:
            return

        from transformers import TrOCRProcessor, VisionEncoderDecoderModel

        print(f"Loading TrOCR-base-handwritten (on {self.device})...")
        model_id = "microsoft/trocr-base-handwritten"
        self.processor = TrOCRProcessor.from_pretrained(model_id)
        self.model = VisionEncoderDecoderModel.from_pretrained(model_id).to(
            self.device
        )
        print("Handwriting OCR ready.")

    def read_line(self, image_path: str, max_new_tokens: int = 128) -> str:
        """Read a single text line from an image. Returns extracted text."""
        self._ensure_model()
        image = Image.open(image_path).convert("RGB")
        pixel_values = self.processor(image, return_tensors="pt").pixel_values.to(
            self.device
        )

        generated_ids = self.model.generate(
            pixel_values,
            max_new_tokens=max_new_tokens,
            do_sample=False,
        )
        text = self.processor.batch_decode(
            generated_ids, skip_special_tokens=True
        )[0]
        return text.strip()

    def read_line_with_confidence(
        self, image_path: str, max_new_tokens: int = 128, use_beam: bool = False
    ) -> tuple:
        """Read a single text line, returning (text, confidence).

        Args:
            use_beam: If True, use beam search (num_beams=4, slower but gives
                      confidence scores). If False, use greedy decode (fast,
                      confidence estimated from text quality).
        """
        self._ensure_model()
        image = Image.open(image_path).convert("RGB")
        pixel_values = self.processor(image, return_tensors="pt").pixel_values.to(
            self.device
        )

        if use_beam:
            output = self.model.generate(
                pixel_values,
                max_new_tokens=max_new_tokens,
                num_beams=4,
                early_stopping=True,
                output_scores=True,
                return_dict_in_generate=True,
            )
            text = self.processor.batch_decode(
                output.sequences, skip_special_tokens=True
            )[0]
            confidence = 0.5
            if hasattr(output, "sequences_scores") and output.sequences_scores is not None:
                raw_score = float(output.sequences_scores[0])
                seq_len = output.sequences.shape[1] if output.sequences.ndim > 1 else 1
                normalized = math.exp(raw_score / max(seq_len, 1))
                confidence = max(0.0, min(1.0, float(normalized)))
        else:
            generated_ids = self.model.generate(
                pixel_values,
                max_new_tokens=max_new_tokens,
                do_sample=False,
            )
            text = self.processor.batch_decode(
                generated_ids, skip_special_tokens=True
            )[0]
            clean = text.strip()
            # Heuristic confidence based on text properties
            if not clean:
                confidence = 0.0
            elif "<unk>" in clean:
                confidence = 0.2
            elif len(clean) < 3:
                confidence = 0.3
            elif len(clean) > 3:
                alpha_ratio = sum(c.isalpha() for c in clean) / len(clean)
                # High confidence with strong alpha ratio
                confidence = min(0.9, 0.4 + 0.5 * alpha_ratio)
            else:
                confidence = 0.5

        return text.strip(), confidence

    def read_lines(self, image_paths: list[str], max_new_tokens: int = 128) -> list[str]:
        """Read multiple text line images. Returns list of extracted texts."""
        return [self.read_line(p, max_new_tokens=max_new_tokens) for p in image_paths]


handwriting_ocr = HandwritingOCR()
