# utils/video_helper.py - Video processing utilities
import whisper
import os
import subprocess
from groq import Groq
from api.models import Video, Transcript, Summary
from django.conf import settings

client = Groq(api_key=settings.GROQ_API_KEY)


def get_video_duration(file_path):
    """Get video duration using ffprobe"""
    try:
        cmd = [
            'ffprobe', 
            '-v', 'quiet', 
            '-show_entries', 'format=duration', 
            '-of', 'csv=p=0', 
            file_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            return float(result.stdout.strip())
        else:
            print(f"ffprobe error: {result.stderr}")
            return 0.0
    except Exception as e:
        print(f"Error getting video duration: {e}")
        return 0.0


def process_video(video_obj):
    """
    Transcribe the full audio into a single transcript and summarize it.
    Alternative function that takes video object directly.
    """
    file_path = video_obj.file.path

    # Load Whisper model
    model = whisper.load_model("base")  # or "small", "medium", etc.

    # Transcribe the full audio
    result = model.transcribe(file_path)
    full_text = result["text"]  # full transcription as a single string
    
    # Get actual video duration
    video_duration = get_video_duration(file_path)

    # Save single transcript
    transcript = Transcript.objects.create(
        video=video_obj,
        text=full_text,
        start_time=0.0,
        end_time=video_duration
    )

    # Create summary using Groq
    summary = generate_summary(transcript)

    # Mark video as processed
    video_obj.processed = True
    video_obj.duration = video_duration
    video_obj.save()

    # Return serializable data instead of model objects
    return {
        "transcript_id": transcript.id,
        "transcript_text": transcript.text,
        "summary_id": summary.id,
        "summary_text": summary.text,
        "duration": video_obj.duration,
        "message": f"Successfully processed video {video_obj.id}"
    }

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
