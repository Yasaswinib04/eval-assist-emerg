import sys
import docx

def read_docx(path):
    doc = docx.Document(path)
    for p in doc.paragraphs:
        text = p.text.strip()
        if text:
            print(f"[{p.style.name}] {text}")

if __name__ == "__main__":
    read_docx(sys.argv[1])
