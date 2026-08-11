# syntax=docker/dockerfile:1

# ---- Stage 1: build the React frontend ----
FROM node:20-alpine AS frontend
WORKDIR /src
COPY dentacademy-frontend/package.json dentacademy-frontend/package-lock.json* ./
RUN npm ci || npm install
COPY dentacademy-frontend/ ./
RUN npm run build

# ---- Stage 2: FastAPI backend + built frontend ----
FROM python:3.11-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# WeasyPrint system libraries (Pango, pixbuf) + fonts for PDF reports
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libpangocairo-1.0-0 \
    libharfbuzz-subset \
    libgdk-pixbuf-2.0-0 \
    fontconfig \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY dentacademy-backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY dentacademy-backend/ .
COPY --from=frontend /src/dist ./dist

EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
