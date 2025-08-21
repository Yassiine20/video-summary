from django.urls import path
from .views import SignUpView, AuthenticateView, VideoUploadView

urlpatterns = [
    path('signup/',SignUpView.as_view(), name='signup'),
    path('authenticate/',AuthenticateView.as_view(), name='authenticate'),
    path('video/upload', VideoUploadView.as_view(), name='video-upload')
]