"""
APScheduler configuration for periodic CVE fetching and notifications.
"""
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler()


def _run_fetch():
    from app.database import SessionLocal
    from app.services.nvd_fetcher import fetch_nvd
    from app.services.rss_fetcher import fetch_rss_feeds
    from app.services.web_scraper import scrape_vendor_pages
    from app.services.paloalto_fetcher import fetch_paloalto
    from app.services.relevance import update_alerts
    from app.services.notifier import send_alerts

    db = SessionLocal()
    try:
        logger.info("Scheduler: starting CVE fetch cycle")
        fetch_nvd(db, days_back=1)
        fetch_rss_feeds(db)
        scrape_vendor_pages(db)
        fetch_paloalto(db)
        update_alerts(db)
        send_alerts(db)
        logger.info("Scheduler: fetch cycle complete")
    except Exception as e:
        logger.error(f"Scheduler error: {e}")
    finally:
        db.close()


def start_scheduler():
    scheduler.add_job(
        _run_fetch,
        trigger=IntervalTrigger(hours=6),
        id="cve_fetch",
        replace_existing=True,
        max_instances=1,
    )
    scheduler.start()
    logger.info("Scheduler started (interval: 6h)")


def stop_scheduler():
    scheduler.shutdown(wait=False)
