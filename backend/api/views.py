import jwt
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import (
    SignupSerializer, 
    AuthenticateSerializer, 
    VideoSerializer, 
    VideoDetailSerializer,
    TranscriptSerializer,
    SummarySerializer,
    UserEditSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)
from .models import User, Video, Transcript, Summary
from utils.jwt_helpers import generate_tokens, verify_token
from .permissions import IsJwtAuthenticated
from .tasks import process_video_async
from django.shortcuts import get_object_or_404
from django.conf import settings
from celery.result import AsyncResult
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail

class SignUpView(APIView):
    serializer_class = SignupSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data

            # Create user and hash password
            user = User(
                username=data['username'],
                email=data['email'],
                first_name=data['first_name'],
                last_name=data['last_name']
            )
            user.set_password(data['password'])
            user.save()

            tokens = generate_tokens(user)

            return Response({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "id_token": tokens["access_token"],
                'refresh_token' : tokens["refresh_token"]
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AuthenticateView(APIView):
    serializer_class = AuthenticateSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']

            tokens = generate_tokens(user)

            return Response({
                "id": user.id,
                "username": user.username,
                "id_token": tokens["access_token"],
                "refresh_token": tokens["refresh_token"]
            }, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class RefreshView(APIView):
    def post(self, request):
        refresh_token = request.data.get("refresh_token")
        if not refresh_token:
            return Response({"error": "Refresh token required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            verified, data = verify_token(refresh_token, token_type="refresh", secret_key=settings.JWT_SECRET_KEY)
            if not verified:
                return Response({"error": "Invalid refresh token"}, status=status.HTTP_401_UNAUTHORIZED)

            user = get_object_or_404(User, id=data["user_id"])
            tokens = generate_tokens(user)
            return Response(tokens, status=status.HTTP_200_OK)
        except jwt.ExpiredSignatureError:
            return Response({"error": "Refresh token expired"}, status=status.HTTP_401_UNAUTHORIZED)
        except jwt.InvalidTokenError:
            return Response({"error": "Invalid refresh token"}, status=status.HTTP_401_UNAUTHORIZED)

class VideoUploadView(APIView):
    serializer_class = VideoSerializer
    permission_classes = [IsJwtAuthenticated]

    def post(self, request):
        serializer = VideoSerializer(data=request.data)
        if serializer.is_valid():
            video = serializer.save(user=request.user)
            print("request.user:", request.user)
            print("is_authenticated:", request.user.is_authenticated)

            # Queue video processing task asynchronously
            task = process_video_async.delay(video.id)
            
            return Response({
                **VideoSerializer(video).data,
                "message": "Video uploaded successfully. Processing has been queued.",
                "task_id": task.id,
                "status": "processing_queued"
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VideoListView(APIView):
    """Get list of user's videos"""
    permission_classes = [IsJwtAuthenticated]

    def get(self, request):
        videos = Video.objects.filter(user=request.user).order_by('-uploaded_at')
        serializer = VideoSerializer(videos, many=True)
        return Response({
            "videos": serializer.data,
            "count": videos.count()
        }, status=status.HTTP_200_OK)


class VideoDetailView(APIView):
    """Get detailed information about a specific video"""
    permission_classes = [IsJwtAuthenticated]

    def get(self, request, video_id):
        video = get_object_or_404(Video, id=video_id, user=request.user)
        serializer = VideoDetailSerializer(video)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def delete(self, request, video_id):
        """Delete a video from database only (keep physical file)"""
        video = get_object_or_404(Video, id=video_id, user=request.user)
        
        # Store video info before deletion
        video_title = video.title
        video_file_path = video.file.name if video.file else "No file"
        
        # Delete from database only (this will cascade delete transcripts and summaries)
        video.delete()
        
        return Response({
            "message": f"Video '{video_title}' has been removed from your account successfully.",
            "note": f"Physical file '{video_file_path}' has been preserved on the server."
        }, status=status.HTTP_200_OK)


class VideoTranscriptView(APIView):
    """Get transcript for a specific video"""
    permission_classes = [IsJwtAuthenticated]

    def get(self, request, video_id):
        video = get_object_or_404(Video, id=video_id, user=request.user)
        transcripts = Transcript.objects.filter(video=video)
        
        if not transcripts.exists():
            return Response({
                "message": "No transcript available for this video. Make sure the video has been processed."
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = TranscriptSerializer(transcripts, many=True)
        return Response({
            "video_id": video_id,
            "video_title": video.title,
            "transcripts": serializer.data
        }, status=status.HTTP_200_OK)


class VideoSummaryView(APIView):
    """Get summary for a specific video"""
    permission_classes = [IsJwtAuthenticated]

    def get(self, request, video_id):
        video = get_object_or_404(Video, id=video_id, user=request.user)
        summaries = Summary.objects.filter(video=video)
        
        if not summaries.exists():
            return Response({
                "message": "No summary available for this video. Make sure the video has been processed."
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = SummarySerializer(summaries, many=True)
        return Response({
            "video_id": video_id,
            "video_title": video.title,
            "summaries": serializer.data
        }, status=status.HTTP_200_OK)


class TaskStatusView(APIView):
    permission_classes = [IsJwtAuthenticated]
    
    def get(self, request, task_id):
        """
        Get the status of a Celery task
        """
        try:
            result = AsyncResult(task_id)
            
            response_data = {
                'task_id': task_id,
                'status': result.status,
                'ready': result.ready(),
            }
            
            if result.ready():
                if result.successful():
                    response_data['result'] = result.result
                else:
                    response_data['error'] = str(result.info)
            else:
                # Task is still running, check for progress info
                if hasattr(result.info, 'get') and result.info:
                    response_data['progress'] = result.info
                
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': f'Failed to get task status: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)

class EditUserInfoView(APIView):
    permission_classes = [IsJwtAuthenticated]

    def put(self, request):
        user = request.user
        serializer = UserEditSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(APIView):
    """Request a password reset: send email with tokenized link"""
    serializer_class = PasswordResetRequestSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Do not reveal whether email exists
            return Response({'detail': 'Email not found.'}, status=status.HTTP_404_NOT_FOUND)

        token_generator = PasswordResetTokenGenerator()
        token = token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        # If you host the frontend separately (e.g. http://localhost:4200) you can set
        # FRONTEND_BASE_URL in Django settings. Otherwise fall back to the current request host.
        frontend_base = getattr(settings, 'FRONTEND_BASE_URL', None)
        if frontend_base:
            frontend_base = frontend_base.rstrip('/')
        else:
            frontend_base = f"{request.scheme}://{request.get_host()}"

        reset_link = f"{frontend_base}/reset-password?uid={uid}&token={token}"

        subject = 'Password reset request'
        message = f'Hello {user.username},\n\nUse the link below to reset your password:\n{reset_link}\n\nIf you did not request this, ignore this email.'
        send_mail(subject, message, None, [user.email], fail_silently=True)

        return Response({'detail': 'A reset email has been sent.'}, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    serializer_class = PasswordResetConfirmSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        uid = serializer.validated_data['uid']
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']

        try:
            uid_decoded = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=uid_decoded)
        except Exception:
            return Response({'detail': 'Invalid link.'}, status=status.HTTP_400_BAD_REQUEST)

        token_generator = PasswordResetTokenGenerator()
        if not token_generator.check_token(user, token):
            return Response({'detail': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({'detail': 'Password has been reset.'}, status=status.HTTP_200_OK)