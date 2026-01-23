set -o errexit

pip install -r requirements.txt

python manage.py makemigrations --merge --noinput

python manage.py migrate --fake-initial

python manage.py create_default_admin

python manage.py collectstatic --no-input