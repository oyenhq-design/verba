import logging
import traceback
import os
import sys
import json

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any
from dotenv import load_dotenv

from docx_processor import DOCXProcessor
from openai_provider import OpenAIProvider
from safety_validator import SafetyValidator

load_dotenv()

# ---------------------------------------------------------------------------
# Structured logging – output goes to Render's log stream
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("verba-engine")

# ---------------------------------------------------------------------------
# Guard: OPENAI_API_KEY must be set before anything else
# ---------------------------------------------------------------------------
if not os.getenv("OPENAI_API_KEY"):
    logger.critical("OPENAI_API_KEY is not set. Aborting startup.")
    sys.exit(1)

app = FastAPI(title="Verba Engine")

# Restrict CORS to expected frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "https://app.verba.com").split(","),
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


class DevelopMessage(BaseModel):
    role: str
    content: str


class DevelopRequest(BaseModel):
    work_id: str
    initial_idea: str | None = None
    current_context: Dict[str, Any] = {}
    recent_messages: list[DevelopMessage] = []
    message: str


class DevelopResponse(BaseModel):
    message: str
    suggested_replies: list[str] = []
    context_updates: Dict[str, Any] = {}
    stage_suggestion: str | None = None
    readiness: Dict[str, Any] = {}


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "verba-engine"}


@app.post("/api/parse")
async def parse_docx(file: UploadFile = File(...)):
    """Accepts a .docx file and returns the JSON DocumentModel structure."""
    if not file.filename.endswith(".docx"):
        return JSONResponse(
            status_code=400,
            content={"error": "INVALID_FILE_TYPE", "message": "Only .docx files are supported"},
        )

    contents = await file.read()
    try:
        processor = DOCXProcessor(contents)
        json_data = processor.parse_to_json()
        processor.cleanup()
        return JSONResponse(content=json_data)
    except Exception as exc:
        logger.exception("parse_docx failed", extra={"exception_type": type(exc).__name__})
        return JSONResponse(
            status_code=500,
            content={"error": "DOCUMENT_PARSE_FAILED", "message": "Unable to parse document."},
        )


@app.post("/api/analyze")
async def analyze_block(req: AnalyzeRequest):
    """Analyzes a block of text for writing issues."""
    try:
        result = provider.analyze_paragraph(req.context, req.paragraph_text)

        # Filter issues by safety validation
        safe_issues = []
        if result.get("needs_revision") and "issues" in result:
            for issue in result["issues"]:
                # Guard: skip if required fields are missing or None
                original = issue.get("original_text")
                suggested = issue.get("suggested_text")
                if not original or not suggested:
                    logger.warning(
                        "Skipping issue with missing original_text or suggested_text",
                        extra={"exception_type": "MissingIssueField"},
                    )
                    continue

                # Ensure the original text actually exists in the paragraph
                if original not in req.paragraph_text:
                    continue

                # Ensure the suggestion preserves protected entities
                try:
                    if SafetyValidator.validate_suggestion(original, suggested):
                        safe_issues.append(issue)
                except Exception as sv_exc:
                    logger.warning(
                        "SafetyValidator raised an exception — skipping issue",
                        extra={"exception_type": type(sv_exc).__name__},
                    )
                    continue

            result["issues"] = safe_issues
            if not safe_issues:
                result["needs_revision"] = False

        return result

    except Exception as exc:
        # Log the FULL traceback to Render's log stream (safe — not sent to browser)
        logger.error(
            "analyze_block failed: %s — %s",
            type(exc).__name__,
            str(exc),
            extra={"exception_type": type(exc).__name__},
        )
        logger.debug("Full traceback:\n%s", traceback.format_exc())

        # Classify the error for the caller without leaking internal detail
        exc_name = type(exc).__name__
        exc_str = str(exc).lower()

        if "authenticationerror" in exc_name or "incorrect api key" in exc_str or "401" in exc_str:
            error_code = "OPENAI_AUTH_FAILED"
            message = "OpenAI authentication failed. Check that OPENAI_API_KEY is valid."
        elif (
            "ratelimiterror" in exc_name
            or "quotaexceeded" in exc_name
            or "insufficient_quota" in exc_str
            or "billing" in exc_str
            or "429" in exc_str
        ):
            error_code = "OPENAI_QUOTA_EXCEEDED"
            message = "OpenAI quota or billing limit reached."
        elif "timeout" in exc_name.lower() or "timeout" in exc_str:
            error_code = "OPENAI_TIMEOUT"
            message = "OpenAI request timed out."
        elif "typeerror" in exc_name.lower():
            error_code = "ENGINE_INTERNAL_ERROR"
            message = f"Internal engine error: {type(exc).__name__}."
        else:
            error_code = "ANALYSIS_FAILED"
            message = "Unable to analyze this passage."

        return JSONResponse(
            status_code=500,
            content={"error": error_code, "message": message},
        )


@app.post("/api/analyze/alternative")
async def analyze_alternative(req: AlternativeRequest):
    """Generates an alternative suggestion for a block."""
    try:
        result = provider.generate_alternative(req.context, req.paragraph_text, req.issue)

        original = req.issue.get("original_text", "")
        suggested = result.get("suggested_text", "")

        if not original or not suggested:
            return JSONResponse(
                status_code=400,
                content={"error": "MISSING_FIELDS", "message": "Missing original or suggested text."},
            )

        if not SafetyValidator.validate_suggestion(original, suggested):
            return JSONResponse(
                status_code=400,
                content={
                    "error": "SAFETY_VALIDATION_FAILED",
                    "message": "Generated alternative failed safety validation.",
                },
            )

        return result

    except Exception as exc:
        logger.error(
            "analyze_alternative failed: %s — %s",
            type(exc).__name__,
            str(exc),
            extra={"exception_type": type(exc).__name__},
        )
        logger.debug("Full traceback:\n%s", traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={
                "error": "ALTERNATIVE_GENERATION_FAILED",
                "message": "Unable to generate alternative.",
            },
        )


@app.post("/api/develop", response_model=DevelopResponse)
async def develop_conversation_route(req: DevelopRequest):
    """Conversational development endpoint for shaping an idea."""
    try:
        # Convert Pydantic messages back to dicts for the provider
        recent_msgs_dict = [{"role": m.role, "content": m.content} for m in req.recent_messages]

        result = provider.develop_conversation(
            initial_idea=req.initial_idea,
            current_context=req.current_context,
            recent_messages=recent_msgs_dict,
            message=req.message
        )
        
        # We assume result is a dictionary matching the DevelopResponse schema.
        # Pydantic will validate and coerce it automatically.
        return result

    except Exception as exc:
        logger.error(
            "develop_conversation_route failed: %s — %s",
            type(exc).__name__,
            str(exc),
            extra={"exception_type": type(exc).__name__},
        )
        logger.debug("Full traceback:\n%s", traceback.format_exc())
        
        # Classify the error for the caller without leaking internal detail
        exc_name = type(exc).__name__
        exc_str = str(exc).lower()

        if "authenticationerror" in exc_name or "incorrect api key" in exc_str or "401" in exc_str:
            error_code = "OPENAI_AUTH_FAILED"
            message = "OpenAI authentication failed."
        elif (
            "ratelimiterror" in exc_name
            or "quotaexceeded" in exc_name
            or "insufficient_quota" in exc_str
            or "billing" in exc_str
            or "429" in exc_str
        ):
            error_code = "OPENAI_QUOTA_EXCEEDED"
            message = "OpenAI quota or billing limit reached."
        elif "timeout" in exc_name.lower() or "timeout" in exc_str:
            error_code = "OPENAI_TIMEOUT"
            message = "OpenAI request timed out."
        else:
            error_code = "DEVELOP_FAILED"
            message = "Unable to generate a response at this time."

        return JSONResponse(
            status_code=500,
            content={
                "error": error_code,
                "message": message,
            },
        )


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
