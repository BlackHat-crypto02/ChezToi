"""Paramètres du backend ChezToi (Django + DRF)."""

import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-a-changer-en-production")
DEBUG = os.getenv("DEBUG", "True") == "True"
ALLOWED_HOSTS = [
    h.strip()
    for h in os.getenv(
        "ALLOWED_HOSTS", "localhost,127.0.0.1,10.0.2.2"
    ).split(",")
    if h.strip()
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # API
    "rest_framework",
    "corsheaders",
    # Applications ChezToi
    "apps.users.apps.UsersConfig",
    "apps.core.apps.CoreConfig",
    "apps.logements.apps.LogementsConfig",
    "apps.reservations.apps.ReservationsConfig",
    "apps.messagerie.apps.MessagerieConfig",
    "apps.notifications.apps.NotificationsConfig",
    "apps.signalements.apps.SignalementsConfig",
    "apps.administration.apps.AdministrationConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",  # avant CommonMiddleware
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "cheztoi.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "cheztoi.wsgi.application"
ASGI_APPLICATION = "cheztoi.asgi.application"

# Modèle utilisateur maison : rôles locataire / propriétaire / administrateur.
AUTH_USER_MODEL = "users.User"

DATABASES = {
    "default": {
        "ENGINE": os.getenv("DB_ENGINE", "django.db.backends.sqlite3"),
        "NAME": os.getenv("DB_NAME", BASE_DIR / "db.sqlite3"),
        "USER": os.getenv("DB_USER", ""),
        "PASSWORD": os.getenv("DB_PASSWORD", ""),
        "HOST": os.getenv("DB_HOST", ""),
        "PORT": os.getenv("DB_PORT", ""),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# Next.js (3000) et Flutter (émulateur / web).
CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://10.0.2.2",
    ).split(",")
    if o.strip()
]

# Taille max des envois (photos, panoramas 360°).
DATA_UPLOAD_MAX_MEMORY_SIZE = 25 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024

# Ports locaux utilisés par `flutter run -d chrome` / le navigateur.
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?$",
]

LANGUAGE_CODE = "fr"
TIME_ZONE = "Africa/Lome"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

# Invitation des administrateurs (lien de configuration valable 24 h).
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://127.0.0.1:3000").rstrip("/")
INVITATION_TTL = 24 * 60 * 60

EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend"
    if DEBUG
    else "django.core.mail.backends.smtp.EmailBackend",
)
EMAIL_HOST = os.getenv("EMAIL_HOST", "")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True") == "True"
DEFAULT_FROM_EMAIL = os.getenv(
    "DEFAULT_FROM_EMAIL", "ChezToi <no-reply@cheztoi.tg>"
)

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Tests : hachage rapide des mots de passe (jamais utilisé hors `manage.py test`).
import sys  # noqa: E402

if len(sys.argv) > 1 and sys.argv[1] == "test":
    PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
