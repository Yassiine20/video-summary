# Video Summary Application

A Django-based application that processes video files to generate transcripts and summaries using AI.

## Features

- **Video Upload**: Upload video files for processing
- **Audio Transcription**: Extract and transcribe audio using OpenAI Whisper
- **AI Summarization**: Generate summaries using Groq's LLM API
- **Asynchronous Processing**: Background task processing with Celery
- **REST API**: Django REST Framework endpoints
- **User Authentication**: JWT-based authentication system

## Tech Stack

### Backend

- **Django 5.2.5** - Web framework
- **Django REST Framework** - API development
- **Celery** - Asynchronous task processing
- **OpenAI Whisper** - Audio transcription
- **Groq API** - Text summarization
- **SQLite** - Database (development)
- **Redis/RabbitMQ** - Message broker for Celery

### Frontend

- _[To be implemented]_

## Project Structure

```
video-summary/
├── backend/
│   ├── api/                    # Main API application
│   │   ├── models.py          # Database models
│   │   ├── views.py           # API views
│   │   ├── serializers.py     # DRF serializers
│   │   ├── tasks.py           # Celery tasks
│   │   └── tests/             # Unit tests
│   ├── settings/              # Django settings
│   │   ├── settings.py        # Main settings
│   │   ├── celery.py          # Celery configuration
│   │   └── urls.py            # URL configuration
│   ├── utils/                 # Utility functions
│   │   ├── jwt_helpers.py     # JWT utilities
│   │   └── video_helper.py    # Video processing utilities
│   ├── videos/                # Uploaded video files
│   └── manage.py              # Django management script
├── frontend/                  # Frontend application (TBD)
├── venv/                      # Virtual environment
├── .gitignore                 # Git ignore rules
└── README.md                  # This file
```

## Installation

### Prerequisites

- Python 3.12+
- Redis or RabbitMQ (for Celery)
- FFmpeg (for video processing)

### Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd video-summary
   ```

2. **Create virtual environment**

   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

4. **Environment variables**
   Create a `.env` file in the backend directory:

   ```env
   SECRET_KEY=your-django-secret-key
   JWT_SECRET_KEY=your-jwt-secret-key
   GROQ_API_KEY=your-groq-api-key
   DEBUG=True
   ```

5. **Database setup**

   ```bash
   cd backend
   python manage.py migrate
   python manage.py createsuperuser
   ```

6. **Start Redis/RabbitMQ**

   ```bash
   # For Redis
   redis-server

   # For RabbitMQ
   rabbitmq-server
   ```

7. **Start Celery worker**

   ```bash
   celery -A settings worker --loglevel=info
   ```

8. **Run development server**
   ```bash
   python manage.py runserver
   ```

## API Endpoints

### Authentication

- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login
- `POST /api/auth/logout/` - User logout

### Video Processing

- `POST /api/videos/upload/` - Upload video for processing
- `GET /api/videos/` - List user's videos
- `GET /api/videos/{id}/` - Get video details
- `GET /api/videos/{id}/transcript/` - Get video transcript
- `GET /api/videos/{id}/summary/` - Get video summary

## Usage

1. **Register/Login** to get access token
2. **Upload a video** using the upload endpoint
3. **Wait for processing** - Celery will handle transcription and summarization
4. **Retrieve results** using the transcript and summary endpoints

## Development

### Running Tests

```bash
cd backend
python manage.py test
```

### Code Style

- Follow PEP 8 guidelines
- Use Black for code formatting
- Use isort for import sorting

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Configuration

### Celery Settings

The application uses Celery for background processing. Configure your broker in `settings/settings.py`:

```python
CELERY_BROKER_URL = 'redis://127.0.0.1:6379/0'  # or RabbitMQ URL
CELERY_RESULT_BACKEND = 'redis://127.0.0.1:6379/0'
```

### Video Storage

Videos are stored in the `backend/videos/` directory. In production, consider using cloud storage like AWS S3.

## Deployment

### Production Considerations

- Use PostgreSQL instead of SQLite
- Configure proper media file storage
- Set up proper logging
- Use environment variables for all secrets
- Configure CORS for frontend integration
- Set up monitoring and error tracking

## License

_[Add your license here]_

## Support

_[Add support information here]_
