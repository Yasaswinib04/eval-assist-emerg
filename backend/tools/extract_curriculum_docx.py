import sys
import json
import docx
import re
from typing import List, Dict

def extract_curriculum(docx_path: str, out_path: str):
    doc = docx.Document(docx_path)
    
    curriculum = {
        "_id": "ap-class8-bio-v1",
        "board": "Andhra Pradesh State Board",
        "class": "Class 8",
        "subject": "Biology",
        "language": "en",
        "version": 1,
        "chapters": []
    }
    
    current_chapter = None
    current_concept = None
    
    ch_idx = 0
    c_idx = 0
    
    for p in doc.paragraphs:
        text = p.text.strip()
        if not text:
            continue
            
        style = p.style.name
        
        # [Title] Chap2 - ignoring or using as chapter context
        if style.startswith('Heading 2'):
            # New Chapter
            ch_idx += 1
            # remove "Chapter X:"
            name = re.sub(r'^Chapter\s*\d+:\s*', '', text)
            
            # Use color mapping for UI
            color = ["blue", "emerald", "amber", "rose"][(ch_idx-1) % 4]
            
            current_chapter = {
                "id": f"ch{ch_idx}",
                "name": name,
                "order": ch_idx,
                "color": color,
                "concepts": []
            }
            curriculum["chapters"].append(current_chapter)
            current_concept = None
            c_idx = 0
            
        elif style.startswith('Heading 3'):
            if not current_chapter:
                # If a heading 3 appears before chapter 2, we might be in chapter 1
                ch_idx = 1
                current_chapter = {
                    "id": "ch1",
                    "name": "Cell — Structure & Functions", # default name if missed
                    "order": 1,
                    "color": "blue",
                    "concepts": []
                }
                curriculum["chapters"].append(current_chapter)
                
            # New Concept
            c_idx += 1
            name = re.sub(r'^\d+\.\s*', '', text)
            current_concept = {
                "id": f"ch{ch_idx}-c{c_idx}",
                "name": name,
                "keywords": [],
                "description": "",
                "prerequisites": [],
                "difficulty": "Medium",
                "expectedSkills": ["Recall", "Application"],
                "associatedImages": []
            }
            current_chapter["concepts"].append(current_concept)
            
        elif style.startswith('Heading 4'):
            if current_concept:
                current_concept["keywords"].append(text.replace(":", ""))
                current_concept["description"] += f" {text}"
                
        elif style == 'normal' or style == 'Normal':
            if current_concept:
                # Add to description, extract some keywords heuristically
                current_concept["description"] += f" {text}"
                
                # Extract bold-like or capitalized terms heuristically as keywords
                # Words with initial caps that aren't first word of sentence
                words = re.findall(r'\b[A-Z][a-z]+\b', text)
                for w in words:
                    if w not in current_concept["keywords"] and len(w) > 3:
                        current_concept["keywords"].append(w)
                        
    # Post-process: limit keywords, trim descriptions
    for ch in curriculum["chapters"]:
        for c in ch["concepts"]:
            c["description"] = c["description"].strip()[:500] + ("..." if len(c["description"]) > 500 else "")
            # clean keywords
            c["keywords"] = list(set([k for k in c["keywords"] if len(k) > 3]))[:8]
            
    # Write to output
    with open(out_path, 'w') as f:
        json.dump(curriculum, f, indent=2)
    print(f"Curriculum extracted to {out_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: extract_curriculum_docx.py <in_docx> <out_json>")
        sys.exit(1)
    extract_curriculum(sys.argv[1], sys.argv[2])
