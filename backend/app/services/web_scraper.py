"""
Web scraper for vendor security advisory pages.
Extracts CVE IDs from HTML content.
"""
import re
import logging
from datetime import datetime
import httpx
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session
from app.models.cve import CVE, ScrapeConfig
from app.models.vendor import Vendor

logger = logging.getLogger(__name__)

CVE_PATTERN = re.compile(r"CVE-\d{4}-\d{4,7}", re.IGNORECASE)


def scrape_vendor_pages(db: Session) -> int:
    """Scrape all enabled web scrape configs and extract CVE IDs."""
    configs = (
        db.query(ScrapeConfig)
        .filter(ScrapeConfig.source_type == "web", ScrapeConfig.enabled == True)
        .all()
    )
    saved = 0
    for config in configs:
        try:
            saved += _scrape_page(config, db)
            config.last_run = datetime.utcnow()
            config.last_status = "ok"
        except Exception as e:
            logger.error(f"Scrape error for config {config.id}: {e}")
            config.last_status = f"error: {e}"
    db.commit()
    return saved


def _scrape_page(config: ScrapeConfig, db: Session) -> int:
    resp = httpx.get(config.url, timeout=20, follow_redirects=True, headers={
        "User-Agent": "Mozilla/5.0 CVE-Checker/1.0"
    })
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "lxml")
    text = soup.get_text(separator=" ")
    cve_ids = set(CVE_PATTERN.findall(text))

    vendor = db.query(Vendor).filter(Vendor.id == config.vendor_id).first()
    saved = 0

    for cve_id in cve_ids:
        cve_id = cve_id.upper()
        existing = db.query(CVE).filter(CVE.cve_id == cve_id).first()
        if existing:
            if existing.vendor_id is None and vendor:
                existing.vendor_id = vendor.id
            continue

        cve = CVE(
            cve_id=cve_id,
            vendor_id=vendor.id if vendor else None,
            source="scrape",
            source_url=config.url,
        )
        db.add(cve)
        saved += 1

    return saved
