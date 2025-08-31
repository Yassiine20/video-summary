from rest_framework import serializers
from .models import User, Video, Transcript, Summary
from django.contrib.auth import authenticate

class SignupSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=255)
    last_name = serializers.CharField(max_length=255)
    password = serializers.CharField(write_only=True)


    def validate_username(self, value):
        from .models import User
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists.")
        return value

    def validate_email(self, value):
        from .models import User
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists.")
        return value
    

class AuthenticateSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data['username'], password=data['password'])
        if not user:
            raise serializers.ValidationError("Invalid username or password")
        data['user'] = user
        return data
    
class VideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Video
        fields = ["id", "title", "file", "uploaded_at", "processed", "duration"]
        read_only_fields = ["uploaded_at", "processed", "duration"]


class TranscriptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transcript
        fields = ["id", "video", "text", "start_time", "end_time", "created_at"]
        read_only_fields = ["created_at"]


class SummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Summary
        fields = ["id", "video", "text", "created_at"]
        read_only_fields = ["created_at"]


class VideoDetailSerializer(serializers.ModelSerializer):
    transcript = TranscriptSerializer(source='transcript_set', many=True, read_only=True)
    summary = SummarySerializer(source='summary_set', many=True, read_only=True)
    
    class Meta:
        model = Video
        fields = ["id", "title", "file", "uploaded_at", "processed", "duration", "transcript", "summary"]

class UserEditSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name']
        extra_kwargs = {
            'email': {'required': False},
            'username': {'required': False},
            'first_name': {'required': False},
            'last_name': {'required': False},
        }


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)