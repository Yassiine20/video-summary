# tasks.py
from celery import Celery
import whisper
import os
from groq import Groq
from api.models import Video, Transcript, Summary
from django.conf import settings


app = Celery('video_processing')

client = Groq(api_key=settings.GROQ_API_KEY)

@app.task
def process_video_task(video_id):
    """
    Celery task to process video: transcribe and summarize
    """
    try:
        video_obj = Video.objects.get(id=video_id)
        file_path = video_obj.file.path

        # Load Whisper model
        model = whisper.load_model("base")

        # Transcribe the full audio
        result = model.transcribe(file_path)
        full_text = result["text"]

        # Save transcript
        transcript = Transcript.objects.create(
            video=video_obj,
            text=full_text,
            start_time=0.0,
            end_time=result.get("duration", 0.0)
        )

        # Generate summary
        summary = generate_summary(transcript)

        # Mark video as processed
        video_obj.processed = True
        video_obj.duration = result.get("duration", 0.0)
        video_obj.save()

        return f"Successfully processed video {video_id}"

    except Video.DoesNotExist:
        return f"Video {video_id} not found"
    except Exception as e:
        return f"Error processing video {video_id}: {str(e)}"

def generate_summary(transcript):
    """
    Generate summary for a video's transcript using Groq LLM.
    """
    if not transcript or not transcript.text.strip():
        raise ValueError("Transcript is empty, cannot generate summary.")

    video_obj = transcript.video

    # Ask Groq LLM to summarize
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You are an assistant that summarizes transcripts clearly and concisely."},
            {"role": "user", "content": f"Summarize this transcript:\n\n{transcript.text}"}
        ]
    )

    summary_text = response.choices[0].message.content

    # Save summary in DB
    summary = Summary.objects.create(video=video_obj, text=summary_text)
    return summary
