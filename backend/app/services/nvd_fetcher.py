"""
NVD NIST API v2 fetcher.
Docs: https://nvd.nist.gov/developers/vulnerabilities
"""
import json
import logging
from datetime import datetime, timedelta
import httpx
from sqlalchemy.orm import Session
from app.config import settings
from app.models.cve import CVE
from app.models.vendor import Vendor

logger = logging.getLogger(__name__)

NVD_BASE = "https://services.nvd.nist.gov/rest/json/cves/2.0"


def _severity_from_cvss(score: float | None) -> str | None:
    if score is None:
        return None
    if score >= 9.0:
        return "CRITICAL"
    if score >= 7.0:
        return "HIGH"
    if score >= 4.0:
        return "MEDIUM"
    return "LOW"


def _get_cvss(cve_item: dict) -> tuple[float | None, str | None]:
    metrics = cve_item.get("metrics", {})
    for key in ("cvssMetricV40", "cvssMetricV31", "cvssMetricV30", "cvssMetricV2"):
        if key in metrics and metrics[key]:
            m = metrics[key][0]
            data = m.get("cvssData", {})
            score = data.get("baseScore")
            version = data.get("version")
            return score, version
    return None, None


def fetch_nvd(db: Session, days_back: int = 7) -> int:
    """Fetch CVEs published in the last `days_back` days from NVD API."""
    pub_start = (datetime.utcnow() - timedelta(days=days_back)).strftime("%Y-%m-%dT%H:%M:%S.000")
    pub_end = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000")

    headers = {}
    if settings.NVD_API_KEY:
        headers["apiKey"] = settings.NVD_API_KEY

    # Fetch all vendors for keyword matching
    vendors = db.query(Vendor).all()
    vendor_map = {v.slug.lower(): v for v in vendors}

    saved = 0
    start_index = 0
    results_per_page = 2000

    while True:
        params = {
            "pubStartDate": pub_start,
            "pubEndDate": pub_end,
            "startIndex": start_index,
            "resultsPerPage": results_per_page,
        }
        try:
            resp = httpx.get(NVD_BASE, params=params, headers=headers, timeout=30)
            resp.raise_for_status()
        except Exception as e:
            logger.error(f"NVD API error: {e}")
            break

        data = resp.json()
        vulnerabilities = data.get("vulnerabilities", [])

        for item in vulnerabilities:
            cve_data = item.get("cve", {})
            cve_id = cve_data.get("id")
            if not cve_id:
                continue

            existing = db.query(CVE).filter(CVE.cve_id == cve_id).first()
            if existing:
                continue

            desc_list = cve_data.get("descriptions", [])
            description = next((d["value"] for d in desc_list if d["lang"] == "en"), None)

            score, cvss_ver = _get_cvss(cve_data)

            # Collect affected CPEs
            cpes = []
            for config in cve_data.get("configurations", []):
                for node in config.get("nodes", []):
                    for match in node.get("cpeMatch", []):
                        cpes.append(match.get("criteria", ""))

            # Try to match vendor
            vendor_id = None
            cpe_text = " ".join(cpes).lower()
            desc_text = (description or "").lower()
            for slug, vendor in vendor_map.items():
                if slug in cpe_text or slug in desc_text:
                    vendor_id = vendor.id
                    break

            pub_str = cve_data.get("published")
            mod_str = cve_data.get("lastModified")

            cve = CVE(
                cve_id=cve_id,
                description=description,
                cvss_score=score,
                cvss_version=cvss_ver,
                severity=_severity_from_cvss(score),
                vendor_id=vendor_id,
                affected_products=json.dumps(cpes[:50]) if cpes else None,
                source="nvd",
                source_url=f"https://nvd.nist.gov/vuln/detail/{cve_id}",
                published_at=datetime.fromisoformat(pub_str.replace("Z", "")) if pub_str else None,
                modified_at=datetime.fromisoformat(mod_str.replace("Z", "")) if mod_str else None,
            )
            db.add(cve)
            saved += 1

        db.commit()

        total = data.get("totalResults", 0)
        start_index += results_per_page
        if start_index >= total:
            break

    logger.info(f"NVD fetch complete: {saved} new CVEs saved")
    return saved
