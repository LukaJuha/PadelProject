import os
import dj_database_url
from .settings import *
from .settings import BASE_DIR

BACKEND_HOST = os.environ.get('RENDER_EXTERNAL_HOSTNAME')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://padelprojectfrontend.onrender.com')
ALLOWED_HOSTS = [h for h in [BACKEND_HOST, 'padelproject-qsb7.onrender.com'] if h]
CSRF_TRUSTED_ORIGINS = [f"https://{BACKEND_HOST}"] + ([FRONTEND_URL] if FRONTEND_URL else [])

DEBUG = False
SECRET_KEY = os.environ.get('SECRET_KEY')

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

CORS_ALLOWED_ORIGINS = [
    'https://padelprojectfrontend.onrender.com',
    FRONTEND_URL,
]
## Be flexible with Render subdomains
CORS_ALLOWED_ORIGIN_REGEXES = [r'^https:\/\/.*onrender\.com$']

# Allow cookies/credentials if frontend uses them
CORS_ALLOW_CREDENTIALS = True

# TEMP: Broaden CORS during debugging; tighten once confirmed
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
    }
}

DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL'),
        conn_max_age=600
    )
}

# Celery Configuration for Render
CELERY_BROKER_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_TIMEZONE = TIME_ZONE
CELERY_ENABLE_UTC = True