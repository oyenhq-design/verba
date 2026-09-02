from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Body
from fastapi.responses import Response, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from docx_processor import DOCXProcessor
from openai_provider import OpenAIProvider
from safety_validator import SafetyValidator
import json
import os
import sys
from pydantic import BaseModel
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()

if not os.getenv("OPENAI_API_KEY"):
    print("CRITICAL ERROR: OPENAI_API_KEY is not set in the environment.")
    print("Please configure it in verba-engine/.env before running.")
    sys.exit(1)

app = FastAPI(title="HumanDraft Python Service")

# Allow Next.js frontend to communicate locally
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

provider = OpenAIProvider()

class AnalyzeRequest(BaseModel):
    context: str = ""
    paragraph_text: str

class AlternativeRequest(BaseModel):
    context: str = ""
    paragraph_text: str
    issue: Dict[str, Any]

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/parse")
async def parse_docx(file: UploadFile = File(...)):
    """Accepts a .docx file and returns the JSON DocumentModel structure."""
    if not file.filename.endswith('.docx'):
        raise HTTPException(status_code=400, detail="Only .docx files are supported")
    
    contents = await file.read()
    try:
        processor = DOCXProcessor(contents)
        json_data = processor.parse_to_json()
        processor.cleanup()
        return JSONResponse(content=json_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze")
async def analyze_block(req: AnalyzeRequest):
    """Analyzes a block of text for writing issues."""
    try:
        result = provider.analyze_paragraph(req.context, req.paragraph_text)
        
        # Filter issues by safety validation
        safe_issues = []
        if result.get("needs_revision") and "issues" in result:
            for issue in result["issues"]:
                # Ensure the original text exists in the paragraph
                if issue["original_text"] not in req.paragraph_text:
                    continue
                # Ensure the suggestion preserves protected entities
                if SafetyValidator.validate_suggestion(issue["original_text"], issue["suggested_text"]):
                    safe_issues.append(issue)
            
            result["issues"] = safe_issues
            if not safe_issues:
                result["needs_revision"] = False
                
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze/alternative")
async def analyze_alternative(req: AlternativeRequest):
    """Generates an alternative suggestion for a block."""
    try:
        result = provider.generate_alternative(req.context, req.paragraph_text, req.issue)
        
        # Ensure the alternative preserves protected entities
        if not SafetyValidator.validate_suggestion(req.issue["original_text"], result["suggested_text"]):
            raise HTTPException(status_code=400, detail="Generated alternative failed safety validation.")
            
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
