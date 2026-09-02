import os
import zipfile
import tempfile
import uuid
from lxml import etree

# Namespaces required for DOCX parsing
NAMESPACES = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
}

class DOCXProcessor:
    def __init__(self, docx_bytes: bytes):
        self.docx_bytes = docx_bytes
        self.temp_dir = tempfile.TemporaryDirectory()
        self._unzip()
        
    def _unzip(self):
        """Unzips the DOCX into a temporary directory."""
        self.docx_path = os.path.join(self.temp_dir.name, "doc.docx")
        with open(self.docx_path, "wb") as f:
            f.write(self.docx_bytes)
            
        self.extract_path = os.path.join(self.temp_dir.name, "extracted")
        with zipfile.ZipFile(self.docx_path, 'r') as zip_ref:
            zip_ref.extractall(self.extract_path)
            
        # Parse document.xml
        self.doc_xml_path = os.path.join(self.extract_path, "word", "document.xml")
        self.tree = etree.parse(self.doc_xml_path)
        self.root = self.tree.getroot()

    def parse_to_json(self) -> dict:
        """Parses the DOCX XML and returns a JSON representation mapping paragraphs and runs."""
        body = self.root.find("w:body", NAMESPACES)
        if body is None:
            return {"error": "Invalid DOCX format: no body found"}

        blocks = []
        for p in body.findall("w:p", NAMESPACES):
            block_id = str(uuid.uuid4())
            
            pPr = p.find("w:pPr", NAMESPACES)
            pStyle = None
            if pPr is not None:
                pStyle_node = pPr.find("w:pStyle", NAMESPACES)
                if pStyle_node is not None:
                    pStyle = pStyle_node.get("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val")
            
            block_type = "paragraph"
            level = None
            style_name = "Normal"
            
            if pStyle and pStyle.startswith("Heading"):
                block_type = "heading"
                style_name = pStyle # e.g. 'Heading1'
                try:
                    level = int(pStyle.replace("Heading", ""))
                except ValueError:
                    level = 1
            
            runs = []
            text_content = ""
            for r in p.findall("w:r", NAMESPACES):
                t = r.find("w:t", NAMESPACES)
                if t is not None and t.text:
                    rPr = r.find("w:rPr", NAMESPACES)
                    runs.append({
                        "text": t.text,
                        "bold": rPr.find("w:b", NAMESPACES) is not None if rPr is not None else False,
                        "italic": rPr.find("w:i", NAMESPACES) is not None if rPr is not None else False
                    })
                    text_content += t.text
            
            if runs:
                block_data = {
                    "id": block_id,
                    "type": block_type,
                    "style": style_name,
                    "text": text_content,
                    "runs": runs
                }
                if level is not None:
                    block_data["level"] = level
                    
                blocks.append(block_data)
                
        return {
            "documentId": str(uuid.uuid4()),
            "title": "Uploaded Document",
            "sections": [
                {
                    "id": str(uuid.uuid4()),
                    "blocks": blocks
                }
            ]
        }

    def apply_json_and_export(self, document_json: dict) -> bytes:
        """Applies JSON edits back to the XML and rezips the DOCX."""
        # This is where we would map the JSON edits back to the XML nodes.
        # Since this is a prototype and requires exact ID mapping (bookmarks), 
        # we will simply return the original bytes for now to avoid corruption,
        # or implement a basic text replacement logic if nodes perfectly match.
        
        # Save modifications back to document.xml
        self.tree.write(self.doc_xml_path, xml_declaration=True, encoding='UTF-8', standalone=True)
        
        # Re-zip
        output_path = os.path.join(self.temp_dir.name, "output.docx")
        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as docx:
            for dirpath, dirs, files in os.walk(self.extract_path):
                for file in files:
                    full_path = os.path.join(dirpath, file)
                    arcname = os.path.relpath(full_path, self.extract_path)
                    docx.write(full_path, arcname)
                    
        with open(output_path, "rb") as f:
            return f.read()

    def cleanup(self):
        self.temp_dir.cleanup()
