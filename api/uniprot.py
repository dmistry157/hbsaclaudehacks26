"""UniProt API wrapper — fetches protein metadata, sequence, and domain annotations."""

import requests
from typing import Optional

UNIPROT_BASE = "https://rest.uniprot.org/uniprotkb"


def get_protein_info(gene: str, organism_id: int = 9606) -> Optional[dict]:
    """
    Fetch UniProt entry for a human gene.

    Returns a dict with:
        uniprot_id, protein_name, sequence, domains, length
    Returns None if not found.
    """
    params = {
        "query": f"gene_exact:{gene} AND organism_id:{organism_id} AND reviewed:true",
        "format": "json",
        "fields": "accession,protein_name,sequence,ft_domain,ft_region,ft_site,length",
        "size": 1,
    }
    resp = requests.get(f"{UNIPROT_BASE}/search", params=params, timeout=10)
    resp.raise_for_status()

    results = resp.json().get("results", [])
    if not results:
        return None

    entry = results[0]
    accession = entry["primaryAccession"]

    # Parse domains / regions / sites
    features = entry.get("features", [])
    domains = []
    for feat in features:
        feat_type = feat.get("type", "")
        if feat_type in ("Domain", "Region", "Active site", "Binding site"):
            loc = feat.get("location", {})
            start = loc.get("start", {}).get("value")
            end = loc.get("end", {}).get("value")
            desc = feat.get("description", feat_type)
            if start is not None and end is not None:
                domains.append({
                    "type": feat_type,
                    "description": desc,
                    "start": int(start),
                    "end": int(end),
                })

    sequence = entry.get("sequence", {}).get("value", "")
    length = entry.get("sequence", {}).get("length", len(sequence))

    protein_name = (
        entry.get("proteinDescription", {})
        .get("recommendedName", {})
        .get("fullName", {})
        .get("value", gene)
    )

    return {
        "uniprot_id": accession,
        "protein_name": protein_name,
        "sequence": sequence,
        "length": length,
        "domains": domains,
    }


def find_domain_for_residue(residue_pos: int, domains: list[dict]) -> list[dict]:
    """Return all domain/region annotations that overlap residue_pos (1-indexed)."""
    return [
        d for d in domains
        if d["start"] <= residue_pos <= d["end"]
    ]
