import os
import json
import logging

from openai import OpenAI
from writing_model import WritingModelProvider

logger = logging.getLogger("verba-engine.openai_provider")


class OpenAIProvider(WritingModelProvider):
    def __init__(self):
        # OPENAI_API_KEY is read automatically by the OpenAI client from the environment.
        # timeout is passed to the client constructor (SDK v1.x) — NOT as a kwarg to create().
        self.client = OpenAI(timeout=30.0)
        self.model = "gpt-4o-mini"
        logger.info("OpenAIProvider initialized with model=%s", self.model)

    def analyze_paragraph(self, context: str, paragraph_text: str) -> dict:
        prompt = f"""You are an expert writing refinement assistant. Your task is to identify genuine writing problems in the provided paragraph.
Do not rewrite text merely to make it different. If a paragraph is already well-written, clearly written, and flows well, return needs_revision = false.

Check for: wordiness, overly_formal, repetition, clarity, generic_phrase, weak_transition, redundancy, sentence_monotony, vagueness, passive_voice, tone_inconsistency.
Do not change: facts, numbers, percentages, citations, names, references, technical terminology, URLs, quotes, equations, units.

Context (for understanding only):
{context}

Target Paragraph to analyze:
{paragraph_text}

Return JSON strictly following this schema:
{{
  "needs_revision": boolean,
  "issues": [
    {{
      "type": "string (one of the checked categories)",
      "severity": "string (low, medium, high)",
      "original_text": "string (exact substring from the paragraph)",
      "suggested_text": "string (the improved alternative for that exact substring)",
      "explanation": "string (brief reason for the suggestion)"
    }}
  ]
}}"""

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You output JSON matching the requested schema exactly."},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
        )

        raw = response.choices[0].message.content
        try:
            return json.loads(raw)
        except json.JSONDecodeError as exc:
            logger.warning("JSON decode failed in analyze_paragraph: %s", exc)
            return {"needs_revision": False, "issues": []}

    def generate_alternative(self, context: str, paragraph_text: str, issue: dict) -> dict:
        prompt = f"""You are an expert writing refinement assistant. Provide an alternative suggestion for a writing issue previously identified.

Target Paragraph:
{paragraph_text}

Issue identified:
Type: {issue.get('type', '')}
Original Text: {issue.get('original_text', '')}
Previous Suggestion: {issue.get('suggested_text', '')}
Explanation: {issue.get('explanation', '')}

Provide a *new* suggested_text that fixes the issue but is different from the previous suggestion.

Return JSON strictly following this schema:
{{
  "suggested_text": "string",
  "explanation": "string"
}}"""

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You output JSON matching the requested schema exactly."},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
        )

        raw = response.choices[0].message.content
        try:
            return json.loads(raw)
        except json.JSONDecodeError as exc:
            logger.warning("JSON decode failed in generate_alternative: %s", exc)
            return {"suggested_text": issue.get("original_text", ""), "explanation": "Failed to generate alternative."}

    def develop_conversation(self, initial_idea: str | None, current_context: dict, recent_messages: list, message: str) -> dict:
        prompt = f"""You are Verba, an intelligent, calm, and curious academic writing assistant. 
Your goal is to help the user shape their rough idea into a structured project context.
Do not write the final document or essay for them yet. 
Help them think. Ask one useful question at a time to clarify their intent.

First, understand what kind of work they are doing (e.g. final_year_project, essay, research_paper).
Then progressively clarify relevant context for that specific work type.
Do not ask a rigid sequence of questions (like "What is your methodology?"). Instead, let the conversation flow naturally.

Current Project Context:
{json.dumps(current_context, indent=2)}

Initial Idea:
{initial_idea or "None"}

The user just said:
{message}

Respond in JSON matching exactly this schema:
{{
  "message": "string (your conversational reply)",
  "suggested_replies": ["string", "string", "string"],
  "context_updates": {{
    // Extract context updates based on the conversation. Only include fields that have been clarified.
    // If you determine the work type, output it as "work_type" (e.g., "final_year_project", "essay", "research_paper").
    // As the project becomes clearer, synthesize a concise "direction_summary" and "approach_summary".
    // Map out proposed sections into "planned_sections" (array of strings) if the user is ready to structure it.
  }},
  "stage_suggestion": "string (developing, shaping) or null"
}}"""

        formatted_messages = [
            {"role": "system", "content": "You output JSON matching the requested schema exactly. You are Verba, an academic writing assistant."},
        ]

        for msg in recent_messages:
            formatted_messages.append({"role": msg.get("role"), "content": msg.get("content")})

        formatted_messages.append({"role": "user", "content": prompt})

        response = self.client.chat.completions.create(
            model=self.model,
            messages=formatted_messages,
            response_format={"type": "json_object"},
            temperature=0.7,
        )

        raw = response.choices[0].message.content
        try:
            parsed = json.loads(raw)
            
            # Deterministic readiness calculation
            from schemas import calculate_readiness
            
            # Merge context updates into current context to calculate readiness
            merged_context = dict(current_context)
            if "context_updates" in parsed and isinstance(parsed["context_updates"], dict):
                merged_context.update(parsed["context_updates"])
            
            work_type = merged_context.get("work_type", "general_document")
            parsed["readiness"] = calculate_readiness(work_type, merged_context)
            
            return parsed
        except json.JSONDecodeError as exc:
            logger.warning("JSON decode failed in develop_conversation: %s", exc)
            return {
                "message": "I'm having trouble processing that right now. Could you rephrase?",
                "suggested_replies": [],
                "context_updates": {},
                "stage_suggestion": None,
                "readiness": {
                    "is_ready": False,
                    "work_type": "general_document",
                    "work_type_label": "General document",
                    "shaped_count": 0,
                    "total_relevant": 0,
                    "missing_core": [],
                    "missing_optional": [],
                    "structure_ready": False,
                    "direction_summary": "",
                    "approach_summary": ""
                }
            }

