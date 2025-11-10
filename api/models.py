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
    # is_active = models.BooleanField(default=True)
    # is_staff = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    objects = CustomUserManager()

    class Meta:
        db_table = 'profile'

    def __str__(self):
        return f"{self.username} ({self.email})"


class Player(models.Model):
    userid = models.OneToOneField(User, on_delete=models.CASCADE, db_column='userId', primary_key=True)
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
    preferred_dow = models.IntegerField(db_column='preferredDow', null=True, blank=True)
    preferred_time = models.TimeField(db_column='preferredTime', null=True, blank=True)

    class Meta:
        db_table = 'player'
    
    def __str__(self):
        return f"Player: {self.user.email}"


class Club(models.Model):
    userid = models.OneToOneField(User, on_delete=models.CASCADE, db_column='userId', primary_key=True)
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
        primary_key=True
    )
    first_name = models.CharField(max_length=40, db_column='firstName', blank=True)
    last_name = models.CharField(max_length=40, db_column='lastName', blank=True)
    can_manage_users = models.BooleanField(default=True, db_column='canManageUsers')
    can_manage_bookings = models.BooleanField(default=True, db_column='canManageBookings')

    class Meta:
        db_table = 'admin'

    def __str__(self):
        return f"{self.userid.email} (Admin)"