from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('auth/login/', views.login, name="login"),
    path('auth/register/', views.register, name="register"),
    path('auth/google/check/', views.google_check, name="google_check"),
    path('auth/google/register/', views.google_register, name="google_register"),
    path('auth/google/login/', views.google_login, name="google_login"),
    path('auth/logout/', views.logout, name='logout'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/user/', views.current_user, name='current_user'),
    path('auth/user/update/', views.update_user, name='update_user'),
    path('auth/password/change/', views.change_password, name='change_password'),
]