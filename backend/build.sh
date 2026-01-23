set -o errexit

pip install -r requirements.txt

python manage.py migrate --fake-initial

python manage.py collectstatic --no-input