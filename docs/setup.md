# Setup Guide

Complete setup instructions for the Stock Market Toolkit, covering local development, Docker deployment, and production configuration.

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| **Python** | 3.12+ | Backend runtime |
| **Node.js** | 20+ | Frontend build |
| **npm** | 10+ | Frontend package manager |
| **Git** | Any | Version control |

### Optional Software

| Software | Purpose |
|----------|---------|
| **PostgreSQL** | Production database (or use Docker) |
| **Docker** | Containerized deployment |
| **Docker Compose** | Multi-container orchestration |

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/ai-workflow-space/stock-market-toolkit.git
cd stock-market-toolkit
```

### 2. Backend Setup

#### Create Virtual Environment

```bash
cd backend
python3 -m venv venv

# Activate on Linux/macOS
source venv/bin/activate

# Activate on Windows
# .\venv\Scripts\activate
```

#### Install Dependencies

```bash
pip install -r requirements.txt
```

**Note**: If using macOS and encounter issues with `bcrypt`, install with:
```bash
brew install openssl
export LDFLAGS="-L$(brew --prefix openssl)/lib"
export CPPFLAGS="-I$(brew --prefix openssl)/include"
pip install bcrypt --force-reinstall
```

#### Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Database (SQLite for local dev)
DATABASE_URL=sqlite+aiosqlite:///./stocktoolkit.db

# JWT Secret (change this in production!)
SECRET_KEY=your-super-secret-key-change-in-production

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Log Level
LOG_LEVEL=DEBUG
```

#### Run the Backend

```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

The API will be available at:
- **API**: http://localhost:8001
- **Swagger Docs**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

#### Default Admin Credentials

On first run, a default admin user is created:

- **Email**: admin@stocktoolkit.local
- **Username**: admin
- **Password**: Admin@1234

**⚠️ Change these credentials in production!**

### 3. Frontend Setup

#### Install Dependencies

```bash
cd frontend
npm install
```

#### Configure Environment

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:8001
```

#### Run the Frontend

```bash
npm run dev
```

The frontend will be available at: **http://localhost:5173**

### 4. Verify Installation

1. Open http://localhost:5173 in your browser
2. Register a new account or login with admin credentials
3. Search for a stock symbol (e.g., "AAPL")
4. View charts and indicators

## Docker Deployment

### Prerequisites

- Docker Engine 24.0+
- Docker Compose 2.20+

### Quick Start with Docker Compose

#### 1. Configure Environment

Create a `.env` file in the project root:

```env
# PostgreSQL
POSTGRES_PASSWORD=your-secure-password

# JWT
SECRET_KEY=your-256-bit-secret-key

# CORS
CORS_ORIGINS=http://localhost:3000

# Log Level
LOG_LEVEL=INFO
```

#### 2. Build and Start

```bash
docker-compose up -d
```

This will:
- Start PostgreSQL on port 5432
- Build and start the backend on port 8001
- Build and start the frontend on port 3000

#### 3. Verify Services

```bash
docker-compose ps
```

```
NAME                STATUS          PORTS
smt_postgres        running         0.0.0.0:5432->5432/tcp
smt_backend         running         0.0.0.0:8001->8001/tcp
smt_frontend        running         0.0.0.0:3000->80/tcp
```

#### 4. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **API Docs**: http://localhost:8001/docs

### Docker Compose Services

| Service | Port | Description |
|---------|------|-------------|
| `postgres` | 5432 | PostgreSQL 16 database |
| `backend` | 8001 | FastAPI application |
| `frontend` | 3000 | Nginx serving React app |

### Stopping Services

```bash
docker-compose down
```

To also remove volumes (database data):

```bash
docker-compose down -v
```

### Rebuilding Images

After code changes:

```bash
docker-compose up -d --build
```

## Production Deployment

### Security Checklist

- [ ] Change `SECRET_KEY` to a secure 256-bit value
- [ ] Use PostgreSQL instead of SQLite
- [ ] Enable HTTPS/TLS
- [ ] Change default admin credentials
- [ ] Set appropriate CORS origins
- [ ] Configure firewall rules
- [ ] Enable rate limiting
- [ ] Set up monitoring and logging

### Generate Secure Secret Key

```bash
# Linux/macOS
openssl rand -hex 64

# Python
python3 -c "import secrets; print(secrets.token_hex(64))"
```

### PostgreSQL Production Setup

```env
DATABASE_URL=postgresql+asyncpg://stocktoolkit:password@localhost:5432/stocktoolkit
```

### Reverse Proxy (Nginx)

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Systemd Service (Backend)

```ini
[Unit]
Description=Stock Market Toolkit Backend
After=network.target postgresql.service

[Service]
User=www-data
WorkingDirectory=/opt/stock-market-toolkit/backend
Environment="PATH=/opt/stock-market-toolkit/backend/venv/bin"
ExecStart=/opt/stock-market-toolkit/backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8001
Restart=always

[Install]
WantedBy=multi-user.target
```

## Troubleshooting

### Common Issues

#### Backend Won't Start

**Error**: `ModuleNotFoundError: No module named 'fastapi'`

**Solution**: Activate virtual environment and reinstall:
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

#### Database Connection Error

**Error**: `sqlalchemy.exc.OperationalError`

**Solution**: 
- Check PostgreSQL is running: `pg_isready`
- Verify `DATABASE_URL` in `.env`
- For SQLite: ensure write permissions on the directory

#### CORS Errors in Browser

**Error**: `Access-Control-Allow-Origin` blocked

**Solution**: Add your frontend URL to `CORS_ORIGINS` in backend `.env`:
```env
CORS_ORIGINS=http://localhost:5173,http://your-production-domain.com
```

#### yfinance Data Not Loading

**Error**: `No data for symbol` or timeout

**Solution**:
- Check internet connection
- Yahoo Finance may be rate-limiting; wait a few minutes
- Try a different symbol

#### Port Already in Use

**Error**: `OSError: [Errno 98] Address already in use`

**Solution**: Find and kill the process:
```bash
# Find process on port 8001
lsof -i :8001

# Kill by PID
kill -9 <PID>
```

### Database Migrations

If using PostgreSQL with Alembic:

```bash
cd backend

# Create a migration
alembic revision --autogenerate -m "add users table"

# Apply migrations
alembic upgrade head
```

### Logs

**Backend logs**: Check uvicorn output or `backend/server.log`

**Docker logs**:
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

## Environment Variables Reference

### Backend Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | SQLite path | Database connection string |
| `SECRET_KEY` | Yes | Dev key | JWT signing key (256-bit) |
| `ALGORITHM` | No | HS256 | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | 30 | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | 7 | Refresh token lifetime |
| `CORS_ORIGINS` | No | localhost:5173 | Allowed origins |
| `LOG_LEVEL` | No | INFO | Logging verbosity |
| `ADMIN_EMAIL` | No | admin@stocktoolkit.local | Default admin email |
| `ADMIN_USERNAME` | No | admin | Default admin username |
| `ADMIN_PASSWORD` | No | Admin@1234 | Default admin password |

### Frontend Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | http://localhost:8001 | Backend API URL |

## Uninstall

### Remove Docker Deployment

```bash
docker-compose down -v
docker rmi kyleckw/stock-market-toolkit-backend kyleckw/stock-market-toolkit-frontend
```

### Remove Local Development

```bash
# Remove virtual environment
rm -rf backend/venv

# Remove database
rm backend/stocktoolkit.db

# Remove node_modules
rm -rf frontend/node_modules
```