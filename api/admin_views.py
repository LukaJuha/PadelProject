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
from .models import Player, Club, Admin, Field, Booking, Reservation, Review

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
