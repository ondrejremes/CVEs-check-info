from datetime import datetime
from pydantic import BaseModel


class VendorBase(BaseModel):
    name: str
    slug: str
    advisory_url: str | None = None
    rss_url: str | None = None
    notes: str | None = None


class VendorCreate(VendorBase):
    pass


class VendorUpdate(BaseModel):
    name: str | None = None
    advisory_url: str | None = None
    rss_url: str | None = None
    notes: str | None = None


class VendorOut(VendorBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
