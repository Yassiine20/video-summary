from django.db import models
from django.contrib.auth.models import AbstractUser
# Create your models here.

class User(AbstractUser):
    email = models.EmailField(unique=True, null=False, blank=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user"

    def __str__(self):
        return self.username
    


class Video(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='videos')
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='videos/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    processed = models.BooleanField(default=False)
    duration = models.FloatField(null=True, blank=True)  # in seconds

    class Meta:
        db_table = 'videos'
    
    def __str__(self):
        return self.title


class Transcript(models.Model):
    video = models.ForeignKey(Video, on_delete=models.CASCADE)
    text = models.TextField()
    start_time = models.FloatField(default=0.0)  # start time in seconds
    end_time = models.FloatField(default=0.0)    # end time in seconds
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'transcripts'

    def __str__(self):
        return f"Transcript for {self.video.title} ({self.start_time}s - {self.end_time}s)"


class Summary(models.Model):
    video = models.ForeignKey(Video, on_delete=models.CASCADE)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'summaries'

    def __str__(self):
        return f"Summary for {self.video.title}"

