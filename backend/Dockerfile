FROM python:3.12-slim

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:${PATH}"

# Copy requirements first for caching
COPY requirements.txt .
RUN uv pip install --system --no-cache -r requirements.txt

# Copy application
COPY app/ ./app/

# pandas_ta_compat.py lives at the backend root (not under app/)
COPY pandas_ta_compat.py ./

# Copy Alembic config. The migration scripts live under app/alembic (copied
# above via COPY app/); alembic.ini sits at the backend root, so it must be
# copied explicitly. The in-process `alembic upgrade head` in app/main.py
# loads /app/alembic.ini whose script_location = app/alembic (relative to the
# /app workdir).
COPY alembic.ini ./

# Create non-root user
RUN useradd --create-home --shell /bin/bash appuser && \
    chown -R appuser:appuser /app
USER appuser

EXPOSE 8001

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
