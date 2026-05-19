import re
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import require_api_key
from app.models.customer import Customer

router = APIRouter(prefix="/reports", tags=["reports"], dependencies=[Depends(require_api_key)])

_SAFE_FILENAME = re.compile(r"[^\w\-]")


def _safe_name(name: str) -> str:
    return _SAFE_FILENAME.sub("_", name)[:50]


@router.get("/customer/{customer_id}/pdf")
def export_pdf(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(404, "Customer not found")
    from app.services.exporter import generate_pdf
    pdf_bytes = generate_pdf(customer, db)
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=cves_{_safe_name(customer.name)}.pdf"},
    )


@router.get("/customer/{customer_id}/excel")
def export_excel(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(404, "Customer not found")
    from app.services.exporter import generate_excel
    excel_bytes = generate_excel(customer, db)
    return StreamingResponse(
        iter([excel_bytes]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=cves_{_safe_name(customer.name)}.xlsx"},
    )
