"""
Celery tasks for async video processing
"""
from celery import shared_task
from django.apps import apps
import whisper
import os
from utils.video_helper import get_video_duration, generate_summary
from groq import Groq
from django.conf import settings

client = Groq(api_key=settings.GROQ_API_KEY)


def update_progress(self, current, total, message, state='PROGRESS'):
    self.update_state(
        state=state,
        meta={
            'current': current,
            'total': total,
            'message': message
        }
    )

@shared_task(bind=True)
def process_video_async(self, video_id):
    """
    Async task to process video in background with progress tracking
    """
    try:
        Video = apps.get_model('api', 'Video')
        Transcript = apps.get_model('api', 'Transcript')
        video = Video.objects.get(id=video_id)
        file_path = video.file.path

        update_progress(self, 10, 100, 'Initializing video processing...')
        update_progress(self, 20, 100, 'Loading speech recognition model...')
        model = whisper.load_model("tiny")  # Much faster than "base"
        update_progress(self, 30, 100, 'Transcribing audio... (This may take a while)')
        result = model.transcribe(file_path)
        full_text = result["text"]
        update_progress(self, 70, 100, 'Audio transcription completed. Getting video info...')
        video_duration = get_video_duration(file_path)
        update_progress(self, 80, 100, 'Saving transcript...')
        transcript = Transcript.objects.create(
            video=video,
            text=full_text,
            start_time=0.0,
            end_time=video_duration
        )
        update_progress(self, 90, 100, 'Generating AI summary...')
        summary = generate_summary(transcript)
        update_progress(self, 95, 100, 'Finalizing...')
        video.processed = True
        video.duration = video_duration
        video.save()

        # Send email notification to the uploader
        from django.core.mail import send_mail
        subject = f'Your video "{video.title}" is processed!'
        message = f'Hello {video.user.username},\n\nYour video "{video.title}" has been processed successfully.\n\nDuration: {video.duration} seconds\nSummary: {summary.text}\n\nTranscript (first 500 chars):\n{full_text[:500]}...'
        recipient_list = [video.user.email]
        send_mail(subject, message, None, recipient_list, fail_silently=True)

        return {
            'status': 'SUCCESS',
            'current': 100,
            'total': 100,
            'message': f'Video "{video.title}" processed successfully!',
            'transcript_id': transcript.id,
            'summary_id': summary.id,
            'duration': video.duration
        }
    except Video.DoesNotExist:
        update_progress(self, 0, 100, f'Video with ID {video_id} not found', state='FAILURE')
        raise Exception(f'Video with ID {video_id} not found')
    except Exception as exc:
        update_progress(self, 0, 100, f'Processing failed: {str(exc)}', state='FAILURE')
        raise exc
