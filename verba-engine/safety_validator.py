import re

class SafetyValidator:
    @staticmethod
    def extract_protected_entities(text: str) -> list:
        entities = []
        
        # 1. Numbers with units or percentages (e.g., 2,450 kg/h, 18 bar, 87.4%)
        # Matches numbers (including commas/decimals) optionally followed by space and typical units or %
        number_pattern = r'\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*(?:kg/h|bar|%|°C|mm|cm|m|km|g|kg|L|mL|s|min|h|Hz)\b|\b\d{1,3}(?:,\d{3})*(?:\.\d+)?%'
        entities.extend(re.findall(number_pattern, text))
        
        # 2. Citations (e.g., Adeyemi et al. (2024), Smith (2020), (Jones, 2019))
        citation_pattern = r'[A-Z][a-z]+ (?:et al\.\s*)?\(\d{4}\)|\([A-Za-z]+, \d{4}\)'
        entities.extend(re.findall(citation_pattern, text))
        
        # 3. URLs
        url_pattern = r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+'
        entities.extend(re.findall(url_pattern, text))
        
        # 4. Technical Expressions / Proper Nouns with symbols (e.g., CO₂, H₂O)
        # Very basic check for uppercase letters mixed with numbers or subscript/superscript
        # (For this MVP, we'll specifically catch common ones or sequences of caps/numbers)
        tech_pattern = r'\b[A-Z]+[₀-₉0-9]+\b'
        entities.extend(re.findall(tech_pattern, text))
        
        # We also just pull standalone numbers that didn't match units just in case
        standalone_numbers = r'\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b'
        for num in re.findall(standalone_numbers, text):
            # Only add if not already part of a matched unit/percentage
            if not any(num in e for e in entities):
                entities.append(num)
                
        # Deduplicate
        return list(set(entities))

    @staticmethod
    def validate_suggestion(original_text: str, suggested_text: str) -> bool:
        """
        Returns True if all protected entities in original_text are preserved in suggested_text.
        """
        protected = SafetyValidator.extract_protected_entities(original_text)
        for entity in protected:
            if entity not in suggested_text:
                # We do a basic string match. In reality, spacing might change slightly, 
                # but strict enforcement is safer for Milestone 2.
                return False
        return True
