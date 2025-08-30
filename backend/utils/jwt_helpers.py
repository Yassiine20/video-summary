from datetime import datetime, timedelta
import jwt
from django.conf import settings
import base64
import logging

logger = logging.getLogger(__name__)

def generate_tokens(user):
    current_time = datetime.utcnow()
    
    # Access token: short-lived
    access_payload = {
        "user_id": user.id,
        "username": user.username,
        "exp": current_time + timedelta(minutes=15),
        "iat": current_time
    }
    access_token = jwt.encode(access_payload, settings.JWT_SECRET_KEY, algorithm="HS256")

    # Refresh token: long-lived
    refresh_payload = {
        "user_id": user.id,
        "username": user.username,
        "exp": current_time + timedelta(days=7),
        "iat": current_time
    }
    refresh_token = jwt.encode(refresh_payload, settings.JWT_SECRET_KEY, algorithm="HS256")

    return {
        "access_token": access_token,
        "refresh_token": refresh_token
    }

def verify_token(token, token_type="access", secret_key=settings.JWT_SECRET_KEY):
    """
    :param token:
    :param token_type:
    :return:
        - True, dict of extra jwt variables
        - False, None : expired token or wrong format
    """
    try:
        decoded = jwt.decode(token, secret_key, algorithms=["HS256"])
        return True, {key: val for key, val in decoded.items() if key not in ["exp", "iat"]}
    except jwt.ExpiredSignatureError as e:
        logger.error(f"[JWT] Token expired: {e}")
        return False, None
    except jwt.InvalidTokenError as e:
        logger.error(f"[JWT] Invalid token: {e}")
        return False, None
    except Exception as e:
        logger.error(f"[JWT] Token verification error: {e}")        
        return False, None