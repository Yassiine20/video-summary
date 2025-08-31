from django.urls import path
from .views import (
    EditUserInfoView,
    SignUpView, 
    AuthenticateView, 
    VideoUploadView,
    VideoListView,
    VideoDetailView,
    VideoTranscriptView,
    VideoSummaryView,
    RefreshView,
    TaskStatusView,
    PasswordResetRequestView,
    PasswordResetConfirmView
)

urlpatterns = [
    # Authentication endpoints
    path('signup/', SignUpView.as_view(), name='signup'),
    path('authenticate/', AuthenticateView.as_view(), name='authenticate'),
    path('refresh/', RefreshView.as_view(), name='refresh'),

    # Video endpoints
    path('video/upload', VideoUploadView.as_view(), name='video-upload'),
    path('videos/', VideoListView.as_view(), name='video-list'),
    path('video/<int:video_id>/', VideoDetailView.as_view(), name='video-detail'),
    path('video/<int:video_id>/transcript/', VideoTranscriptView.as_view(), name='video-transcript'),
    path('video/<int:video_id>/summary/', VideoSummaryView.as_view(), name='video-summary'),
    
    # Task status endpoint
    path('task/<str:task_id>/status/', TaskStatusView.as_view(), name='task-status'),

    # User info endpoint
    path('user/edit/', EditUserInfoView.as_view(), name='edit-user-info'),

    # Password reset endpoints
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
]