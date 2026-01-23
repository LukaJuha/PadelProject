set -o errexit

pip install -r requirements.txt

python manage.py migrate --fake

python manage.py migrate

python manage.py create_default_admin

python manage.py collectstatic --no-input