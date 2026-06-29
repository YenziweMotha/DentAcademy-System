from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import os
from routers import auth_router, users_router, apprentices_router, modules_router, evaluations_router, mentors_router, predictions_router, reports_router, dashboard_router
from middleware.auth_middleware import SecurityHeadersMiddleware

# Since we use a raw SQL file for the schema, we typically wouldn't use create_all, but it is safe.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="DentAcademy Management Portal")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SecurityHeadersMiddleware)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(apprentices_router)
app.include_router(modules_router)
app.include_router(evaluations_router)
app.include_router(mentors_router)
app.include_router(predictions_router)
app.include_router(reports_router)
app.include_router(dashboard_router)
