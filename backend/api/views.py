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
    SummarySerializer
)
from .models import User, Video, Transcript, Summary
from utils.jwt_helpers import generate_tokens, verify_token
from .permissions import IsJwtAuthenticated
from utils.video_helper import process_video
from django.shortcuts import get_object_or_404
from django.conf import settings

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

            # Process video synchronously
            try:
                result = process_video(video)
                return Response({
                    **VideoSerializer(video).data,
                    "message": "Video uploaded and processed successfully.",
                    "processing_result": result
                }, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({
                    **VideoSerializer(video).data,
                    "message": "Video uploaded but processing failed.",
                    "error": str(e)
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