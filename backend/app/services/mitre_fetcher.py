"""
MITRE CVE API fetcher.
Uses the cveawg/cve-schema GitHub releases for bulk data.
"""
import json
import logging
from datetime import datetime
import httpx
from sqlalchemy.orm import Session
from app.models.cve import CVE

logger = logging.getLogger(__name__)

MITRE_API = "https://cveawg.mitre.org/api/cve"


def fetch_mitre_cve(cve_id: str, db: Session) -> bool:
    """Fetch a single CVE from MITRE API and save if not exists."""
    existing = db.query(CVE).filter(CVE.cve_id == cve_id).first()
    if existing:
        return False

    try:
        resp = httpx.get(f"{MITRE_API}/{cve_id}", timeout=15)
        if resp.status_code == 404:
            return False
        resp.raise_for_status()
    except Exception as e:
        logger.error(f"MITRE API error for {cve_id}: {e}")
        return False

    data = resp.json()
    containers = data.get("containers", {})
    cna = containers.get("cna", {})

    desc_list = cna.get("descriptions", [])
    description = next((d["value"] for d in desc_list if d.get("lang", "").startswith("en")), None)

    metrics = cna.get("metrics", [])
    score, cvss_ver = None, None
    for m in metrics:
        for key in ("cvssV4_0", "cvssV3_1", "cvssV3_0", "cvssV2_0"):
            if key in m:
                score = m[key].get("baseScore")
                cvss_ver = m[key].get("version")
                break
        if score:
            break

    severity = None
    if score:
        if score >= 9.0:
            severity = "CRITICAL"
        elif score >= 7.0:
            severity = "HIGH"
        elif score >= 4.0:
            severity = "MEDIUM"
        else:
            severity = "LOW"

    meta = data.get("cveMetadata", {})
    pub_str = meta.get("datePublished")

    cve = CVE(
        cve_id=cve_id,
        description=description,
        cvss_score=score,
        cvss_version=cvss_ver,
        severity=severity,
        source="mitre",
        source_url=f"https://www.cve.org/CVERecord?id={cve_id}",
        published_at=datetime.fromisoformat(pub_str.replace("Z", "")) if pub_str else None,
    )
    db.add(cve)
    db.commit()
    return True
