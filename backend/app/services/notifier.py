"""
Email notifier — sends CVE alerts to customers in their preferred language (cs/en).
Uses Jinja2 templates: templates/email/alert_cs.html and alert_en.html
"""
import logging
import ssl
from datetime import datetime
from pathlib import Path
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from jinja2 import Environment, FileSystemLoader
from sqlalchemy.orm import Session
from app.config import settings
from app.models.cve import CVEAlert, NotificationLog
from app.models.customer import Customer

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).parent.parent / "templates" / "email"
jinja_env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)), autoescape=True)

SUBJECTS = {
    "cs": "Nové bezpečnostní zranitelnosti (CVE) pro vaše produkty",
    "en": "New security vulnerabilities (CVE) for your products",
}


def send_alerts(db: Session) -> int:
    """Send email notifications for all unnotified CVEAlerts, grouped by customer."""
    customers = db.query(Customer).filter(Customer.notify_email == True).all()
    sent = 0

    for customer in customers:
        unnotified = (
            db.query(CVEAlert)
            .filter(CVEAlert.customer_id == customer.id, CVEAlert.notified == False)
            .all()
        )
        if not unnotified:
            continue

        cves = [a.cve for a in unnotified]
        lang = customer.language if customer.language in ("cs", "en") else "en"

        try:
            _send_email(customer, cves, lang)
            for alert in unnotified:
                alert.notified = True
                alert.notified_at = datetime.utcnow()
            log = NotificationLog(
                customer_id=customer.id,
                subject=SUBJECTS[lang],
                cve_count=len(cves),
                success=True,
            )
            db.add(log)
            db.commit()
            sent += 1
            logger.info(f"Notification sent to {customer.email} ({len(cves)} CVEs)")
        except Exception as e:
            logger.error(f"Failed to send notification to {customer.email}: {e}")
            log = NotificationLog(
                customer_id=customer.id,
                subject=SUBJECTS[lang],
                cve_count=len(cves),
                success=False,
                error=str(e),
            )
            db.add(log)
            db.commit()

    return sent


def _send_email(customer: Customer, cves: list, lang: str) -> None:
    template = jinja_env.get_template(f"alert_{lang}.html")
    html_body = template.render(customer=customer, cves=cves)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = SUBJECTS[lang]
    msg["From"] = settings.MAIL_FROM
    msg["To"] = customer.email
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    ssl_ctx = ssl.create_default_context()
    with smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT) as smtp:
        if settings.MAIL_TLS:
            smtp.starttls(context=ssl_ctx)
        if settings.MAIL_USERNAME:
            smtp.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
        smtp.sendmail(settings.MAIL_FROM, customer.email, msg.as_string())
