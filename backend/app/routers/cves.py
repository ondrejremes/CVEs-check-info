from fastapi import APIRouter, Depends, BackgroundTasks, Query
from sqlalchemy.orm import Session, joinedload, contains_eager
from app.database import get_db
from app.auth import require_api_key
from app.models.cve import CVE, CVEAlert
from app.models.vendor import Vendor
from app.schemas.cve import CVEOut, CVEAlertOut

router = APIRouter(prefix="/cves", tags=["cves"], dependencies=[Depends(require_api_key)])


@router.get("/", response_model=list[CVEOut])
def list_cves(
    customer_id: int | None = None,
    vendor_id: int | None = None,
    severity: str | None = None,
    skip: int = 0,
    limit: int = Query(50, le=500),
    db: Session = Depends(get_db),
):
    if customer_id:
        alerts = (
            db.query(CVEAlert)
            .filter(CVEAlert.customer_id == customer_id)
            .options(joinedload(CVEAlert.cve).joinedload(CVE.vendor))
            .offset(skip)
            .limit(limit)
            .all()
        )
        cves = [a.cve for a in alerts]
    else:
        q = db.query(CVE).options(joinedload(CVE.vendor))
        if vendor_id:
            q = q.filter(CVE.vendor_id == vendor_id)
        if severity:
            q = q.filter(CVE.severity == severity.upper())
        cves = q.order_by(CVE.published_at.desc()).offset(skip).limit(limit).all()
    return cves


@router.get("/alerts", response_model=list[CVEAlertOut])
def list_alerts(
    customer_id: int | None = None,
    notified: bool | None = None,
    skip: int = 0,
    limit: int = Query(50, le=500),
    db: Session = Depends(get_db),
):
    q = db.query(CVEAlert).options(joinedload(CVEAlert.cve).joinedload(CVE.vendor))
    if customer_id:
        q = q.filter(CVEAlert.customer_id == customer_id)
    if notified is not None:
        q = q.filter(CVEAlert.notified == notified)
    return q.order_by(CVEAlert.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{cve_id}", response_model=CVEOut)
def get_cve(cve_id: str, db: Session = Depends(get_db)):
    cve = db.query(CVE).filter(CVE.cve_id == cve_id).first()
    if not cve:
        from fastapi import HTTPException
        raise HTTPException(404, "CVE not found")
    return cve


def _run_full_fetch(db: Session):
    from app.fetch_status import start_fetch, step_start, step_done, finish_fetch
    from app.services.nvd_fetcher import fetch_nvd
    from app.services.rss_fetcher import fetch_rss_feeds
    from app.services.web_scraper import scrape_vendor_pages
    from app.services.paloalto_fetcher import fetch_paloalto
    from app.services.relevance import update_alerts
    from app.services.notifier import send_alerts
    import logging
    logger = logging.getLogger(__name__)
    try:
        start_fetch()
        fetch_nvd(db, days_back=7)
        fetch_rss_feeds(db)
        scrape_vendor_pages(db)
        fetch_paloalto(db)
        update_alerts(db)
        step_start("Notifikace")
        try:
            send_alerts(db)
            step_done("Notifikace", 0)
        except Exception as e:
            step_done("Notifikace", 0, str(e))
        finish_fetch()
    except Exception as e:
        logger.error(f"Fetch error: {e}")
        finish_fetch(str(e))


@router.get("/fetch/status")
def fetch_status():
    from app.fetch_status import get_status
    return get_status()


@router.post("/fetch")
async def trigger_fetch(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    from app.fetch_status import get_status
    if get_status().get("running"):
        return {"message": "Fetch already running"}
    background_tasks.add_task(_run_full_fetch, db)
    return {"message": "CVE fetch started in background"}
