from datetime import datetime
from pydantic import BaseModel


class CVEOut(BaseModel):
    id: int
    cve_id: str
    description: str | None
    cvss_score: float | None
    cvss_version: str | None
    severity: str | None
    vendor_id: int | None
    affected_products: str | None
    source: str | None
    source_url: str | None
    published_at: datetime | None
    fetched_at: datetime

    model_config = {"from_attributes": True}


class CVEAlertOut(BaseModel):
    id: int
    cve_id: int
    customer_id: int
    notified: bool
    notified_at: datetime | None
    created_at: datetime
    cve: CVEOut

    model_config = {"from_attributes": True}
