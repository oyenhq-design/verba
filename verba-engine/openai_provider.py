import os
import json
from openai import OpenAI
from writing_model import WritingModelProvider

class OpenAIProvider(WritingModelProvider):
    def __init__(self):
        # Requires OPENAI_API_KEY environment variable
        self.client = OpenAI()
        self.model = "gpt-4o-mini" # Using gpt-4o-mini for speed and cost efficiency, can be upgraded to gpt-4o

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
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            timeout=30.0
        )
        
        try:
            return json.loads(response.choices[0].message.content)
        except json.JSONDecodeError:
            return {"needs_revision": False, "issues": []}

    def generate_alternative(self, context: str, paragraph_text: str, issue: dict) -> dict:
        prompt = f"""You are an expert writing refinement assistant. Provide an alternative suggestion for a writing issue previously identified.

Target Paragraph:
{paragraph_text}

Issue identified:
Type: {issue['type']}
Original Text: {issue['original_text']}
Previous Suggestion: {issue['suggested_text']}
Explanation: {issue['explanation']}

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
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
            timeout=30.0
        )
        
        try:
            return json.loads(response.choices[0].message.content)
        except json.JSONDecodeError:
            return {"suggested_text": issue['original_text'], "explanation": "Failed to generate alternative."}
