from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import require_api_key
from app.models.vendor import Vendor
from app.models.cve import ScrapeConfig
from app.schemas.vendor import VendorCreate, VendorUpdate, VendorOut

router = APIRouter(prefix="/vendors", tags=["vendors"], dependencies=[Depends(require_api_key)])

KNOWN_VENDORS: dict[str, dict] = {
    "cisco": {
        "name": "Cisco", "slug": "cisco",
        "advisory_url": "https://sec.cloudapps.cisco.com/security/center/publicationListing.x",
        "rss_url": "https://sec.cloudapps.cisco.com/security/center/psirtrss20.xml",
    },
    "microsoft": {
        "name": "Microsoft", "slug": "microsoft",
        "advisory_url": "https://msrc.microsoft.com/update-guide/",
        "rss_url": "https://api.msrc.microsoft.com/update-guide/rss",
    },
    "fortinet": {
        "name": "Fortinet", "slug": "fortinet",
        "advisory_url": "https://www.fortiguard.com/psirt",
        "rss_url": "https://www.fortiguard.com/rss/psirt.xml",
    },
    "palo alto": {
        "name": "Palo Alto Networks", "slug": "paloalto",
        "advisory_url": "https://security.paloaltonetworks.com/",
        "rss_url": "https://security.paloaltonetworks.com/rss.xml",
    },
    "juniper": {
        "name": "Juniper Networks", "slug": "juniper",
        "advisory_url": "https://supportportal.juniper.net/s/global-search/Security%20Advisory",
        "rss_url": None,
    },
    "f5": {
        "name": "F5", "slug": "f5",
        "advisory_url": "https://my.f5.com/manage/s/article/K4",
        "rss_url": None,
    },
    "oracle": {
        "name": "Oracle", "slug": "oracle",
        "advisory_url": "https://www.oracle.com/security-alerts/",
        "rss_url": "https://www.oracle.com/security-alerts/securityalertrss.xml",
    },
    "red hat": {
        "name": "Red Hat", "slug": "redhat",
        "advisory_url": "https://access.redhat.com/security/security-updates/",
        "rss_url": "https://access.redhat.com/rss/latest-security-advisories.xml",
    },
    "sophos": {
        "name": "Sophos", "slug": "sophos",
        "advisory_url": "https://www.sophos.com/en-us/security-advisories",
        "rss_url": "https://www.sophos.com/en-us/rss/security-advisories.xml",
    },
    "vmware": {
        "name": "VMware", "slug": "vmware",
        "advisory_url": "https://www.vmware.com/security/advisories.html",
        "rss_url": None,
    },
    "check point": {
        "name": "Check Point", "slug": "checkpoint",
        "advisory_url": "https://support.checkpoint.com/results/sk/en",
        "rss_url": None,
    },
    "sonicwall": {
        "name": "SonicWall", "slug": "sonicwall",
        "advisory_url": "https://psirt.global.sonicwall.com/vuln-list",
        "rss_url": None,
    },
    "aruba": {
        "name": "Aruba Networks", "slug": "aruba",
        "advisory_url": "https://www.arubanetworks.com/support-services/security-bulletins/",
        "rss_url": None,
    },
    "zyxel": {
        "name": "Zyxel", "slug": "zyxel",
        "advisory_url": "https://www.zyxel.com/global/en/support/security-advisories",
        "rss_url": None,
    },
    "netgear": {
        "name": "Netgear", "slug": "netgear",
        "advisory_url": "https://kb.netgear.com/app/answers/detail/a_id/62883",
        "rss_url": None,
    },
    "siemens": {
        "name": "Siemens", "slug": "siemens",
        "advisory_url": "https://cert.siemens.com/security-advisories",
        "rss_url": None,
    },
    "lenovo": {
        "name": "Lenovo", "slug": "lenovo",
        "advisory_url": "https://support.lenovo.com/us/en/product_security/home",
        "rss_url": None,
    },
    "dell": {
        "name": "Dell", "slug": "dell",
        "advisory_url": "https://www.dell.com/support/security/en-us",
        "rss_url": None,
    },
    "hp": {
        "name": "HP", "slug": "hp",
        "advisory_url": "https://support.hp.com/us-en/security/product-security-alerts",
        "rss_url": None,
    },
    "ibm": {
        "name": "IBM", "slug": "ibm",
        "advisory_url": "https://www.ibm.com/support/pages/ibm-security-advisories",
        "rss_url": None,
    },
    "apache": {
        "name": "Apache", "slug": "apache",
        "advisory_url": "https://httpd.apache.org/security_report.html",
        "rss_url": None,
    },
    "nginx": {
        "name": "NGINX", "slug": "nginx",
        "advisory_url": "https://nginx.org/en/security_advisories.html",
        "rss_url": None,
    },
    "citrix": {
        "name": "Citrix", "slug": "citrix",
        "advisory_url": "https://support.citrix.com/",
        "rss_url": None,
    },
    "wallix": {
        "name": "Wallix", "slug": "wallix",
        "advisory_url": "https://www.wallix.com/psirt/",
        "rss_url": None,
    },
    "forcepoint": {
        "name": "Forcepoint", "slug": "forcepoint",
        "advisory_url": "https://support.forcepoint.com/s/article/Security-Advisories",
        "rss_url": None,
    },
    "bitdefender": {
        "name": "Bitdefender", "slug": "bitdefender",
        "advisory_url": "https://www.bitdefender.com/support/security-advisories/",
        "rss_url": None,
    },
    "avast": {
        "name": "Avast", "slug": "avast",
        "advisory_url": "https://www.avast.com/security/advisories",
        "rss_url": None,
    },
}


def _sync_scrape_configs(db: Session, vendor: Vendor, rss_url: str | None, advisory_url: str | None):
    for source_type, url in (("rss", rss_url), ("web", advisory_url)):
        existing = db.query(ScrapeConfig).filter(
            ScrapeConfig.vendor_id == vendor.id,
            ScrapeConfig.source_type == source_type,
        ).first()
        if url:
            if existing:
                existing.url = url
                existing.enabled = True
            else:
                db.add(ScrapeConfig(vendor_id=vendor.id, source_type=source_type, url=url))
        elif existing:
            db.delete(existing)


@router.get("/lookup")
def lookup_vendor(name: str = Query(..., min_length=1)):
    """Return known advisory/RSS URLs for a vendor by name (fuzzy match)."""
    q = name.lower().strip()
    for key, data in KNOWN_VENDORS.items():
        if key in q or q in key:
            return {"found": True, **data}
    return {"found": False}


@router.get("/", response_model=list[VendorOut])
def list_vendors(db: Session = Depends(get_db)):
    return db.query(Vendor).order_by(Vendor.name).all()


@router.post("/", response_model=VendorOut, status_code=201)
def create_vendor(data: VendorCreate, db: Session = Depends(get_db)):
    if db.query(Vendor).filter(Vendor.slug == data.slug).first():
        raise HTTPException(400, "Vendor with this slug already exists")
    vendor = Vendor(**data.model_dump())
    db.add(vendor)
    db.flush()
    _sync_scrape_configs(db, vendor, data.rss_url, data.advisory_url)
    db.commit()
    db.refresh(vendor)
    return vendor


@router.get("/{vendor_id}", response_model=VendorOut)
def get_vendor(vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(404, "Vendor not found")
    return vendor


@router.put("/{vendor_id}", response_model=VendorOut)
def update_vendor(vendor_id: int, data: VendorUpdate, db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(404, "Vendor not found")
    url_fields = {"advisory_url", "rss_url"}
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(vendor, k, None if k in url_fields and not v else v)
    _sync_scrape_configs(db, vendor, vendor.rss_url, vendor.advisory_url)
    db.commit()
    db.refresh(vendor)
    return vendor


@router.delete("/{vendor_id}", status_code=204)
def delete_vendor(vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(404, "Vendor not found")
    db.delete(vendor)
    db.commit()
