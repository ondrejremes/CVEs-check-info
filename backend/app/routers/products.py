import re
from fastapi import APIRouter, Depends, HTTPException
import httpx
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import require_api_key
from app.models.product import Product
from app.models.vendor import Vendor
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut
from app.config import settings

router = APIRouter(prefix="/products", tags=["products"], dependencies=[Depends(require_api_key)])

NVD_CPE_BASE = "https://services.nvd.nist.gov/rest/json/cpes/2.0"
PALOALTO_ADVISORY_URL = "https://security.paloaltonetworks.com/"


def _fetch_paloalto_advisory_products() -> list[str]:
    """Scrape product names from the Palo Alto advisory listing page filter checkboxes."""
    try:
        resp = httpx.get(
            PALOALTO_ADVISORY_URL,
            headers={"User-Agent": "Mozilla/5.0 CVE-Checker/1.0"},
            timeout=15,
            follow_redirects=True,
        )
        resp.raise_for_status()
        names = re.findall(r'<input[^>]+name="product"[^>]+value="([^"]+)"', resp.text)
        # Deduplicate and strip whitespace, filter empties
        seen = set()
        result = []
        for n in names:
            n = n.strip()
            if n and n.lower() not in seen:
                seen.add(n.lower())
                result.append(n)
        return sorted(result)
    except Exception:
        return []


@router.get("/suggest")
def suggest_products(vendor_id: int, db: Session = Depends(get_db)):
    """Return product suggestions from NVD CPE database for a given vendor."""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(404, "Vendor not found")

    headers = {"apiKey": settings.NVD_API_KEY} if settings.NVD_API_KEY else {}
    cpe_match = f"cpe:2.3:*:{vendor.cpe_vendor or vendor.slug}:*"

    try:
        resp = httpx.get(
            NVD_CPE_BASE,
            params={"cpeMatchString": cpe_match, "resultsPerPage": 2000},
            headers=headers,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(502, f"NVD API returned {e.response.status_code}")
    except Exception as e:
        raise HTTPException(502, f"NVD API error: {e}")

    existing_cpes = {
        p.cpe_prefix
        for p in db.query(Product).filter(Product.vendor_id == vendor_id).all()
        if p.cpe_prefix
    }

    seen: dict[str, dict] = {}
    for item in data.get("products", []):
        cpe_name = item.get("cpe", {}).get("cpeName", "")
        parts = cpe_name.split(":")
        if len(parts) < 5:
            continue
        prefix = ":".join(parts[:5])
        if prefix in seen or prefix in existing_cpes:
            continue

        titles = item.get("cpe", {}).get("titles", [])
        name = next((t["title"] for t in titles if t.get("lang") == "en"), None)
        if not name:
            name = parts[4].replace("_", " ").replace("-", " ").title()

        seen[prefix] = {"name": name, "cpe_prefix": prefix}

    # For Palo Alto Networks: advisory page is the primary source.
    # NVD results are used only to enrich CPE prefixes.
    is_paloalto = "paloaltonetworks" in (vendor.slug or "") or \
                  "paloaltonetworks" in (vendor.cpe_vendor or "") or \
                  "security.paloaltonetworks.com" in (vendor.advisory_url or "")
    if is_paloalto:
        existing_names = {
            p.name.lower()
            for p in db.query(Product).filter(Product.vendor_id == vendor_id).all()
        }

        # Build lookup: normalized NVD name → CPE prefix (and CPE product slug → prefix)
        name_to_prefix: dict[str, str] = {v["name"].lower(): k for k, v in seen.items()}
        slug_to_prefix: dict[str, str] = {k.split(":")[4]: k for k in seen.keys()}

        def _find_cpe(advisory_name: str) -> str:
            low = advisory_name.lower()
            slug = re.sub(r"[^a-z0-9]+", "_", low).strip("_")
            if low in name_to_prefix:
                return name_to_prefix[low]
            if slug in slug_to_prefix:
                return slug_to_prefix[slug]
            for nvd_name, prefix in name_to_prefix.items():
                if low in nvd_name or nvd_name in low:
                    return prefix
            return ""

        advisory_products = _fetch_paloalto_advisory_products()
        result: list[dict] = []
        for name in advisory_products:
            if name.lower() in existing_names:
                continue
            cpe_prefix = _find_cpe(name)
            if cpe_prefix in existing_cpes:
                continue
            result.append({"name": name, "cpe_prefix": cpe_prefix})

        return result  # already sorted alphabetically by _fetch_paloalto_advisory_products

    return sorted(seen.values(), key=lambda x: x["name"])


@router.get("/", response_model=list[ProductOut])
def list_products(vendor_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(Product)
    if vendor_id:
        q = q.filter(Product.vendor_id == vendor_id)
    return q.order_by(Product.name).all()


@router.post("/", response_model=ProductOut, status_code=201)
def create_product(data: ProductCreate, db: Session = Depends(get_db)):
    product = Product(**data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    return product


@router.put("/{product_id}", response_model=ProductOut)
def update_product(product_id: int, data: ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(product, k, v)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=204)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    db.delete(product)
    db.commit()
