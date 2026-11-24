from django.urls import path

from . import views

urlpatterns = [
    path("config/", views.auth_config, name="auth-config"),
    path("register/", views.register, name="register"),
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("me/", views.me, name="me"),
    path("export/", views.export, name="export"),
]
