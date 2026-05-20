from datetime import datetime
from pydantic import BaseModel


class ProductBase(BaseModel):
    name: str
    vendor_id: int
    version_pattern: str | None = None
    cpe_prefix: str | None = None
    notes: str | None = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = None
    vendor_id: int | None = None
    version_pattern: str | None = None
    cpe_prefix: str | None = None
    notes: str | None = None


class ProductOut(ProductBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
