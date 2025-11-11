from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.db import transaction
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import Player, Club, Admin
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

User = get_user_model()

@api_view(['POST'])
def register(request):
    try:
        email = request.data.get('email')
        password = request.data.get('password', '')
        username = request.data.get('username')
        role = (request.data.get('role') or 'PLAYER').upper()

        if not all([email, password, username]):
            return Response({'error': 'email, password, username are required'},
                            status=status.HTTP_400_BAD_REQUEST)

        if role not in ('PLAYER', 'CLUB', 'ADMIN'):
            return Response({'error': 'invalid role'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({'error': 'User with this email already exists'},
                            status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({'error': 'User with this username already exists'},
                            status=status.HTTP_400_BAD_REQUEST)


        # create user and related object inside a transaction
        with transaction.atomic():
            user = User.objects.create_user(
                username=username,
                password=password,
                email=email,
                role=role,
            )

            if role == 'PLAYER':
                Player.objects.create(
                    userid=user,
                )

            elif role == 'CLUB':
                Club.objects.create(
                    userid=user,
                )
            
            elif role == 'ADMIN':
                Admin.objects.create(
                    userid=user,
                )

        refresh = RefreshToken.for_user(user)
        return Response({
            'message': "User registered successfully",
            'user': {
                'email': user.email,
                'role': user.role
            }
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def login(request):
    email = request.data.get('email')
    password = request.data.get('password')

    if not email or not password:
        return Response({
            'error': 'Please provide both email and password'
        }, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(username=email, password=password)

    if user:
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'email': user.email,
                'role': user.role
            }
        }, status=status.HTTP_200_OK)
    else:
        return Response({
            'error': 'Invalid credentials'
        }, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
def google_check(request):
    credential = request.data.get('credential')
    if not credential:
        return Response({'error': 'Missing credential'}, status=400)

    try:
        idinfo = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )

        email = idinfo.get('email')
        if not email:
            return Response({'error': 'Email not found'}, status=400)

        user_exists = User.objects.filter(email=email).exists()

        return Response({
            'exists': user_exists,
            'email': email,
            'name': idinfo.get('name', '')
        }, status=200)

    except ValueError:
        return Response({'error': 'Invalid Google credential'}, status=401)


@api_view(['POST'])
def google_auth(request):
    credential = request.data.get('credential')
    role = request.data.get('role', 'PLAYER')

    if not credential:
        return Response({'error': 'Missing credential'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Verify the token with Google
        idinfo = id_token.verify_oauth2_token(credential, google_requests.Request(), settings.GOOGLE_CLIENT_ID)

        email = idinfo.get('email')
        first_name = idinfo.get('given_name', '')
        last_name = idinfo.get('family_name', '')

        if not email:
            return Response({'error': 'Email not found in Google token'}, status=status.HTTP_400_BAD_REQUEST)

        # Get or create user
        user, created = User.objects.get_or_create(
            email=email,
            username=email,
            defaults={
                'role': role,
                # 'password': User.objects.make_random_password()
            }
        )

        if created:
            user.set_unusable_password()
            user.save()

        if role == 'PLAYER':
            Player.objects.get_or_create(
                userid=user,
                defaults={'first_name': first_name, 'last_name': last_name}
            )
        elif role == 'CLUB':
            Club.objects.get_or_create(
                userid=user,
                defaults={'name': f"{first_name} {last_name}".strip() or user.username}
            )
        elif role == 'ADMIN':
            Admin.objects.get_or_create(
                userid=user,
                defaults={'first_name': first_name, 'last_name': last_name}
            )

        # Issue JWT tokens
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'email': user.email,
                'role': user.role
            }
        }, status=status.HTTP_200_OK)

    except ValueError:
        return Response({'error': 'Invalid Google credential'}, status=status.HTTP_401_UNAUTHORIZED)
    

@api_view(['POST'])
def logout(request):
    refresh_token = request.data.get('refresh')
    if not refresh_token:
        return Response({'error': 'refresh token required'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response(status=status.HTTP_205_RESET_CONTENT)
    except Exception:
        return Response({'error': 'Invalid or already blacklisted token'}, status=status.HTTP_400_BAD_REQUEST)
    

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    user = request.user
    role = getattr(user, 'role', None)
    if role == 'PLAYER':
        try:
            player = user.player
        except Player.DoesNotExist:
            player = None

        return Response({
            'email': user.email,
            'username': user.username,
            'first_name': user.player.first_name,
            'last_name': user.player.last_name,
            'phone_number': user.player.phone_number,
            'skill_level': user.player.skill_level,
            'preferred_dow': user.player.preferred_dow,
            'preferred_time': user.player.preferred_time,
            'role': role,
        }, status=status.HTTP_200_OK)
    elif role == 'CLUB':
        try:
            club = user.club
        except Player.DoesNotExist:
            club = None

        return Response({
            'email': user.email,
            'username': user.username,
            'name': user.club.name,
            'address': user.club.address,
            'description': user.club.description,
            'working_hours': user.club.working_hours,
            'contact_number': user.club.contact_number,
            'rating_avg': user.club.rating_avg,
            'role': role,
        }, status=status.HTTP_200_OK)
    elif role == 'ADMIN':
        try:
            admin = user.admin
        except Player.DoesNotExist:
            admin = None

        return Response({
            'email': user.email,
            'username': user.username,
            'first_name': user.admin.first_name,
            'last_name': user.admin.last_name,
            'can_manage_users': user.admin.can_manage_users,
            'can_manage_bookings': user.admin.can_manage_bookings,
            'role': role,
        }, status=status.HTTP_200_OK)
    else:
        return Response({
            'email': user.email,
            'username': user.username,
            'message': 'Role not recognized',
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_user(request):
    user = request.user
    role = getattr(user, 'role', None)
    data = request.data

    try:
        if role == 'PLAYER':
            player = user.player
            player.first_name = data.get('first_name', player.first_name)
            player.last_name = data.get('last_name', player.last_name)
            player.phone_number = data.get('phone_number', player.phone_number)
            player.skill_level = data.get('skill_level', player.skill_level)
            player.preferred_dow = data.get('preferred_dow', player.preferred_dow)
            player.preferred_time = data.get('preferred_time', player.preferred_time)
            player.save()

            user.username = data.get('username', user.username)
            user.save()

            return Response({
                'email': user.email,
                'username': user.username,
                'first_name': player.first_name,
                'last_name': player.last_name,
                'phone_number': player.phone_number,
                'skill_level': player.skill_level,
                'preferred_dow': player.preferred_dow,
                'preferred_time': player.preferred_time,
                'role': role,
            }, status=status.HTTP_200_OK)

        elif role == 'CLUB':
            club = user.club
            club.name = data.get('name', club.name)
            club.address = data.get('address', club.address)
            club.description = data.get('description', club.description)
            club.working_hours = data.get('working_hours', club.working_hours)
            club.contact_number = data.get('contact_number', club.contact_number)
            club.save()

            user.username = data.get('username', user.username)
            user.save()

            return Response({
                'email': user.email,
                'username': user.username,
                'name': club.name,
                'address': club.address,
                'description': club.description,
                'working_hours': club.working_hours,
                'contact_number': club.contact_number,
                'rating_avg': club.rating_avg,
                'role': role,
            }, status=status.HTTP_200_OK)

        elif role == 'ADMIN':
            admin = user.admin
            admin.first_name = data.get('first_name', admin.first_name)
            admin.last_name = data.get('last_name', admin.last_name)
            admin.can_manage_users = data.get('can_manage_users', admin.can_manage_users)
            admin.can_manage_bookings = data.get('can_manage_bookings', admin.can_manage_bookings)
            admin.save()

            user.username = data.get('username', user.username)
            user.save()

            return Response({
                'email': user.email,
                'username': user.username,
                'first_name': admin.first_name,
                'last_name': admin.last_name,
                'can_manage_users': admin.can_manage_users,
                'can_manage_bookings': admin.can_manage_bookings,
                'role': role,
            }, status=status.HTTP_200_OK)

        else:
            return Response({'error': 'Invalid role or user type not recognized.'},
                            status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """
    POST { "old_password": "...", "new_password": "..." }
    Auth required (Authorization: Bearer <access>)
    """
    old = request.data.get('old_password')
    new = request.data.get('new_password')

    if not old or not new:
        return Response({'error': 'old_password and new_password are required'}, status=status.HTTP_400_BAD_REQUEST)

    user = request.user

    if not user.check_password(old):
        return Response({'error': 'Old password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)

    if old == new:
        return Response({'error': 'New password must be different from old password'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        validate_password(new, user=user)
    except ValidationError as e:
        return Response({'error': e.messages}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new)
    user.save()

    return Response({'message': 'Password changed successfully'}, status=status.HTTP_200_OK)
