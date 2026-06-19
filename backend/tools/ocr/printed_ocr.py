"""Printed Text OCR using SmolDocling-256M.

End-to-end full-page document conversion:
- Converts printed page images to structured text
- Handles 2-column layouts, tables, formulas
- Outputs Markdown and DocTags format
- Preserves reading order

Model: docling-project/SmolDocling-256M-preview (Apache 2.0, 256M params)
"""

from pathlib import Path
from PIL import Image
import fitz

try:
    import torch
except ImportError:
    torch = None


class PrintedOCR:
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

        model_id = "ds4sd/SmolDocling-256M-preview"
        print(f"Loading {model_id} (this may take a minute on first run)...")

        from transformers import AutoProcessor

        try:
            from transformers import AutoModelForVision2Seq as ModelCls
        except ImportError:
            from transformers import AutoModelForMultimodalLM as ModelCls

        attn_impl = "eager" if self.device != "cuda" else "flash_attention_2"

        if self.device == "cuda":
            self.model = ModelCls.from_pretrained(
                model_id, torch_dtype=torch.bfloat16,
                _attn_implementation=attn_impl
            ).to(self.device)
        else:
            self.model = ModelCls.from_pretrained(model_id, _attn_implementation=attn_impl).to(self.device)

        self.processor = AutoProcessor.from_pretrained(model_id)
        print(f"Printed OCR ready on {self.device}.")

    def ocr_page(self, image_path: str) -> str:
        """Convert a single printed page image to Markdown text."""
        self._ensure_model()

        image = Image.open(image_path).convert("RGB")
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image"},
                    {"type": "text", "text": "Convert this page to docling."},
                ],
            }
        ]

        prompt = self.processor.apply_chat_template(
            messages, add_generation_prompt=True
        )
        inputs = self.processor(text=prompt, images=[image], return_tensors="pt").to(
            self.device
        )

        max_tokens = getattr(self, '_max_new_tokens', 8192)
        generated_ids = self.model.generate(**inputs, max_new_tokens=max_tokens)
        prompt_length = inputs.input_ids.shape[1]
        trimmed = generated_ids[:, prompt_length:]
        doctags = self.processor.batch_decode(
            trimmed, skip_special_tokens=False
        )[0].lstrip()

        from docling_core.types.doc import DoclingDocument
        from docling_core.types.doc.document import DocTagsDocument

        doctags_doc = DocTagsDocument.from_doctags_and_image_pairs(
            [doctags], [image]
        )
        doc = DoclingDocument.load_from_doctags(doctags_doc, document_name="page")
        return doc.export_to_markdown()

    def ocr_pdf(self, pdf_path: str) -> dict:
        """Convert every page of a PDF to Markdown. Returns {page_num: markdown}."""
        self._ensure_model()
        doc = fitz.open(pdf_path)
        pages = {}

        for page_num in range(len(doc)):
            page = doc[page_num]
            pix = page.get_pixmap(dpi=150)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

            import tempfile, os

            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                img.save(tmp.name)
                tmp_path = tmp.name

            try:
                md = self.ocr_page(tmp_path)
                pages[page_num + 1] = md
            except Exception as e:
                pages[page_num + 1] = f"[OCR Error: {e}]"
            finally:
                os.unlink(tmp_path)

        return pages


printed_ocr = PrintedOCR()
