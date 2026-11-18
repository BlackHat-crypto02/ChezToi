from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        (
            "ChezToi",
            {
                "fields": (
                    "role",
                    "phone",
                    "city",
                    "verified",
                    "password_temporary",
                    "invitation_sent_at",
                )
            },
        ),
    )
    list_display = (
        "username",
        "email",
        "role",
        "verified",
        "password_temporary",
        "is_staff",
    )
    list_filter = ("role", "verified", "is_staff")
