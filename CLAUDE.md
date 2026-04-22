# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

```bash
export ANTHROPIC_API_KEY=sk-ant-...
streamlit run app.py
```

The app runs on http://localhost:8501 by default.

## Architecture

This is a Streamlit app that explains genetic variants using a multi-API pipeline orchestrated by Claude.

**Data flow:**
1. User inputs gene symbol + variant notation (e.g. `BRCA1`, `c.5266dupC`)
2. `api/variant_parser.py` parses the variant string into a structured dict with `protein_position`, `type`, `ref_aa`, `alt_aa`
3. `api/uniprot.py` fetches protein metadata (UniProt ID, sequence, domain annotations) from UniProt REST API
4. `api/alphafold.py` fetches the AlphaFold predicted structure PDB file URL, then downloads PDB text
5. `api/clinvar.py` searches ClinVar via NCBI E-utilities for pathogenicity and disease associations
6. `claude_explainer.py` builds a structured prompt from all collected data and streams Claude's explanation
7. `viewer.py` injects the PDB text into a py3Dmol HTML/JS component rendered via `st.components.v1.html`

**Key design decisions:**
- The 3D viewer (`viewer.py`) embeds py3Dmol via CDN in raw HTML — no `stmol` dependency required at runtime
- `generate_explanation()` in `claude_explainer.py` is a generator that yields tokens for streaming display in Streamlit
- All API calls are synchronous (no async); Streamlit's `st.status` context manager wraps them for UX feedback
- `variant_parser.py` handles both protein-level (p.Glu6Val) and coding-level (c.5266dupC) HGVS notation; coding positions are approximated to protein position via `coding_pos // 3`

## Demo variants (tested working)

| Variant | Gene | Notes |
|---|---|---|
| `p.Glu6Val` | `HBB` | Sickle cell — clean ClinVar hit, short protein |
| `c.5266dupC` | `BRCA1` | Frameshift, Pathogenic, well-known |
| `p.Phe508del` | `CFTR` | Most common CF variant |

## API notes

All three external APIs are free with no key required:
- UniProt: `https://rest.uniprot.org/uniprotkb/search` — uses `reviewed:true` filter to get Swiss-Prot entries only
- AlphaFold: `https://alphafold.ebi.ac.uk/api/prediction/{uniprot_id}` — returns 404 for proteins without a prediction
- ClinVar: NCBI E-utilities `esearch` + `efetch` — search falls back to a broader term if the exact variant isn't found
