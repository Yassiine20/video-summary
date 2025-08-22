import logging

from rest_framework.permissions import BasePermission
from django.contrib.auth import get_user_model
from utils.jwt_helpers import verify_token

logger = logging.getLogger(__name__)
User = get_user_model()


class IsJwtAuthenticated(BasePermission):
    """Validate custom JWT in Authorization header (Bearer <token>). Adds request.user if valid."""

    message = "Invalid or missing authentication token"

    def has_permission(self, request, view):
        # Try multiple ways to access header for reliability
        raw_header = request.headers.get('Authorization') or request.META.get('HTTP_AUTHORIZATION')
        if not raw_header:
            # Debug trace during development
            print('[AUTH] Missing Authorization header')
            return False
        if not raw_header.startswith('Bearer '):
            print('[AUTH] Header present but not Bearer format:', raw_header[:30])
            return False
        token = raw_header.split(' ', 1)[1].strip()
        if not token:
            print('[AUTH] Empty token after Bearer prefix')
            return False
        verified, data = verify_token(token)
        if not verified:
            print('[AUTH] Token verification failed')
            return False
        user_id = data.get('user_id') if data else None
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            print('[AUTH] User not found for id', user_id)
            return False
        # Attach user for downstream logic
        request.user = user
        return True