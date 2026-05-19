from datetime import datetime
from sqlalchemy import String, DateTime, Float, Text, ForeignKey, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class CVE(Base):
    __tablename__ = "cves"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    cve_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, comment="e.g. CVE-2024-12345")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    description_cs: Mapped[str | None] = mapped_column(Text, nullable=True, comment="Czech description (future auto-translate)")
    cvss_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    cvss_version: Mapped[str | None] = mapped_column(String(10), nullable=True, comment="3.1, 4.0 etc.")
    severity: Mapped[str | None] = mapped_column(String(20), nullable=True, comment="CRITICAL/HIGH/MEDIUM/LOW")
    vendor_id: Mapped[int | None] = mapped_column(ForeignKey("vendors.id", ondelete="SET NULL"), nullable=True)
    affected_products: Mapped[str | None] = mapped_column(Text, nullable=True, comment="JSON list of affected CPEs/product names")
    source: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="nvd/mitre/rss/scrape")
    source_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    modified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    vendor: Mapped["Vendor"] = relationship("Vendor", back_populates="cves")
    alerts: Mapped[list["CVEAlert"]] = relationship("CVEAlert", back_populates="cve", cascade="all, delete-orphan")


class CVEAlert(Base):
    __tablename__ = "cve_alerts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    cve_id: Mapped[int] = mapped_column(ForeignKey("cves.id", ondelete="CASCADE"))
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id", ondelete="CASCADE"))
    notified: Mapped[bool] = mapped_column(Boolean, default=False)
    notified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    cve: Mapped["CVE"] = relationship("CVE", back_populates="alerts")
    customer: Mapped["Customer"] = relationship("Customer", back_populates="alerts")


class NotificationLog(Base):
    __tablename__ = "notification_log"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id", ondelete="CASCADE"))
    subject: Mapped[str] = mapped_column(String(512))
    cve_count: Mapped[int] = mapped_column(Integer, default=0)
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)


class ScrapeConfig(Base):
    __tablename__ = "scrape_configs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id", ondelete="CASCADE"))
    source_type: Mapped[str] = mapped_column(String(20), comment="rss/web/api")
    url: Mapped[str] = mapped_column(String(512))
    interval_hours: Mapped[int] = mapped_column(Integer, default=6)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    last_run: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
