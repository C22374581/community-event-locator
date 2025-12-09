# PowerShell Script to Test Community Event Locator
# Run this script to test your project

Write-Host "=== Community Event Locator - Test Script ===" -ForegroundColor Cyan
Write-Host ""

# Check if running in Docker or locally
$useDocker = $false
if (Test-Path "docker-compose.yml") {
    $dockerResponse = Read-Host "Do you want to test with Docker? (y/n)"
    if ($dockerResponse -eq "y" -or $dockerResponse -eq "Y") {
        $useDocker = $true
    }
}

if ($useDocker) {
    Write-Host "`n=== Testing with Docker ===" -ForegroundColor Yellow
    
    # Check if .env exists
    if (-not (Test-Path ".env")) {
        Write-Host "Creating .env file..." -ForegroundColor Yellow
        @"
POSTGRES_DB=lbsdb
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
DJANGO_SECRET_KEY=dev-secret-key-change-me
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0,web,nginx
PGADMIN_EMAIL=admin@example.com
PGADMIN_PASSWORD=admin123
"@ | Out-File -FilePath ".env" -Encoding UTF8
        Write-Host ".env file created!" -ForegroundColor Green
    }
    
    Write-Host "`nBuilding and starting Docker containers..." -ForegroundColor Yellow
    docker compose up -d --build
    
    Write-Host "`nWaiting for services to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    Write-Host "`nRunning migrations..." -ForegroundColor Yellow
    docker compose exec -T web python manage.py migrate
    
    Write-Host "`nCollecting static files..." -ForegroundColor Yellow
    docker compose exec -T web python manage.py collectstatic --noinput
    
    Write-Host "`n=== Docker Services Status ===" -ForegroundColor Cyan
    docker compose ps
    
    Write-Host "`n=== Test URLs ===" -ForegroundColor Cyan
    Write-Host "App Home: http://localhost/" -ForegroundColor Green
    Write-Host "Map UI: http://localhost/map/" -ForegroundColor Green
    Write-Host "API: http://localhost/api/" -ForegroundColor Green
    Write-Host "Swagger: http://localhost/api/docs/" -ForegroundColor Green
    Write-Host "Health: http://localhost/health/" -ForegroundColor Green
    
} else {
    Write-Host "`n=== Testing Locally ===" -ForegroundColor Yellow
    
    # Check Python
    try {
        $pythonVersion = python --version
        Write-Host "Python: $pythonVersion" -ForegroundColor Green
    } catch {
        Write-Host "Python not found! Please install Python 3.10+" -ForegroundColor Red
        exit 1
    }
    
    # Check virtual environment
    if (-not (Test-Path "venv")) {
        Write-Host "`nCreating virtual environment..." -ForegroundColor Yellow
        python -m venv venv
    }
    
    Write-Host "`nActivating virtual environment..." -ForegroundColor Yellow
    & "venv\Scripts\Activate.ps1"
    
    # Check if .env exists
    if (-not (Test-Path ".env")) {
        Write-Host "`nCreating .env file..." -ForegroundColor Yellow
        @"
POSTGRES_DB=lbsdb
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
DJANGO_SECRET_KEY=dev-secret-key-change-me
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
"@ | Out-File -FilePath ".env" -Encoding UTF8
        Write-Host ".env file created! Please update with your database credentials." -ForegroundColor Yellow
    }
    
    # Install dependencies
    Write-Host "`nInstalling dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt
    
    # Run migrations
    Write-Host "`nRunning migrations..." -ForegroundColor Yellow
    python manage.py migrate
    
    # Collect static files
    Write-Host "`nCollecting static files..." -ForegroundColor Yellow
    python manage.py collectstatic --noinput
    
    Write-Host "`n=== Starting Development Server ===" -ForegroundColor Cyan
    Write-Host "Server will start at http://127.0.0.1:8000/" -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
    Write-Host ""
    
    python manage.py runserver
}

Write-Host "`n=== Testing Complete ===" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Open http://localhost/ (or http://127.0.0.1:8000/ for local)" -ForegroundColor White
Write-Host "2. Open DevTools (F12) → Application tab" -ForegroundColor White
Write-Host "3. Check Service Workers section" -ForegroundColor White
Write-Host "4. Test offline mode (Network tab → Offline)" -ForegroundColor White
Write-Host "5. Try installing the app" -ForegroundColor White

