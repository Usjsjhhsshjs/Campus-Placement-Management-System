import logging

from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.core.config import get_settings
from app.core.database import engine
from app.routes import applications, auth, interviews, notifications, opportunities, recruiters, students
from app.services.file_service import upload_dir

logging.basicConfig(level=logging.INFO)
settings = get_settings()

app = FastAPI(title="CampusConnect API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api/v1")


@api.get("/health", tags=["system"])
def health():
    """Reports whether the API is up and whether PostgreSQL answers."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        logging.exception("Database health check failed")
        raise HTTPException(status_code=503, detail="Database unavailable")
    return {"status": "ok", "database": "connected"}


for module in (auth, students, recruiters, opportunities, applications, interviews, notifications):
    api.include_router(module.router)
app.include_router(api)

# Company logos are public images. Resumes are NOT mounted: they are served only through
# protected endpoints that check who is asking.
app.mount("/uploads/logos", StaticFiles(directory=str(upload_dir("logos"))), name="logos")


@app.exception_handler(Exception)
async def unhandled_error(request: Request, exc: Exception):
    logging.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Something went wrong on the server."})
