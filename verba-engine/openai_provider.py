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
Challenge overly broad ideas gently (e.g. "That sounds impressive, but might be too broad to finish well. Let's narrow it.").
Use the current Project Context to inform your response. Do not fabricate research findings, papers, or quotes.

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
    // Only include fields from the Project Context that have been clarified or updated.
    // Allowed keys: working_title, work_type, field, topic, problem, aim, objectives, scope, methodology, tools, geography, citation_style, economic_analysis, focus, constraints, context_summary
  }},
  "stage_suggestion": "string (developing, shaping) or null",
  "readiness": {{
    "can_plan": boolean,
    "missing": ["string", "string"] // fields missing before planning can start
  }}
}}"""

        formatted_messages = [
            {"role": "system", "content": "You output JSON matching the requested schema exactly. You are Verba, an academic writing assistant."},
        ]

        # Add recent messages for context
        for msg in recent_messages:
            formatted_messages.append({"role": msg.get("role"), "content": msg.get("content")})

        # Add the final prompt
        formatted_messages.append({"role": "user", "content": prompt})

        response = self.client.chat.completions.create(
            model=self.model,
            messages=formatted_messages,
            response_format={"type": "json_object"},
            temperature=0.7,
        )

        raw = response.choices[0].message.content
        try:
            return json.loads(raw)
        except json.JSONDecodeError as exc:
            logger.warning("JSON decode failed in develop_conversation: %s", exc)
            return {
                "message": "I'm having trouble processing that right now. Could you rephrase?",
                "suggested_replies": [],
                "context_updates": {},
                "stage_suggestion": None,
                "readiness": {"can_plan": False, "missing": []}
            }
