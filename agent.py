"""
Pure agent logic — no Streamlit dependency.
Imported by both chat.py (web) and sms_server.py (SMS).
"""

import json
from anthropic import Anthropic
from api.clinvar import search_variant
from api.gnomad import get_gene_constraint
from api.clinical_trials import find_clinical_trials
from api.openfda import get_approved_treatments

client = Anthropic()

SYSTEM_PROMPT = """You are a compassionate genetic health assistant. The user has received \
genetic test results and you have their complete analysis as context — including the specific \
variant, the protein it affects, the structural domain at the mutation site, and clinical \
significance data from ClinVar.

You have tools to look up live data: clinical trials, FDA-approved treatments, ClinVar entries, \
and gnomAD gene constraint scores. Use them when the user asks questions that would benefit \
from current information.

You can help them understand:
- What their specific variant means for their health
- Lifestyle considerations relevant to their condition
- Treatment options they should ask their doctor about
- Questions to bring to their physician or genetic counselor
- How this may affect family members and whether relatives should get tested
- What clinical significance classifications actually mean in plain language

Always recommend consulting a physician or certified genetic counselor before any medical \
decisions. Never diagnose or prescribe. Be warm, clear, and honest. If you don't know \
something, say so."""

TOOLS = [
    {
        "name": "search_clinvar",
        "description": "Look up clinical significance and disease associations for a specific gene variant in ClinVar.",
        "input_schema": {
            "type": "object",
            "properties": {
                "gene": {"type": "string", "description": "Gene symbol, e.g. BRCA1"},
                "variant": {"type": "string", "description": "Variant notation, e.g. c.5266dupC"},
            },
            "required": ["gene", "variant"],
        },
    },
    {
        "name": "get_gene_constraint",
        "description": "Get gnomAD constraint scores for a gene, showing how intolerant it is to mutations generally.",
        "input_schema": {
            "type": "object",
            "properties": {
                "gene": {"type": "string", "description": "Gene symbol, e.g. BRCA1"},
            },
            "required": ["gene"],
        },
    },
    {
        "name": "find_clinical_trials",
        "description": "Search ClinicalTrials.gov for currently recruiting trials for a medical condition.",
        "input_schema": {
            "type": "object",
            "properties": {
                "condition": {"type": "string", "description": "Medical condition or disease name"},
            },
            "required": ["condition"],
        },
    },
    {
        "name": "get_approved_treatments",
        "description": "Look up FDA-approved drugs or therapies with indications for a medical condition.",
        "input_schema": {
            "type": "object",
            "properties": {
                "condition": {"type": "string", "description": "Medical condition or disease name"},
            },
            "required": ["condition"],
        },
    },
]

TOOL_LABELS = {
    "search_clinvar": "Searching ClinVar...",
    "get_gene_constraint": "Checking gnomAD constraint scores...",
    "find_clinical_trials": "Searching ClinicalTrials.gov...",
    "get_approved_treatments": "Looking up FDA-approved treatments...",
}

MAX_TOOL_ROUNDS = 5


def build_context(analysis: dict) -> str:
    protein = analysis.get("protein_info") or {}
    variant = analysis.get("variant_info") or {}
    clinvar = analysis.get("clinvar_info") or {}
    domains = analysis.get("domains_at_site") or []

    return f"""The following is the patient's complete genetic analysis. Use it as context for the conversation.

Gene: {analysis['gene']}
Variant: {analysis['variant_input']}
Variant type: {variant.get('type', 'unknown')}
Affected protein position: {variant.get('protein_position', 'unknown')}
Amino acid change: {variant.get('ref_aa', '?')} → {variant.get('alt_aa', '?')}

Protein: {protein.get('protein_name', 'unknown')} (UniProt: {protein.get('uniprot_id', 'unknown')})
Protein length: {protein.get('length', 'unknown')} amino acids

Domains at variant site:
{json.dumps(domains, indent=2) if domains else 'None annotated'}

ClinVar clinical significance: {clinvar.get('clinical_significance', 'Not found')}
Associated conditions: {', '.join(clinvar.get('conditions', [])) or 'None listed'}
Review status: {clinvar.get('review_status', 'unknown')}

Plain-language explanation previously shown to this patient:
{analysis.get('explanation', 'Not available')}"""


def dispatch_tool(name: str, inputs: dict) -> str:
    if name == "search_clinvar":
        result = search_variant(inputs["gene"], inputs["variant"])
        return str(result) if result else "No ClinVar data found for this variant."
    if name == "get_gene_constraint":
        return get_gene_constraint(inputs["gene"])
    if name == "find_clinical_trials":
        return find_clinical_trials(inputs["condition"])
    if name == "get_approved_treatments":
        return get_approved_treatments(inputs["condition"])
    return "Unknown tool."


def run_agent(messages: list, on_tool_call=None) -> str:
    """
    Agentic loop: call Claude with tools until it produces a final text response.

    on_tool_call: optional callable(tool_name) called before each tool executes.
                  Used by the web UI to show status; omitted for SMS.
    """
    full_messages = list(messages)

    for _ in range(MAX_TOOL_ROUNDS):
        response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=full_messages,
        )

        if response.stop_reason == "end_turn":
            for block in response.content:
                if hasattr(block, "text"):
                    return block.text
            return ""

        full_messages.append({"role": "assistant", "content": response.content})

        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                if on_tool_call:
                    on_tool_call(block.name)
                result = dispatch_tool(block.name, block.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result,
                })

        full_messages.append({"role": "user", "content": tool_results})

    return "I wasn't able to complete a response after several attempts. Please try rephrasing your question."
