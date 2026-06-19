"""Layout Detection using YOLO11n fine-tuned on DocLayNet.

Detects 11 document layout types:
text, title, section-header, table, picture, caption,
list-item, formula, page-header, page-footer, footnote

Model: Armaggheddon/yolo11n-document-layout (MIT, 2.7M params)
"""

import os
from pathlib import Path
from typing import Optional
from PIL import Image
import fitz  # PyMuPDF


class LayoutDetector:
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
        self._model_path: Optional[Path] = None

    def _ensure_model(self):
        if self.model is not None:
            return

        from huggingface_hub import hf_hub_download
        from ultralytics import YOLO

        model_dir = Path(__file__).parent / "_models"
        model_dir.mkdir(exist_ok=True)

        model_file = "yolo11n_doc_layout.pt"
        if not (model_dir / model_file).exists():
            print("Downloading YOLO11n-document-layout model...")
            self._model_path = Path(
                hf_hub_download(
                    repo_id="Armaggheddon/yolo11-document-layout",
                    filename=model_file,
                    local_dir=model_dir,
                )
            )
        else:
            self._model_path = model_dir / model_file

        self.model = YOLO(str(self._model_path))
        print("Layout detector ready.")

    def detect_page(self, image_path: str, conf: float = 0.25):
        """Detect layout elements on a single image. Returns list of boxes."""
        self._ensure_model()
        results = self.model(image_path, conf=conf)

        elements = []
        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                cls_name = r.names[cls_id]
                coords = box.xyxy[0].tolist()  # [x1, y1, x2, y2]
                confidence = float(box.conf[0])
                elements.append(
                    {
                        "class": cls_name,
                        "bbox": coords,
                        "confidence": round(confidence, 3),
                    }
                )
        return elements

    def detect_pdf(self, pdf_path: str, conf: float = 0.25):
        """Detect layout on every page of a PDF. Returns page-keyed dict."""
        self._ensure_model()
        doc = fitz.open(pdf_path)
        all_pages = {}

        for page_num in range(len(doc)):
            page = doc[page_num]
            pix = page.get_pixmap(dpi=150)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

            import tempfile

            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                img.save(tmp.name)
                tmp_path = tmp.name

            try:
                elements = self.detect_page(tmp_path, conf=conf)
                all_pages[page_num + 1] = elements
            finally:
                os.unlink(tmp_path)

        return all_pages


layout_detector = LayoutDetector()
