FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# System deps (curl for healthcheck, libgdal/geos for GIS)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    postgresql-client \
    gdal-bin \
    libgdal-dev \
    libgeos-dev \
    && rm -rf /var/lib/apt/lists/*

# Create user and workdir
RUN useradd -m appuser
WORKDIR /app

# Install deps
COPY requirements.txt /app/
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy project
COPY . /app

# Setup static/media dirs
RUN mkdir -p /app/staticfiles /app/media && chown -R appuser:appuser /app

# Entrypoint
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

USER appuser

EXPOSE 8000
ENTRYPOINT ["/app/entrypoint.sh"]
