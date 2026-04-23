import streamlit as st
from auth import get_supabase


def save_analysis(
    gene: str,
    variant_input: str,
    variant_info: dict,
    protein_info: dict,
    clinvar_info: dict | None,
    domains_at_site: list,
    explanation: str,
    reading_level: str,
) -> None:
    user_id = st.session_state["user"].id
    get_supabase().table("variant_analyses").insert({
        "user_id": user_id,
        "gene": gene,
        "variant_input": variant_input,
        "variant_info": variant_info,
        "protein_info": protein_info,
        "clinvar_info": clinvar_info,
        "domains_at_site": domains_at_site,
        "explanation": explanation,
        "reading_level": reading_level,
    }).execute()


def load_analyses():
    user_id = st.session_state["user"].id
    res = (
        get_supabase()
        .table("variant_analyses")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data
