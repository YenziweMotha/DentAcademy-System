# DentAcademy Backend

## Project Overview
Backend service for DentAcademy Apprenticeship Management Portal. Built with FastAPI and MySQL.

## Prerequisites
- Python 3.11+
- MySQL 8.x

## Installation
```bash
cd ~/Documents/Third\ Level/COSC300\ 2026/DentAcademy/dentacademy-backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # then fill in your DB credentials
mysql -u root -p < database/schema.sql
mysql -u root -p dentacademy < database/triggers.sql
alembic upgrade head
python seed.py
uvicorn main:app --reload --port 8000
```

- API docs: http://localhost:8000/docs
- Default login credentials:
  - Administrator: admin / Admin@123
  - Supervisor: supervisor / Super@123
  - Mentor: mentor1 / Mentor@123
  - Apprentice: apprentice1 / Apprent@123
