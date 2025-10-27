# PadelProject

## ServeIt - PadelTime

Aplikacija za igrače padela koja omogućuje jednostavan pronalazak klubova, rezervaciju terena, automatsko plaćanje i više.
<br>
Timovima olakšava administrativne poslove te povećava njihovu popunjenost.

## Uporabljene tehnologije
- **Django + Django REST Framework** za backend API
- **React + Vite** za frontend
- **PostgreSQL** za bazu podataka

## Preduvjeti
- [Python 3.13.9](https://www.python.org/downloads/release/python-3139/) (trebao bi funkcionirati bilo koji >= 3.10)
- [Node.js v22.21.0](https://nodejs.org/en/download)
- [PostgreSQL 17](https://www.postgresql.org/download/)

## Setup

### Backend

1. **Kreiraj i aktiviraj virtualno okruženje**
   ```bash
   python -m venv backend-venv
   # Windows
   backend-venv\Scripts\activate
   # Linux/Mac
   source backend-venv/bin/activate
   ```
2. **Instaliraj potrebne biblioteke**
   ```bash
   pip install -r requirements.txt
   ```
3. **U Postgresu dodaj korisnika i bazu podataka**
   ```sql
   CREATE USER progiuser WITH PASSWORD 'progi';
   CREATE DATABASE progidb OWNER progiuser;
   ```
4. **Konfiguriraj bazu podataka u `backend/settings.py`**
   ```json
   DATABASES = {
       "default": {
           "ENGINE": "django.db.backends.postgresql",
           "NAME": "progidb",
           "USER": "progiuser",
           "PASSWORD": "progi",
           "HOST": "localhost",
           "PORT": "5432",
       }
   }
   ```
   - ovaj korak je potreban jedino ako se u koraku 3. korisnik konfigurirao drugačije
5. **Napravi migracije i pokreni server**
   ```bash
   python manage.py migrate
   python manage.py runserver
   ```
6. **Provjeri možeš li pristupiti serveru lokalno**
   <br>
   <http://localhost:8000>

### Frontend

1. **Instaliraj potrebne pakete**
   ```bash
   cd frontend
   npm install
   ```

2. **Pokreni server**
   ```bash
   npm run dev
   ```

3. **Pristupi aplikaciji lokalno**
   <br>
   <http://localhost:5173/>