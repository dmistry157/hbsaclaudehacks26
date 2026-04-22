"""
Variant notation parser.

Handles common HGVS-style protein and coding variants:
  - p.Glu6Val  / p.E6V            (missense)
  - p.Lys1282Ter / p.K1282*       (nonsense)
  - c.5266dupC                    (coding dup → frameshift at protein position)
  - F508del  / p.Phe508del        (deletion)
"""

import re
from typing import Optional

# Three-letter to one-letter amino acid map
AA3_TO_1 = {
    "Ala": "A", "Arg": "R", "Asn": "N", "Asp": "D", "Cys": "C",
    "Glu": "E", "Gln": "Q", "Gly": "G", "His": "H", "Ile": "I",
    "Leu": "L", "Lys": "K", "Met": "M", "Phe": "F", "Pro": "P",
    "Ser": "S", "Thr": "T", "Trp": "W", "Tyr": "Y", "Val": "V",
    "Ter": "*", "Sec": "U",
}
AA1_SET = set(AA3_TO_1.values()) | {"*"}


def parse_variant(variant_str: str) -> dict:
    """
    Parse a variant string and return a structured dict.

    Returns:
        {
            "raw": original string,
            "type": "missense" | "nonsense" | "frameshift" | "deletion" | "insertion" | "unknown",
            "protein_position": int or None,   # 1-indexed residue
            "ref_aa": str or None,
            "alt_aa": str or None,
            "notation": str,                   # cleaned canonical form
        }
    """
    v = variant_str.strip()
    result = {
        "raw": v,
        "type": "unknown",
        "protein_position": None,
        "ref_aa": None,
        "alt_aa": None,
        "notation": v,
    }

    # Strip p. or c. prefix for easier matching
    clean = re.sub(r"^[pc]\.", "", v, flags=re.IGNORECASE)

    # ---- Protein-level missense/nonsense: Glu6Val / E6V / E6* ----
    m = re.match(
        r"([A-Za-z]{1,3})(\d+)([A-Za-z]{1,3}|\*)",
        clean,
    )
    if m:
        ref_raw, pos_str, alt_raw = m.group(1), m.group(2), m.group(3)
        ref_aa = _normalize_aa(ref_raw)
        alt_aa = _normalize_aa(alt_raw) if alt_raw != "*" else "*"
        if ref_aa and (alt_aa or alt_raw == "*"):
            result["protein_position"] = int(pos_str)
            result["ref_aa"] = ref_aa
            result["alt_aa"] = alt_aa if alt_aa else "*"
            result["type"] = "nonsense" if result["alt_aa"] == "*" else "missense"
            result["notation"] = f"p.{ref_raw}{pos_str}{alt_raw}"
            return result

    # ---- Deletion: Phe508del / F508del ----
    m = re.match(r"([A-Za-z]{1,3})(\d+)del", clean, re.IGNORECASE)
    if m:
        ref_raw, pos_str = m.group(1), m.group(2)
        ref_aa = _normalize_aa(ref_raw)
        if ref_aa:
            result["protein_position"] = int(pos_str)
            result["ref_aa"] = ref_aa
            result["alt_aa"] = "del"
            result["type"] = "deletion"
            result["notation"] = f"p.{ref_raw}{pos_str}del"
            return result

    # ---- Coding duplication → frameshift: c.5266dupC ----
    m = re.match(r"(\d+)dup([A-Za-z]+)", clean, re.IGNORECASE)
    if m:
        coding_pos = int(m.group(1))
        # Approximate protein position: coding pos / 3, rounded
        protein_pos = max(1, coding_pos // 3)
        result["protein_position"] = protein_pos
        result["type"] = "frameshift"
        result["notation"] = f"c.{coding_pos}dup{m.group(2)}"
        return result

    # ---- Coding insertion/deletion ----
    m = re.match(r"(\d+)(ins|del)([A-Za-z]*)", clean, re.IGNORECASE)
    if m:
        coding_pos = int(m.group(1))
        protein_pos = max(1, coding_pos // 3)
        result["protein_position"] = protein_pos
        result["type"] = "frameshift"
        result["notation"] = v
        return result

    return result


def _normalize_aa(aa_str: str) -> Optional[str]:
    """Convert 3-letter or 1-letter amino acid code to 1-letter. Returns None if unrecognized."""
    if len(aa_str) == 1 and aa_str.upper() in AA1_SET:
        return aa_str.upper()
    capitalized = aa_str.capitalize()
    return AA3_TO_1.get(capitalized)
