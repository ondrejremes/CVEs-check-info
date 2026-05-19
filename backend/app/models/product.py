from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    version_pattern: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="Regex or glob for matching versions, e.g. '15.*'")
    cpe_prefix: Mapped[str | None] = mapped_column(String(512), nullable=True, comment="CPE prefix for NVD matching, e.g. 'cpe:2.3:a:cisco:ios'")
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id", ondelete="CASCADE"))
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    vendor: Mapped["Vendor"] = relationship("Vendor", back_populates="products")
    customers: Mapped[list["Customer"]] = relationship("Customer", secondary="customer_products", back_populates="products")
