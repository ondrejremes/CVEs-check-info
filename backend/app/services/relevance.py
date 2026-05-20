"""
Relevance engine: matches CVEs to customers based on their assigned products.
Matching strategy:
  1. Vendor match (cve.vendor_id in customer's product vendors)
  2. CPE prefix match (product.cpe_prefix is substring of cve.affected_products)
  3. Product name match (product.name in cve.description)
"""
import json
import logging
from sqlalchemy.orm import Session
from app.models.cve import CVE, CVEAlert
from app.models.customer import Customer
from app.models.product import Product

logger = logging.getLogger(__name__)


def _cve_matches_product(cve: CVE, product: Product) -> bool:
    # Match by vendor
    if cve.vendor_id and cve.vendor_id == product.vendor_id:
        return True

    # Match by CPE prefix
    if product.cpe_prefix and cve.affected_products:
        try:
            cpes = json.loads(cve.affected_products)
            if any(product.cpe_prefix.lower() in c.lower() for c in cpes):
                return True
        except (json.JSONDecodeError, TypeError):
            if product.cpe_prefix.lower() in cve.affected_products.lower():
                return True

    # Match by product name in description
    if product.name and cve.description:
        if product.name.lower() in cve.description.lower():
            return True

    return False


def update_alerts(db: Session, _report: bool = True) -> int:
    """
    For all unmatched CVEs, check relevance against all customers/products
    and create CVEAlert records where relevant.
    """
    from app.fetch_status import step_start, step_done
    if _report:
        step_start("Relevance")
    # Only process CVEs not yet evaluated for any customer
    all_cves = db.query(CVE).all()
    customers = db.query(Customer).all()

    created = 0
    for customer in customers:
        if not customer.products:
            continue

        existing_alert_cve_ids = {
            a.cve_id for a in db.query(CVEAlert).filter(CVEAlert.customer_id == customer.id).all()
        }

        for cve in all_cves:
            if cve.id in existing_alert_cve_ids:
                continue

            for product in customer.products:
                if _cve_matches_product(cve, product):
                    alert = CVEAlert(cve_id=cve.id, customer_id=customer.id)
                    db.add(alert)
                    created += 1
                    break

    db.commit()
    logger.info(f"Relevance update: {created} new alerts created")
    if _report:
        step_done("Relevance", created)
    return created
