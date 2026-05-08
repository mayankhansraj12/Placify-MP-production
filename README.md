# Placify AI

Placify AI is a full-stack placement readiness app. The frontend is a Vite/React SPA and the backend is a FastAPI API backed by MongoDB Atlas.

## Recommended Free Deployment

Use this split:

- Frontend: Vercel
- Backend: Render free Web Service
- Database: MongoDB Atlas free cluster

Render free can still sleep after idle time, but MongoDB Atlas keeps the app data persistent across backend restarts and redeploys.

## Project Layout

```text
Placify-MP-production/
|-- client/              # Vite React frontend
|-- server/              # FastAPI backend
|-- .env.example         # Backend env reference
|-- start_placify.bat    # Windows local dev launcher
`-- README.md
```

## Local Setup

Create the backend env file in the project root:

```powershell
Copy-Item .env.example .env
```

Set at least:

```env
PLACIFY_SECRET_KEY=replace-with-python-secrets-token-hex-32
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=placify

FRONTEND_URL=http://localhost:5173
CORS_ALLOW_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
COOKIE_SECURE=false
COOKIE_SAMESITE=lax

GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
GITHUB_REDIRECT_URI=http://localhost:5000/api/auth/github/callback
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

## MongoDB Atlas

Create a free Atlas cluster, then:

- Create a database user.
- Allow network access from `0.0.0.0/0` for free hosting.
- Copy the Python connection string.
- Put it in `MONGODB_URI`.

The backend creates required indexes on startup.

Collections used:

- `users`
- `analyses`
- `interview_sessions`
- `coach_messages`
- `coach_goals`

## Render Backend

Create a Render Web Service from this repo:

```text
Root Directory: server
Language: Python
Build Command: pip install -r requirements.txt
Start Command: python main.py
Health Check Path: /api/health
```

Set Render environment variables:

```env
PLACIFY_SECRET_KEY=your-real-secret
HOST=0.0.0.0
PORT=10000

MONGODB_URI=your-mongodb-atlas-uri
MONGODB_DB_NAME=placify

FRONTEND_URL=https://placifyai.dev
CORS_ALLOW_ORIGINS=https://placifyai.dev,https://www.placifyai.dev
COOKIE_SECURE=true
COOKIE_SAMESITE=none

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://YOUR-RENDER-SERVICE.onrender.com/api/auth/google/callback

GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=https://YOUR-RENDER-SERVICE.onrender.com/api/auth/github/callback

AZURE_OPENAI_ENDPOINT=your-azure-endpoint
AZURE_OPENAI_API_KEY=your-azure-key
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_API_VERSION=2024-08-01-preview
LLM_TIMEOUT_SECONDS=30
LLM_MAX_OUTPUT_TOKENS=6000
ENABLE_RAG=true
```

Use `COOKIE_SAMESITE=none` when the backend is on `onrender.com` and the frontend is on `placifyai.dev`. If you later put the backend on `api.placifyai.dev`, `COOKIE_SAMESITE=lax` is fine.

## Vercel Frontend

Create a Vercel project:

```text
Root Directory: client
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Set this Vercel environment variable:

```env
VITE_API_BASE_URL=https://YOUR-RENDER-SERVICE.onrender.com/api
```

SPA routing is handled by `client/vercel.json`.

## OAuth Callback URLs

For Render:

```text
Google: https://YOUR-RENDER-SERVICE.onrender.com/api/auth/google/callback
GitHub: https://YOUR-RENDER-SERVICE.onrender.com/api/auth/github/callback
```

For local:

```text
Google: http://localhost:5000/api/auth/google/callback
GitHub: http://localhost:5000/api/auth/github/callback
```

## What `start_placify.bat` Does

`start_placify.bat` is only a Windows local development helper. It:

- creates `.env` from `.env.example` if `.env` is missing
- starts the backend, using `server\.venv` when it exists
- starts the Vite frontend
- opens `http://localhost:5173`

It is not used by Render or Vercel.

## Health Checks

Local:

```powershell
Invoke-RestMethod http://localhost:5000/api/health
```

Render:

```powershell
Invoke-RestMethod https://YOUR-RENDER-SERVICE.onrender.com/api/health
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
$env:PLACIFY_ALLOW_MEMORY_DB='true'
$env:PLACIFY_SECRET_KEY='test-secret-key'
$env:SKIP_MODEL_LOAD='true'
python -m pytest -q
```
