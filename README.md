# Video Summary Application

A Django-based application that processes video files to generate transcripts and summaries using AI.

## Features

- **Video Upload**: Upload video files for processing

# Video Summary — full-stack app (Django + Angular)

This repository contains a Django backend that accepts video uploads, transcribes audio using OpenAI Whisper, and generates AI summaries (via Groq). Processing is performed asynchronously by Celery workers with Redis as the recommended broker.

Follow the Quick Start to run the project locally.

---

## Quick overview

- Backend: Django + Django REST Framework
- Background processing: Celery + Redis
- Transcription: OpenAI Whisper (CPU or GPU)
- Summarization: Groq LLM (requires `GROQ_API_KEY`)
- Frontend: Angular (in `frontend/`)

## Quick Start (Windows)

Assumes you run commands from the repository root.

1. Create & activate Python venv

```powershell
python -m venv venv
& .\venv\Scripts\Activate
```

2. Install backend dependencies

```powershell
pip install -r requirements.txt
```

3. Create backend environment file (recommended: `backend/.env`)
   ```powershell
   cd backend
   cp .env.example .env
   ```

4. Apply database migrations and create admin user

```powershell
python manage.py migrate
python manage.py createsuperuser
cd ..
```

5. Start Redis (required by Celery)

On Windows you can run Redis via WSL, Docker, or a Windows build. Example (Docker):

```powershell
# using Docker
docker run -p 6379:6379 --name video-summary-redis -d redis:7
```

6. Start Celery worker (run in a separate terminal)

```powershell
cd backend
& .\venv\Scripts\Activate
celery -A settings worker --loglevel=info
```

7. Run the Django development server

```powershell
cd backend
& .\venv\Scripts\Activate.ps1
python manage.py runserver 0.0.0.0:8000
```

8. Start the frontend dev server (optional)

```powershell
cd frontend
npm install
npm start
```

Open the frontend at http://localhost:4200 and the API at http://localhost:8000.

---

## Development notes

- Environment files: keep your real `.env` out of git. Use `.env.example` to document variables. The project uses `python-decouple` to read env variables.
- If you run Whisper on GPU, install a CUDA-compatible `torch` build and ensure `torch.cuda.is_available()` is True.
- If email is not required while developing, set an email backend like `django.core.mail.backends.console.EmailBackend` in `settings.py` to print emails to console.

## Useful commands

- Backup and regenerate requirements (PowerShell):

```powershell
Copy-Item .\requirements.txt .\requirements-full.txt
& .\venv\Scripts\Activate.ps1
pip freeze > requirements.txt
```

- Run tests (backend):

```powershell
cd backend
& .\venv\Scripts\Activate.ps1
python manage.py test
```

---

## Project structure (high level)

```
video-summary/
├── backend/                # Django project
│   ├── api/                # API app (models, views, serializers, tasks)
│   ├── settings/           # Django settings + celery wiring
│   ├── utils/              # helpers (whisper, groq usage)
│   └── manage.py
├── frontend/               # Angular app (UI)
├── requirements.txt        # Backend runtime requirements
├── requirements-dev.txt    # (optional) dev/test requirements
└── .env.example            # Example env file
```

## Potential considerations

- Use PostgreSQL for production databases.
- Use a process manager (systemd, Supervisor) for Celery/Django and a reverse proxy (nginx) for Django.
- Configure proper logging, monitoring, and secrets management.

