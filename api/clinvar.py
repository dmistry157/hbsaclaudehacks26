"""ClinVar API wrapper via NCBI E-utilities — fetches pathogenicity and disease associations."""

import requests
import xml.etree.ElementTree as ET
from typing import Optional

EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"


def search_variant(gene: str, variant: str) -> Optional[dict]:
    """
    Search ClinVar for a gene+variant and return clinical significance info.

    Returns dict with:
        variant_id, clinical_significance, review_status,
        conditions, last_evaluated, variation_name
    Returns None if not found.
    """
    # Build search term: gene name + variant notation
    term = f"{gene}[gene] AND {variant}"
    search_url = f"{EUTILS_BASE}/esearch.fcgi"
    search_params = {
        "db": "clinvar",
        "term": term,
        "retmax": 1,
        "retmode": "json",
    }
    resp = requests.get(search_url, params=search_params, timeout=10)
    resp.raise_for_status()
    data = resp.json()

    ids = data.get("esearchresult", {}).get("idlist", [])
    if not ids:
        # Try broader search — just gene name and variant without brackets
        search_params["term"] = f"{gene} {variant}"
        resp = requests.get(search_url, params=search_params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        ids = data.get("esearchresult", {}).get("idlist", [])

    if not ids:
        return None

    variant_id = ids[0]
    return _fetch_variant_summary(variant_id)


def _fetch_variant_summary(variant_id: str) -> Optional[dict]:
    """Fetch detailed ClinVar record by variation ID using efetch."""
    summary_url = f"{EUTILS_BASE}/efetch.fcgi"
    params = {
        "db": "clinvar",
        "id": variant_id,
        "rettype": "vcv",
        "retmode": "xml",
        "from_esearch": "true",
    }
    resp = requests.get(summary_url, params=params, timeout=15)
    resp.raise_for_status()

    try:
        root = ET.fromstring(resp.text)
    except ET.ParseError:
        return None

    # Pull classification
    classif_elem = root.find(".//GermlineClassification/Description")
    clinical_significance = classif_elem.text if classif_elem is not None else "Unknown"

    review_elem = root.find(".//ReviewStatus")
    review_status = review_elem.text if review_elem is not None else "Unknown"

    last_eval_elem = root.find(".//GermlineClassification/LastEvaluated")
    last_evaluated = last_eval_elem.text if last_eval_elem is not None else "Unknown"

    # Pull associated conditions
    conditions = []
    for trait in root.findall(".//TraitSet/Trait"):
        name_elem = trait.find(".//Name/ElementValue[@Type='Preferred']")
        if name_elem is not None:
            conditions.append(name_elem.text)

    # Variation name
    var_name_elem = root.find(".//VariationName")
    variation_name = var_name_elem.text if var_name_elem is not None else ""

    return {
        "variant_id": variant_id,
        "clinical_significance": clinical_significance,
        "review_status": review_status,
        "conditions": conditions,
        "last_evaluated": last_evaluated,
        "variation_name": variation_name,
    }
