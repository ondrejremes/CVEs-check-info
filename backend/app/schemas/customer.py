from datetime import datetime
from pydantic import BaseModel, EmailStr
from app.schemas.product import ProductOut


class CustomerBase(BaseModel):
    name: str
    email: EmailStr
    language: str = "cs"
    contact_person: str | None = None
    notes: str | None = None
    notify_email: bool = True


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    language: str | None = None
    contact_person: str | None = None
    notes: str | None = None
    notify_email: bool | None = None


class CustomerOut(CustomerBase):
    id: int
    created_at: datetime
    products: list[ProductOut] = []

    model_config = {"from_attributes": True}
