"""AlphaFold DB API wrapper — fetches predicted protein structure as PDB text."""

import requests
from typing import Optional

ALPHAFOLD_BASE = "https://alphafold.ebi.ac.uk/api"


def get_structure(uniprot_id: str) -> Optional[dict]:
    """
    Fetch AlphaFold prediction metadata for a UniProt accession.

    Returns dict with:
        pdb_url, cif_url, confidence_url, model_id
    Returns None if no prediction exists.
    """
    url = f"{ALPHAFOLD_BASE}/prediction/{uniprot_id}"
    resp = requests.get(url, timeout=10)
    if resp.status_code == 404:
        return None
    resp.raise_for_status()

    data = resp.json()
    if not data:
        return None

    entry = data[0]
    return {
        "model_id": entry.get("entryId"),
        "pdb_url": entry.get("pdbUrl"),
        "cif_url": entry.get("cifUrl"),
        "confidence_url": entry.get("paeDocUrl"),
    }


def fetch_pdb_text(pdb_url: str) -> str:
    """Download and return the raw PDB file content as a string."""
    resp = requests.get(pdb_url, timeout=30)
    resp.raise_for_status()
    return resp.text
