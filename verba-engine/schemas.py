from typing import Dict, Any, List

WORK_TYPE_SCHEMAS = {
    "final_year_project": {
        "label": "Final-year project",
        "core": ["working_title", "problem", "aim", "objectives", "scope", "methodology"],
        "optional": ["research_questions", "data_requirements", "analysis_approach", "tools", "geography", "assumptions", "limitations", "citation_style", "planned_sections"]
    },
    "research_project": {
        "label": "Research project",
        "core": ["working_title", "problem", "aim", "research_questions", "methodology"],
        "optional": ["objectives", "scope", "data_requirements", "analysis_approach", "tools", "limitations", "citation_style", "planned_sections"]
    },
    "research_paper": {
        "label": "Research paper",
        "core": ["working_title", "topic", "problem", "methodology"],
        "optional": ["hypotheses", "data_sources", "analysis_approach", "limitations", "literature_gap", "citation_style", "planned_sections", "target_length"]
    },
    "dissertation": {
        "label": "Dissertation",
        "core": ["working_title", "problem", "aim", "research_questions", "methodology", "scope"],
        "optional": ["objectives", "data_requirements", "analysis_approach", "limitations", "literature_themes", "citation_style", "planned_sections"]
    },
    "essay": {
        "label": "Essay",
        "core": ["working_title", "topic", "position", "main_arguments"],
        "optional": ["counterarguments", "evidence_needs", "citation_style", "planned_sections", "target_length"]
    },
    "technical_report": {
        "label": "Technical report",
        "core": ["working_title", "topic", "problem", "aim", "methodology"],
        "optional": ["scope", "tools", "assumptions", "constraints", "validation_approach", "planned_sections"]
    },
    "professional_report": {
        "label": "Professional report",
        "core": ["working_title", "topic", "aim"],
        "optional": ["problem", "scope", "methodology", "constraints", "planned_sections"]
    },
    "general_document": {
        "label": "General document",
        "core": ["working_title", "topic", "aim"],
        "optional": ["problem", "scope", "focus", "planned_sections"]
    }
}

def is_value_defined(val: Any) -> bool:
    if val is None or val == "":
        return False
    if isinstance(val, list) and len(val) == 0:
        return False
    if isinstance(val, dict) and not val:
        return False
    return True

def calculate_readiness(work_type_raw: str, context: Dict[str, Any]) -> Dict[str, Any]:
    # Normalize work_type
    work_type = "general_document"
    if work_type_raw and isinstance(work_type_raw, str):
        normalized = work_type_raw.lower().strip().replace(" ", "_").replace("-", "_")
        if normalized in WORK_TYPE_SCHEMAS:
            work_type = normalized
    
    schema = WORK_TYPE_SCHEMAS[work_type]
    
    core_fields = schema.get("core", [])
    optional_fields = schema.get("optional", [])
    
    missing_core = []
    missing_optional = []
    
    shaped_count = 0
    total_relevant = len(core_fields) + len(optional_fields)
    
    for field in core_fields:
        if is_value_defined(context.get(field)):
            shaped_count += 1
        else:
            missing_core.append(field)
            
    for field in optional_fields:
        if is_value_defined(context.get(field)):
            shaped_count += 1
        else:
            missing_optional.append(field)
            
    is_ready = len(missing_core) == 0
    structure_ready = is_value_defined(context.get("planned_sections"))

    direction_summary = context.get("direction_summary", "")
    approach_summary = context.get("approach_summary", "")
        
    return {
        "is_ready": is_ready,
        "work_type": work_type,
        "work_type_label": schema.get("label", "General document"),
        "shaped_count": shaped_count,
        "total_relevant": total_relevant,
        "missing_core": missing_core,
        "missing_optional": missing_optional,
        "structure_ready": structure_ready,
        "direction_summary": direction_summary,
        "approach_summary": approach_summary
    }
