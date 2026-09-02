from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class WritingModelProvider(ABC):
    
    @abstractmethod
    def analyze_paragraph(self, context: str, paragraph_text: str) -> Dict[str, Any]:
        """
        Analyzes a single paragraph and returns a structured JSON-like dict.
        Expected structure:
        {
          "needs_revision": True/False,
          "issues": [
            {
              "type": "wordiness",
              "severity": "medium",
              "original_text": "...",
              "suggested_text": "...",
              "explanation": "..."
            }
          ]
        }
        """
        pass

    @abstractmethod
    def generate_alternative(self, context: str, paragraph_text: str, issue: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generates an alternative suggestion for an existing issue.
        Expected structure:
        {
          "suggested_text": "...",
          "explanation": "..."
        }
        """
        pass
