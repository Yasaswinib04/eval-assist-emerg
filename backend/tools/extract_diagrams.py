import sys
import os
import fitz  # PyMuPDF

def extract_images(pdf_path: str, out_dir: str):
    os.makedirs(out_dir, exist_ok=True)
    doc = fitz.open(pdf_path)
    
    img_count = 0
    for page_num in range(len(doc)):
        page = doc[page_num]
        image_list = page.get_images(full=True)
        
        for img_index, img in enumerate(image_list):
            xref = img[0]
            base_image = doc.extract_image(xref)
            image_bytes = base_image["image"]
            image_ext = base_image["ext"]
            
            # Simple heuristic: ignore very small images (like icons)
            if len(image_bytes) < 5000:
                continue
                
            img_count += 1
            out_name = f"img_p{page_num+1}_{img_index+1}.{image_ext}"
            out_path = os.path.join(out_dir, out_name)
            
            with open(out_path, "wb") as f:
                f.write(image_bytes)
                
    print(f"Extracted {img_count} images to {out_dir}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: extract_diagrams.py <in_pdf> <out_dir>")
        sys.exit(1)
    extract_images(sys.argv[1], sys.argv[2])
