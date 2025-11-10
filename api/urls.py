from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('auth/login/', views.login, name="login"),
    path('auth/register/', views.register, name="register"),
    path('auth/google/', views.google_auth, name="google_auth"),
    path('auth/logout/', views.logout, name='logout'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/user/', views.current_user, name='current_user'),
    path('auth/password/change/', views.change_password, name='change_password'),
]