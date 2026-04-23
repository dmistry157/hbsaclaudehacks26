import requests

GNOMAD_API = "https://gnomad.broadinstitute.org/api"

QUERY = """
query GeneConstraint($geneSymbol: String!) {
  gene(gene_symbol: $geneSymbol, reference_genome: GRCh38) {
    gnomad_constraint {
      pli
      loeuf
      mis_z
    }
  }
}
"""


def get_gene_constraint(gene: str) -> str:
    try:
        resp = requests.post(
            GNOMAD_API,
            json={"query": QUERY, "variables": {"geneSymbol": gene}},
            timeout=10,
        )
        resp.raise_for_status()
        constraint = (
            resp.json()
            .get("data", {})
            .get("gene", {})
            .get("gnomad_constraint", {})
        )
        if not constraint:
            return f"No constraint data found for {gene} in gnomAD."

        pli = constraint.get("pli")
        loeuf = constraint.get("loeuf")
        mis_z = constraint.get("mis_z")

        lines = [f"gnomAD constraint scores for {gene}:"]
        if pli is not None:
            note = " — gene is highly intolerant to loss-of-function mutations" if pli > 0.9 else ""
            lines.append(f"  pLI: {pli:.3f}{note}")
        if loeuf is not None:
            note = " — gene is strongly constrained" if loeuf < 0.35 else ""
            lines.append(f"  LOEUF: {loeuf:.3f}{note}")
        if mis_z is not None:
            note = " — gene is intolerant to missense mutations" if mis_z > 3.09 else ""
            lines.append(f"  Missense Z-score: {mis_z:.3f}{note}")

        return "\n".join(lines)
    except Exception as e:
        return f"Could not retrieve gnomAD data for {gene}: {e}"
