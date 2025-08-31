"""
Celery configuration module
"""
import sys
import os

# Add the parent directory to the path to import celery_app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from celery_app import app
