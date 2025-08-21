from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import SignupSerializer, AuthenticateSerializer, VideoSerializer
from .models import User
from utils.jwt_helpers import generate_tokens
from .permissions import IsJwtAuthenticated
from .tasks import process_video_task

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

class VideoUploadView(APIView):
    serializer_class = VideoSerializer
    permission_classes = [IsJwtAuthenticated]

    def post(self, request):
        serializer = VideoSerializer(data=request.data)
        if serializer.is_valid():
            video = serializer.save(user=request.user)
            print("request.user:", request.user)
            print("is_authenticated:", request.user.is_authenticated)

            # Queue video processing task
            process_video_task.delay(video.id)

            return Response({
                **VideoSerializer(video).data,
                "message": "Video uploaded successfully. Processing started in background."
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)