# Tech Stack Documentation

Complete listing of all technologies, libraries, and dependencies used in the Stock Market Toolkit.

## Backend Technologies

### Core Framework

| Library | Version | Purpose |
|---------|---------|---------|
| **FastAPI** | 0.115.0 | Modern Python web framework with async support |
| **Uvicorn** | 0.30.0 | ASGI server for running FastAPI |
| **Python** | 3.12+ | Programming language |

### Data Processing

| Library | Version | Purpose |
|---------|---------|---------|
| **pandas** | ≥2.3.2 | Data manipulation and analysis |
| **pandas-ta** | 0.4.71b0 | Technical analysis indicators |
| **python-dateutil** | 2.9.0 | Date/time utilities |

### Database

| Library | Version | Purpose |
|---------|---------|---------|
| **SQLAlchemy** | ≥2.0.0 | Async ORM for database operations |
| **aiosqlite** | ≥0.20.0 | Async SQLite driver (development) |
| **asyncpg** | ≥0.30.0 | Async PostgreSQL driver (production) |
| **Alembic** | 1.14.0 | Database migrations |
| **PostgreSQL** | 16 | Relational database |

### Authentication & Security

| Library | Version | Purpose |
|---------|---------|---------|
| **python-jose** | 3.3.0 | JWT token encoding/decoding |
| **passlib** | 1.7.4 | Password hashing |
| **bcrypt** | 4.2.0 | Bcrypt password hashing algorithm |

### API & Networking

| Library | Version | Purpose |
|---------|---------|---------|
| **yfinance** | 1.4.1 | Yahoo Finance data fetching |
| **requests** | 2.32.0 | HTTP client library |

### API Documentation

| Library | Version | Purpose |
|---------|---------|---------|
| **Pydantic** | 2.10.0 | Data validation and settings |

### Rate Limiting

| Library | Version | Purpose |
|---------|---------|---------|
| **SlowAPI** | 0.1.9 | Rate limiting for FastAPI |

### Full Backend Requirements

```
# requirements.txt
fastapi==0.115.0
uvicorn[standard]==0.30.0
yfinance==1.4.1
pandas>=2.3.2
pandas-ta==0.4.71b0
python-dateutil==2.9.0
requests==2.32.0

# Database
sqlalchemy>=2.0.0
aiosqlite>=0.20.0
asyncpg>=0.30.0
alembic==1.14.0

# Auth
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
bcrypt==4.2.0

# Rate limiting
slowapi==0.1.9

# Utilities
pydantic[email]==2.10.0
```

## Frontend Technologies

### Core Framework

| Library | Version | Purpose |
|---------|---------|---------|
| **React** | 19 | UI library |
| **TypeScript** | 5.x | Type-safe JavaScript |
| **Vite** | 5.x | Build tool and dev server |

### Routing

| Library | Version | Purpose |
|---------|---------|---------|
| **react-router-dom** | 6.x | Client-side routing |

### Data Visualization

| Library | Version | Purpose |
|---------|---------|---------|
| **Recharts** | 2.x | Composable charting library |

### HTTP Client

| Library | Version | Purpose |
|---------|---------|---------|
| **axios** | 1.x | HTTP client (if used) |
| **fetch** | Native | Built-in browser API |

### Full Frontend Dependencies

```json
// package.json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^6.0.0",
    "recharts": "^2.12.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

## DevOps & Deployment

### Containerization

| Technology | Version | Purpose |
|------------|---------|---------|
| **Docker** | 24.x | Container runtime |
| **Docker Compose** | 2.x | Multi-container orchestration |

### Backend Dockerfile

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Frontend Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

## Development Tools

### Python Development

| Tool | Purpose |
|------|---------|
| **venv** | Built-in virtual environment |
| **pip** | Package installer |
| **IPython** | Enhanced REPL (optional) |

### Frontend Development

| Tool | Purpose |
|------|---------|
| **npm** | Node package manager |
| **ESLint** | JavaScript linting |
| **Prettier** | Code formatting |

### API Development

| Tool | Purpose |
|------|---------|
| **Swagger UI** (`/docs`) | Interactive API documentation |
| **ReDoc** (`/redoc`) | Alternative API documentation |

## Architecture Patterns

### Backend Patterns

| Pattern | Implementation |
|---------|----------------|
| **Async/Await** | All I/O operations are async |
| **Repository Pattern** | Database queries isolated in session management |
| **Dependency Injection** | FastAPI `Depends()` for DB and auth |
| **MVC** | Routes (C) → Schemas (V) → Models (M) |
| **Middleware** | CORS, rate limiting, exception handling |

### Frontend Patterns

| Pattern | Implementation |
|---------|----------------|
| **Component-based** | React functional components |
| **Context API** | Auth state management |
| **Hooks** | useState, useEffect, useCallback |
| **Debouncing** | Search input debouncing (300ms) |
| **Memoization** | useCallback for stable references |

## Security Libraries

### Password Hashing

```python
import bcrypt

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
```

### JWT Token Handling

```python
from jose import jwt
from datetime import datetime, timedelta, timezone

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=30))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
```

## Database Schema (SQLAlchemy)

### User Model

```python
from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.sql import func

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### Watchlist Model

```python
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey

class Watchlist(Base):
    __tablename__ = "watchlists"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    symbol = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

## API Documentation Tools

### Swagger UI

Access at: `http://localhost:8001/docs`

- Interactive API testing
- Request/response examples
- Authentication support

### ReDoc

Access at: `http://localhost:8001/redoc`

- Clean documentation view
- Navigation panel
- Search functionality

## Data Validation (Pydantic)

### Example Schema

```python
from pydantic import BaseModel, EmailStr, Field

class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=8, max_length=128)
    
    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        if not v.replace("_", "").isalnum():
            raise ValueError("Username must be alphanumeric (underscores ok)")
        return v.lower()
```

## External Libraries Summary

### Backend (Python)

```
Core:         fastapi, uvicorn
Data:         pandas, pandas-ta, yfinance
Database:     sqlalchemy, aiosqlite, asyncpg, alembic
Security:     python-jose, passlib, bcrypt
API:          pydantic, slowapi
Utilities:    python-dateutil, requests
```

### Frontend (JavaScript/TypeScript)

```
Core:         react, react-dom, react-router-dom
Build:        vite, typescript
Charts:       recharts
Styling:      css (custom)
```

## Environment Variables

| Variable | Backend Default | Frontend Default |
|----------|-----------------|------------------|
| `DATABASE_URL` | `sqlite+aiosqlite:///./stocktoolkit.db` | N/A |
| `SECRET_KEY` | Dev key (change in production) | N/A |
| `CORS_ORIGINS` | `http://localhost:5173` | N/A |
| `LOG_LEVEL` | `INFO` | N/A |
| `VITE_API_URL` | N/A | `http://localhost:8001` |