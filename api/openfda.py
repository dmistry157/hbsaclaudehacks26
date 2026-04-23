import requests

OPENFDA_BASE = "https://api.fda.gov/drug/label.json"


def get_approved_treatments(condition: str) -> str:
    try:
        resp = requests.get(
            OPENFDA_BASE,
            params={
                "search": f'indications_and_usage:"{condition}"',
                "limit": 5,
            },
            timeout=10,
        )
        if resp.status_code == 404:
            return f"No FDA-labeled drugs found for '{condition}'."
        resp.raise_for_status()
        results = resp.json().get("results", [])

        if not results:
            return f"No FDA drug label data found for '{condition}'."

        lines = [f"FDA-approved drugs with indications related to '{condition}':"]
        for r in results:
            openfda = r.get("openfda", {})
            brand = openfda.get("brand_name", ["Unknown"])[0]
            generic = openfda.get("generic_name", ["Unknown"])[0]
            indication = r.get("indications_and_usage", ["Not specified"])[0][:300]
            lines.append(f"\n• {brand} ({generic})\n  {indication}...")

        return "\n".join(lines)
    except Exception as e:
        return f"Could not retrieve FDA drug data for '{condition}': {e}"
