#!/usr/bin/env python
"""
Django Test Server Setup Script
Run this script to start Django test server for E2E tests

Usage:
    python setup_test_server.py
"""

import os
import sys
import django
from django.core.management import call_command
from django.contrib.auth import get_user_model

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set Django settings module for testing
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

def setup_test_database():
    """Setup test database with test users"""
    django.setup()
    
    User = get_user_model()
    from api.models import Player, Club, Admin
    
    print("Setting up test database...")
    
    # Create test users
    test_users = [
        {
            'email': 'admin@test.com',
            'username': 'testadmin',
            'password': 'testpass123',
            'role': 'ADMIN'
        },
        {
            'email': 'player@test.com',
            'username': 'testplayer',
            'password': 'testpass123',
            'role': 'PLAYER'
        },
        {
            'email': 'club@test.com',
            'username': 'testclub',
            'password': 'testpass123',
            'role': 'CLUB'
        }
    ]
    
    for user_data in test_users:
        email = user_data['email']
        role = user_data['role']
        
        # Create or get user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': user_data['username'],
                'role': role
            }
        )
        
        if created:
            user.set_password(user_data['password'])
            user.save()
            print(f"✓ Created test user: {email} ({role})")
        else:
            print(f"- Test user already exists: {email} ({role})")
        
        # Ensure role-specific record exists
        if role == 'PLAYER':
            player, created = Player.objects.get_or_create(
                userid=user,
                defaults={
                    'first_name': 'Test',
                    'last_name': 'Player',
                    'skill_level': 'INTERMEDIATE'
                }
            )
            if created:
                print(f"  ✓ Created Player record")
            else:
                print(f"  - Player record already exists")
                
        elif role == 'CLUB':
            club, created = Club.objects.get_or_create(
                userid=user,
                defaults={
                    'name': 'Test Club',
                    'address': '123 Test Street',
                    'description': 'Test club for E2E testing',
                    'working_hours': '9:00-22:00',
                    'contact_number': '+123456789'
                }
            )
            if created:
                print(f"  ✓ Created Club record")
            else:
                print(f"  - Club record already exists")
                
        elif role == 'ADMIN':
            admin, created = Admin.objects.get_or_create(userid=user)
            if created:
                print(f"  ✓ Created Admin record")
            else:
                print(f"  - Admin record already exists")
    
    print("\n✓ Test database ready!")

def run_test_server():
    """Run Django test server on port 8001"""
    print("\nStarting Django test server on http://localhost:8001")
    print("Press Ctrl+C to stop\n")
    
    try:
        call_command('runserver', '8001', use_reloader=False)
    except KeyboardInterrupt:
        print("\n\nStopping test server...")

if __name__ == '__main__':
    setup_test_database()
    run_test_server()
