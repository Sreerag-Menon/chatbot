# apps/backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Base env + make sure Python can import from /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONPATH=/app \
    PORT=8000

# Minimal build deps + curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl \
  && rm -rf /var/lib/apt/lists/*

# Install deps
COPY apps/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY apps/backend/ .

# Create runtime dirs (Render disk can be mounted at /data; app can still write to /app/uploads)
RUN mkdir -p /app/uploads /data/chroma

# The port Render scans is $PORT; expose it for local runs
EXPOSE ${PORT}

# Healthcheck should also use $PORT
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -fsS http://127.0.0.1:${PORT}/health || exit 1

# Use shell form so ${PORT} expands; bind to 0.0.0.0
CMD bash -lc "uvicorn main:app --host 0.0.0.0 --port ${PORT}"
