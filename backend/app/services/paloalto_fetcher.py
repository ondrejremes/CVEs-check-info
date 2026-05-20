"""
Palo Alto Networks security advisory fetcher.
Primary source: https://security.paloaltonetworks.com/
- RSS feed: list of new advisories
- Detail pages: SSR HTML with CVSS scores, CPE data, product info
"""
import json
import logging
import re
import time
from datetime import datetime

import feedparser
import httpx
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from app.models.cve import CVE
from app.models.vendor import Vendor

logger = logging.getLogger(__name__)

RSS_URL = "https://security.paloaltonetworks.com/rss.xml"
CVE_RE = re.compile(r"^CVE-\d{4}-\d{4,7}$", re.IGNORECASE)
HEADERS = {"User-Agent": "Mozilla/5.0 CVE-Checker/1.0"}


def _parse_detail(html: str) -> dict:
    """Extract full CVE metadata from a Palo Alto advisory detail page."""
    soup = BeautifulSoup(html, "lxml")

    # Severity from Twitter card meta (HIGH/MEDIUM/CRITICAL/LOW)
    sev_tag = soup.find("meta", attrs={"name": "twitter:data1"})
    severity = sev_tag["content"].upper() if sev_tag else None

    # Published date
    pub_tag = soup.find("meta", property="article:published_time")
    published_at = None
    if pub_tag and pub_tag.get("content"):
        try:
            published_at = datetime.fromisoformat(pub_tag["content"].replace("Z", "")).replace(tzinfo=None)
        except ValueError:
            pass

    # Description from og:description (clean, no advisory prefix)
    og_desc = soup.find("meta", property="og:description")
    description = og_desc["content"].strip() if og_desc and og_desc.get("content") else None
    if not description:
        # Fall back to name=description and strip the standard prefix
        meta_desc = soup.find("meta", attrs={"name": "description"})
        if meta_desc and meta_desc.get("content"):
            description = re.sub(
                r'^Palo Alto Networks Security Advisory:\s*CVE-\d{4}-\d{4,7}[^:]*:\s*',
                '', meta_desc["content"]
            ).strip()
    if description:
        description = description[:2000]

    # CVSS score from the "Severity\n7.2 ·\nHIGH" text in the page anchor
    cvss_score = None
    cvss_version = None
    score_match = re.search(r'Severity\s*[\n\r]+\s*([0-9]+\.[0-9]+)\s*[·•]', html)
    if score_match:
        try:
            cvss_score = float(score_match.group(1))
            cvss_version = "4.0"
        except ValueError:
            pass

    # Affected CPEs from JSON embedded in title attributes (BS4 auto-decodes HTML entities)
    cpes = []
    for tag in soup.find_all(attrs={"title": True}):
        title_val = tag.get("title", "")
        if '"criteria"' in title_val:
            try:
                data = json.loads(title_val)
                if isinstance(data, dict) and "criteria" in data:
                    cpes.append(data["criteria"])
            except (json.JSONDecodeError, TypeError):
                found = re.findall(r'cpe:[^\s",]+', title_val)
                cpes.extend(found)

    cpes = list(dict.fromkeys(cpes))  # deduplicate preserving order
    affected_products = json.dumps(cpes[:50]) if cpes else None

    # Affected product names from the versions table
    product_names = []
    table = soup.find("table", class_="neat card")
    if table:
        for row in table.find_all("tr")[1:]:
            cells = row.find_all("td")
            if cells:
                name = cells[0].get_text(strip=True)
                if name:
                    product_names.append(name)

    return {
        "severity": severity,
        "cvss_score": cvss_score,
        "cvss_version": cvss_version,
        "description": description,
        "published_at": published_at,
        "affected_products": affected_products,
        "product_names": product_names,
    }


def fetch_paloalto(db: Session) -> int:
    """Fetch Palo Alto advisories from their security portal RSS + detail pages."""
    from sqlalchemy import or_
    vendor = db.query(Vendor).filter(
        or_(
            Vendor.slug == "paloalto",
            Vendor.slug == "paloaltonetworks",
            Vendor.advisory_url.contains("security.paloaltonetworks.com"),
        )
    ).first()
    if not vendor:
        logger.warning("Palo Alto vendor not found in DB (slug paloalto/paloaltonetworks), skipping")
        return 0

    from app.fetch_status import step_start, step_done
    step_start("Palo Alto")
    try:
        feed = feedparser.parse(RSS_URL)
    except Exception as e:
        logger.error(f"Failed to fetch Palo Alto RSS: {e}")
        step_done("Palo Alto", 0, str(e))
        return 0

    saved = 0
    for entry in feed.entries:
        link = entry.get("link", "")
        cve_id = link.rstrip("/").split("/")[-1].upper()

        if not CVE_RE.match(cve_id):
            logger.debug(f"Skipping non-CVE entry: {cve_id}")
            continue

        existing = db.query(CVE).filter(CVE.cve_id == cve_id).first()
        if existing:
            if existing.vendor_id is None:
                existing.vendor_id = vendor.id
                db.commit()
            continue

        # Fetch detail page for full metadata
        detail = {}
        try:
            resp = httpx.get(link, headers=HEADERS, timeout=20, follow_redirects=True)
            resp.raise_for_status()
            detail = _parse_detail(resp.text)
            time.sleep(0.5)
        except Exception as e:
            logger.warning(f"Failed to fetch detail {link}: {e}")
            pub = entry.get("published_parsed")
            detail = {
                "severity": None,
                "cvss_score": None,
                "cvss_version": None,
                "description": entry.get("summary", "")[:2000] or None,
                "published_at": datetime(*pub[:6]) if pub else None,
                "affected_products": None,
            }

        # Prefer detail description; fall back to RSS summary
        description = detail.get("description") or entry.get("summary", "")[:2000] or None

        cve = CVE(
            cve_id=cve_id,
            description=description,
            cvss_score=detail.get("cvss_score"),
            cvss_version=detail.get("cvss_version"),
            severity=detail.get("severity"),
            vendor_id=vendor.id,
            affected_products=detail.get("affected_products"),
            source="paloalto",
            source_url=link,
            published_at=detail.get("published_at"),
        )
        db.add(cve)
        db.commit()
        saved += 1
        logger.debug(f"Saved {cve_id} (score={detail.get('cvss_score')}, sev={detail.get('severity')})")

    logger.info(f"Palo Alto fetch: {saved} new CVEs saved")
    step_done("Palo Alto", saved)
    return saved
