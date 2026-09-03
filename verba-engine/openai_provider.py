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
