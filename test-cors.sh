#!/bin/bash

# Script para probar la configuración de CORS del backend

echo "🔍 Probando configuración de CORS..."
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# URL del backend
BACKEND_URL="https://rifaslsv.com/backendanalis/api"
FRONTEND_URL="https://administracionweb.netlify.app"

echo "Backend URL: $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo ""

# Test 1: Health check
echo "📋 Test 1: Health Check"
echo "----------------------------------------"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/../health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Backend está corriendo${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}❌ Backend no responde correctamente (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Test 2: OPTIONS request (preflight)
echo "📋 Test 2: Preflight Request (OPTIONS)"
echo "----------------------------------------"
OPTIONS_RESPONSE=$(curl -s -X OPTIONS "$BACKEND_URL/auth/login" \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -i)

echo "$OPTIONS_RESPONSE"
echo ""

# Verificar headers CORS
if echo "$OPTIONS_RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
    ALLOW_ORIGIN=$(echo "$OPTIONS_RESPONSE" | grep "Access-Control-Allow-Origin" | cut -d' ' -f2 | tr -d '\r')
    echo -e "${GREEN}✅ Access-Control-Allow-Origin: $ALLOW_ORIGIN${NC}"
else
    echo -e "${RED}❌ Access-Control-Allow-Origin header NO encontrado${NC}"
fi

if echo "$OPTIONS_RESPONSE" | grep -q "Access-Control-Allow-Methods"; then
    ALLOW_METHODS=$(echo "$OPTIONS_RESPONSE" | grep "Access-Control-Allow-Methods" | cut -d' ' -f2- | tr -d '\r')
    echo -e "${GREEN}✅ Access-Control-Allow-Methods: $ALLOW_METHODS${NC}"
else
    echo -e "${RED}❌ Access-Control-Allow-Methods header NO encontrado${NC}"
fi

if echo "$OPTIONS_RESPONSE" | grep -q "Access-Control-Allow-Credentials"; then
    echo -e "${GREEN}✅ Access-Control-Allow-Credentials está presente${NC}"
else
    echo -e "${YELLOW}⚠️  Access-Control-Allow-Credentials header NO encontrado${NC}"
fi
echo ""

# Test 3: GET request con Origin
echo "📋 Test 3: GET Request con Origin Header"
echo "----------------------------------------"
GET_RESPONSE=$(curl -s -X GET "$BACKEND_URL/../health" \
  -H "Origin: $FRONTEND_URL" \
  -i)

if echo "$GET_RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
    echo -e "${GREEN}✅ CORS headers presentes en GET request${NC}"
else
    echo -e "${RED}❌ CORS headers NO presentes en GET request${NC}"
fi
echo ""

# Resumen
echo "========================================="
echo "📊 RESUMEN"
echo "========================================="

if echo "$OPTIONS_RESPONSE" | grep -q "Access-Control-Allow-Origin" && \
   echo "$OPTIONS_RESPONSE" | grep -q "Access-Control-Allow-Methods"; then
    echo -e "${GREEN}✅ CORS está configurado correctamente${NC}"
    echo ""
    echo "El frontend debería poder hacer peticiones al backend."
else
    echo -e "${RED}❌ CORS NO está configurado correctamente${NC}"
    echo ""
    echo "Pasos para solucionar:"
    echo "1. Verificar que .env.production tenga: CORS_ORIGIN=$FRONTEND_URL"
    echo "2. Verificar que NODE_ENV=production"
    echo "3. Reiniciar el servidor backend"
    echo "4. Verificar que no haya un proxy bloqueando los headers"
fi
echo ""
