# Complete Project Startup and Test Script
# Run this once Docker Desktop is running

Write-Host "=== Community Event Locator - Startup Script ===" -ForegroundColor Cyan
Write-Host ""

# Check Docker
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>&1
    Write-Host "  Docker: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "  Docker not found!" -ForegroundColor Red
    exit 1
}

# Check if Docker daemon is running
Write-Host "Checking Docker daemon..." -ForegroundColor Yellow
docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Docker daemon not running!" -ForegroundColor Red
    Write-Host "  Please start Docker Desktop and wait for it to fully load." -ForegroundColor Yellow
    Write-Host "  Then run this script again." -ForegroundColor Yellow
    exit 1
}
Write-Host "  Docker daemon: Running" -ForegroundColor Green

# Check .env file
Write-Host "Checking .env file..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "  .env file: Found" -ForegroundColor Green
} else {
    Write-Host "  .env file: Missing" -ForegroundColor Red
    Write-Host "  Creating from .env.example..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "  .env file created!" -ForegroundColor Green
    } else {
        Write-Host "  Please create .env file manually" -ForegroundColor Red
        exit 1
    }
}

# Stop any existing containers
Write-Host ""
Write-Host "Stopping existing containers..." -ForegroundColor Yellow
docker compose down 2>&1 | Out-Null

# Build and start
Write-Host ""
Write-Host "Building and starting services..." -ForegroundColor Yellow
Write-Host "  This may take a few minutes on first run..." -ForegroundColor Gray
docker compose up -d --build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== Services Starting ===" -ForegroundColor Green
    Write-Host "  Waiting for services to be ready..." -ForegroundColor Yellow
    
    # Wait a bit
    Start-Sleep -Seconds 10
    
    # Check service status
    Write-Host ""
    Write-Host "Service Status:" -ForegroundColor Cyan
    docker compose ps
    
    Write-Host ""
    Write-Host "=== Your Project is Running! ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Access your application:" -ForegroundColor Cyan
    Write-Host "  Home:     http://localhost/" -ForegroundColor White
    Write-Host "  Map:      http://localhost/map/" -ForegroundColor White
    Write-Host "  API:      http://localhost/api/" -ForegroundColor White
    Write-Host "  Swagger:  http://localhost/api/docs/" -ForegroundColor White
    Write-Host "  Health:   http://localhost/health/" -ForegroundColor White
    Write-Host ""
    Write-Host "=== Testing PWA Features ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Open http://localhost/map/ in your browser" -ForegroundColor White
    Write-Host "2. Press F12 to open DevTools" -ForegroundColor White
    Write-Host "3. Go to Application tab → Service Workers" -ForegroundColor White
    Write-Host "4. Check Network tab → Set to 'Offline' → Refresh page" -ForegroundColor White
    Write-Host "5. Look for 'Install App' button or install icon" -ForegroundColor White
    Write-Host ""
    Write-Host "=== Useful Commands ===" -ForegroundColor Cyan
    Write-Host "  View logs:     docker compose logs -f" -ForegroundColor Gray
    Write-Host "  Stop services: docker compose down" -ForegroundColor Gray
    Write-Host "  Restart:       docker compose restart" -ForegroundColor Gray
    Write-Host ""
    
    # Test health endpoint
    Write-Host "Testing health endpoint..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    try {
        $response = Invoke-WebRequest -Uri "http://localhost/health/" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "  ✓ Health check passed!" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ⚠ Health check not ready yet (services still starting)" -ForegroundColor Yellow
        Write-Host "  Wait a bit longer and try http://localhost/health/" -ForegroundColor Gray
    }
    
} else {
    Write-Host ""
    Write-Host "=== Error Starting Services ===" -ForegroundColor Red
    Write-Host "Check the error messages above." -ForegroundColor Yellow
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  - Docker Desktop not fully started" -ForegroundColor Gray
    Write-Host "  - Port 80 already in use" -ForegroundColor Gray
    Write-Host "  - Database connection issues" -ForegroundColor Gray
}

