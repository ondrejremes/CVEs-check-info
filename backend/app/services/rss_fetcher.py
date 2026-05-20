"""
RSS/Atom feed fetcher for vendor security advisories.
"""
import re
import logging
from datetime import datetime
import feedparser
import httpx
from sqlalchemy.orm import Session
from app.models.cve import CVE, ScrapeConfig
from app.models.vendor import Vendor

logger = logging.getLogger(__name__)

CVE_PATTERN = re.compile(r"CVE-\d{4}-\d{4,7}", re.IGNORECASE)


def fetch_rss_feeds(db: Session) -> int:
    """Fetch all enabled RSS scrape configs and extract CVE IDs mentioned in entries."""
    from app.fetch_status import step_start, step_done
    step_start("RSS")
    configs = (
        db.query(ScrapeConfig)
        .filter(ScrapeConfig.source_type == "rss", ScrapeConfig.enabled == True)
        .all()
    )
    saved = 0
    for config in configs:
        try:
            saved += _process_feed(config, db)
            config.last_run = datetime.utcnow()
            config.last_status = "ok"
        except Exception as e:
            logger.error(f"RSS feed error for config {config.id}: {e}")
            config.last_status = f"error: {e}"
    db.commit()
    step_done("RSS", saved)
    return saved


def _process_feed(config: ScrapeConfig, db: Session) -> int:
    feed = feedparser.parse(config.url)
    vendor = db.query(Vendor).filter(Vendor.id == config.vendor_id).first()
    saved = 0

    for entry in feed.entries:
        text = f"{entry.get('title', '')} {entry.get('summary', '')}"
        cve_ids = set(CVE_PATTERN.findall(text))

        for cve_id in cve_ids:
            cve_id = cve_id.upper()
            existing = db.query(CVE).filter(CVE.cve_id == cve_id).first()
            if existing:
                if existing.vendor_id is None and vendor:
                    existing.vendor_id = vendor.id
                continue

            pub = entry.get("published_parsed")
            pub_dt = datetime(*pub[:6]) if pub else None

            cve = CVE(
                cve_id=cve_id,
                description=entry.get("summary", "")[:2000] or None,
                vendor_id=vendor.id if vendor else None,
                source="rss",
                source_url=entry.get("link"),
                published_at=pub_dt,
            )
            db.add(cve)
            saved += 1

    return saved
