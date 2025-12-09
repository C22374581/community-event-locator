# PWA Setup Verification Script
# This script verifies all PWA files are in place

Write-Host "=== PWA Setup Verification ===" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check manifest.json
Write-Host "Checking manifest.json..." -NoNewline
if (Test-Path "static/manifest.json") {
    Write-Host " ✓" -ForegroundColor Green
    $manifest = Get-Content "static/manifest.json" | ConvertFrom-Json
    Write-Host "  - App Name: $($manifest.name)" -ForegroundColor Gray
    Write-Host "  - Short Name: $($manifest.short_name)" -ForegroundColor Gray
} else {
    Write-Host " ✗ MISSING" -ForegroundColor Red
    $allGood = $false
}

# Check service-worker.js
Write-Host "Checking service-worker.js..." -NoNewline
if (Test-Path "static/service-worker.js") {
    Write-Host " ✓" -ForegroundColor Green
    $swSize = (Get-Item "static/service-worker.js").Length
    Write-Host "  - Size: $swSize bytes" -ForegroundColor Gray
} else {
    Write-Host " ✗ MISSING" -ForegroundColor Red
    $allGood = $false
}

# Check pwa.js
Write-Host "Checking static/js/pwa.js..." -NoNewline
if (Test-Path "static/js/pwa.js") {
    Write-Host " ✓" -ForegroundColor Green
} else {
    Write-Host " ✗ MISSING" -ForegroundColor Red
    $allGood = $false
}

# Check offline.js
Write-Host "Checking static/js/offline.js..." -NoNewline
if (Test-Path "static/js/offline.js") {
    Write-Host " ✓" -ForegroundColor Green
} else {
    Write-Host " ✗ MISSING" -ForegroundColor Red
    $allGood = $false
}

# Check base.html includes
Write-Host "Checking templates/base.html..." -NoNewline
if (Test-Path "templates/base.html") {
    $baseContent = Get-Content "templates/base.html" -Raw
    if ($baseContent -match "manifest.json" -and $baseContent -match "pwa.js") {
        Write-Host " ✓" -ForegroundColor Green
        Write-Host "  - Manifest link: Found" -ForegroundColor Gray
        Write-Host "  - PWA scripts: Found" -ForegroundColor Gray
    } else {
        Write-Host " ⚠ Partially configured" -ForegroundColor Yellow
        if ($baseContent -notmatch "manifest.json") {
            Write-Host "  - Missing: manifest.json link" -ForegroundColor Yellow
        }
        if ($baseContent -notmatch "pwa.js") {
            Write-Host "  - Missing: pwa.js script" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host " ✗ MISSING" -ForegroundColor Red
    $allGood = $false
}

# Check URLs configuration
Write-Host "Checking config/urls.py..." -NoNewline
if (Test-Path "config/urls.py") {
    $urlsContent = Get-Content "config/urls.py" -Raw
    if ($urlsContent -match "manifest.json") {
        Write-Host " ✓" -ForegroundColor Green
        Write-Host "  - Manifest route: Configured" -ForegroundColor Gray
    } else {
        Write-Host " ⚠" -ForegroundColor Yellow
        Write-Host "  - Manifest route may be missing" -ForegroundColor Yellow
    }
} else {
    Write-Host " ✗ MISSING" -ForegroundColor Red
    $allGood = $false
}

# Check icons directory
Write-Host "Checking static/icons/..." -NoNewline
if (Test-Path "static/icons") {
    $iconCount = (Get-ChildItem "static/icons/*.png" -ErrorAction SilentlyContinue).Count
    if ($iconCount -gt 0) {
        Write-Host " OK - $iconCount icons found" -ForegroundColor Green
    } else {
        Write-Host " WARNING (Directory exists but no icons)" -ForegroundColor Yellow
        Write-Host "  - You need to generate icons (see static/icons/README.md)" -ForegroundColor Yellow
    }
} else {
    Write-Host " WARNING (Directory missing)" -ForegroundColor Yellow
}

Write-Host ""
if ($allGood) {
    Write-Host "=== All PWA Files Verified! ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Start Docker Desktop" -ForegroundColor White
    Write-Host "2. Run: docker compose up --build" -ForegroundColor White
    Write-Host "3. Open: http://localhost/map/" -ForegroundColor White
    Write-Host "4. Press F12, go to Application tab, then Service Workers" -ForegroundColor White
} else {
    Write-Host "=== Some Files Missing ===" -ForegroundColor Red
    Write-Host "Please check the missing files above." -ForegroundColor Yellow
}

