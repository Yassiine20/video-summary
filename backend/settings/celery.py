# backend/settings/celery.py
from __future__ import absolute_import, unicode_literals
import os
from celery import Celery

# Tell Celery where the Django settings are
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "settings.settings")

app = Celery("video_summary")

# Load config from Django settings, using keys with "CELERY_"
app.config_from_object("django.conf:settings", namespace="CELERY")

# Autodiscover tasks.py files in all installed apps
app.autodiscover_tasks()
