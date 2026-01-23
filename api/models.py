import datetime

from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin

class CustomUserManager(BaseUserManager):
    def create_user(self, email, username=None, password=None, role='PLAYER', **extra_fields):
        if not email:
            raise ValueError('Users must have an email address')
        email = self.normalize_email(email)

        # set default username if not provided
        if not username:
            username = email.split('@')[0]

        user = self.model(email=email, username=username, role=role, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username=None, password=None, **extra_fields):
        extra_fields.setdefault('role', 'ADMIN')
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, username, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLES = [
        ('PLAYER', 'Player'),
        ('CLUB', 'Club'),
        ('ADMIN', 'Admin'),
    ]

    id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=30, unique=True)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLES, default='PLAYER')

    # Django still requires these if you use the admin site:
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    objects = CustomUserManager()

    class Meta:
        db_table = 'profile'

    def __str__(self):
        return f"{self.username} ({self.email})"


class Player(models.Model):
    userid = models.OneToOneField(User, on_delete=models.CASCADE, db_column='userId', primary_key=True, related_name='player')
    first_name = models.CharField(max_length=40, db_column='firstName', blank=True)
    last_name = models.CharField(max_length=40, db_column='lastName', blank=True)
    phone_number = models.CharField(max_length=20, db_column='phoneNumber', blank=True)
    skill_level = models.CharField(
        max_length=20,
        db_column='skillLevel',
        default='BEGINNER',
        choices=[
            ('BEGINNER', 'BEGINNER'),
            ('INTERMEDIATE', 'INTERMEDIATE'),
            ('ADVANCED', 'ADVANCED'),
            ('PROFESSIONAL', 'PROFESSIONAL')
        ]
    )
    preferred_dow = models.IntegerField(db_column='preferredDow', null=True, default=0)
    preferred_time = models.TimeField(db_column='preferredTime', null=True, default=datetime.time(9, 30))

    class Meta:
        db_table = 'player'
    
    def __str__(self):
        return f"Player: {self.user.email}"


class Club(models.Model):
    userid = models.OneToOneField(User, on_delete=models.CASCADE, db_column='userId', primary_key=True, related_name='club')
    name = models.CharField(max_length=100, db_column='name')
    address = models.CharField(max_length=255, db_column='address', blank=True)
    description = models.TextField(db_column='description', blank=True)
    working_hours = models.CharField(max_length=100, db_column='workingHours', blank=True)
    contact_number = models.CharField(max_length=20, db_column='contactNumber', blank=True)
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, db_column='ratingAvg', default=0.0)

    class Meta:
        db_table = 'club' 

    def __str__(self):
        return self.name


class Admin(models.Model):
    userid = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        db_column='userId',
        primary_key=True,
        related_name='admin'
    )
    first_name = models.CharField(max_length=40, db_column='firstName', blank=True)
    last_name = models.CharField(max_length=40, db_column='lastName', blank=True)
    can_manage_users = models.BooleanField(default=True, db_column='canManageUsers')
    can_manage_bookings = models.BooleanField(default=True, db_column='canManageBookings')

    class Meta:
        db_table = 'admin'

    def __str__(self):
        return f"{self.userid.email} (Admin)"


class Field(models.Model):
    FLOOR_TYPES = [
        ('HARDWOOD', 'Hardwood'),
        ('GRASS', 'Grass'),
        ('TURF', 'Turf'),
        ('ARTIFICIAL', 'Artificial'),
    ]
    
    SIZE_CHOICES = [
        ('SINGLE', 'Single'),
        ('DOUBLE', 'Double'),
    ]
    
    LOCATION_CHOICES = [
        ('INSIDE', 'Inside'),
        ('OUTSIDE', 'Outside'),
    ]
    
    id = models.AutoField(primary_key=True)
    clubid = models.ForeignKey(Club, on_delete=models.CASCADE, db_column='clubId', related_name='fields')
    name = models.CharField(max_length=50, db_column='name')
    floortype = models.CharField(max_length=20, db_column='floorType', choices=FLOOR_TYPES)
    size = models.CharField(max_length=20, db_column='size', choices=SIZE_CHOICES)
    location = models.CharField(max_length=20, db_column='location', choices=LOCATION_CHOICES)
    ceilingheight = models.IntegerField(db_column='ceilingHeight', null=True, blank=True)
    lighting = models.BooleanField(db_column='lighting', default=True)
    reservation_fee = models.DecimalField(max_digits=8, decimal_places=2, default=0.00, db_column='reservationFee')
    
    class Meta:
        db_table = 'field'
    
    def __str__(self):
        return f"{self.name} ({self.clubid.name})"


class Booking(models.Model):
    id = models.AutoField(primary_key=True)
    field = models.ForeignKey(Field, on_delete=models.CASCADE, related_name='bookings')
    title = models.CharField(max_length=100)
    day_of_week = models.IntegerField()  # 0=Sunday, 1=Monday, ..., 6=Saturday
    start_time = models.TimeField()
    end_time = models.TimeField()
    price = models.DecimalField(max_digits=8, decimal_places=2, default=0.00, db_column='price')
    subscriptions = models.ManyToManyField('Subscription', related_name='bookings', db_table='booking_subscription', blank=True)
    subscription_only = models.BooleanField(default=False, db_column='subscriptionOnly')
    
    class Meta:
        db_table = 'booking'
    
    def __str__(self):
        return f"{self.title} on {self.field.name}"


class Reservation(models.Model):
    PAYMENT_METHODS = [
        ('IN_PERSON', 'Pay in person'),
        ('PAYPAL', 'PayPal'),
    ]
    
    PAYMENT_STATUS = [
        ('PENDING', 'Pending'),
        ('PAID', 'Paid'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    APPROVAL_STATUS = [
        ('PENDING', 'Pending approval'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]
    
    id = models.AutoField(primary_key=True)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='reservations')
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='reservations')
    date = models.DateField(db_column='date')
    repeating = models.BooleanField(default=False, db_column='repeating')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS, default='IN_PERSON', db_column='paymentMethod')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='PENDING', db_column='paymentStatus')
    approval_status = models.CharField(max_length=20, choices=APPROVAL_STATUS, default='APPROVED', db_column='approvalStatus')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'reservation'
        unique_together = ('booking', 'player', 'date')
    
    def __str__(self):
        return f"{self.player.userid.username} - {self.booking.title} on {self.date}"


class ReservationHistory(models.Model):
    """Archive of completed reservations for player history"""
    id = models.AutoField(primary_key=True)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='history')
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='reservation_history')
    booking_date = models.DateField(db_column='bookingDate')  # The date the booking occurred
    payment_method = models.CharField(max_length=20, choices=Reservation.PAYMENT_METHODS, default='IN_PERSON', db_column='paymentMethod')
    payment_status = models.CharField(max_length=20, choices=Reservation.PAYMENT_STATUS, default='PENDING', db_column='paymentStatus')
    created_at = models.DateTimeField(db_column='createdAt')  # When reservation was made
    completed_at = models.DateTimeField(auto_now_add=True, db_column='completedAt')  # When booking ended and archived
    
    class Meta:
        db_table = 'reservation_history'
        ordering = ['-booking_date']
    
    def __str__(self):
        return f"History: {self.player.userid.username} - {self.booking.title} on {self.booking_date}"


class Review(models.Model):
    id = models.AutoField(primary_key=True)
    userid = models.ForeignKey(User, on_delete=models.CASCADE, db_column='userId', related_name='reviews_created')
    clubid = models.ForeignKey(User, on_delete=models.CASCADE, db_column='clubId', related_name='reviews_received')
    comment = models.CharField(max_length=300, db_column='comment')
    rating = models.DecimalField(max_digits=3, decimal_places=2, db_column='rating')
    uploaded_at = models.DateTimeField(auto_now_add=True, db_column='uploadedAt')

    class Meta:
        db_table = 'review'
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"Review by {self.userid.username} for {self.clubid.username} - {self.rating}/5.00"


class Notification(models.Model):
    id = models.AutoField(primary_key=True)
    userid = models.ForeignKey(User, on_delete=models.CASCADE, db_column='userId', related_name='notifications')
    title = models.CharField(max_length=100, db_column='title')
    message = models.TextField(db_column='message')
    is_read = models.BooleanField(default=False, db_column='isRead')
    reservation = models.ForeignKey(Reservation, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications', db_column='reservationId')
    created_at = models.DateTimeField(auto_now_add=True, db_column='createdAt')

    class Meta:
        db_table = 'notification'
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.userid.username}: {self.title}"


class Offer(models.Model):
    """Base offer model - can be either a Subscription or Tutoring"""
    OFFER_TYPES = [
        ('SUBSCRIPTION', 'Subscription'),
        ('TUTORING', 'Tutoring'),
    ]
    
    id = models.AutoField(primary_key=True)
    clubid = models.ForeignKey(Club, on_delete=models.CASCADE, db_column='clubId', related_name='offers')
    name = models.CharField(max_length=100, db_column='name')
    description = models.TextField(db_column='description', blank=True)
    monthly_price = models.DecimalField(max_digits=12, decimal_places=2, db_column='monthlyPrice')
    offer_type = models.CharField(max_length=20, choices=OFFER_TYPES, db_column='offerType')
    created_at = models.DateTimeField(auto_now_add=True, db_column='startedAt')
    
    class Meta:
        db_table = 'offer'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.offer_type}) - {self.clubid.name}"


class Subscription(models.Model):
    """Subscription offer that provides discounts on specific bookings"""
    offer = models.OneToOneField(Offer, on_delete=models.CASCADE, db_column='offerId', primary_key=True, related_name='subscription')
    discount_percentage = models.IntegerField(db_column='discountPercentage')
    
    class Meta:
        db_table = 'subscription'
    
    def __str__(self):
        return f"Subscription: {self.offer.name} ({self.discount_percentage}% off)"


class Tutoring(models.Model):
    """Tutoring offer with assigned tutor"""
    offer = models.OneToOneField(Offer, on_delete=models.CASCADE, db_column='offerId', primary_key=True, related_name='tutoring')
    tutor_name = models.CharField(max_length=100, db_column='tutorName')
    
    class Meta:
        db_table = 'tutoring'
    
    def __str__(self):
        return f"Tutoring: {self.offer.name} by {self.tutor_name}"


class PlayerOffer(models.Model):
    """Tracks active offers purchased by players"""
    PAYMENT_STATUS = [
        ('PENDING', 'Pending'),
        ('PAID', 'Paid'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    id = models.AutoField(primary_key=True)
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='player_offers')
    offer = models.ForeignKey(Offer, on_delete=models.CASCADE, related_name='player_offers')
    paypal_order_id = models.CharField(max_length=255, db_column='paypalOrderId', null=True, blank=True)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='PENDING', db_column='paymentStatus')
    purchased_at = models.DateTimeField(auto_now_add=True, db_column='purchasedAt')
    expires_at = models.DateTimeField(db_column='expiresAt')  # Monthly subscription expires after 30 days
    is_active = models.BooleanField(default=True, db_column='isActive')
    
    class Meta:
        db_table = 'player_offer'
        ordering = ['-purchased_at']
        unique_together = ('player', 'offer')
    
    def __str__(self):
        return f"{self.player.userid.username} - {self.offer.name} (expires: {self.expires_at})"