import logging
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import IntegrityError
from routers import (
    auth_router,
    users_router,
    apprentices_router,
    modules_router,
    evaluations_router,
    mentors_router,
    predictions_router,
    reports_router,
    dashboard_router,
    config_router,
)
from middleware.auth_middleware import SecurityHeadersMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("dentacademy")

# NOTE: Schema is managed by Alembic migrations, not create_all.

app = FastAPI(
    title="DentAcademy Management Portal",
    description=(
        "DentAcademy apprenticeship management portal for Dent Doctor "
        "Lebowakgomo. All endpoints are JSON; authentication is JWT (Bearer) "
        "issued via /api/auth/login. See /redoc for the full schema."
    ),
    version="1.0.0",
)


# ------------------------------------------------------------------
# CORS (env-driven single or multi origin)
# ------------------------------------------------------------------

CORS_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "CORS_ORIGINS",
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
    ).split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SecurityHeadersMiddleware)


# ------------------------------------------------------------------
# Centralized exception handling (SRS §30)
# ------------------------------------------------------------------

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code >= 500:
        logger.error("HTTP %s on %s %s: %s", exc.status_code, request.method,
                     request.url.path, exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        loc = ".".join(str(p) for p in err.get("loc", []) if p != "body")
        errors.append({"field": loc or "body", "message": err.get("msg", "Invalid value")})
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation failed. Please correct the highlighted fields.", "errors": errors},
    )


@app.exception_handler(IntegrityError)
async def integrity_exception_handler(request: Request, exc: IntegrityError):
    # Never leak the underlying SQL error text to the client.
    logger.error("IntegrityError on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=409,
        content={"detail": "The operation conflicts with existing data (duplicate or referenced record)."},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected server error occurred. Please try again later."},
    )


# ------------------------------------------------------------------
# Routers
# ------------------------------------------------------------------

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(apprentices_router)
app.include_router(modules_router)
app.include_router(evaluations_router)
app.include_router(mentors_router)
app.include_router(predictions_router)
app.include_router(reports_router)
app.include_router(dashboard_router)
app.include_router(config_router)


# ------------------------------------------------------------------
# Startup: ensure tables + optional one-time seed (env driven)
# ------------------------------------------------------------------

@app.on_event("startup")
async def on_startup():
    import startup

    startup.run_startup()


# ------------------------------------------------------------------
# Static SPA (built frontend) served from FastAPI in production
# ------------------------------------------------------------------

_DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")
if os.path.isdir(_DIST_DIR):
    app.mount("/", StaticFiles(directory=_DIST_DIR, html=True), name="spa")
