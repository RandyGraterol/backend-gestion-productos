# Script para probar la configuración de CORS del backend

Write-Host "🔍 Probando configuración de CORS..." -ForegroundColor Cyan
Write-Host ""

# URLs
$BACKEND_URL = "https://rifaslsv.com/backendanalis/api"
$FRONTEND_URL = "https://administracionweb.netlify.app"

Write-Host "Backend URL: $BACKEND_URL"
Write-Host "Frontend URL: $FRONTEND_URL"
Write-Host ""

# Test 1: Health check
Write-Host "📋 Test 1: Health Check" -ForegroundColor Yellow
Write-Host "----------------------------------------"

try {
    $healthResponse = Invoke-WebRequest -Uri "$BACKEND_URL/../health" -Method Get -UseBasicParsing
    if ($healthResponse.StatusCode -eq 200) {
        Write-Host "✅ Backend está corriendo" -ForegroundColor Green
        Write-Host "Response: $($healthResponse.Content)"
    }
} catch {
    Write-Host "❌ Backend no responde correctamente" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)"
}
Write-Host ""

# Test 2: OPTIONS request (preflight)
Write-Host "📋 Test 2: Preflight Request (OPTIONS)" -ForegroundColor Yellow
Write-Host "----------------------------------------"

try {
    $headers = @{
        "Origin" = $FRONTEND_URL
        "Access-Control-Request-Method" = "POST"
        "Access-Control-Request-Headers" = "Content-Type"
    }
    
    $optionsResponse = Invoke-WebRequest -Uri "$BACKEND_URL/auth/login" -Method Options -Headers $headers -UseBasicParsing
    
    Write-Host "Status Code: $($optionsResponse.StatusCode)"
    
    # Verificar headers CORS
    if ($optionsResponse.Headers["Access-Control-Allow-Origin"]) {
        $allowOrigin = $optionsResponse.Headers["Access-Control-Allow-Origin"]
        Write-Host "✅ Access-Control-Allow-Origin: $allowOrigin" -ForegroundColor Green
    } else {
        Write-Host "❌ Access-Control-Allow-Origin header NO encontrado" -ForegroundColor Red
    }
    
    if ($optionsResponse.Headers["Access-Control-Allow-Methods"]) {
        $allowMethods = $optionsResponse.Headers["Access-Control-Allow-Methods"]
        Write-Host "✅ Access-Control-Allow-Methods: $allowMethods" -ForegroundColor Green
    } else {
        Write-Host "❌ Access-Control-Allow-Methods header NO encontrado" -ForegroundColor Red
    }
    
    if ($optionsResponse.Headers["Access-Control-Allow-Credentials"]) {
        Write-Host "✅ Access-Control-Allow-Credentials está presente" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Access-Control-Allow-Credentials header NO encontrado" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Error en OPTIONS request" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)"
}
Write-Host ""

# Test 3: GET request con Origin
Write-Host "📋 Test 3: GET Request con Origin Header" -ForegroundColor Yellow
Write-Host "----------------------------------------"

try {
    $headers = @{
        "Origin" = $FRONTEND_URL
    }
    
    $getResponse = Invoke-WebRequest -Uri "$BACKEND_URL/../health" -Method Get -Headers $headers -UseBasicParsing
    
    if ($getResponse.Headers["Access-Control-Allow-Origin"]) {
        Write-Host "✅ CORS headers presentes en GET request" -ForegroundColor Green
    } else {
        Write-Host "❌ CORS headers NO presentes en GET request" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error en GET request" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)"
}
Write-Host ""

# Resumen
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "📊 RESUMEN" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Si ves errores arriba, sigue estos pasos:" -ForegroundColor Yellow
Write-Host "1. Verificar que .env.production tenga: CORS_ORIGIN=$FRONTEND_URL"
Write-Host "2. Verificar que NODE_ENV=production"
Write-Host "3. Reiniciar el servidor backend"
Write-Host "4. Verificar que no haya un proxy bloqueando los headers"
Write-Host ""
