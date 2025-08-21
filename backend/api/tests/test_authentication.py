from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from api.models import User  # adjust import if needed

class SignupTestCase(APITestCase):

    def setUp(self):
        self.url = reverse('signup')
        self.user_data = {
            "username": "yassine",
            "email": "yassine@example.com",
            "first_name": "Yassine",
            "last_name": "Chebbi",
            "password": "mypassword"
        }

    def test_signup_creates_user_and_returns_token(self):
        response = self.client.post(self.url, self.user_data, format='json')

        # Status code 201
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # User created in DB
        self.assertTrue(User.objects.filter(username="yassine").exists())

        # JWT token returned
        self.assertIn("id_token", response.data)
        self.assertIn("refresh_token", response.data)
        self.assertEqual(response.data["username"], self.user_data["username"])
        self.assertEqual(response.data["email"], self.user_data["email"])
