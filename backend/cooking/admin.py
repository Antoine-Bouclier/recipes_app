from django.contrib import admin

from .models import CookingSession


@admin.register(CookingSession)
class CookingSessionAdmin(admin.ModelAdmin):
    list_display = ("recipe", "user", "started_at", "updated_at")
