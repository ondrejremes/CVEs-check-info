from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import vendors, products, customers, cves, reports
from app.database import Base, engine
from app.scheduler import start_scheduler, stop_scheduler

Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    lifespan=lifespan,
    title="CVEs Check Info",
    description="CVE monitoring for customers and their products",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "X-API-Key"],
)

app.include_router(vendors.router)
app.include_router(products.router)
app.include_router(customers.router)
app.include_router(cves.router)
app.include_router(reports.router)


@app.get("/health")
def health():
    return {"status": "ok"}
