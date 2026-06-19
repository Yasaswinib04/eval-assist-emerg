#!/usr/bin/env python3
"""
EvalAssist OCR Pipeline — Unified entry point.
 
Chains open-source models for:
1. Layout detection on textbook/question paper PDFs
2. Full-page printed OCR with layout preservation
3. Handwriting recognition from student answer sheets
4. Concept matching for question tagging
5. Answer sheet processing (segment → OCR → map → grade)
 
Usage:
    python3 backend/tools/ocr/pipeline.py textbook --pdf Biology/8_Biology_SEM-1_Textbook.pdf
    python3 backend/tools/ocr/pipeline.py ocr --pdf Biology/8_SA1_BS_25-26.pdf
    python3 backend/tools/ocr/pipeline.py layout --pdf Biology/8_Biology_SEM-1_Textbook.pdf --page 1
    python3 backend/tools/ocr/pipeline.py handwriting --images img1.png img2.png
    python3 backend/tools/ocr/pipeline.py match --question "What is mitosis?" --curriculum seed/curriculum/ap-class8-bio.json
    python3 backend/tools/ocr/pipeline.py answersheet --images media/samples/answer_sheets/Karan.jpeg
    python3 backend/tools/ocr/pipeline.py answersheet --all-students
"""

import argparse
import json
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))


def cmd_textbook(args):
    """Full pipeline: extract layout + printed text from a textbook PDF."""
    print(f"\n=== Processing textbook: {args.pdf} ===\n")

    # Step 1: Layout detection
    print("[1/2] Detecting layout elements...")
    from tools.ocr.layout_detector import layout_detector

    layouts = layout_detector.detect_pdf(args.pdf, conf=0.2)
    layout_counts = {}
    for page_elements in layouts.values():
        for el in page_elements:
            cls = el["class"]
            layout_counts[cls] = layout_counts.get(cls, 0) + 1

    print(f"  Found layout elements across {len(layouts)} pages:")
    for cls, count in sorted(layout_counts.items()):
        print(f"    {cls}: {count}")

    # Step 2: Full-page OCR
    print("\n[2/2] Running full-page OCR (this may take a while on CPU)...")
    print("  (Use --max-pages N to limit pages)")
    from tools.ocr.printed_ocr import printed_ocr

    max_pages = args.max_pages
    if max_pages:
        pages_to_process = {
            k: v for k, v in sorted(layouts.items()) if k <= max_pages
        }
    else:
        pages_to_process = layouts

    results = {}
    doc = __import__("fitz").open(args.pdf)

    if max_pages:
        actual_max = min(max_pages, len(doc))
    else:
        actual_max = len(doc)

    for page_num in range(min(3, actual_max)):  # Demo: first 3 pages by default
        actual_page = page_num + 1
        print(f"  Processing page {actual_page}...")
        pix = doc[actual_page - 1].get_pixmap(dpi=150)
        from PIL import Image
        import tempfile

        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            img.save(tmp.name)

        try:
            md = printed_ocr.ocr_page(tmp.name)
            results[actual_page] = md
            preview = md[:200].replace("\n", " ")
            print(f"    → {preview}...")
        finally:
            os.unlink(tmp.name)

    if args.output:
        out_path = Path(args.output)
        with open(out_path, "w") as f:
            json.dump(results, f, indent=2)
        print(f"\nSaved OCR results to {out_path}")

    # Also save layout
    if args.output_layout:
        with open(args.output_layout, "w") as f:
            json.dump(layouts, f, indent=2)
        print(f"Saved layout data to {args.output_layout}")

    print("\nDone.")


def cmd_layout(args):
    """Layout detection only."""
    from tools.ocr.layout_detector import layout_detector

    if args.page:
        import tempfile
        import fitz

        doc = fitz.open(args.pdf)
        page = doc[args.page - 1]
        pix = page.get_pixmap(dpi=150)
        from PIL import Image

        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            img.save(tmp.name)
            elements = layout_detector.detect_page(tmp.name, conf=args.conf)
            os.unlink(tmp.name)

        print(f"\nPage {args.page} layout elements:")
        for el in sorted(elements, key=lambda x: x["bbox"][1]):
            print(
                f"  [{el['class']:20s}] confidence={el['confidence']:.3f}  "
                f"bbox=({el['bbox'][0]:.0f},{el['bbox'][1]:.0f})-({el['bbox'][2]:.0f},{el['bbox'][3]:.0f})"
            )
    else:
        layouts = layout_detector.detect_pdf(args.pdf, conf=args.conf)
        for page_num, elements in sorted(layouts.items()):
            print(f"\nPage {page_num}: {len(elements)} elements")
            for el in sorted(elements, key=lambda x: x["bbox"][1]):
                print(
                    f"  [{el['class']:20s}] conf={el['confidence']:.3f}"
                )


def cmd_ocr(args):
    """Full-page printed OCR only."""
    from tools.ocr.printed_ocr import printed_ocr

    if args.pdf:
        results = printed_ocr.ocr_pdf(args.pdf)
        for page_num, md in sorted(results.items()):
            print(f"\n=== Page {page_num} ===")
            print(md[:500])
    else:
        raise ValueError("Provide --pdf or --image")


def cmd_handwriting(args):
    """Handwriting recognition."""
    from tools.ocr.handwriting_ocr import handwriting_ocr

    for img_path in args.images:
        print(f"\n--- {img_path} ---")
        text = handwriting_ocr.read_line(img_path)
        print(f"  {text}")


def cmd_match(args):
    """Concept matching."""
    from tools.ocr.concept_matcher import concept_matcher

    if args.curriculum:
        with open(args.curriculum) as f:
            curriculum = json.load(f)
        concepts = []
        for ch in curriculum.get("chapters", []):
            for c in ch.get("concepts", []):
                concepts.append(
                    {
                        "name": c["name"],
                        "keywords": c.get("keywords", []),
                        "description": c.get("description", ""),
                        "chapter": ch["name"],
                    }
                )
    else:
        from backend.seed.data.mock_concepts import ALL_CONCEPTS
        concepts = ALL_CONCEPTS

    matches = concept_matcher.match_question_to_concept(args.question, concepts)
    print(f"\nQuestion: {args.question}\n")
    print("Top matches:")
    for i, m in enumerate(matches, 1):
        c = m["concept"]
        print(f"  {i}. [{c['chapter']}] {c['name']}  (score: {m['score']:.4f})")


def cmd_answersheet(args):
    """Process student answer sheets through the full OCR pipeline."""
    from tools.ocr.answer_sheet_ocr import AnswerSheetProcessor

    questions_path = args.questions or str(
        Path(__file__).resolve().parents[2]
        / "seed" / "data" / "questions.json"
    )
    language = getattr(args, "lang", "en") or "en"
    processor = AnswerSheetProcessor(questions_path=questions_path, language=language)
    use_ollama = not args.no_ollama

    if args.all_students:
        students_json = args.students or str(
            Path(__file__).resolve().parents[2]
            / "seed" / "data" / "students.json"
        )
        sheets_dir = args.sheets_dir or str(
            Path(__file__).resolve().parents[3]
            / "media" / "samples" / "answer_sheets"
        )
        output_dir = args.output or str(
            Path(__file__).resolve().parent / "output"
        )
        print(f"\n=== Batch Processing All Students ===")
        print(f"  Language: {language}")
        print(f"  Students: {students_json}")
        print(f"  Answer sheets: {sheets_dir}")
        print(f"  Output: {output_dir}")
        print(f"  Ollama: {'enabled' if use_ollama else 'disabled'}")

        results = processor.process_all(
            students_json=students_json,
            answer_sheets_dir=sheets_dir,
            use_ollama=use_ollama,
            output_dir=output_dir,
        )

        all_output = os.path.join(output_dir, "all_students.json")
        with open(all_output, "w") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"\nSaved batch results to {all_output}")
    else:
        if not args.images:
            print("Error: provide --images <paths> or --all-students")
            sys.exit(1)

        print(f"\n=== Processing Answer Sheet ===")
        print(f"  Language: {language}")
        print(f"  Images: {args.images}")
        print(f"  Ollama: {'enabled' if use_ollama else 'disabled'}")

        result = processor.process(
            image_paths=args.images,
            student_id=args.student_id,
            use_ollama=use_ollama,
        )

        if args.output:
            os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
            with open(args.output, "w") as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            print(f"\nSaved to {args.output}")
        else:
            output_dir = str(Path(__file__).resolve().parent / "output")
            os.makedirs(output_dir, exist_ok=True)
            sid = args.student_id or "unknown"
            out_path = os.path.join(output_dir, f"answers_{sid}.json")
            with open(out_path, "w") as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            print(f"\nSaved to {out_path}")

        print(f"\n  Extracted {len(result.get('rawTexts', []))} text regions")
        print(f"  Structured {len(result.get('structured', []))} answers")
        print(f"  Graded {len(result.get('evaluations', []))} questions")


def main():
    parser = argparse.ArgumentParser(
        description="EvalAssist OCR Pipeline — Open-source model toolchain"
    )
    sub = parser.add_subparsers(dest="command")

    # Textbook subcommand
    p_tb = sub.add_parser("textbook", help="Full pipeline on textbook PDF")
    p_tb.add_argument("--pdf", required=True)
    p_tb.add_argument("--max-pages", type=int, default=3)
    p_tb.add_argument("--output", help="JSON output for OCR text")
    p_tb.add_argument("--output-layout", help="JSON output for layout data")

    # Layout subcommand
    p_lo = sub.add_parser("layout", help="Layout detection only")
    p_lo.add_argument("--pdf", required=True)
    p_lo.add_argument("--page", type=int)
    p_lo.add_argument("--conf", type=float, default=0.25)

    # OCR subcommand
    p_oc = sub.add_parser("ocr", help="Printed text OCR only")
    p_oc.add_argument("--pdf")
    p_oc.add_argument("--image")

    # Handwriting subcommand
    p_hw = sub.add_parser("handwriting", help="Handwriting recognition")
    p_hw.add_argument("--images", nargs="+", required=True)

    # Match subcommand
    p_mc = sub.add_parser("match", help="Question → Concept matching")
    p_mc.add_argument("--question", required=True)
    p_mc.add_argument("--curriculum")

    # Answer sheet subcommand
    p_as = sub.add_parser(
        "answersheet",
        help="Process student answer sheets (segment → OCR → map → grade)",
    )
    p_as.add_argument("--images", nargs="+", help="Answer sheet image paths")
    p_as.add_argument("--student-id", help="Student identifier")
    p_as.add_argument("--questions", help="Path to questions.json")
    p_as.add_argument("--output", help="Output JSON file path")
    p_as.add_argument("--no-ollama", action="store_true", help="Skip Ollama post-processing")
    p_as.add_argument("--lang", default="en", choices=["en", "hi", "te"],
                      help="Language for OCR: en (English), hi (Hindi), te (Telugu)")
    p_as.add_argument(
        "--all-students",
        action="store_true",
        help="Batch process all students from students.json",
    )
    p_as.add_argument("--students", help="Path to students.json")
    p_as.add_argument("--sheets-dir", help="Directory containing answer sheet images")

    args = parser.parse_args()

    if args.command == "textbook":
        cmd_textbook(args)
    elif args.command == "layout":
        cmd_layout(args)
    elif args.command == "ocr":
        cmd_ocr(args)
    elif args.command == "handwriting":
        cmd_handwriting(args)
    elif args.command == "match":
        cmd_match(args)
    elif args.command == "answersheet":
        cmd_answersheet(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
