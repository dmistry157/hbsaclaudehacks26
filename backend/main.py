"""
FastAPI backend for the AlphaFold Variant Explainer.

Endpoints:
  POST /api/analyze   – runs UniProt + AlphaFold + ClinVar pipeline, returns JSON
  POST /api/explain   – streams Claude explanation as SSE

Run:
  uvicorn backend.main:app --reload --port 8000
"""

from __future__ import annotations
import sys
import os
import json
import asyncio
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# Allow importing from repo root (api/, claude_explainer.py)
sys.path.insert(0, str(Path(__file__).parent.parent))
load_dotenv()

from api.variant_parser import parse_variant
from api.uniprot import get_protein_info, find_domain_for_residue
from api.alphafold import get_structure
from api.clinvar import search_variant
from claude_explainer import generate_explanation

app = FastAPI(title="Variant Explainer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ─────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    gene: str
    variant: str


class ExplainRequest(BaseModel):
    gene: str
    variant_info: dict
    protein_info: dict
    clinvar_info: Optional[dict]
    domains_at_site: list[dict]
    level_label: str = "Patient (plain English)"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.post("/api/analyze")
def analyze(req: AnalyzeRequest):
    gene = req.gene.strip().upper()
    variant = req.variant.strip()

    if not gene or not variant:
        raise HTTPException(status_code=422, detail="gene and variant are required")

    # 1. Parse variant
    variant_info = parse_variant(variant)

    # 2. UniProt
    protein_info = get_protein_info(gene)
    if protein_info is None:
        raise HTTPException(
            status_code=404,
            detail=f"No reviewed UniProt entry found for gene '{gene}'. Check the symbol."
        )
    # Drop sequence — large and unused by frontend
    protein_info.pop("sequence", None)

    # 3. AlphaFold
    af_meta = get_structure(protein_info["uniprot_id"])
    pdb_url = af_meta["pdb_url"] if af_meta else None
    af_model_id = af_meta["model_id"] if af_meta else None

    # 4. ClinVar
    clinvar_info = search_variant(gene, variant)

    # 5. Domain context
    domains_at_site = []
    if variant_info.get("protein_position") and protein_info.get("domains"):
        domains_at_site = find_domain_for_residue(
            variant_info["protein_position"],
            protein_info["domains"],
        )

    return {
        "variant_info": variant_info,
        "protein_info": protein_info,
        "clinvar_info": clinvar_info,
        "domains_at_site": domains_at_site,
        "pdb_url": pdb_url,
        "af_model_id": af_model_id,
    }


@app.post("/api/explain")
def explain(req: ExplainRequest):
    """Stream Claude explanation tokens as Server-Sent Events."""

    def sse_generator():
        try:
            for token in generate_explanation(
                gene=req.gene,
                variant_info=req.variant_info,
                protein_info=req.protein_info,
                clinvar_info=req.clinvar_info,
                domains_at_site=req.domains_at_site,
                level_label=req.level_label,
            ):
                payload = json.dumps({"text": token})
                yield f"data: {payload}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/health")
def health():
    return {"status": "ok"}
