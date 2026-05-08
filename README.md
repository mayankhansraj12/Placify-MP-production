# Placify AI

Placify AI is a full-stack placement readiness app. The frontend is a Vite/React SPA and the backend is a FastAPI API that uses the existing SQLite setup.

## Deployment Choice

Use this split:

- Frontend: Vercel
- Backend: AWS
- Database: keep the current SQLite setup

This repo is configured for that shape. The frontend calls `VITE_API_BASE_URL` when it is set. If it is not set, local development uses `http://localhost:5000/api`, and production domains fall back to `https://api.<domain>/api`.

## Project Layout

```text
Placify-MP-production/
|-- client/              # Vite React frontend
|-- server/              # FastAPI backend
|-- .env.example         # Local/backend env reference
|-- start_placify.bat    # Windows local dev launcher
`-- README.md
```

## Local Setup

Create the backend env file in the project root:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set at least:

```env
PLACIFY_SECRET_KEY=replace-with-python-secrets-token-hex-32
FRONTEND_URL=http://localhost:5173
CORS_ALLOW_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
COOKIE_SECURE=false
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
GITHUB_REDIRECT_URI=http://localhost:5000/api/auth/github/callback
```

Frontend env overrides belong in `client/.env`. You usually do not need this locally because the app already falls back to `http://localhost:5000/api`, but if you want an explicit frontend env file:

```powershell
Copy-Item client\.env.example client\.env
```

Install and run the backend:

```powershell
cd server
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python migrate.py
python main.py
```

Install and run the frontend:

```powershell
cd client
npm install
npm run dev
```

Open `http://localhost:5173`.

## What `start_placify.bat` Does

`start_placify.bat` is only a Windows local development helper. It:

- creates `.env` from `.env.example` if `.env` is missing
- starts the FastAPI backend in one terminal, using `server\.venv` when it exists
- starts the Vite frontend in another terminal
- opens `http://localhost:5173`

It is not used for Vercel or AWS production deployment.

## Vercel Frontend

Create a Vercel project from this repository with:

- Root Directory: `client`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

Set this Vercel environment variable:

```env
VITE_API_BASE_URL=https://api.placifyai.dev/api
```

SPA routing is handled by `client/vercel.json`, so routes like `/dashboard`, `/analyze`, `/enhance`, `/coach`, and `/interview` can be opened directly.

## AWS Backend

Deploy the `server` folder on AWS and run it with Python. The app listens on `PORT`, default `5000`.

Required production environment values:

```env
PLACIFY_SECRET_KEY=replace-with-python-secrets-token-hex-32
FRONTEND_URL=https://placifyai.dev
CORS_ALLOW_ORIGINS=https://placifyai.dev,https://www.placifyai.dev
COOKIE_SECURE=true
COOKIE_SAMESITE=lax
GOOGLE_REDIRECT_URI=https://api.placifyai.dev/api/auth/google/callback
GITHUB_REDIRECT_URI=https://api.placifyai.dev/api/auth/github/callback
```

Recommended AWS startup commands:

```powershell
cd server
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python migrate.py
python main.py
```

For Linux EC2, use the same commands with `python3` and `source .venv/bin/activate`.

Point `api.placifyai.dev` to the AWS backend and terminate HTTPS at your AWS load balancer, reverse proxy, or host-level web server. Keep the FastAPI app reachable at `/api/...`.

## OAuth Setup

Google authorized redirect URI:

```text
https://api.placifyai.dev/api/auth/google/callback
```

GitHub authorization callback URL:

```text
https://api.placifyai.dev/api/auth/github/callback
```

Local callback URLs:

```text
http://localhost:5000/api/auth/google/callback
http://localhost:5000/api/auth/github/callback
```

## Database

The database setup has not been changed.

- Default SQLite path: `server/data/placify.db`
- Override path: `PLACIFY_DB_PATH`
- Migration command: `python migrate.py`

Database files are ignored by git.

## Health Checks

Local:

```powershell
Invoke-RestMethod http://localhost:5000/api/health
```

Production:

```powershell
Invoke-RestMethod https://api.placifyai.dev/api/health
```

## Useful Commands

Frontend build:

```powershell
cd client
npm run build
```

Backend tests:

```powershell
cd server
python -m pytest -q
```

Legacy backend scenario scripts:

```powershell
cd server
python test_cases.py
python test_10_cases.py
```
