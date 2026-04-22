"""
AlphaFold Variant Explainer
A Streamlit app that takes a gene + variant, fetches protein structure,
highlights the mutation site in 3D, and explains it in plain language.
"""

import streamlit as st
from api.uniprot import get_protein_info, find_domain_for_residue
from api.alphafold import get_structure, fetch_pdb_text
from api.clinvar import search_variant
from api.variant_parser import parse_variant
from claude_explainer import generate_explanation, READING_LEVELS
from viewer import render_structure, render_placeholder


def _significance_color(sig: str) -> str:
    sig_lower = sig.lower()
    if "pathogenic" in sig_lower and "benign" not in sig_lower:
        return "#ff4b4b"
    if "benign" in sig_lower:
        return "#21c354"
    if "uncertain" in sig_lower or "vus" in sig_lower:
        return "#f0a500"
    return "#888888"


# ── Page config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="AlphaFold Variant Explainer",
    page_icon="🧬",
    layout="wide",
)

# ── Demo presets ─────────────────────────────────────────────────────────────
PRESETS = {
    "BRCA1 — c.5266dupC (hereditary breast cancer)": ("BRCA1", "c.5266dupC"),
    "HBB — p.Glu6Val (sickle cell disease)": ("HBB", "p.Glu6Val"),
    "CFTR — p.Phe508del (cystic fibrosis)": ("CFTR", "p.Phe508del"),
    "Custom": ("", ""),
}

# ── Sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.title("🧬 Variant Explainer")
    st.caption("Enter a gene and variant to see its 3D structure and a plain-language explanation.")

    preset_label = st.selectbox("Demo presets", list(PRESETS.keys()))
    preset_gene, preset_variant = PRESETS[preset_label]

    st.divider()

    gene_input = st.text_input(
        "Gene symbol",
        value=preset_gene,
        placeholder="e.g. BRCA1",
    ).strip().upper()

    variant_input = st.text_input(
        "Variant notation",
        value=preset_variant,
        placeholder="e.g. c.5266dupC or p.Glu6Val",
    ).strip()

    level_label = st.radio(
        "Explanation reading level",
        list(READING_LEVELS.keys()),
        index=0,
    )

    run_btn = st.button("Explain this variant", type="primary", use_container_width=True)

    st.divider()
    st.caption(
        "**Data sources:** UniProt · AlphaFold EBI · ClinVar (NCBI)\n\n"
        "**Disclaimer:** This tool is for educational purposes only. "
        "It is not a diagnostic tool and does not constitute medical advice. "
        "Always consult a healthcare professional."
    )

# ── Main layout ───────────────────────────────────────────────────────────────
col_3d, col_info = st.columns([1.1, 1], gap="large")

with col_3d:
    st.subheader("3D Protein Structure")
    viewer_placeholder = st.empty()
    with viewer_placeholder:
        render_placeholder(height=480)

with col_info:
    st.subheader("Variant Explanation")
    info_placeholder = st.empty()
    info_placeholder.info("Fill in a gene and variant, then click **Explain this variant**.")

# ── Run pipeline ──────────────────────────────────────────────────────────────
if run_btn:
    if not gene_input or not variant_input:
        st.error("Please enter both a gene symbol and a variant notation.")
        st.stop()

    # Status container
    status = st.status(f"Analysing **{gene_input} {variant_input}**…", expanded=True)

    with status:
        # 1. Parse variant ──────────────────────────────────────────────────
        st.write("Parsing variant notation…")
        variant_info = parse_variant(variant_input)

        # 2. UniProt ────────────────────────────────────────────────────────
        st.write(f"Fetching protein info from UniProt for **{gene_input}**…")
        protein_info = get_protein_info(gene_input)
        if protein_info is None:
            status.update(label="UniProt lookup failed", state="error")
            st.error(f"Could not find a reviewed UniProt entry for gene **{gene_input}**. Check the gene symbol.")
            st.stop()

        st.write(f"Found: **{protein_info['protein_name']}** ({protein_info['uniprot_id']}), {protein_info['length']} aa")

        # 3. AlphaFold ──────────────────────────────────────────────────────
        st.write(f"Fetching AlphaFold structure for {protein_info['uniprot_id']}…")
        af_meta = get_structure(protein_info["uniprot_id"])
        pdb_text = None
        if af_meta is None:
            st.warning("No AlphaFold structure available for this protein. 3D view will be unavailable.")
        else:
            st.write(f"Downloading PDB file…")
            pdb_text = fetch_pdb_text(af_meta["pdb_url"])
            st.write(f"Structure loaded ({len(pdb_text):,} bytes).")

        # 4. ClinVar ────────────────────────────────────────────────────────
        st.write("Querying ClinVar…")
        clinvar_info = search_variant(gene_input, variant_input)
        if clinvar_info:
            sig = clinvar_info["clinical_significance"]
            st.write(f"ClinVar: **{sig}** — {', '.join(clinvar_info['conditions'][:2]) or 'conditions listed'}")
        else:
            st.write("No ClinVar entry found for this exact variant.")

        status.update(label="Data collected — generating explanation…", state="running")

    # 5. Domain context ────────────────────────────────────────────────────────
    domains_at_site = []
    if variant_info["protein_position"] and protein_info.get("domains"):
        domains_at_site = find_domain_for_residue(
            variant_info["protein_position"],
            protein_info["domains"],
        )

    # 6. Render 3D viewer ─────────────────────────────────────────────────────
    with viewer_placeholder:
        if pdb_text:
            render_structure(
                pdb_text=pdb_text,
                highlight_residue=variant_info.get("protein_position"),
                height=480,
            )
        else:
            render_placeholder(height=480)

    # 7. Render protein metadata ───────────────────────────────────────────────
    with col_info:
        # Compact data card
        with st.expander("Protein & variant details", expanded=False):
            c1, c2 = st.columns(2)
            c1.metric("Gene", gene_input)
            c2.metric("UniProt ID", protein_info["uniprot_id"])
            c1.metric("Protein length", f"{protein_info['length']} aa")
            c2.metric("Affected residue", str(variant_info.get("protein_position", "unknown")))

            if domains_at_site:
                st.write("**Domains at variant site:**")
                for d in domains_at_site:
                    st.write(f"- {d['type']}: {d['description']} ({d['start']}–{d['end']})")
            else:
                st.write("No annotated domain at the variant site.")

            if clinvar_info:
                sig = clinvar_info["clinical_significance"]
                color = _significance_color(sig)
                st.markdown(
                    f"**ClinVar:** <span style='color:{color};font-weight:bold'>{sig}</span>",
                    unsafe_allow_html=True,
                )
                if clinvar_info["conditions"]:
                    st.write("Associated conditions:")
                    for c in clinvar_info["conditions"]:
                        st.write(f"  • {c}")

        # 8. Stream Claude explanation ─────────────────────────────────────
        st.write(f"**Explanation** *(level: {level_label})*")
        explanation_box = st.empty()
        full_explanation = ""
        for token in generate_explanation(
            gene=gene_input,
            variant_info=variant_info,
            protein_info=protein_info,
            clinvar_info=clinvar_info,
            domains_at_site=domains_at_site,
            level_label=level_label,
        ):
            full_explanation += token
            explanation_box.markdown(full_explanation + "▌")
        explanation_box.markdown(full_explanation)

    status.update(label="Done!", state="complete", expanded=False)
