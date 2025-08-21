from django.urls import path
from .views import (
    SignUpView, 
    AuthenticateView, 
    VideoUploadView,
    VideoListView,
    VideoDetailView,
    VideoTranscriptView,
    VideoSummaryView
)

urlpatterns = [
    # Authentication endpoints
    path('signup/', SignUpView.as_view(), name='signup'),
    path('authenticate/', AuthenticateView.as_view(), name='authenticate'),
    
    # Video endpoints
    path('video/upload', VideoUploadView.as_view(), name='video-upload'),
    path('videos/', VideoListView.as_view(), name='video-list'),
    path('video/<int:video_id>/', VideoDetailView.as_view(), name='video-detail'),
    path('video/<int:video_id>/transcript/', VideoTranscriptView.as_view(), name='video-transcript'),
    path('video/<int:video_id>/summary/', VideoSummaryView.as_view(), name='video-summary'),
]