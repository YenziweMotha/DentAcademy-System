# DentAcademy — System Documentation

**DentAcademy Apprenticeship Management Portal**  
Automotive workshop apprenticeship programme — Lebowakgomo, Limpopo, South Africa  
Developers: Group 13, University of Limpopo — COSC300 2026

This document describes how the whole application works: architecture, features, roles, database, AI training and inference, LLM chat, reports, and how to run or deploy it.

---

## 1. What the system does

DentAcademy replaces a manual apprenticeship process for annual DentAcademy intake Staff and apprentices use a web portal to:

- Register and manage apprentices (personal details, education, photos)
- Assign mentors and track trade modules
- Record attendance and mentor evaluations
- Score dropout / completion risk with a machine-learning model
- Generate PDF reports (individual and programme summary)
- Capture daily apprentice “experience” feedback via an AI chatbot, with escalation to supervisors
- Audit important actions for accountability

---

## 2. Tech stack

| Layer | Technologies |
|--------|----------------|
| **Frontend** | React 18, React Router 6, Axios, Tailwind CSS 3, Vite 5, Lucide icons |
| **Backend** | FastAPI, SQLAlchemy 2, Pydantic, PyJWT, bcrypt, Alembic, Jinja2, WeasyPrint, httpx |
| **Database** | MySQL-compatible (local MariaDB/MySQL or TiDB Cloud Serverless) |
| **Classical AI** | scikit-learn `RandomForestRegressor`, joblib (`ai/model.pkl`) |
| **LLM AI** | OpenRouter (default model `openai/gpt-4o-mini`) for experience chat and formal PDF commentary |

Repo layout:

```
DentAcademy-System/
├── dentacademy-frontend/     # React SPA
├── dentacademy-backend/      # FastAPI API + AI + PDF templates
├── Dockerfile                # Production image (SPA + API)
└── render.yaml               # Free Render Blueprint
```

---

## 3. High-level architecture

```text
Browser (React)
    │  HTTPS / same-origin /api
    ▼
Vite (dev) or FastAPI StaticFiles (prod)
    │  proxy /api → backend   OR   same process
    ▼
FastAPI routers  ──►  SQLAlchemy  ──►  MySQL / TiDB
                 ──►  Random Forest (model.pkl)
                 ──►  OpenRouter (optional)
                 ──►  WeasyPrint PDFs
```

### Development

- Frontend: `http://localhost:3000` (Vite)
- Backend: `http://localhost:8000` (Uvicorn)
- Vite proxies `/api` and `/uploads` to the backend so the browser can use same-origin URLs (important for Cloudflare tunnels and avoiding mixed-content issues).

### Production (Docker / Render)

- Vite builds the SPA into `dist/`
- FastAPI serves the SPA and the JSON API on one port
- Database is external (recommended: TiDB Cloud free tier)

---

## 4. Authentication and roles (RBAC)

### Login flow

1. User submits username/password to `POST /api/auth/login`
2. Backend verifies bcrypt hash, applies lockout after 5 failures
3. Response includes a JWT **and** sets an HttpOnly cookie `access_token`
4. Frontend stores the JWT in `localStorage` and sends `Authorization: Bearer <token>` on later requests
5. Protected routes on the frontend check role via `ProtectedRoute`

JWT payload includes `user_id` and `role`. Default expiry is 60 minutes (`JWT_EXPIRY_MINUTES`).

### Roles

| Role | Typical access |
|------|----------------|
| **Administrator** | Full system: users, settings, audit, reports, predictions, escalations |
| **Supervisor** | Oversight, approvals, reports, escalations, risk views |
| **Mentor** | Assigned apprentices, evaluations, module progress, attendance |
| **Apprentice** | Own dashboard, modules, experience chat |

---

## 5. Functional modules

| Area | Backend prefix | What it does |
|------|----------------|--------------|
| Auth | `/api/auth` | Login, logout, me, password reset/change |
| Users | `/api/users` | Create/manage accounts |
| Apprentices | `/api/apprentices` | Profile, education, photo upload, registration workflow |
| Mentors | `/api/mentors` | Mentor profiles and apprentice assignments |
| Modules | `/api/modules` | Trade modules and per-apprentice progress |
| Evaluations | `/api/evaluations` | Mentor ratings; staff approval |
| Attendance | `/api/attendance` | Period attendance rates |
| Predictions | `/api/predictions` | Generate/store AI risk scores |
| Reports | `/api/reports` | PDF apprentice + programme reports |
| Experience chat | `/api/experience-chat` | Daily feedback chatbot + escalations |
| Audit | `/api/audit` | Action log for admins |
| Config | `/api/config` | System settings (e.g. risk threshold) |
| Dashboard | `/api/dashboard` | Aggregated stats per role |

### Role dashboards (frontend)

- Administrator → `/dashboard/admin`
- Supervisor → `/dashboard/supervisor`
- Mentor → `/dashboard/mentor`
- Apprentice → `/dashboard/apprentice` and `/experience-chat`

---

## 6. Database

### Engines supported

- Local MariaDB/MySQL (see `dentacademy-backend/start-db.sh` for a user-space MariaDB helper)
- **TiDB Cloud** (MySQL protocol, TLS). Public CA files live under `dentacademy-backend/certs/`

Startup can auto-create the database/tables when `DB_AUTO_CREATE=1` and `AUTO_CREATE_TABLES=1`. Schema is also managed with Alembic migrations.

### Main tables / models

| Table | Purpose |
|-------|---------|
| `users` | Accounts and roles |
| `apprentices` | Apprentice profiles linked to users |
| `education` / `education_subjects` | School marks / qualification |
| `mentors` / `mentor_assignments` | Mentors and who they coach |
| `modules` / `module_progress` | Curriculum and completion status |
| `evaluations` | Mentor ratings (discipline, teamwork, etc.) |
| `attendance` | Attendance rates by period |
| `ai_predictions` | Stored ML outputs + feature snapshot |
| `audit_log` | Security/compliance events |
| `settings` | Tunable system config |
| `chat_conversations` / `chat_messages` | Experience chatbot history |
| `apprentice_experiences` | Classified daily experiences |
| `experience_escalations` | Items needing supervisor review |

---

## 7. Classical AI — dropout / completion prediction

This is the **scikit-learn** model used on the Predictions and Performance screens. It is separate from the OpenRouter chatbot.

### Goal

Estimate how likely an apprentice is to **complete** the programme (0–100).  
**Dropout risk** is derived as:

```text
dropout_risk = 100 − completion_likelihood
```

Also computed: **employment readiness** and a **confidence score**.

### Key files

| File | Role |
|------|------|
| `dentacademy-backend/ai/scoring.py` | Feature names, expert heuristic, confidence helpers |
| `dentacademy-backend/ai/features.py` | Build features from the live database |
| `dentacademy-backend/ai/train.py` | Train and save `model.pkl` |
| `dentacademy-backend/ai/model.py` | Load pickle and run inference |
| `dentacademy-backend/ai/model.pkl` | Deployed trained bundle |
| `dentacademy-backend/services/prediction_service.py` | API orchestration (gate → predict → save) |

### Feature vector (12 inputs)

Defined in `FEATURE_NAMES`:

1. `academic_avg_mark` — from education subjects / average mark  
2. `module_completion_pct` — completed modules vs active modules  
3. `avg_assessment_score` — module assessment scores  
4. `attendance_rate` — mean attendance  
5. `avg_discipline`  
6. `avg_commitment`  
7. `avg_willingness`  
8. `avg_teamwork`  
9. `avg_time_management`  
10. `avg_professional_conduct` — means of **approved** mentor evaluations (1–5)  
11. `eval_count` — number of approved evaluations  
12. `eval_trend` — least-squares slope of overall evaluation scores over time  

**Minimum data gate:** education, attendance, module progress, and **at least 2 approved evaluations**. If the gate fails, prediction is refused with `missing_features` (no blind guess from empty data).

### How the model was trained

The shipped pickle is **`rf-oulad-v1`**, trained on the cleaned Open University Learning Analytics Dataset. Cleaning steps, row counts, and hold-out metrics are in `dentacademy-backend/ai/TRAINING.md`. The forest uses four live features (`academic_avg_mark`, `module_completion_pct`, `avg_assessment_score`, `attendance_rate`) and a real Pass/Distinction vs Fail/Withdrawn label. Mentor ratings are not in that dataset, so they are not model inputs. The expert formula below is the fallback when the pickle cannot run.

Process (`python ai/prepare_oulad.py`, then `python -m ai.train`):

1. Clean OULAD into `ai/data/oulad_training.csv` (32,593 student-module rows).
2. Label Pass/Distinction as 100 and Fail/Withdrawn as 0.
3. Train/test split **80/20**, random seed **42**.
4. Fit a **`RandomForestRegressor`** (`n_estimators=200`, `max_depth=10`, `min_samples_leaf=6`).
5. Save `ai/model.pkl` as version `rf-oulad-v1` with `blend_with_expert: false`.

Hold-out MAE is about 10 points, R² about 0.79, and accuracy at a score of 50 is about 0.93. Module completion dominates the importances because submitting the assessment bank is the strongest signal in this dataset.

### Expert heuristic (labels + fallback)

Weighted completion score (conceptually):

| Signal | Approximate weight |
|--------|--------------------|
| Attendance | 22% |
| Module completion | 20% |
| Academic average | 14% |
| Assessment scores | 12% |
| Mentor ratings (scaled to %) | 24% |
| Evaluation trend | 8% |

If the pickle is missing or inference fails, the system falls back to this heuristic alone (`expert-heuristic-v2`).

### Inference at runtime

1. Staff call `POST /api/predictions/{apprentice_id}/generate` (admin/supervisor)
2. `build_feature_vector` reads live DB rows
3. `PredictionModel.predict` runs the forest on the four OULAD features. `rf-oulad-v1` does not blend in the expert score. Older bundles that set `blend_with_expert` still use `0.75 × forest + 0.25 × expert`.
4. Derives `dropout_risk`, `employment_readiness`, `confidence_score` (tree disagreement + eval count + score extremity)
5. Persists an `AIPrediction` row including `feature_snapshot_json` for auditability (FR-30/FR-32)

Legacy pickles (old classifiers / 9-feature models) are still loadable for compatibility.

### Risk labels in the UI

Default threshold setting: `dropout_risk_threshold` = **60** (configurable in System Settings).

Typical banding:

| Dropout risk | Interpretation |
|--------------|----------------|
| Above threshold (e.g. > 60) | High risk |
| Above half threshold | Monitor / medium |
| Otherwise | Low risk / on track |

At-risk lists on dashboards use `dropout_risk > threshold`.

### Retraining

```bash
cd dentacademy-backend
source venv/bin/activate
python -m ai.train
# writes ai/model.pkl — restart API or clear model cache to reload
```

Set `MODEL_PATH` if the file lives elsewhere.

---

## 8. LLM AI — experience chatbot and report commentary

### Experience chat

Apprentices describe daily workshop experiences in `/experience-chat`.

Pipeline (`services/ai/`):

1. **OpenRouter client** — chat completions API  
2. **Classification** — labels such as `GOOD`, `BAD`, `APPRENTICE_MISCONDUCT` with severities `LOW` … `CRITICAL`  
3. **Chatbot service** — stores conversation/messages, replies helpfully, decides escalation  
4. **Escalation service** — creates supervisor workflow items when severity is high/critical, emergency, or `requires_escalation`

If `OPENROUTER_API_KEY` is unset, classification falls back to rule/regex logic so the app still runs.

Staff review queue: `/escalations` (Administrator / Supervisor).

### PDF commentary

When generating formal PDF reports, the system can ask OpenRouter for polished commentary. Without an API key, deterministic formal text is still produced so PDFs always generate.

Default model env: `AI_MODEL=openai/gpt-4o-mini`.

---

## 9. PDF reports (WeasyPrint)

- Service: `services/report_service.py`
- Templates: `templates/reports/apprentice_report.html`, `programme_summary.html`
- Output: PDF via WeasyPrint (needs Pango/fonts — installed in the Docker image)
- Includes performance metrics, AI risk summary, optional LLM commentary
- Timezone context: Africa/Johannesburg

Endpoints include:

- `GET /api/reports/apprentice/{id}`
- `GET /api/reports/programme-summary`

---

## 10. Security notes

- Passwords hashed with bcrypt  
- JWT required for protected APIs  
- Account lockout after repeated failed logins  
- Security headers middleware (CSP, HSTS, frame denial, etc.)  
- Audit log for sensitive actions  
- Production refuses to start without a strong `JWT_SECRET_KEY` when `ENVIRONMENT=production`  
- Uploaded photos stored under `UPLOAD_DIR` (ephemeral on free PaaS — lost on restart)

---

## 11. Demo / seed accounts

With `AUTO_SEED=1` or `python seed.py` (defaults):

| Role | Username | Password |
|------|----------|----------|
| Administrator | `admin` | `Admin@123` |
| Supervisor | `supervisor` | `Super@123` |
| Mentors | `mentor001`, `mentor002`, … | `Mentor@123` |
| Apprentices | `apprentice00001`, … | `Apprent@123` |

Defaults seed ~150 apprentices and ~20 mentors (overridable via `SEED_*` env vars). After first production deploy, set `AUTO_SEED=0`.

---

## 12. Environment variables (backend)

See `dentacademy-backend/.env.example` for the full list. Important ones:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | SQLAlchemy MySQL/TiDB URL |
| `DB_SSL_REQUIRED` / `DB_SSL_CA` | TiDB TLS |
| `JWT_SECRET_KEY` | Sign tokens |
| `MODEL_PATH` | Path to `model.pkl` |
| `OPENROUTER_API_KEY` / `AI_MODEL` | LLM features |
| `AUTO_CREATE_TABLES` / `AUTO_SEED` | Startup provisioning |
| `SECURE_COOKIES` / `ENVIRONMENT` | Production hardening |
| `FRONTEND_URL` / `CORS_ORIGINS` | CORS (Render can auto-use `RENDER_EXTERNAL_URL`) |
| `SMTP_*` | Password-reset email |

Frontend (optional):

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Leave **empty** for same-origin `/api` (recommended for tunnels). Do not set to `http://localhost:8000` when sharing via a public HTTPS URL. |

---

## 13. Running locally

### Database

```bash
# Option A: helper script (user-space MariaDB)
./dentacademy-backend/start-db.sh

# Option B: your own MySQL — create DB and point DATABASE_URL in .env
```

### Backend

```bash
cd dentacademy-backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then edit DATABASE_URL + JWT_SECRET_KEY
# ENVIRONMENT=development
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```bash
cd dentacademy-frontend
npm install
npm run dev -- --host 0.0.0.0 --port 3000
```

Open http://localhost:3000 — API docs at http://localhost:8000/docs

### Temporary public share (no Render)

If Cursor port-forward is unavailable, a Cloudflare quick tunnel to port 3000 works while your laptop stays online. Vite must allow tunnel hosts (`server.allowedHosts: true`) and API must use same-origin `/api`.

---

## 14. Free cloud deploy (Render + TiDB)

1. Push repo to GitHub (or fork if you are a collaborator)  
2. Create a free **TiDB Cloud** Serverless cluster → copy MySQL URL  
3. On **Render**: New → Blueprint → select repo → paste `DATABASE_URL`  
4. Blueprint (`render.yaml`) sets production defaults, SSL CA path, `AUTO_SEED=1`, generates `JWT_SECRET_KEY`  
5. After first login, set `AUTO_SEED=0` and redeploy  

Limits on free tiers: cold starts after idle, ephemeral disk (photos), SMTP often blocked on Render free.

Docker image builds frontend + backend; health check path `/redoc`.

---

## 15. Mental model (end-to-end)

1. Admins create users; apprentices complete registration (education, modules start empty)  
2. Mentors evaluate and mark attendance/progress over time  
3. When enough data exists, staff generate an AI prediction → Random Forest + expert blend → risk badges and at-risk lists  
4. Apprentices chat about daily experiences → LLM (or rules) classifies → high severity escalates to supervisors  
5. Staff export WeasyPrint PDFs for individuals or the whole programme  

---

## 16. Related docs in the repo

- Root `README.md` — short overview and classic setup  
- `dentacademy-backend/.env.example` — production/Render checklist  
- `render.yaml` — free Render Blueprint  
- `dentacademy-backend/ai/train.py` — training script docstring and hyperparameters  

---

*Document generated for the DentAcademy COSC300 2026 project. Update this file when model versions, feature lists, or deploy targets change.*
