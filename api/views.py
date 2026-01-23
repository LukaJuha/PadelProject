from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.db import transaction
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import Player, Club, Admin, Field, Booking, Reservation, Review, Notification, Offer, Subscription, Tutoring, PlayerOffer
from django.db import connection
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db.models import Avg
from django.utils import timezone
from datetime import datetime, timedelta
from .tasks import send_club_reservation_notification, send_player_reservation_reminder, move_reservation_to_history

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


        validation_errors = validate_password_detailed(password, user=User(username=username, email=email))
        
        if validation_errors:
            return Response({'error': validation_errors}, status=status.HTTP_400_BAD_REQUEST)

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
                'id': user.id,
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
def google_register(request):
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
def google_login(request):
    credential = request.data.get('credential')

    if not credential:
        return Response({'error': 'Missing credential'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        idinfo = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )

        email = idinfo.get('email')
        if not email:
            return Response({'error': 'Email not found in Google token'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'User does not exist, please register first.'}, status=status.HTTP_404_NOT_FOUND)

        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)

        return Response({
            'access': access,
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'email': user.email,
                'role': user.role,
            }
        }, status=status.HTTP_200_OK)

    except ValueError as e:
        return Response({'error': f'Invalid token: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        print(f"Google login error: {e}")
        return Response({'error': 'Unexpected error during Google login'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                         

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
    role = user.role
    if role == 'PLAYER':
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


    validation_errors = validate_password_detailed(new, user=user)
    
    if validation_errors:
        return Response({'error': validation_errors}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new)
    user.save()

    return Response({'message': 'Password changed successfully'}, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_account(request):
    """
    DELETE with optional password confirmation
    Body: { "password": "..." } (optional but recommended)
    Auth required (Authorization: Bearer <access>)
    Deletes the currently authenticated user and all related data
    """
    password = request.data.get('password')
    user = request.user

    # Optional password verification for extra security
    if password:
        if not user.check_password(password):
            return Response({'error': 'Password is incorrect'}, 
                            status=status.HTTP_400_BAD_REQUEST)

    try:
        # Delete the user (cascade will delete related Player/Club/Admin/Reviews/etc)
        user_email = user.email
        user.delete()

        return Response({
            'message': f'Account {user_email} has been permanently deleted'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def validate_password_detailed(password, user=None):
    """
    Custom password validation that returns specific, user-friendly error messages
    """
    errors = []
    
    # 1. Check minimum length
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long.")
        return errors  # Return early if too short
    
    # 2. Check if password is too common
    common_passwords = [
        'password', '12345678', '123456789', 'qwerty', 'abc123', 
        'password1', '12345', '123456', '1234567', '111111',
        '1234567890', 'admin', 'letmein', 'welcome', 'monkey'
    ]
    if password.lower() in common_passwords:
        errors.append("This password is too common and easy to guess.")
    
    # 3. Check if entirely numeric
    if password.isdigit():
        errors.append("Password cannot contain only numbers.")
    
    # 4. Check for at least one letter and one number
    has_letter = any(char.isalpha() for char in password)
    has_digit = any(char.isdigit() for char in password)
    
    if not has_letter:
        errors.append("Password must contain at least one letter.")
    if not has_digit:
        errors.append("Password must contain at least one number.")
    
    # 5. Check for uppercase and lowercase (optional but recommended)
    has_upper = any(char.isupper() for char in password)
    has_lower = any(char.islower() for char in password)
    
    if not has_upper:
        errors.append("Password must contain at least one uppercase letter.")
    if not has_lower:
        errors.append("Password must contain at least one lowercase letter.")
    
    # 6. Check similarity to username/email
    if user:
        if user.username and user.username.lower() in password.lower():
            errors.append("Password cannot contain your username.")
        if user.email and user.email.split('@')[0].lower() in password.lower():
            errors.append("Password cannot contain your email address.")
    
    return errors

@api_view(['GET'])
def search(request):
    # GET params
    q = request.GET.get('q', '').strip()
    search_type = (request.GET.get('type') or 'BOTH').upper()
    field_location = (request.GET.get('fieldLocation') or 'BOTH').upper()
    field_size = (request.GET.get('fieldSize') or 'BOTH').upper()
    field_lighting = (request.GET.get('lighting') or 'BOTH').upper()
    # fieldType may appear multiple times: ?fieldType=GRASS&fieldType=CONCRETE
    field_types = request.GET.getlist('fieldType') or []

    include_all_clubs = (request.GET.get('includeAllClubs') or '').lower() in ('true', '1', 'yes')

    # Normalize types to upper
    field_types = [t.upper() for t in field_types]

    # Build filters for fields
    from django.db.models import Q
    field_filters = Q()

    if q:
        field_filters &= (Q(clubid__userid__username__icontains=q) | Q(name__icontains=q))

    if field_location and field_location != 'BOTH':
        field_filters &= Q(location=field_location)

    if field_size and field_size != 'BOTH':
        field_filters &= Q(size=field_size)

    if field_lighting and field_lighting != 'BOTH':
        if field_lighting == 'YES':
            field_filters &= Q(lighting=True)
        elif field_lighting == 'NO':
            field_filters &= Q(lighting=False)

    if field_types:
        field_filters &= Q(floortype__in=field_types)

    # Query matching fields and their club using ORM
    field_objects = Field.objects.filter(field_filters).select_related('clubid')
    
    # Build response structure
    fields = []
    clubs_map = {}

    for field in field_objects:
        club = field.clubid
        field_obj = {
            'id': field.id,
            'name': field.name,
            'floorType': field.floortype,
            'size': field.size,
            'location': field.location,
            'lighting': field.lighting,
            'clubId': club.userid.id,
            'clubName': club.userid.username,
        }
        fields.append(field_obj)

        club_id = club.userid.id
        if club_id not in clubs_map:
            clubs_map[club_id] = {
                'id': club_id,
                'name': club.userid.username,
                'address': club.address,
                'description': club.description,
                'ratingAvg': float(club.rating_avg) if club.rating_avg else None,
                'fields': [field_obj],
            }
        else:
            clubs_map[club_id]['fields'].append(field_obj)

    clubs = list(clubs_map.values())

    # Optionally include clubs even if they have no matching fields
    if include_all_clubs and search_type in ('BOTH', 'CLUB'):
        club_filters = Q()
        if q:
            club_filters &= (
                Q(userid__username__icontains=q) |
                Q(name__icontains=q) |
                Q(description__icontains=q) |
                Q(address__icontains=q)
            )
        extra_clubs = Club.objects.filter(club_filters).select_related('userid')
        for club in extra_clubs:
            club_id = club.userid.id
            if club_id not in clubs_map:
                clubs_map[club_id] = {
                    'id': club_id,
                    'name': club.userid.username,
                    'address': club.address,
                    'description': club.description,
                    'ratingAvg': float(club.rating_avg) if club.rating_avg else None,
                    'fields': [],
                }
        clubs = list(clubs_map.values())

    result = {'clubs': [], 'fields': []}

    if search_type in ('BOTH', 'CLUB'):
        # return clubs that have matching fields
        result['clubs'] = clubs

    if search_type in ('BOTH', 'FIELD'):
        result['fields'] = fields

    return Response(result, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_fields(request):
    """
    GET /fields/
    Returns all fields for the authenticated club user.
    """
    user = request.user
    
    if user.role != 'CLUB':
        return Response({'error': 'Only club accounts can access this endpoint'}, 
                       status=status.HTTP_403_FORBIDDEN)
    
    try:
        club = Club.objects.get(userid=user)
        field_objects = Field.objects.filter(clubid=club).order_by('name')
        
        fields = []
        for field in field_objects:
            fields.append({
                'id': field.id,
                'name': field.name,
                'floorType': field.floortype,
                'floor_type': field.floortype,
                'size': field.size,
                'location': field.location,
                'ceilingHeight': field.ceilingheight,
                'ceiling_height': field.ceilingheight,
                'lighting': field.lighting,
            })
        
        return Response({'fields': fields}, status=status.HTTP_200_OK)
        
    except Club.DoesNotExist:
        return Response({'error': 'Club not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_field(request):
    """
    POST /fields/create/
    Body: { name, floor_type, size, location, ceiling_height (optional), lighting }
    Creates a new field for the authenticated club user.
    """
    user = request.user
    
    if user.role != 'CLUB':
        return Response({'error': 'Only club accounts can create fields'}, 
                       status=status.HTTP_403_FORBIDDEN)
    
    try:
        name = request.data.get('name')
        floor_type = request.data.get('floor_type', '').upper()
        size = request.data.get('size', '').upper()
        location = request.data.get('location', '').upper()
        ceiling_height = request.data.get('ceiling_height')
        lighting = request.data.get('lighting', True)
        
        # Validation
        if not name:
            return Response({'error': 'Field name is required'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        valid_floor_types = ['HARDWOOD', 'GRASS', 'ARTIFICIAL']
        if floor_type not in valid_floor_types:
            return Response({'error': f'Invalid floor type. Must be one of: {", ".join(valid_floor_types)}'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        if size not in ['SINGLE', 'DOUBLE']:
            return Response({'error': 'Size must be SINGLE or DOUBLE'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        if location not in ['INSIDE', 'OUTSIDE']:
            return Response({'error': 'Location must be INSIDE or OUTSIDE'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        club = Club.objects.get(userid=user)
        
        # Create the field using ORM
        field = Field.objects.create(
            clubid=club,
            name=name,
            floortype=floor_type,
            size=size,
            location=location,
            ceilingheight=ceiling_height,
            lighting=lighting
        )
        
        return Response({
            'message': 'Field created successfully',
            'field': {
                'id': field.id,
                'name': field.name,
                'floorType': field.floortype,
                'floor_type': field.floortype,
                'size': field.size,
                'location': field.location,
                'ceilingHeight': field.ceilingheight,
                'ceiling_height': field.ceilingheight,
                'lighting': field.lighting,
                'reservationFee': float(field.reservation_fee),
                'reservation_fee': float(field.reservation_fee),
            }
        }, status=status.HTTP_201_CREATED)
        
    except Club.DoesNotExist:
        return Response({'error': 'Club not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_field(request, field_id):
    """
    GET /fields/{field_id}/
    Returns a specific field (must belong to authenticated club).
    """
    user = request.user
    
    if user.role != 'CLUB':
        return Response({'error': 'Only club accounts can access this endpoint'}, 
                       status=status.HTTP_403_FORBIDDEN)
    
    try:
        club = Club.objects.get(userid=user)
        field = Field.objects.get(id=field_id, clubid=club)
        
        return Response({
            'field': {
                'id': field.id,
                'name': field.name,
                'floorType': field.floortype,
                'floor_type': field.floortype,
                'size': field.size,
                'location': field.location,
                'ceilingHeight': field.ceilingheight,
                'ceiling_height': field.ceilingheight,
                'lighting': field.lighting,
                'reservationFee': float(field.reservation_fee),
                'reservation_fee': float(field.reservation_fee),
            }
        }, status=status.HTTP_200_OK)
        
    except Club.DoesNotExist:
        return Response({'error': 'Club not found'}, status=status.HTTP_404_NOT_FOUND)
    except Field.DoesNotExist:
        return Response({'error': 'Field not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_field(request, field_id):
    """
    DELETE /fields/{field_id}/delete/
    Deletes a field and all its bookings (must belong to authenticated club).
    """
    user = request.user
    
    if user.role != 'CLUB':
        return Response({'error': 'Only club accounts can delete fields'}, 
                       status=status.HTTP_403_FORBIDDEN)
    
    try:
        club = Club.objects.get(userid=user)
        field = Field.objects.get(id=field_id, clubid=club)
        field.delete()
        
        return Response({'message': 'Field deleted successfully'}, status=status.HTTP_200_OK)
        
    except Club.DoesNotExist:
        return Response({'error': 'Club not found'}, status=status.HTTP_404_NOT_FOUND)
    except Field.DoesNotExist:
        return Response({'error': 'Field not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_field_bookings(request, field_id):
    """
    GET /fields/{field_id}/bookings/
    Returns all bookings for a specific field.
    """
    user = request.user
    
    if user.role != 'CLUB':
        return Response({'error': 'Only club accounts can access this endpoint'}, 
                       status=status.HTTP_403_FORBIDDEN)
    
    try:
        club = Club.objects.get(userid=user)
        field = Field.objects.get(id=field_id, clubid=club)
        bookings = Booking.objects.filter(field=field).order_by('day_of_week', 'start_time')
        
        booking_list = []
        for booking in bookings:
            booking_list.append({
                'id': booking.id,
                'title': booking.title,
                'day_of_week': booking.day_of_week,
                'start_time': str(booking.start_time),
                'end_time': str(booking.end_time),
                'price': float(booking.price),
                'subscription_ids': list(booking.subscriptions.values_list('offer_id', flat=True)),
                'subscription_only': booking.subscription_only,
            })
        
        return Response({'bookings': booking_list}, status=status.HTTP_200_OK)
        
    except Club.DoesNotExist:
        return Response({'error': 'Club not found'}, status=status.HTTP_404_NOT_FOUND)
    except Field.DoesNotExist:
        return Response({'error': 'Field not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_booking(request, field_id):
    """
    POST /fields/{field_id}/bookings/create/
    Body: { title, day_of_week, start_time, end_time, price }
    Creates a new booking for a field.
    """
    user = request.user
    
    if user.role != 'CLUB':
        return Response({'error': 'Only club accounts can create bookings'}, 
                       status=status.HTTP_403_FORBIDDEN)
    
    try:
        title = request.data.get('title')
        day_of_week = request.data.get('day_of_week')
        start_time = request.data.get('start_time')
        end_time = request.data.get('end_time')
        price = request.data.get('price')
        subscription_ids = request.data.get('subscription_ids', [])
        subscription_only = request.data.get('subscription_only', False)
        
        if not all([title, day_of_week is not None, start_time, end_time, price is not None]):
            return Response({'error': 'title, day_of_week, start_time, end_time, price are required'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        if not (0 <= int(day_of_week) <= 6):
            return Response({'error': 'day_of_week must be 0-6'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        club = Club.objects.get(userid=user)
        field = Field.objects.get(id=field_id, clubid=club)
        
        booking = Booking.objects.create(
            field=field,
            title=title,
            day_of_week=int(day_of_week),
            start_time=start_time,
            end_time=end_time,
            price=float(price),
            subscription_only=subscription_only
        )
        
        # Add subscriptions if provided
        if subscription_ids:
            subscriptions = Subscription.objects.filter(
                offer_id__in=subscription_ids,
                offer__clubid=club
            )
            booking.subscriptions.set(subscriptions)
        
        return Response({
            'message': 'Booking created successfully',
            'booking': {
                'id': booking.id,
                'title': booking.title,
                'day_of_week': booking.day_of_week,
                'start_time': str(booking.start_time),
                'end_time': str(booking.end_time),
                'price': float(booking.price),
                'subscription_ids': list(booking.subscriptions.values_list('offer_id', flat=True)),
                'subscription_only': booking.subscription_only,
            }
        }, status=status.HTTP_201_CREATED)
        
    except Club.DoesNotExist:
        return Response({'error': 'Club not found'}, status=status.HTTP_404_NOT_FOUND)
    except Field.DoesNotExist:
        return Response({'error': 'Field not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_booking(request, field_id, booking_id):
    """
    PUT /fields/{field_id}/bookings/{booking_id}/
    Body: { title, day_of_week, start_time, end_time, price }
    Updates a booking.
    """
    user = request.user
    
    if user.role != 'CLUB':
        return Response({'error': 'Only club accounts can update bookings'}, 
                       status=status.HTTP_403_FORBIDDEN)
    
    try:
        club = Club.objects.get(userid=user)
        field = Field.objects.get(id=field_id, clubid=club)
        booking = Booking.objects.get(id=booking_id, field=field)
        
        # Update fields if provided
        if 'title' in request.data:
            booking.title = request.data.get('title')
        if 'day_of_week' in request.data:
            day_of_week_value = request.data.get('day_of_week')
            if day_of_week_value is not None:
                day_of_week = int(day_of_week_value)
                if not (0 <= day_of_week <= 6):
                    return Response({'error': 'day_of_week must be 0-6'}, 
                                   status=status.HTTP_400_BAD_REQUEST)
                booking.day_of_week = day_of_week
        if 'start_time' in request.data:
            booking.start_time = request.data.get('start_time')
        if 'end_time' in request.data:
            booking.end_time = request.data.get('end_time')
        if 'price' in request.data:
            booking.price = float(request.data.get('price'))
        if 'subscription_only' in request.data:
            booking.subscription_only = request.data.get('subscription_only')
        
        # Update subscriptions if provided
        if 'subscription_ids' in request.data:
            subscription_ids = request.data.get('subscription_ids', [])
            subscriptions = Subscription.objects.filter(
                offer_id__in=subscription_ids,
                offer__clubid=club
            )
            booking.subscriptions.set(subscriptions)
        
        booking.save()
        
        return Response({
            'message': 'Booking updated successfully',
            'booking': {
                'id': booking.id,
                'title': booking.title,
                'day_of_week': booking.day_of_week,
                'start_time': str(booking.start_time),
                'end_time': str(booking.end_time),
                'price': float(booking.price),
                'subscription_ids': list(booking.subscriptions.values_list('offer_id', flat=True)),
                'subscription_only': booking.subscription_only,
            }
        }, status=status.HTTP_200_OK)
        
    except Club.DoesNotExist:
        return Response({'error': 'Club not found'}, status=status.HTTP_404_NOT_FOUND)
    except Field.DoesNotExist:
        return Response({'error': 'Field not found'}, status=status.HTTP_404_NOT_FOUND)
    except Booking.DoesNotExist:
        return Response({'error': 'Booking not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_booking(request, field_id, booking_id):
    """
    DELETE /fields/{field_id}/bookings/{booking_id}/
    Deletes a booking.
    """
    user = request.user
    
    if user.role != 'CLUB':
        return Response({'error': 'Only club accounts can delete bookings'}, 
                       status=status.HTTP_403_FORBIDDEN)
    
    try:
        club = Club.objects.get(userid=user)
        field = Field.objects.get(id=field_id, clubid=club)
        booking = Booking.objects.get(id=booking_id, field=field)
        booking.delete()
        
        return Response({'message': 'Booking deleted successfully'}, 
                       status=status.HTTP_200_OK)
        
    except Club.DoesNotExist:
        return Response({'error': 'Club not found'}, status=status.HTTP_404_NOT_FOUND)
    except Field.DoesNotExist:
        return Response({'error': 'Field not found'}, status=status.HTTP_404_NOT_FOUND)
    except Booking.DoesNotExist:
        return Response({'error': 'Booking not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_field(request, field_id):
    """
    PUT /fields/{field_id}/
    Body: { name, floor_type, size, location, ceiling_height, lighting }
    Updates a field.
    """
    user = request.user
    
    if user.role != 'CLUB':
        return Response({'error': 'Only club accounts can update fields'}, 
                       status=status.HTTP_403_FORBIDDEN)
    
    try:
        club = Club.objects.get(userid=user)
        field = Field.objects.get(id=field_id, clubid=club)
        
        # Update fields if provided
        if 'name' in request.data:
            field.name = request.data.get('name')
        if 'floor_type' in request.data:
            field.floortype = request.data.get('floor_type')
        if 'size' in request.data:
            field.size = request.data.get('size')
        if 'location' in request.data:
            field.location = request.data.get('location')
        if 'ceiling_height' in request.data:
            ch = request.data.get('ceiling_height')
            field.ceilingheight = int(ch) if ch else None
        if 'lighting' in request.data:
            field.lighting = request.data.get('lighting')
        if 'reservation_fee' in request.data:
            field.reservation_fee = request.data.get('reservation_fee')
        
        field.save()
        
        return Response({
            'message': 'Field updated successfully',
            'field': {
                'id': field.id,
                'name': field.name,
                'floor_type': field.floortype,
                'size': field.size,
                'location': field.location,
                'ceiling_height': field.ceilingheight,
                'lighting': field.lighting,
                'reservation_fee': float(field.reservation_fee),
            }
        }, status=status.HTTP_200_OK)
        
    except Club.DoesNotExist:
        return Response({'error': 'Club not found'}, status=status.HTTP_404_NOT_FOUND)
    except Field.DoesNotExist:
        return Response({'error': 'Field not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_club(request, club_id):
    """
    GET /clubs/{club_id}/
    Returns club information and its fields (public endpoint).
    """
    try:
        club = Club.objects.get(userid_id=club_id)
        fields = Field.objects.filter(clubid=club)
        
        field_list = []
        for field in fields:
            field_list.append({
                'id': field.id,
                'name': field.name,
                'floor_type': field.floortype,
                'size': field.size,
                'location': field.location,
                'ceiling_height': field.ceilingheight,
                'lighting': field.lighting,
            })
        
        return Response({
            'club': {
                'id': club.userid.id,
                'name': club.userid.username,
                'email': club.userid.email,
            },
            'fields': field_list
        }, status=status.HTTP_200_OK)
        
    except Club.DoesNotExist:
        return Response({'error': 'Club not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_public_field(request, field_id):
    """
    GET /fields/{field_id}/public/
    Returns field information and bookings (public endpoint for players to view).
    """
    try:
        field = Field.objects.get(id=field_id)
        
        return Response({
            'field': {
                'id': field.id,
                'name': field.name,
                'floor_type': field.floortype,
                'size': field.size,
                'location': field.location,
                'ceiling_height': field.ceilingheight,
                'lighting': field.lighting,
                'club_id': field.clubid.userid.id,
                'club_name': field.clubid.userid.username,
            }
        }, status=status.HTTP_200_OK)
        
    except Field.DoesNotExist:
        return Response({'error': 'Field not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_public_field_bookings(request, field_id):
    """
    GET /fields/{field_id}/bookings/public/
    Returns all bookings for a specific field (public endpoint for viewing schedule).
    """
    try:
        field = Field.objects.get(id=field_id)
        bookings = Booking.objects.filter(field=field).order_by('day_of_week', 'start_time')
        
        booking_list = []
        for booking in bookings:
            # Get subscription details for this booking
            subscriptions_data = []
            for subscription in booking.subscriptions.select_related('offer').all():
                subscriptions_data.append({
                    'id': subscription.offer.id,
                    'name': subscription.offer.name,
                    'discount_percentage': subscription.discount_percentage,
                })
            
            booking_list.append({
                'id': booking.id,
                'title': booking.title,
                'day_of_week': booking.day_of_week,
                'start_time': str(booking.start_time),
                'end_time': str(booking.end_time),
                'price': float(booking.price),
                'subscriptions': subscriptions_data,
                'subscription_only': booking.subscription_only,
            })
        
        return Response({'bookings': booking_list}, status=status.HTTP_200_OK)
        
    except Field.DoesNotExist:
        return Response({'error': 'Field not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reserve_booking(request, field_id):
    """
    POST /fields/{field_id}/reserve/
    Body: { booking_id }
    Allows players to reserve a booking term.
    """
    user = request.user
    
    if user.role != 'PLAYER':
        return Response({'error': 'Only players can make reservations'}, 
                       status=status.HTTP_403_FORBIDDEN)
    
    try:
        booking_id = request.data.get('booking_id')
        date = request.data.get('date')
        payment_method = request.data.get('payment_method', 'IN_PERSON')
        paypal_order_id = request.data.get('paypal_order_id')
        repeating = bool(request.data.get('repeating', False))
        
        if not booking_id or not date:
            return Response({'error': 'booking_id and date are required'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        # Validate payment method
        valid_methods = ['IN_PERSON', 'PAYPAL']
        if payment_method not in valid_methods:
            return Response({'error': 'Invalid payment method'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        # If PayPal payment, require order ID
        if payment_method == 'PAYPAL' and not paypal_order_id:
            return Response({'error': 'PayPal order ID is required for PayPal payments'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        player = Player.objects.get(userid=user)
        booking = Booking.objects.get(id=booking_id, field_id=field_id)
        
        # Check if booking requires subscription
        if booking.subscription_only:
            # Get player's active subscriptions for this club
            club = booking.field.clubid
            player_subscriptions = PlayerOffer.objects.filter(
                player=player,
                offer__clubid=club,
                offer__offer_type='SUBSCRIPTION',
                expires_at__gte=timezone.now(),
                payment_status='PAID'
            ).values_list('offer_id', flat=True)
            
            # Get required subscription IDs
            required_subscription_ids = booking.subscriptions.values_list('offer_id', flat=True)
            
            # Check if player has at least one of the required subscriptions
            if required_subscription_ids and not any(sub_id in player_subscriptions for sub_id in required_subscription_ids):
                subscription_names = booking.subscriptions.values_list('offer__name', flat=True)
                return Response({
                    'error': f'Ovaj termin zahtijeva jednu od sljedećih pretplata: {", ".join(subscription_names)}'
                }, status=status.HTTP_403_FORBIDDEN)
        
        # Block if any repeating reservation already owns this booking
        if Reservation.objects.filter(booking=booking, repeating=True).exists():
            return Response({'error': 'Ovaj termin je već trajno rezerviran.'}, 
                           status=status.HTTP_400_BAD_REQUEST)

        # Block repeats if any reservation already exists for this booking (any date)
        if repeating and Reservation.objects.filter(booking=booking).exists():
            return Response({'error': 'Termin već ima rezervacije pa ga nije moguće postaviti kao ponavljajući.'}, 
                           status=status.HTTP_400_BAD_REQUEST)

        # Check if the slot is already reserved for this date by anyone
        if Reservation.objects.filter(booking=booking, date=date).exists():
            return Response({'error': 'Termin je već rezerviran za odabrani datum.'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        # Set payment status and approval status based on payment method
        payment_status = 'PAID' if payment_method == 'PAYPAL' else 'PENDING'
        approval_status = 'APPROVED' if payment_method == 'PAYPAL' else 'PENDING'
        
        reservation = Reservation.objects.create(
            booking=booking,
            player=player,
            date=date,
            repeating=repeating,
            payment_method=payment_method,
            payment_status=payment_status,
            approval_status=approval_status
        )
        
        print(f"DEBUG: Reservation created: {reservation.id}")
        
        # Send immediate notification to club¸
        print("DEBUG: Sending club reservation notification task")
        result = send_club_reservation_notification.delay(reservation.id)
        print(f"DEBUG: Task sent with ID: {result.id}")
        
        # Schedule reminder 24h before the next occurrence of the booking
        # Calculate next occurrence of the booking day
        now = timezone.now()
        current_weekday = now.weekday()
        days_until_booking = (booking.day_of_week - current_weekday) % 7
        if days_until_booking == 0:
            # If today, check if the time has passed
            booking_datetime = datetime.combine(now.date(), booking.start_time)
            booking_datetime = timezone.make_aware(booking_datetime)
            if booking_datetime <= now:
                days_until_booking = 7  # Next week

        next_booking_date = now.date() + timedelta(days_until_booking)
        next_booking_datetime = datetime.combine(next_booking_date, booking.start_time)
        next_booking_datetime = timezone.make_aware(next_booking_datetime)
        
        # Schedule reminder 24 hours before
        reminder_time = next_booking_datetime - timedelta(hours=24)
        
        # Only schedule if reminder time is in the future
        if reminder_time > now:
            send_player_reservation_reminder.apply_async(
                args=[reservation.id],
                eta=reminder_time
            )
        
        # Schedule archival for when the booking ends (only for non-repeating reservations)
        if not reservation.repeating:
            next_booking_end_datetime = datetime.combine(next_booking_date, booking.end_time)
            next_booking_end_datetime = timezone.make_aware(next_booking_end_datetime)
            
            if next_booking_end_datetime > now:
                move_reservation_to_history.apply_async(
                    args=[reservation.id],
                    eta=next_booking_end_datetime
                )
        
        return Response({
            'message': 'Reservation created successfully',
            'reservation': {
                'id': reservation.id,
                'booking_id': reservation.booking.id,
                'booking_title': reservation.booking.title,
                'repeating': reservation.repeating,
                'date': reservation.date,
                'payment_method': reservation.payment_method,
                'payment_status': reservation.payment_status,
                'paypal_order_id': paypal_order_id if payment_method == 'PAYPAL' else None,
            }
        }, status=status.HTTP_201_CREATED)
        
    except Player.DoesNotExist:
        return Response({'error': 'Player profile not found'}, status=status.HTTP_404_NOT_FOUND)
    except Booking.DoesNotExist:
        return Response({'error': 'Booking not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_field_reservations(request, field_id):
    """
    GET /fields/{field_id}/reservations/
    Returns all reservations for a specific field made by the authenticated player.
    """
    user = request.user
    
    if user.role != 'PLAYER':
        return Response({'error': 'Only players can view their reservations'}, 
                       status=status.HTTP_403_FORBIDDEN)
    
    try:
        player = Player.objects.get(userid=user)
        reservations = Reservation.objects.filter(
            booking__field_id=field_id,
            player=player
        )
        
        reservation_list = []
        for res in reservations:
            reservation_list.append({
                'id': res.id,
                'booking_id': res.booking.id,
                'booking_title': res.booking.title,
                'day_of_week': res.booking.day_of_week,
                'start_time': str(res.booking.start_time),
                'end_time': str(res.booking.end_time),
                'repeating': res.repeating,
            })
        
        return Response({'reservations': reservation_list}, status=status.HTTP_200_OK)
        
    except Player.DoesNotExist:
        return Response({'error': 'Player profile not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_player_reservations(request):
    """
    GET /reservations/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
    Returns all reservations for the authenticated player, optionally filtered by date range.
    Repeating reservations are always included.
    """
    user = request.user
    
    if user.role != 'PLAYER':
        return Response({'error': 'Only players can view reservations'}, 
                       status=status.HTTP_403_FORBIDDEN)
    
    try:
        player = Player.objects.get(userid=user)
        reservations = Reservation.objects.filter(player=player).select_related(
            'booking__field__clubid__userid'
        )
        
        # Filter by date range if provided (exclude repeating reservations from date filter)
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        
        if start_date and end_date:
            from django.db.models import Q
            # Include: repeating reservations OR reservations within date range
            reservations = reservations.filter(
                Q(repeating=True) | Q(date__gte=start_date, date__lte=end_date)
            )
        
        reservation_list = []
        for res in reservations:
            reservation_list.append({
                'id': res.id,
                'booking_id': res.booking.id,
                'booking_title': res.booking.title,
                'day_of_week': res.booking.day_of_week,
                'start_time': str(res.booking.start_time),
                'end_time': str(res.booking.end_time),
                'date': str(res.date),
                'field_id': res.booking.field.id,
                'field_name': res.booking.field.name,
                'club_id': res.booking.field.clubid.userid.id,
                'club_name': res.booking.field.clubid.userid.username,
                'repeating': res.repeating,
            })
        
        return Response({'reservations': reservation_list}, status=status.HTTP_200_OK)
        
    except Player.DoesNotExist:
        return Response({'error': 'Player profile not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_reservation(request, reservation_id):
    """
    DELETE /reservations/{reservation_id}/
    Cancels a reservation for the authenticated player.
    Players can cancel up to 24h before start time.
    Refund = booking price - field reservation fee.
    """
    user = request.user
    
    if user.role != 'PLAYER':
        return Response({'error': 'Only players can delete reservations'}, 
                       status=status.HTTP_403_FORBIDDEN)
    
    try:
        player = Player.objects.get(userid=user)
        reservation = Reservation.objects.select_related('booking__field').get(id=reservation_id, player=player)
        
        # Calculate reservation start datetime
        booking = reservation.booking
        field = booking.field
        
        # For repeating reservations, use the next occurrence
        if reservation.repeating:
            now = timezone.now()
            current_weekday = now.weekday()
            days_until_booking = (booking.day_of_week - current_weekday) % 7
            if days_until_booking == 0:
                # If today, check if the time has passed
                booking_datetime = datetime.combine(now.date(), booking.start_time)
                booking_datetime = timezone.make_aware(booking_datetime)
                if booking_datetime <= now:
                    days_until_booking = 7  # Next week
            next_booking_date = now.date() + timedelta(days_until_booking)
            reservation_start = datetime.combine(next_booking_date, booking.start_time)
        else:
            reservation_start = datetime.combine(reservation.date, booking.start_time)
        
        reservation_start = timezone.make_aware(reservation_start)
        
        # Check if cancellation is at least 24h before start
        now = timezone.now()
        time_until_start = reservation_start - now
        
        if time_until_start < timedelta(hours=24):
            hours_left = time_until_start.total_seconds() / 3600
            return Response({
                'error': f'Rezervaciju možete otkazati samo 24 sata prije početka. Preostalo: {hours_left:.1f}h'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Calculate refund amount
        refund_amount = float(booking.price) - float(field.reservation_fee)
        refund_amount = max(0, refund_amount)  # Ensure non-negative
        
        # Send cancellation notification to club
        from .tasks import send_club_cancellation_notification
        send_club_cancellation_notification.delay(reservation.id, refund_amount)
        
        # Delete the reservation
        reservation.delete()
        
        return Response({
            'message': 'Reservation cancelled successfully',
            'refund_amount': refund_amount
        }, status=status.HTTP_200_OK)
        
    except Player.DoesNotExist:
        return Response({'error': 'Player profile not found'}, status=status.HTTP_404_NOT_FOUND)
    except Reservation.DoesNotExist:
        return Response({'error': 'Reservation not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_reservation(request, reservation_id):
    """
    POST /reservations/{reservation_id}/approve/
    Body: { "approved": true/false }
    Club approves or rejects a pending reservation request.
    """
    user = request.user
    
    if user.role != 'CLUB':
        return Response({'error': 'Only club accounts can approve reservations'}, 
                       status=status.HTTP_403_FORBIDDEN)
    
    try:
        approved = request.data.get('approved', False)
        reservation = Reservation.objects.get(id=reservation_id)
        
        # Verify the club owns this booking
        club = Club.objects.get(userid=user)
        if reservation.booking.field.clubid != club:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        
        # Only PENDING reservations can be approved/rejected
        if reservation.approval_status != 'PENDING':
            return Response({'error': 'Reservation is not pending approval'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        if approved:
            reservation.approval_status = 'APPROVED'
            message = f"Rezervacija za {reservation.booking.title} je odobjena"
            player_message = f"Vaša rezervacija za {reservation.booking.title} je odobjena od strane kluba!"
        else:
            reservation.approval_status = 'REJECTED'
            message = f"Rezervacija za {reservation.booking.title} je odbijena"
            player_message = f"Vaša rezervacija za {reservation.booking.title} je odbijena od strane kluba."
        
        reservation.save()
        
        # Send notification to player about approval/rejection
        Notification.objects.create(
            userid=reservation.player.userid,
            title=message,
            message=player_message,
            is_read=False
        )
        
        return Response({
            'message': f"Reservation {'approved' if approved else 'rejected'} successfully",
            'reservation': {
                'id': reservation.id,
                'approval_status': reservation.approval_status,
            }
        }, status=status.HTTP_200_OK)
        
    except Reservation.DoesNotExist:
        return Response({'error': 'Reservation not found'}, status=status.HTTP_404_NOT_FOUND)
    except Club.DoesNotExist:
        return Response({'error': 'Club not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_review(request):
    """
    POST { "club_id": <int>, "comment": "...", "rating": <decimal> }
    Auth required (Authorization: Bearer <access>)
    """
    try:
        club_id = request.data.get('club_id')
        comment = request.data.get('comment', '')
        rating = request.data.get('rating')

        if not club_id or rating is None:
            return Response({'error': 'club_id and rating are required'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Only players can leave reviews and only if they have an active reservation in this club
        if request.user.role.upper() != 'PLAYER':
            return Response({'error': 'Only players can leave reviews'},
                            status=status.HTTP_403_FORBIDDEN)

        # Validate club exists and is actually a club
        try:
            club_user = User.objects.get(id=club_id)
            if club_user.role != 'CLUB':
                return Response({'error': 'The specified user is not a club'},
                                status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({'error': 'Club not found'},
                            status=status.HTTP_404_NOT_FOUND)

        # Ensure player has an active/approved reservation (today or future) in this club
        player = Player.objects.get(userid=request.user)
        today = timezone.now().date()
        has_active_reservation = Reservation.objects.filter(
            player=player,
            booking__field__clubid__userid=club_user,
            approval_status='APPROVED',
            payment_status__in=['PENDING', 'PAID'],
            date__gte=today
        ).exists()

        if not has_active_reservation:
            return Response({'error': 'Morate imati aktivnu rezervaciju u ovom klubu da biste ostavili recenziju'},
                            status=status.HTTP_403_FORBIDDEN)

        # Validate rating range
        try:
            rating = float(rating)
            if rating < 0 or rating > 5:
                return Response({'error': 'Rating must be between 0 and 5'},
                                status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({'error': 'Invalid rating value'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Validate comment length
        if len(comment) > 300:
            return Response({'error': 'Comment cannot exceed 300 characters'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Create review
        review = Review.objects.create(
            userid=request.user,
            clubid=club_user,
            comment=comment,
            rating=rating
        )

        # Update club's average rating
        avg_rating = Review.objects.filter(clubid=club_user).aggregate(Avg('rating'))['rating__avg']
        club = club_user.club
        club.rating_avg = avg_rating or 0.0
        club.save()

        return Response({
            'id': review.id,
            'user_id': review.userid.id,
            'club_id': review.clubid.id,
            'comment': review.comment,
            'rating': float(review.rating),
            'uploaded_at': review.uploaded_at
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_reviews_by_user(request, user_id):
    """
    GET /api/reviews/user/<user_id>/
    Returns all reviews created by a specific user
    """
    try:
        reviews = Review.objects.filter(userid=user_id).select_related('userid', 'clubid')
        
        reviews_data = [{
            'id': review.id,
            'user_id': review.userid.id,
            'user_username': review.userid.username,
            'club_id': review.clubid.id,
            'club_name': review.clubid.club.name if hasattr(review.clubid, 'club') else review.clubid.username,
            'comment': review.comment,
            'rating': float(review.rating),
            'uploaded_at': review.uploaded_at
        } for review in reviews]

        return Response({
            'count': len(reviews_data),
            'reviews': reviews_data
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_reviews_by_club(request, club_id):
    """
    GET /api/reviews/club/<club_id>/
    Returns all reviews for a specific club
    """
    try:
        # Verify the club exists
        try:
            club_user = User.objects.get(id=club_id)
            if club_user.role != 'CLUB':
                return Response({'error': 'The specified user is not a club'},
                                status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({'error': 'Club not found'},
                            status=status.HTTP_404_NOT_FOUND)

        reviews = Review.objects.filter(clubid=club_id).select_related('userid', 'clubid')
        
        reviews_data = [{
            'id': review.id,
            'user_id': review.userid.id,
            'user_username': review.userid.username,
            'club_id': review.clubid.id,
            'club_name': review.clubid.club.name if hasattr(review.clubid, 'club') else review.clubid.username,
            'comment': review.comment,
            'rating': float(review.rating),
            'uploaded_at': review.uploaded_at
        } for review in reviews]

        # Calculate average rating
        avg_rating = Review.objects.filter(clubid=club_id).aggregate(Avg('rating'))['rating__avg']

        return Response({
            'count': len(reviews_data),
            'average_rating': float(avg_rating) if avg_rating else 0.0,
            'reviews': reviews_data
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_review(request, review_id):
    """
    DELETE /api/reviews/<review_id>/
    Allows a user to delete their own review
    Auth required (Authorization: Bearer <access>)
    """
    try:
        # Get the review
        try:
            review = Review.objects.get(id=review_id)
        except Review.DoesNotExist:
            return Response({'error': 'Review not found'},
                            status=status.HTTP_404_NOT_FOUND)

        # Check if the user owns this review
        if review.userid.id != request.user.id:
            return Response({'error': 'You can only delete your own reviews'},
                            status=status.HTTP_403_FORBIDDEN)

        club_user = review.clubid
        review.delete()

        # Update club's average rating after deletion
        avg_rating = Review.objects.filter(clubid=club_user).aggregate(Avg('rating'))['rating__avg']
        club = club_user.club
        club.rating_avg = avg_rating or 0.0
        club.save()

        return Response({'message': 'Review deleted successfully'},
                        status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_last_notifications(request):
    try:
        count = int(request.GET.get('count', '5'))
        notifications = Notification.objects.filter(userid=request.user).order_by('-created_at')[:count]
        data = [
            {
                'id': n.id,
                'title': n.title,
                'message': n.message,
                'is_read': n.is_read,
                'reservation_id': n.reservation_id if n.reservation_id else None,
                'created_at': n.created_at
            }
            for n in notifications
        ]
        return Response({'notifications': data}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_notifications(request):
    try:
        notifications = Notification.objects.filter(userid=request.user).order_by('-created_at')
        data = [
            {
                'id': n.id,
                'title': n.title,
                'message': n.message,
                'is_read': n.is_read,
                'reservation_id': n.reservation_id if n.reservation_id else None,
                'created_at': n.created_at
            }
            for n in notifications
        ]
        return Response({'count': len(data), 'notifications': data}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    try:
        notification = Notification.objects.get(id=notification_id, userid=request.user)
        notification.is_read = True
        notification.save()
        return Response({'message': 'Notification marked as read'}, status=status.HTTP_200_OK)
    except Notification.DoesNotExist:
        return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_reservation_history(request):
    """Get all completed reservations for the current player"""
    try:
        user = request.user
        
        if user.role.upper() != 'PLAYER':
            return Response({'error': 'Only players can view reservation history'}, 
                           status=status.HTTP_403_FORBIDDEN)
        
        player = Player.objects.get(userid=user)
        history = player.reservation_history.select_related(
            'booking__field__clubid__userid'
        ).all()
        
        data = []
        for res in history:
            data.append({
                'id': res.id,
                'booking_id': res.booking.id,
                'booking_title': res.booking.title,
                'field_id': res.booking.field.id,
                'field_name': res.booking.field.name,
                'club_id': res.booking.field.clubid.userid.id,
                'club_name': res.booking.field.clubid.name,
                'day_of_week': res.booking.day_of_week,
                'start_time': res.booking.start_time.isoformat(),
                'end_time': res.booking.end_time.isoformat(),
                'booking_date': res.booking_date.isoformat(),
                'payment_method': res.payment_method,
                'payment_status': res.payment_status,
                'created_at': res.created_at.isoformat(),
                'completed_at': res.completed_at.isoformat(),
            })
        
        return Response({'count': len(data), 'history': data}, status=status.HTTP_200_OK)
    except Player.DoesNotExist:
        return Response({'error': 'Player profile not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==================== OFFERS ENDPOINTS ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_offer(request):
    """Create a new offer (subscription or tutoring) - Club only"""
    try:
        user = request.user
        
        if user.role.upper() != 'CLUB':
            return Response({'error': 'Only clubs can create offers'}, 
                           status=status.HTTP_403_FORBIDDEN)
        
        club = Club.objects.get(userid=user)
        
        name = request.data.get('name')
        description = request.data.get('description', '')
        monthly_price = request.data.get('monthly_price')
        offer_type = request.data.get('offer_type')
        
        if not all([name, monthly_price, offer_type]):
            return Response({'error': 'name, monthly_price, and offer_type are required'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        if offer_type not in ['SUBSCRIPTION', 'TUTORING']:
            return Response({'error': 'offer_type must be SUBSCRIPTION or TUTORING'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        # Create base offer
        offer = Offer.objects.create(
            clubid=club,
            name=name,
            description=description,
            monthly_price=monthly_price,
            offer_type=offer_type
        )
        
        # Create specific offer type
        if offer_type == 'SUBSCRIPTION':
            discount_percentage = request.data.get('discount_percentage')
            
            if discount_percentage is None:
                offer.delete()
                return Response({'error': 'discount_percentage is required for subscriptions'}, 
                               status=status.HTTP_400_BAD_REQUEST)
            
            if not (0 <= int(discount_percentage) <= 100):
                offer.delete()
                return Response({'error': 'discount_percentage must be between 0 and 100'}, 
                               status=status.HTTP_400_BAD_REQUEST)
            
            Subscription.objects.create(
                offer=offer,
                discount_percentage=discount_percentage
            )
            
        else:  # TUTORING
            tutor_name = request.data.get('tutor_name')
            
            if not tutor_name:
                offer.delete()
                return Response({'error': 'tutor_name is required for tutoring offers'}, 
                               status=status.HTTP_400_BAD_REQUEST)
            
            Tutoring.objects.create(
                offer=offer,
                tutor_name=tutor_name
            )
        
        return Response({
            'message': 'Offer created successfully',
            'offer_id': offer.id
        }, status=status.HTTP_201_CREATED)
        
    except Club.DoesNotExist:
        return Response({'error': 'Club profile not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_club_offers(request, club_id):
    """Get all offers for a specific club"""
    try:
        club = Club.objects.get(userid=club_id)
        offers = Offer.objects.filter(clubid=club).select_related('clubid__userid')
        
        data = []
        for offer in offers:
            offer_data = {
                'id': offer.id,
                'name': offer.name,
                'description': offer.description,
                'monthly_price': str(offer.monthly_price),
                'offer_type': offer.offer_type,
                'created_at': offer.created_at.isoformat(),
            }
            
            if offer.offer_type == 'SUBSCRIPTION':
                try:
                    subscription = offer.subscription
                    offer_data['discount_percentage'] = subscription.discount_percentage
                except Subscription.DoesNotExist:
                    pass
            
            elif offer.offer_type == 'TUTORING':
                try:
                    tutoring = offer.tutoring
                    offer_data['tutor_name'] = tutoring.tutor_name
                except Tutoring.DoesNotExist:
                    pass
            
            data.append(offer_data)
        
        return Response({'offers': data}, status=status.HTTP_200_OK)
    except Club.DoesNotExist:
        return Response({'error': 'Club not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_offer(request, offer_id):
    """Delete an offer - Club only"""
    try:
        user = request.user
        
        if user.role.upper() != 'CLUB':
            return Response({'error': 'Only clubs can delete offers'}, 
                           status=status.HTTP_403_FORBIDDEN)
        
        club = Club.objects.get(userid=user)
        offer = Offer.objects.get(id=offer_id, clubid=club)
        
        offer.delete()
        
        return Response({'message': 'Offer deleted successfully'}, status=status.HTTP_200_OK)
    except Club.DoesNotExist:
        return Response({'error': 'Club profile not found'}, status=status.HTTP_404_NOT_FOUND)
    except Offer.DoesNotExist:
        return Response({'error': 'Offer not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def purchase_offer(request, offer_id):
    """Purchase an offer - Player only, PayPal required"""
    try:
        user = request.user
        
        if user.role.upper() != 'PLAYER':
            return Response({'error': 'Only players can purchase offers'}, 
                           status=status.HTTP_403_FORBIDDEN)
        
        player = Player.objects.get(userid=user)
        offer = Offer.objects.select_related('clubid__userid').get(id=offer_id)
        
        paypal_order_id = request.data.get('paypal_order_id')
        
        if not paypal_order_id:
            return Response({'error': 'PayPal order ID is required'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        # Check if player already has an active offer of this type
        active_offers = PlayerOffer.objects.filter(
            player=player,
            offer__offer_type=offer.offer_type,
            is_active=True,
            expires_at__gt=timezone.now()
        )
        
        if active_offers.exists():
            return Response({
                'error': f'You already have an active {offer.offer_type.lower()} offer'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create player offer (expires in 30 days)
        expires_at = timezone.now() + timedelta(days=30)
        
        player_offer = PlayerOffer.objects.create(
            player=player,
            offer=offer,
            paypal_order_id=paypal_order_id,
            payment_status='PAID',
            expires_at=expires_at,
            is_active=True
        )
        
        # Send notification to club
        Notification.objects.create(
            userid=offer.clubid.userid,
            title=f"Nova kupovina ponude: {offer.name}",
            message=f"Igrač '{user.username}' je kupio ponudu '{offer.name}' ({offer.monthly_price} EUR/mjesec)."
        )
        
        return Response({
            'message': 'Offer purchased successfully',
            'player_offer_id': player_offer.id,
            'expires_at': player_offer.expires_at.isoformat()
        }, status=status.HTTP_201_CREATED)
        
    except Player.DoesNotExist:
        return Response({'error': 'Player profile not found'}, status=status.HTTP_404_NOT_FOUND)
    except Offer.DoesNotExist:
        return Response({'error': 'Offer not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_player_offers(request):
    """Get all active offers for the current player"""
    try:
        user = request.user
        
        if user.role.upper() != 'PLAYER':
            return Response({'error': 'Only players can view their offers'}, 
                           status=status.HTTP_403_FORBIDDEN)
        
        player = Player.objects.get(userid=user)
        
        # Get all active offers
        player_offers = PlayerOffer.objects.filter(
            player=player,
            is_active=True,
            expires_at__gt=timezone.now()
        ).select_related('offer__clubid__userid')
        
        data = []
        for po in player_offers:
            offer_data = {
                'id': po.id,
                'offer_id': po.offer.id,
                'offer_name': po.offer.name,
                'offer_type': po.offer.offer_type,
                'club_name': po.offer.clubid.name,
                'monthly_price': str(po.offer.monthly_price),
                'purchased_at': po.purchased_at.isoformat(),
                'expires_at': po.expires_at.isoformat(),
                'payment_status': po.payment_status,
            }
            
            if po.offer.offer_type == 'SUBSCRIPTION':
                try:
                    subscription = po.offer.subscription
                    offer_data['discount_percentage'] = subscription.discount_percentage
                except Subscription.DoesNotExist:
                    pass
            
            elif po.offer.offer_type == 'TUTORING':
                try:
                    tutoring = po.offer.tutoring
                    offer_data['tutor_name'] = tutoring.tutor_name
                except Tutoring.DoesNotExist:
                    pass
            
            data.append(offer_data)
        
        return Response({'offers': data}, status=status.HTTP_200_OK)
    except Player.DoesNotExist:
        return Response({'error': 'Player profile not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)