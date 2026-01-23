from django.core.management.base import BaseCommand
from api.models import User, Admin


class Command(BaseCommand):
    help = 'Creates default admin user if it does not exist'

    def handle(self, *args, **options):
        username = 'Admin1'
        password = 'MyPass123'
        email = 'admin1@example.com'
        
        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f'Admin user "{username}" already exists'))
            return
        
        try:
            # Create the admin user
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                role='ADMIN'
            )
            
            # Create the Admin profile
            Admin.objects.create(userid=user)
            
            self.stdout.write(self.style.SUCCESS(f'Successfully created admin user "{username}"'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error creating admin user: {str(e)}'))
