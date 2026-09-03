from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from docx_processor import DOCXProcessor
from openai_provider import OpenAIProvider
from safety_validator import SafetyValidator
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

# Restrict CORS to expected frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:3001",
        "https://app.verba.com"
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
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
    return {"status": "ok", "service": "verba-engine"}

@app.post("/api/parse")
async def parse_docx(file: UploadFile = File(...)):
    """Accepts a .docx file and returns the JSON DocumentModel structure."""
    if not file.filename.endswith('.docx'):
        return JSONResponse(status_code=400, content={"error": "INVALID_FILE_TYPE", "message": "Only .docx files are supported"})
    
    contents = await file.read()
    try:
        processor = DOCXProcessor(contents)
        json_data = processor.parse_to_json()
        processor.cleanup()
        return JSONResponse(content=json_data)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": "DOCUMENT_PARSE_FAILED", "message": f"Unable to parse document. Error: {str(e)}"})

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
        return JSONResponse(status_code=500, content={"error": "ANALYSIS_FAILED", "message": f"Unable to analyze block. Error: {str(e)}"})

@app.post("/api/analyze/alternative")
async def analyze_alternative(req: AlternativeRequest):
    """Generates an alternative suggestion for a block."""
    try:
        result = provider.generate_alternative(req.context, req.paragraph_text, req.issue)
        
        # Ensure the alternative preserves protected entities
        if not SafetyValidator.validate_suggestion(req.issue["original_text"], result["suggested_text"]):
            return JSONResponse(status_code=400, content={"error": "SAFETY_VALIDATION_FAILED", "message": "Generated alternative failed safety validation."})
            
        return result
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": "ALTERNATIVE_GENERATION_FAILED", "message": f"Unable to generate alternative. Error: {str(e)}"})

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
