# DentAcademy Apprenticeship Management Portal

## Overview
A web-based apprenticeship management portal for an automotive workshop apprenticeship programme in Lebowakgomo, Limpopo, South Africa. The system manages apprentices and annual intakes of TVET college students, replacing a manual process.

**Developer:** Group 13, University of Limpopo  
**Course:** COSC300 2026  

## Architecture
- **Frontend**: React, Tailwind CSS, Vite
- **Backend**: FastAPI, MySQL, SQLAlchemy, PyJWT
- **AI**: Scikit-learn Random Forest for dropout prediction

## Setup Instructions

1. Start the backend:
```bash
cd dentacademy-backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Set up MySQL and DB credentials in .env
mysql -u root -p < database/schema.sql
mysql -u root -p dentacademy < database/triggers.sql
alembic upgrade head
python seed.py
uvicorn main:app --reload --port 8000
```

2. Start the frontend:
```bash
cd dentacademy-frontend
npm install
npm run dev
```

## System Requirements Implemented
All functional and non-functional requirements (FR-01 to FR-36, SR-01 to SR-08) including RBAC, JWT Auth, AI prediction, PDF Reports, and strict MySQL triggers have been implemented.
