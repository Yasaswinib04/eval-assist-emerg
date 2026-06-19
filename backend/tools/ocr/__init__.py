"""EvalAssist OCR Pipeline
 
Open-source model stack for curriculum extraction and answer sheet processing:
- Layout Detection: YOLO11n-document-layout (MIT)
- Printed OCR: SmolDocling-256M-preview (Apache 2.0)
- Handwriting OCR: TrOCR-base-handwritten (MIT)
- Concept Matching: all-MiniLM-L6-v2 (Apache 2.0)
- Answer Sheet Processing: end-to-end pipeline (segment → OCR → map → grade)
"""
 
__all__ = [
    "LayoutDetector",
    "PrintedOCR",
    "HandwritingOCR",
    "ConceptMatcher",
    "OCRPipeline",
    "AnswerSheetProcessor",
]
