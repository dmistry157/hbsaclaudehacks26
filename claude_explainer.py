"""
Claude-powered explanation layer.

Takes all collected data (variant, protein info, ClinVar) and produces
a plain-language explanation tailored to the requested reading level.
"""

from __future__ import annotations
from typing import Generator
import anthropic

READING_LEVELS = {
    "Patient (plain English)": "patient",
    "Clinician (clinical)": "clinician",
    "Child (simple)": "child",
}

SYSTEM_PROMPT = """You are a genetic counseling assistant that helps explain genetic variants to people.

CRITICAL RULES:
1. This is NOT medical advice. Always include a brief reminder to discuss findings with their doctor.
2. Be accurate — do not speculate beyond the data provided.
3. Be compassionate — a patient reading this may be scared.
4. Do not make diagnostic or treatment recommendations.
"""

LEVEL_INSTRUCTIONS = {
    "patient": (
        "Explain this to a patient with no medical background. "
        "Use clear, everyday language. Avoid jargon. If you must use a technical term, define it immediately. "
        "Aim for a 8th-grade reading level. Be warm and reassuring while being honest."
    ),
    "clinician": (
        "Explain this to a clinician (physician or genetic counselor). "
        "Use standard clinical and molecular biology terminology. "
        "Include mechanistic details, structural context, and known disease associations. "
        "Be precise and concise."
    ),
    "child": (
        "Explain this to a child aged 8–12. "
        "Use a simple analogy (like a recipe with a typo, or a broken LEGO brick). "
        "Keep it very short — 3 to 5 sentences. Be gentle and positive."
    ),
}


def build_prompt(
    gene: str,
    variant_info: dict,
    protein_info: dict,
    clinvar_info: dict | None,
    domains_at_site: list[dict],
    level: str,
) -> str:
    prot_pos = variant_info.get("protein_position", "unknown")
    variant_type = variant_info.get("type", "unknown")
    ref_aa = variant_info.get("ref_aa", "")
    alt_aa = variant_info.get("alt_aa", "")

    domain_text = "No annotated domain at this position."
    if domains_at_site:
        domain_text = "; ".join(
            f'{d["type"]} — {d["description"]} (residues {d["start"]}–{d["end"]})'
            for d in domains_at_site
        )

    clinvar_text = "No ClinVar data available for this variant."
    if clinvar_info:
        conds = ", ".join(clinvar_info.get("conditions", [])) or "not specified"
        clinvar_text = (
            f"Clinical significance: {clinvar_info['clinical_significance']}. "
            f"Review status: {clinvar_info['review_status']}. "
            f"Associated conditions: {conds}. "
            f"Last evaluated: {clinvar_info['last_evaluated']}."
        )

    level_instr = LEVEL_INSTRUCTIONS.get(level, LEVEL_INSTRUCTIONS["patient"])

    return f"""You are explaining a genetic variant to someone. Here is the data:

GENE: {gene}
PROTEIN: {protein_info.get('protein_name', gene)} (UniProt: {protein_info.get('uniprot_id', 'unknown')})
PROTEIN LENGTH: {protein_info.get('length', 'unknown')} amino acids

VARIANT: {variant_info.get('notation', variant_info.get('raw', 'unknown'))}
VARIANT TYPE: {variant_type}
AFFECTED RESIDUE POSITION: {prot_pos} (out of {protein_info.get('length', '?')} total)
AMINO ACID CHANGE: {ref_aa} → {alt_aa}

DOMAIN/REGION AT THIS SITE:
{domain_text}

CLINVAR CLINICAL INFORMATION:
{clinvar_text}

TASK: {level_instr}

Structure your response as:
1. **What this variant is** (1–2 sentences)
2. **Where it is in the protein and why that matters** (1–3 sentences)
3. **What we know about its clinical significance** (1–2 sentences)
4. **What this means for the patient** (1–2 sentences, practical framing)
5. **Important note** (one line reminder that this is not medical advice and to discuss with their doctor)

Keep the total response under 300 words for patient/child levels, under 400 for clinician level."""


def generate_explanation(
    gene: str,
    variant_info: dict,
    protein_info: dict,
    clinvar_info: dict | None,
    domains_at_site: list[dict],
    level_label: str = "Patient (plain English)",
) -> Generator[str, None, None]:
    """
    Call Claude to generate a plain-language explanation.

    Uses streaming so Streamlit can render tokens as they arrive.
    Returns the full explanation string.
    """
    level = READING_LEVELS.get(level_label, "patient")
    prompt = build_prompt(gene, variant_info, protein_info, clinvar_info, domains_at_site, level)

    client = anthropic.Anthropic()

    with client.messages.stream(
        model="claude-opus-4-6",
        max_tokens=600,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for text in stream.text_stream:
            yield text
