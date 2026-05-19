from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import require_api_key
from app.models.vendor import Vendor
from app.schemas.vendor import VendorCreate, VendorUpdate, VendorOut

router = APIRouter(prefix="/vendors", tags=["vendors"], dependencies=[Depends(require_api_key)])


@router.get("/lookup")
def lookup_vendor(q: str, db: Session = Depends(get_db)):
    """Search known vendor DB by name and return suggested config."""
    from app.services.vendor_lookup import lookup_vendor as _lookup
    return _lookup(q)


@router.post("/lookup/import", response_model=VendorOut, status_code=201)
def import_vendor(data: dict, db: Session = Depends(get_db)):
    """Create vendor from lookup result (auto-filled fields)."""
    slug = data.get("slug", "")
    if db.query(Vendor).filter(Vendor.slug == slug).first():
        raise HTTPException(400, "Vendor already exists")
    vendor = Vendor(
        name=data["name"],
        slug=slug,
        advisory_url=data.get("advisory_url"),
        rss_url=data.get("rss_url"),
    )
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return vendor


@router.get("/", response_model=list[VendorOut])
def list_vendors(db: Session = Depends(get_db)):
    return db.query(Vendor).order_by(Vendor.name).all()


@router.post("/", response_model=VendorOut, status_code=201)
def create_vendor(data: VendorCreate, db: Session = Depends(get_db)):
    if db.query(Vendor).filter(Vendor.slug == data.slug).first():
        raise HTTPException(400, "Vendor with this slug already exists")
    vendor = Vendor(**data.model_dump())
    db.add(vendor)
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
