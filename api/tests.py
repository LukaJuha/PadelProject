from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Player, Club, Review
from decimal import Decimal
from django.db.models import Avg

User = get_user_model()


class ReviewAPITestCase(APITestCase):
    """Test suite for Review API endpoints"""

    def setUp(self):
        """Set up test data"""
        # Create a player user
        self.player_user = User.objects.create_user(
            email='player@test.com',
            username='testplayer',
            password='testpass123',
            role='PLAYER'
        )
        Player.objects.create(
            userid=self.player_user,
            first_name='Test',
            last_name='Player'
        )

        # Create a club user
        self.club_user = User.objects.create_user(
            email='club@test.com',
            username='testclub',
            password='testpass123',
            role='CLUB'
        )
        Club.objects.create(
            userid=self.club_user,
            name='Test Tennis Club',
            address='123 Test St'
        )

        # Create another player for additional tests
        self.player_user2 = User.objects.create_user(
            email='player2@test.com',
            username='testplayer2',
            password='testpass123',
            role='PLAYER'
        )
        Player.objects.create(
            userid=self.player_user2,
            first_name='Test2',
            last_name='Player2'
        )

        # Get JWT token for authentication
        refresh = RefreshToken.for_user(self.player_user)
        self.access_token = str(refresh.access_token)
        
        # Set up API client
        self.client = APIClient()

    def test_create_review_success(self):
        """Test creating a review successfully"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        data = {
            'club_id': self.club_user.id,
            'comment': 'Great tennis club!',
            'rating': 4.5
        }
        
        response = self.client.post('/api/reviews/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user_id'], self.player_user.id)
        self.assertEqual(response.data['club_id'], self.club_user.id)
        self.assertEqual(response.data['comment'], 'Great tennis club!')
        self.assertEqual(response.data['rating'], 4.5)
        self.assertIn('uploaded_at', response.data)

    def test_create_review_without_authentication(self):
        """Test creating a review without authentication fails"""
        data = {
            'club_id': self.club_user.id,
            'comment': 'Great club!',
            'rating': 4.5
        }
        
        response = self.client.post('/api/reviews/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_review_missing_fields(self):
        """Test creating a review with missing required fields"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        # Missing rating
        data = {
            'club_id': self.club_user.id,
            'comment': 'Great club!'
        }
        
        response = self.client.post('/api/reviews/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Missing club_id
        data = {
            'comment': 'Great club!',
            'rating': 4.5
        }
        
        response = self.client.post('/api/reviews/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_review_invalid_rating(self):
        """Test creating a review with invalid rating"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        # Rating too high
        data = {
            'club_id': self.club_user.id,
            'comment': 'Great club!',
            'rating': 6.0
        }
        
        response = self.client.post('/api/reviews/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Rating negative
        data['rating'] = -1.0
        response = self.client.post('/api/reviews/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_review_comment_too_long(self):
        """Test creating a review with comment exceeding 300 characters"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        data = {
            'club_id': self.club_user.id,
            'comment': 'a' * 301,  # 301 characters
            'rating': 4.5
        }
        
        response = self.client.post('/api/reviews/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_review_for_non_club(self):
        """Test creating a review for a user who is not a club"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        data = {
            'club_id': self.player_user2.id,  # This is a player, not a club
            'comment': 'Great player!',
            'rating': 4.5
        }
        
        response = self.client.post('/api/reviews/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('not a club', response.data['error'])

    def test_create_review_for_nonexistent_club(self):
        """Test creating a review for a non-existent club"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        data = {
            'club_id': 99999,  # Non-existent ID
            'comment': 'Great club!',
            'rating': 4.5
        }
        
        response = self.client.post('/api/reviews/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_reviews_by_user(self):
        """Test fetching all reviews by a specific user"""
        # Create multiple reviews
        Review.objects.create(
            userid=self.player_user,
            clubid=self.club_user,
            comment='First review',
            rating=4.0
        )
        Review.objects.create(
            userid=self.player_user,
            clubid=self.club_user,
            comment='Second review',
            rating=5.0
        )
        Review.objects.create(
            userid=self.player_user2,
            clubid=self.club_user,
            comment='Another user review',
            rating=3.5
        )
        
        response = self.client.get(f'/api/reviews/user/{self.player_user.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
        self.assertEqual(len(response.data['reviews']), 2)
        
        # Check that reviews belong to the correct user
        for review in response.data['reviews']:
            self.assertEqual(review['user_id'], self.player_user.id)

    def test_get_reviews_by_user_no_reviews(self):
        """Test fetching reviews for a user with no reviews"""
        response = self.client.get(f'/api/reviews/user/{self.player_user2.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)
        self.assertEqual(len(response.data['reviews']), 0)

    def test_get_reviews_by_club(self):
        """Test fetching all reviews for a specific club"""
        # Create multiple reviews for the club
        Review.objects.create(
            userid=self.player_user,
            clubid=self.club_user,
            comment='First review',
            rating=4.0
        )
        Review.objects.create(
            userid=self.player_user2,
            clubid=self.club_user,
            comment='Second review',
            rating=5.0
        )
        
        response = self.client.get(f'/api/reviews/club/{self.club_user.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
        self.assertEqual(len(response.data['reviews']), 2)
        self.assertEqual(response.data['average_rating'], 4.5)
        
        # Check that reviews belong to the correct club
        for review in response.data['reviews']:
            self.assertEqual(review['club_id'], self.club_user.id)

    def test_get_reviews_by_club_no_reviews(self):
        """Test fetching reviews for a club with no reviews"""
        response = self.client.get(f'/api/reviews/club/{self.club_user.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)
        self.assertEqual(response.data['average_rating'], 0.0)

    def test_get_reviews_by_nonexistent_club(self):
        """Test fetching reviews for a non-existent club"""
        response = self.client.get('/api/reviews/club/99999/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_reviews_by_non_club_user(self):
        """Test fetching reviews for a user who is not a club"""
        response = self.client.get(f'/api/reviews/club/{self.player_user.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('not a club', response.data['error'])

    def test_club_rating_avg_updates(self):
        """Test that club's average rating updates when reviews are added"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        # Create first review
        data = {
            'club_id': self.club_user.id,
            'comment': 'Good club',
            'rating': 4.0
        }
        self.client.post('/api/reviews/', data, format='json')
        
        # Check club rating
        self.club_user.club.refresh_from_db()
        self.assertEqual(float(self.club_user.club.rating_avg), 4.0)
        
        # Create second review with different token
        refresh = RefreshToken.for_user(self.player_user2)
        access_token2 = str(refresh.access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token2}')
        
        data = {
            'club_id': self.club_user.id,
            'comment': 'Excellent club',
            'rating': 5.0
        }
        self.client.post('/api/reviews/', data, format='json')
        
        # Check updated club rating (should be average of 4.0 and 5.0)
        self.club_user.club.refresh_from_db()
        self.assertEqual(float(self.club_user.club.rating_avg), 4.5)

    def test_delete_own_review_success(self):
        """Test deleting own review successfully"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        # Create a review
        review = Review.objects.create(
            userid=self.player_user,
            clubid=self.club_user,
            comment='Test review',
            rating=4.0
        )
        
        # Delete the review
        response = self.client.delete(f'/api/reviews/{review.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('deleted successfully', response.data['message'])
        
        # Verify review is deleted
        self.assertFalse(Review.objects.filter(id=review.id).exists())

    def test_delete_review_without_authentication(self):
        """Test deleting review without authentication fails"""
        # Create a review
        review = Review.objects.create(
            userid=self.player_user,
            clubid=self.club_user,
            comment='Test review',
            rating=4.0
        )
        
        # Try to delete without authentication
        response = self.client.delete(f'/api/reviews/{review.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Verify review still exists
        self.assertTrue(Review.objects.filter(id=review.id).exists())

    def test_delete_other_user_review_forbidden(self):
        """Test that users cannot delete reviews by other users"""
        # Create a review by player_user2
        review = Review.objects.create(
            userid=self.player_user2,
            clubid=self.club_user,
            comment='Another user review',
            rating=4.0
        )
        
        # Try to delete as player_user
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.delete(f'/api/reviews/{review.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('only delete your own', response.data['error'])
        
        # Verify review still exists
        self.assertTrue(Review.objects.filter(id=review.id).exists())

    def test_delete_nonexistent_review(self):
        """Test deleting a non-existent review"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        response = self.client.delete('/api/reviews/99999/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_club_rating_updates_after_deletion(self):
        """Test that club's average rating updates after review deletion"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        # Create first review
        review1 = Review.objects.create(
            userid=self.player_user,
            clubid=self.club_user,
            comment='First review',
            rating=4.0
        )
        
        # Create second review
        review2 = Review.objects.create(
            userid=self.player_user2,
            clubid=self.club_user,
            comment='Second review',
            rating=5.0
        )
        
        # Update club rating
        avg_rating = Review.objects.filter(clubid=self.club_user).aggregate(Avg('rating'))['rating__avg']
        self.club_user.club.rating_avg = avg_rating
        self.club_user.club.save()
        
        # Check initial rating (4.0 + 5.0) / 2 = 4.5
        self.club_user.club.refresh_from_db()
        self.assertEqual(float(self.club_user.club.rating_avg), 4.5)
        
        # Delete first review
        response = self.client.delete(f'/api/reviews/{review1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check updated rating (should be 5.0 now)
        self.club_user.club.refresh_from_db()
        self.assertEqual(float(self.club_user.club.rating_avg), 5.0)

class DeleteAccountAPITestCase(APITestCase):
    """Test suite for Delete Account API endpoint"""

    def setUp(self):
        """Set up test data"""
        # Create a player user
        self.player_user = User.objects.create_user(
            email='player@test.com',
            username='testplayer',
            password='testpass123',
            role='PLAYER'
        )
        Player.objects.create(
            userid=self.player_user,
            first_name='Test',
            last_name='Player'
        )

        # Create a club user
        self.club_user = User.objects.create_user(
            email='club@test.com',
            username='testclub',
            password='testpass123',
            role='CLUB'
        )
        Club.objects.create(
            userid=self.club_user,
            name='Test Tennis Club',
            address='123 Test St'
        )

        # Get JWT token for authentication
        refresh = RefreshToken.for_user(self.player_user)
        self.access_token = str(refresh.access_token)
        
        # Set up API client
        self.client = APIClient()

    def test_delete_account_with_password_success(self):
        """Test deleting account with password confirmation"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        data = {
            'password': 'testpass123'
        }
        
        response = self.client.delete('/api/auth/user/delete/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('permanently deleted', response.data['message'])
        
        # Verify user is deleted
        self.assertFalse(User.objects.filter(email='player@test.com').exists())
        
        # Verify related Player is also deleted (cascade)
        self.assertFalse(Player.objects.filter(userid=self.player_user.id).exists())

    def test_delete_account_without_password_success(self):
        """Test deleting account without password confirmation"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        response = self.client.delete('/api/auth/user/delete/', format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('permanently deleted', response.data['message'])
        
        # Verify user is deleted
        self.assertFalse(User.objects.filter(email='player@test.com').exists())

    def test_delete_account_with_wrong_password(self):
        """Test deleting account with incorrect password"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        data = {
            'password': 'wrongpassword'
        }
        
        response = self.client.delete('/api/auth/user/delete/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('incorrect', response.data['error'])
        
        # Verify user still exists
        self.assertTrue(User.objects.filter(email='player@test.com').exists())

    def test_delete_account_without_authentication(self):
        """Test deleting account without authentication fails"""
        response = self.client.delete('/api/auth/user/delete/', format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Verify user still exists
        self.assertTrue(User.objects.filter(email='player@test.com').exists())

    def test_delete_club_account_cascades(self):
        """Test deleting club account also deletes related Club record"""
        refresh = RefreshToken.for_user(self.club_user)
        club_token = str(refresh.access_token)
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {club_token}')
        
        response = self.client.delete('/api/auth/user/delete/', format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify club user is deleted
        self.assertFalse(User.objects.filter(email='club@test.com').exists())
        
        # Verify related Club is also deleted (cascade)
        self.assertFalse(Club.objects.filter(userid=self.club_user.id).exists())

    def test_delete_account_with_reviews_cascades(self):
        """Test deleting account also deletes all reviews by that user"""
        # Create some reviews
        Review.objects.create(
            userid=self.player_user,
            clubid=self.club_user,
            comment='Test review 1',
            rating=4.0
        )
        Review.objects.create(
            userid=self.player_user,
            clubid=self.club_user,
            comment='Test review 2',
            rating=5.0
        )
        
        # Verify reviews exist
        self.assertEqual(Review.objects.filter(userid=self.player_user).count(), 2)
        
        # Delete account
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.delete('/api/auth/user/delete/', format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify reviews are also deleted (cascade)
        self.assertEqual(Review.objects.filter(userid=self.player_user.id).count(), 0)