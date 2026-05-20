from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import require_api_key
from app.models.vendor import Vendor
from app.models.cve import ScrapeConfig
from app.schemas.vendor import VendorCreate, VendorUpdate, VendorOut

router = APIRouter(prefix="/vendors", tags=["vendors"], dependencies=[Depends(require_api_key)])


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
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(vendor, k, v)
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
