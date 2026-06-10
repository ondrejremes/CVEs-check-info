# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Backend**: FastAPI + SQLAlchemy 2.0 + MariaDB, Python 3.11+, Alembic migrations, APScheduler
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + React Query + Axios
- **Infrastructure**: Docker Compose (services: `db`, `backend`, `frontend`)

## Development Commands

### Full stack (Docker)
```bash
docker compose up --build        # start all services
docker compose up -d             # detached
docker compose logs -f backend   # follow backend logs
```

### Backend (local)
```bash
cd backend
cp .env.example .env             # then fill in values
pip install -r requirements.txt
uvicorn app.main:app --reload    # runs on :8000
```

### Database migrations
```bash
cd backend
alembic upgrade head             # apply migrations
alembic revision --autogenerate -m "description"  # generate new migration
```
Note: `app.main` also calls `Base.metadata.create_all` on startup, so tables are created even without running Alembic. Use Alembic for schema changes in production.

### Frontend (local)
```bash
cd frontend
npm install
npm run dev     # runs on :5173, proxies /api → http://localhost:8000
npm run build   # type-check + bundle
```

Frontend reads `VITE_API_KEY` from `frontend/.env` — must match `API_KEY` in `backend/.env`.

## Architecture

### Data Flow
CVE data enters through four ingestion services (all called by the scheduler every 6 hours):
1. `services/nvd_fetcher.py` — NVD NIST API v2, paginates up to 2000 results per page
2. `services/rss_fetcher.py` — parses RSS feeds from vendor `rss_url` fields
3. `services/web_scraper.py` — scrapes vendor advisory pages
4. `services/mitre_fetcher.py` — MITRE CVE list

After ingestion, `services/relevance.py` matches CVEs to customers via three strategies (in order): vendor ID match → CPE prefix substring match → product name in CVE description. Matches create `CVEAlert` records.

`services/notifier.py` then sends email alerts for unnotified `CVEAlert` records using Jinja2 templates (`templates/email/alert_en.html`, `alert_cs.html`).

### Auth
All API routes use `X-API-Key` header auth (`app/auth.py`). The key is validated against `API_KEY` in `.env`; placeholder values raise a startup error via a Pydantic field validator in `app/config.py`.

### Vendor Lookup
`services/vendor_lookup.py` contains a static `VENDOR_DB` list of ~35 known security vendors with pre-filled advisory URLs, RSS feeds, and CPE vendor slugs. The `GET /vendors/lookup?q=` endpoint searches this DB; `POST /vendors/lookup/import` creates a vendor from a lookup result. When adding new vendors to this DB, follow the existing dict structure: `name`, `slug`, `advisory_url`, `rss_url`, `cpe_vendor`.

### Frontend Proxy
Vite dev server proxies `/api/*` → `http://localhost:8000/*` (strips `/api` prefix). In production Docker, nginx serves the built frontend on port 80 and must be configured to proxy `/api` to the backend container.

### Reports
`routers/reports.py` + `services/exporter.py` handle PDF (reportlab) and Excel (openpyxl) export of CVE alerts per customer.

## Environment Setup

`backend/.env` required fields:
- `DATABASE_URL` — `mysql+pymysql://user:pass@host:3306/dbname`
- `API_KEY` — strong random value (e.g. `openssl rand -hex 32`)
- SMTP fields for email notifications (`MAIL_*`)
- `NVD_API_KEY` — optional, increases NVD rate limits

Root `.env` is only for Docker Compose DB credentials (`MARIADB_*`).
