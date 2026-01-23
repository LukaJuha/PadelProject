"""
Admin-only API endpoints
Requires authentication and admin role (ROLE='ADMIN')
"""

from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework import status
from django.contrib.auth import get_user_model
from django.db.models import Avg
from .models import Player, Club, Admin, Field, Booking, Reservation, Review, Offer, PlayerOffer

User = get_user_model()


class IsAdmin(BasePermission):
    """
    Custom permission to only allow admins to access a view.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'ADMIN'


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_list_users(request):
    """
    GET /api/admin/users/?role=PLAYER&search=john
    List all users with optional filtering
    Admin only
    """
    try:
        role = request.GET.get('role', None)
        search = request.GET.get('search', None)
        
        users = User.objects.all()
        
        if role:
            users = users.filter(role=role.upper())
        
        if search:
            users = users.filter(
                username__icontains=search
            ) | users.filter(
                email__icontains=search
            )
        
        users_data = []
        for user in users:
            user_info = {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'last_login': user.last_login
            }
            
            # Add role-specific data
            if user.role == 'PLAYER' and hasattr(user, 'player'):
                user_info['profile'] = {
                    'first_name': user.player.first_name,
                    'last_name': user.player.last_name,
                    'phone_number': user.player.phone_number,
                    'skill_level': user.player.skill_level
                }
            elif user.role == 'CLUB' and hasattr(user, 'club'):
                user_info['profile'] = {
                    'name': user.club.name,
                    'address': user.club.address,
                    'rating_avg': float(user.club.rating_avg)
                }
            elif user.role == 'ADMIN' and hasattr(user, 'admin'):
                user_info['profile'] = {
                    'first_name': user.admin.first_name,
                    'last_name': user.admin.last_name
                }
            
            users_data.append(user_info)
        
        return Response({
            'count': len(users_data),
            'users': users_data
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_get_user(request, user_id):
    """
    GET /api/admin/users/<user_id>/
    Get detailed information about a specific user
    Admin only
    """
    try:
        user = User.objects.get(id=user_id)
        
        user_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'last_login': user.last_login,
            'is_superuser': user.is_superuser
        }
        
        # Add role-specific data
        if user.role == 'PLAYER' and hasattr(user, 'player'):
            user_data['profile'] = {
                'first_name': user.player.first_name,
                'last_name': user.player.last_name,
                'phone_number': user.player.phone_number,
                'skill_level': user.player.skill_level,
                'preferred_dow': user.player.preferred_dow,
                'preferred_time': str(user.player.preferred_time) if user.player.preferred_time else None
            }
            user_data['reviews_count'] = Review.objects.filter(userid=user).count()
            user_data['reservations_count'] = Reservation.objects.filter(player=user.player).count()
            
        elif user.role == 'CLUB' and hasattr(user, 'club'):
            user_data['profile'] = {
                'name': user.club.name,
                'address': user.club.address,
                'description': user.club.description,
                'working_hours': user.club.working_hours,
                'contact_number': user.club.contact_number,
                'rating_avg': float(user.club.rating_avg)
            }
            user_data['reviews_count'] = Review.objects.filter(clubid=user).count()
            user_data['fields_count'] = Field.objects.filter(clubid=user.club).count()
            
        elif user.role == 'ADMIN' and hasattr(user, 'admin'):
            user_data['profile'] = {
                'first_name': user.admin.first_name,
                'last_name': user.admin.last_name,
                'can_manage_users': user.admin.can_manage_users,
                'can_manage_bookings': user.admin.can_manage_bookings
            }
        
        return Response(user_data, status=status.HTTP_200_OK)
    
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_update_user(request, user_id):
    """
    PATCH /api/admin/users/<user_id>/
    Update any user's profile
    Admin only
    """
    try:
        user = User.objects.get(id=user_id)
        # Block modifying admin accounts via admin endpoints
        if user.role == 'ADMIN':
            return Response({'error': 'Admins cannot modify admin accounts via this endpoint'},
                            status=status.HTTP_403_FORBIDDEN)
        data = request.data
        
        # Update username if provided
        if 'username' in data:
            if User.objects.filter(username=data['username']).exclude(id=user_id).exists():
                return Response({'error': 'Username already exists'},
                                status=status.HTTP_400_BAD_REQUEST)
            user.username = data['username']
            user.save()
        
        # Update role-specific profile
        if user.role == 'PLAYER' and hasattr(user, 'player'):
            player = user.player
            if 'first_name' in data:
                player.first_name = data['first_name']
            if 'last_name' in data:
                player.last_name = data['last_name']
            if 'phone_number' in data:
                player.phone_number = data['phone_number']
            if 'skill_level' in data:
                player.skill_level = data['skill_level']
            if 'preferred_dow' in data:
                player.preferred_dow = data['preferred_dow']
            if 'preferred_time' in data:
                player.preferred_time = data['preferred_time']
            player.save()
            
        elif user.role == 'CLUB' and hasattr(user, 'club'):
            club = user.club
            if 'name' in data:
                club.name = data['name']
            if 'address' in data:
                club.address = data['address']
            if 'description' in data:
                club.description = data['description']
            if 'working_hours' in data:
                club.working_hours = data['working_hours']
            if 'contact_number' in data:
                club.contact_number = data['contact_number']
            club.save()
            
        elif user.role == 'ADMIN' and hasattr(user, 'admin'):
            admin = user.admin
            if 'first_name' in data:
                admin.first_name = data['first_name']
            if 'last_name' in data:
                admin.last_name = data['last_name']
            if 'can_manage_users' in data:
                admin.can_manage_users = data['can_manage_users']
            if 'can_manage_bookings' in data:
                admin.can_manage_bookings = data['can_manage_bookings']
            admin.save()
        
        return Response({'message': 'User updated successfully'}, status=status.HTTP_200_OK)
    
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_delete_user(request, user_id):
    """
    DELETE /api/admin/users/<user_id>/
    Delete any user account
    Admin only (cannot delete themselves)
    """
    try:
        if request.user.id == user_id:
            return Response({'error': 'Admins cannot delete their own account using this endpoint'},
                            status=status.HTTP_400_BAD_REQUEST)
        
        user = User.objects.get(id=user_id)
        # Block deleting admin accounts
        if user.role == 'ADMIN':
            return Response({'error': 'Admins cannot delete admin accounts'},
                            status=status.HTTP_403_FORBIDDEN)
        user_email = user.email
        user.delete()
        
        return Response({
            'message': f'User {user_email} has been deleted by admin'
        }, status=status.HTTP_200_OK)
    
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_delete_review(request, review_id):
    """
    DELETE /api/admin/reviews/<review_id>/
    Delete any review (content moderation)
    Admin only
    """
    try:
        review = Review.objects.get(id=review_id)
        club_user = review.clubid
        review.delete()
        
        # Update club's average rating
        avg_rating = Review.objects.filter(clubid=club_user).aggregate(Avg('rating'))['rating__avg']
        club = club_user.club
        club.rating_avg = avg_rating or 0.0
        club.save()
        
        return Response({'message': 'Review deleted by admin'}, status=status.HTTP_200_OK)
    
    except Review.DoesNotExist:
        return Response({'error': 'Review not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_statistics(request):
    """
    GET /api/admin/statistics/
    Get platform statistics
    Admin only
    """
    try:
        stats = {
            'total_users': User.objects.count(),
            'users_by_role': {
                'players': User.objects.filter(role='PLAYER').count(),
                'clubs': User.objects.filter(role='CLUB').count(),
                'admins': User.objects.filter(role='ADMIN').count()
            },
            'total_reviews': Review.objects.count(),
            'total_fields': Field.objects.count(),
            'total_bookings': Booking.objects.count(),
            'total_reservations': Reservation.objects.count(),
            'average_club_rating': float(Club.objects.aggregate(Avg('rating_avg'))['rating_avg__avg'] or 0)
        }
        
        return Response(stats, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_get_player_reservations(request, user_id):
    """
    GET /api/admin/users/<user_id>/reservations/
    Get all reservations for a specific player user
    Admin only
    """
    try:
        user = User.objects.get(id=user_id)
        if user.role != 'PLAYER':
            return Response({'error': 'User is not a player'}, status=status.HTTP_400_BAD_REQUEST)
        
        player = user.player
        reservations = Reservation.objects.filter(player=player).select_related('booking__field__clubid')
        
        reservations_data = []
        for reservation in reservations:
            booking = reservation.booking
            field = booking.field
            club = field.clubid
            
            reservations_data.append({
                'id': reservation.id,
                'booking_id': booking.id,
                'booking_title': booking.title,
                'field_id': field.id,
                'field_name': field.name,
                'club_id': club.userid_id,
                'club_name': club.name,
                'day_of_week': booking.day_of_week,
                'start_time': str(booking.start_time),
                'end_time': str(booking.end_time),
                'created_at': reservation.created_at
            })
        
        return Response({'reservations': reservations_data}, status=status.HTTP_200_OK)
    
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_delete_reservation(request, reservation_id):
    """
    DELETE /api/admin/reservations/<reservation_id>/
    Delete any reservation
    Admin only
    """
    try:
        reservation = Reservation.objects.get(id=reservation_id)
        reservation.delete()
        
        return Response({'message': 'Reservation deleted by admin'}, status=status.HTTP_200_OK)
    
    except Reservation.DoesNotExist:
        return Response({'error': 'Reservation not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_get_club_fields(request, user_id):
    """
    GET /api/admin/users/<user_id>/fields/
    Get all fields for a specific club user
    Admin only
    """
    try:
        user = User.objects.get(id=user_id)
        if user.role != 'CLUB':
            return Response({'error': 'User is not a club'}, status=status.HTTP_400_BAD_REQUEST)
        
        club = user.club
        fields = Field.objects.filter(clubid=club)
        
        fields_data = []
        for field in fields:
            fields_data.append({
                'id': field.id,
                'name': field.name,
                'floor_type': field.floortype,
                'floorType': field.floortype,
                'size': field.size,
                'location': field.location,
                'ceiling_height': field.ceilingheight,
                'ceilingHeight': field.ceilingheight,
                'lighting': field.lighting
            })
        
        return Response({'fields': fields_data}, status=status.HTTP_200_OK)
    
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_get_field_bookings(request, field_id):
    """
    GET /api/admin/fields/<field_id>/bookings/
    Get all bookings for a specific field
    Admin only
    """
    try:
        field = Field.objects.get(id=field_id)
        bookings = Booking.objects.filter(field=field)
        
        bookings_data = []
        for booking in bookings:
            has_reservation = Reservation.objects.filter(booking=booking).exists()
            bookings_data.append({
                'id': booking.id,
                'title': booking.title,
                'day_of_week': booking.day_of_week,
                'start_time': str(booking.start_time),
                'end_time': str(booking.end_time),
                'has_reservation': has_reservation
            })
        
        return Response({'bookings': bookings_data}, status=status.HTTP_200_OK)
    
    except Field.DoesNotExist:
        return Response({'error': 'Field not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_delete_field(request, field_id):
    """
    DELETE /api/admin/fields/<field_id>/
    Delete a field and all its bookings
    Admin only
    """
    try:
        field = Field.objects.get(id=field_id)
        field_name = field.name
        field.delete()
        
        return Response({'message': f'Field {field_name} deleted by admin'}, status=status.HTTP_200_OK)
    
    except Field.DoesNotExist:
        return Response({'error': 'Field not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_delete_booking(request, booking_id):
    """
    DELETE /api/admin/bookings/<booking_id>/
    Delete a booking and all its reservations
    Admin only
    """
    try:
        booking = Booking.objects.get(id=booking_id)
        booking_title = booking.title
        booking.delete()
        
        return Response({'message': f'Booking {booking_title} deleted by admin'}, status=status.HTTP_200_OK)
    
    except Booking.DoesNotExist:
        return Response({'error': 'Booking not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_update_field(request, field_id):
    """
    PUT /api/admin/fields/<field_id>/
    Update a field's properties
    Admin only
    """
    try:
        field = Field.objects.get(id=field_id)
        data = request.data
        
        if 'name' in data:
            field.name = data['name']
        if 'floor_type' in data:
            field.floortype = data['floor_type']
        if 'size' in data:
            field.size = data['size']
        if 'location' in data:
            field.location = data['location']
        if 'ceiling_height' in data:
            field.ceilingheight = data['ceiling_height']
        if 'lighting' in data:
            field.lighting = data['lighting']
        
        field.save()
        
        return Response({
            'message': 'Field updated successfully',
            'field': {
                'id': field.id,
                'name': field.name,
                'floor_type': field.floortype,
                'floorType': field.floortype,
                'size': field.size,
                'location': field.location,
                'ceiling_height': field.ceilingheight,
                'ceilingHeight': field.ceilingheight,
                'lighting': field.lighting
            }
        }, status=status.HTTP_200_OK)
    
    except Field.DoesNotExist:
        return Response({'error': 'Field not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_update_booking(request, booking_id):
    """
    PUT /api/admin/bookings/<booking_id>/
    Update a booking's properties
    Admin only
    """
    try:
        booking = Booking.objects.get(id=booking_id)
        data = request.data
        
        if 'title' in data:
            booking.title = data['title']
        if 'day_of_week' in data:
            booking.day_of_week = data['day_of_week']
        if 'start_time' in data:
            booking.start_time = data['start_time']
        if 'end_time' in data:
            booking.end_time = data['end_time']
        
        booking.save()
        
        has_reservation = Reservation.objects.filter(booking=booking).exists()
        
        return Response({
            'message': 'Booking updated successfully',
            'booking': {
                'id': booking.id,
                'title': booking.title,
                'day_of_week': booking.day_of_week,
                'start_time': str(booking.start_time),
                'end_time': str(booking.end_time),
                'has_reservation': has_reservation
            }
        }, status=status.HTTP_200_OK)
    
    except Booking.DoesNotExist:
        return Response({'error': 'Booking not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_assign_subscription(request, player_id):
    """
    POST /api/admin/players/<player_id>/assign-subscription/
    Body: { "offer_id": 1, "duration_days": 30 }
    Admin can assign any subscription to any player
    """
    try:
        from django.utils import timezone
        from datetime import timedelta
        
        player = Player.objects.get(userid__id=player_id)
        offer_id = request.data.get('offer_id')
        duration_days = request.data.get('duration_days', 30)
        
        if not offer_id:
            return Response({'error': 'offer_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        offer = Offer.objects.get(id=offer_id)
        
        # Check if player already has this exact offer active
        existing = PlayerOffer.objects.filter(
            player=player,
            offer=offer,
            is_active=True,
            expires_at__gt=timezone.now()
        ).first()
        
        if existing:
            # Extend the existing subscription
            existing.expires_at = timezone.now() + timedelta(days=duration_days)
            existing.save()
            
            return Response({
                'message': 'Subscription extended successfully',
                'player_offer_id': existing.id,
                'expires_at': existing.expires_at.isoformat()
            }, status=status.HTTP_200_OK)
        
        # Create new player offer
        expires_at = timezone.now() + timedelta(days=duration_days)
        
        player_offer = PlayerOffer.objects.create(
            player=player,
            offer=offer,
            payment_status='PAID',
            expires_at=expires_at,
            is_active=True
        )
        
        return Response({
            'message': 'Subscription assigned successfully',
            'player_offer_id': player_offer.id,
            'expires_at': player_offer.expires_at.isoformat()
        }, status=status.HTTP_201_CREATED)
        
    except Player.DoesNotExist:
        return Response({'error': 'Player not found'}, status=status.HTTP_404_NOT_FOUND)
    except Offer.DoesNotExist:
        return Response({'error': 'Offer not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_revoke_subscription(request, player_offer_id):
    """
    DELETE /api/admin/subscriptions/<player_offer_id>/
    Admin can revoke any player's subscription
    """
    try:
        player_offer = PlayerOffer.objects.get(id=player_offer_id)
        player_offer.is_active = False
        player_offer.save()
        
        return Response({
            'message': 'Subscription revoked successfully'
        }, status=status.HTTP_200_OK)
        
    except PlayerOffer.DoesNotExist:
        return Response({'error': 'Subscription not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_list_all_subscriptions(request):
    """
    GET /api/admin/subscriptions/?active_only=true&player_id=1
    List all player subscriptions with optional filtering
    """
    try:
        from django.utils import timezone
        
        subscriptions = PlayerOffer.objects.select_related(
            'player__userid',
            'offer__clubid__userid'
        ).all()
        
        # Filter by active status
        active_only = request.GET.get('active_only', '').lower() == 'true'
        if active_only:
            subscriptions = subscriptions.filter(
                is_active=True,
                expires_at__gt=timezone.now()
            )
        
        # Filter by player
        player_id = request.GET.get('player_id')
        if player_id:
            subscriptions = subscriptions.filter(player__userid__id=player_id)
        
        subscriptions_data = []
        for sub in subscriptions:
            offer_data = {
                'id': sub.offer.id,
                'name': sub.offer.name,
                'type': sub.offer.offer_type,
                'price': float(sub.offer.monthly_price),
                'club': sub.offer.clubid.userid.username
            }
            
            # Add discount percentage if it's a subscription offer
            if sub.offer.offer_type == 'SUBSCRIPTION':
                try:
                    offer_data['discount_percentage'] = sub.offer.subscription.discount_percentage
                except Subscription.DoesNotExist:
                    offer_data['discount_percentage'] = 0
            
            subscriptions_data.append({
                'id': sub.id,
                'player': {
                    'id': sub.player.userid.id,
                    'username': sub.player.userid.username,
                    'email': sub.player.userid.email
                },
                'offer': offer_data,
                'payment_status': sub.payment_status,
                'purchased_at': sub.purchased_at.isoformat(),
                'expires_at': sub.expires_at.isoformat(),
                'is_active': sub.is_active,
                'is_expired': sub.expires_at < timezone.now()
            })
        
        return Response({
            'count': len(subscriptions_data),
            'subscriptions': subscriptions_data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
