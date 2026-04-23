import requests

TRIALS_BASE = "https://clinicaltrials.gov/api/v2/studies"


def find_clinical_trials(condition: str, max_results: int = 5) -> str:
    try:
        resp = requests.get(
            TRIALS_BASE,
            params={
                "query.cond": condition,
                "filter.overallStatus": "RECRUITING",
                "pageSize": max_results,
                "fields": "NCTId,BriefTitle,Phase,LeadSponsorName",
            },
            timeout=10,
        )
        resp.raise_for_status()
        studies = resp.json().get("studies", [])

        if not studies:
            return f"No currently recruiting clinical trials found for '{condition}'."

        lines = [f"Recruiting clinical trials for '{condition}':"]
        for s in studies:
            proto = s.get("protocolSection", {})
            id_mod = proto.get("identificationModule", {})
            design_mod = proto.get("designModule", {})
            sponsor_mod = proto.get("sponsorCollaboratorsModule", {})

            nct_id = id_mod.get("nctId", "N/A")
            title = id_mod.get("briefTitle", "Untitled")
            phases = design_mod.get("phases", [])
            phase = phases[0] if phases else "N/A"
            sponsor = sponsor_mod.get("leadSponsor", {}).get("name", "Unknown")

            lines.append(
                f"\n• {title}\n"
                f"  NCT: {nct_id} | Phase: {phase} | Sponsor: {sponsor}\n"
                f"  https://clinicaltrials.gov/study/{nct_id}"
            )

        return "\n".join(lines)
    except Exception as e:
        return f"Could not search clinical trials for '{condition}': {e}"
