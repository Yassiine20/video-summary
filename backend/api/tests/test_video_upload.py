# test_video_upload.py
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from api.models import Video
from utils.jwt_helpers import generate_tokens
from unittest.mock import patch

User = get_user_model()

class VideoUploadTest(TestCase):
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        # Generate tokens and authenticate
        tokens = generate_tokens(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access_token"]}')
        
        # Create test video file
        self.video_file = SimpleUploadedFile(
            name='test_video.mp4',
            content=b'fake video content',
            content_type='video/mp4'
        )

    @patch('api.views.process_video_task.delay')
    def test_successful_video_upload(self, mock_task):
        """Test successful video upload"""
        data = {
            'title': 'My Test Video',
            'file': self.video_file
        }
        
        response = self.client.post('/api/videos/', data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check response data
        self.assertEqual(response.data['title'], 'My Test Video')
        self.assertIn('message', response.data)
        self.assertIn('Processing started in background', response.data['message'])
        
        # Verify video was created in database
        video = Video.objects.get(id=response.data['id'])
        self.assertEqual(video.title, 'My Test Video')
        self.assertEqual(video.user, self.user)
        self.assertFalse(video.processed)  # Should be False initially
        
        # Verify Celery task was called
        mock_task.assert_called_once_with(video.id)

    def test_video_upload_without_authentication(self):
        """Test video upload without authentication token"""
        self.client.credentials()  # Remove authentication
        
        data = {
            'title': 'Test Video',
            'file': self.video_file
        }
        
        response = self.client.post('/api/videos/', data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_video_upload_missing_title(self):
        """Test video upload without title"""
        data = {
            'file': self.video_file
        }
        
        response = self.client.post('/api/videos/', data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('title', response.data)

    def test_video_upload_missing_file(self):
        """Test video upload without file"""
        data = {
            'title': 'Test Video'
        }
        
        response = self.client.post('/api/videos/', data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('file', response.data)

    def test_video_upload_invalid_file_type(self):
        """Test upload with invalid file type"""
        invalid_file = SimpleUploadedFile(
            name='test.txt',
            content=b'not a video file',
            content_type='text/plain'
        )
        
        data = {
            'title': 'Test Video',
            'file': invalid_file
        }
        
        response = self.client.post('/api/videos/', data, format='multipart')
        
        # This depends on your video file validation in the model/serializer
        # Adjust assertion based on your validation logic
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST])

    @patch('api.views.process_video_task.delay')
    def test_multiple_video_uploads(self, mock_task):
        """Test uploading multiple videos"""
        videos_data = [
            {'title': 'Video 1', 'file': SimpleUploadedFile('video1.mp4', b'content1', 'video/mp4')},
            {'title': 'Video 2', 'file': SimpleUploadedFile('video2.mp4', b'content2', 'video/mp4')},
            {'title': 'Video 3', 'file': SimpleUploadedFile('video3.mp4', b'content3', 'video/mp4')},
        ]
        
        for video_data in videos_data:
            response = self.client.post('/api/videos/', video_data, format='multipart')
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify all videos created
        self.assertEqual(Video.objects.filter(user=self.user).count(), 3)
        
        # Verify all tasks were queued
        self.assertEqual(mock_task.call_count, 3)

    def test_video_upload_with_expired_token(self):
        """Test video upload with expired token"""
        # Use an expired token (you might need to mock this)
        expired_token = "expired.jwt.token"
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {expired_token}')
        
        data = {
            'title': 'Test Video',
            'file': self.video_file
        }
        
        response = self.client.post('/api/videos/', data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch('api.views.process_video_task.delay')
    def test_video_upload_large_file(self, mock_task):
        """Test uploading a larger video file"""
        large_video_file = SimpleUploadedFile(
            name='large_video.mp4',
            content=b'x' * (5 * 1024 * 1024),  # 5MB file
            content_type='video/mp4'
        )
        
        data = {
            'title': 'Large Video',
            'file': large_video_file
        }
        
        response = self.client.post('/api/videos/', data, format='multipart')
        
        # Should succeed unless you have file size limits
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_task.assert_called_once()

    def test_video_serializer_fields(self):
        """Test that video serializer returns correct fields"""
        data = {
            'title': 'Test Video Fields',
            'file': self.video_file
        }
        
        with patch('api.views.process_video_task.delay'):
            response = self.client.post('/api/videos/', data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check all expected fields are present
        expected_fields = ['id', 'title', 'file', 'uploaded_at', 'processed', 'duration']
        for field in expected_fields:
            self.assertIn(field, response.data)
        
        # Check read-only fields have correct values
        self.assertIsNotNone(response.data['uploaded_at'])
        self.assertFalse(response.data['processed'])
        self.assertIsNone(response.data['duration'])

    @patch('api.views.process_video_task.delay', side_effect=Exception('Celery error'))
    def test_video_upload_celery_task_failure(self, mock_task):
        """Test video upload when Celery task fails to queue"""
        data = {
            'title': 'Test Video',
            'file': self.video_file
        }
        
        # This depends on how you handle Celery task failures
        # You might want to catch exceptions in your view
        response = self.client.post('/api/videos/', data, format='multipart')
        
        # Video should still be created even if task fails to queue
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Video.objects.filter(title='Test Video').exists())