"""
FastAPI backend for the AlphaFold Variant Explainer.

Endpoints:
  POST /api/auth/login    – Supabase email/password login, returns session
  POST /api/auth/signup   – Supabase account creation
  POST /api/auth/logout   – invalidate session
  POST /api/analyze       – runs UniProt + AlphaFold + ClinVar pipeline, returns JSON
  POST /api/explain       – streams Claude explanation as SSE
  POST /api/chat          – agentic chat about a genetic analysis (SSE)

Run:
  uvicorn backend.main:app --reload --port 8000
"""

from __future__ import annotations
import sys
import os
import json
import asyncio
import threading
import queue as queue_mod
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client

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


# ── Supabase client ───────────────────────────────────────────────────────────

def get_supabase():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_ANON_KEY")
    if not url or not key:
        raise HTTPException(status_code=503, detail="Auth service not configured (missing SUPABASE_URL / SUPABASE_ANON_KEY)")
    return create_client(url, key)


# ── Request / Response models ─────────────────────────────────────────────────

class AuthRequest(BaseModel):
    email: str
    password: str

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


class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    analysis: dict          # {gene, variant_input, variant_info, protein_info, clinvar_info, domains_at_site, explanation}
    messages: list[ChatMessage]


# ── Auth endpoints ────────────────────────────────────────────────────────────

@app.post("/api/auth/login")
def auth_login(req: AuthRequest):
    try:
        res = get_supabase().auth.sign_in_with_password({"email": req.email, "password": req.password})
        return {
            "access_token": res.session.access_token,
            "refresh_token": res.session.refresh_token,
            "user": {"id": res.user.id, "email": res.user.email},
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@app.post("/api/auth/signup")
def auth_signup(req: AuthRequest):
    try:
        res = get_supabase().auth.sign_up({"email": req.email, "password": req.password})
        return {"message": "Account created — check your email to confirm, then log in.", "user_id": res.user.id if res.user else None}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/auth/logout")
def auth_logout():
    try:
        get_supabase().auth.sign_out()
    except Exception:
        pass
    return {"message": "Logged out"}


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


@app.post("/api/chat")
def chat_endpoint(req: ChatRequest):
    """Agentic chat about a genetic analysis — streams tool status then final response as SSE."""
    from agent import run_agent, build_context, TOOL_LABELS

    status_queue: queue_mod.Queue = queue_mod.Queue()
    result_holder: dict = {}

    def worker():
        context = build_context(req.analysis)
        messages = [
            {"role": "user", "content": context},
            {
                "role": "assistant",
                "content": (
                    "Thank you — I have your complete genetic analysis in front of me. "
                    "What would you like to know?"
                ),
            },
            *[{"role": m.role, "content": m.content} for m in req.messages],
        ]

        def on_tool_call(name):
            status_queue.put(("tool", TOOL_LABELS.get(name, f"Calling {name}...")))

        try:
            text = run_agent(messages, on_tool_call=on_tool_call)
            result_holder["text"] = text
        except Exception as e:
            result_holder["error"] = str(e)
        finally:
            status_queue.put(None)  # sentinel: worker done

    thread = threading.Thread(target=worker, daemon=True)
    thread.start()

    def sse_gen():
        while True:
            try:
                item = status_queue.get(timeout=90)
            except queue_mod.Empty:
                break
            if item is None:
                break
            kind, val = item
            yield f"data: {json.dumps({kind: val})}\n\n"

        thread.join(timeout=5)
        if "error" in result_holder:
            yield f"data: {json.dumps({'error': result_holder['error']})}\n\n"
        else:
            yield f"data: {json.dumps({'text': result_holder.get('text', '')})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        sse_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/health")
def health():
    return {"status": "ok"}
