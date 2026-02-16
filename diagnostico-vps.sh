#!/bin/bash

# Script de diagnóstico para problemas de CORS en VPS
# Ejecutar en el servidor VPS

echo "🔍 DIAGNÓSTICO DE CORS - VPS"
echo "=========================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
BACKEND_PORT=3000
BACKEND_URL="https://rifaslsv.com/backendanalis/api"
FRONTEND_URL="https://administracionweb.netlify.app"

# 1. Verificar Backend Local
echo -e "${BLUE}1. Verificando Backend Local (puerto $BACKEND_PORT)${NC}"
echo "----------------------------------------"
if curl -s http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend está corriendo en localhost:$BACKEND_PORT${NC}"
    HEALTH_DATA=$(curl -s http://localhost:$BACKEND_PORT/health)
    echo "   Respuesta: $HEALTH_DATA"
else
    echo -e "${RED}❌ Backend NO está corriendo en localhost:$BACKEND_PORT${NC}"
    echo -e "${YELLOW}   Solución: Iniciar el backend${NC}"
fi
echo ""

# 2. Verificar Proceso Node.js
echo -e "${BLUE}2. Verificando Proceso Node.js${NC}"
echo "----------------------------------------"
NODE_PROCESS=$(ps aux | grep node | grep -v grep | grep -v diagnostico)
if [ -n "$NODE_PROCESS" ]; then
    echo -e "${GREEN}✅ Proceso Node.js encontrado:${NC}"
    echo "$NODE_PROCESS" | head -n 3
else
    echo -e "${RED}❌ No se encontró proceso Node.js corriendo${NC}"
fi
echo ""

# 3. Verificar Puerto 3000
echo -e "${BLUE}3. Verificando Puerto $BACKEND_PORT${NC}"
echo "----------------------------------------"
if command -v netstat > /dev/null 2>&1; then
    PORT_INFO=$(sudo netstat -tlnp 2>/dev/null | grep :$BACKEND_PORT)
    if [ -n "$PORT_INFO" ]; then
        echo -e "${GREEN}✅ Puerto $BACKEND_PORT está en uso:${NC}"
        echo "$PORT_INFO"
    else
        echo -e "${RED}❌ Puerto $BACKEND_PORT NO está en uso${NC}"
    fi
elif command -v lsof > /dev/null 2>&1; then
    PORT_INFO=$(sudo lsof -i :$BACKEND_PORT 2>/dev/null)
    if [ -n "$PORT_INFO" ]; then
        echo -e "${GREEN}✅ Puerto $BACKEND_PORT está en uso:${NC}"
        echo "$PORT_INFO"
    else
        echo -e "${RED}❌ Puerto $BACKEND_PORT NO está en uso${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No se puede verificar el puerto (netstat/lsof no disponible)${NC}"
fi
echo ""

# 4. Verificar Servidor Web (nginx/Apache)
echo -e "${BLUE}4. Verificando Servidor Web${NC}"
echo "----------------------------------------"
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx está corriendo${NC}"
    NGINX_VERSION=$(nginx -v 2>&1)
    echo "   $NGINX_VERSION"
    WEBSERVER="nginx"
elif systemctl is-active --quiet apache2; then
    echo -e "${GREEN}✅ Apache está corriendo${NC}"
    APACHE_VERSION=$(apache2 -v 2>&1 | head -n 1)
    echo "   $APACHE_VERSION"
    WEBSERVER="apache"
else
    echo -e "${YELLOW}⚠️  No se detectó nginx ni Apache corriendo${NC}"
    WEBSERVER="none"
fi
echo ""

# 5. Verificar Archivo .env.production
echo -e "${BLUE}5. Verificando .env.production${NC}"
echo "----------------------------------------"
if [ -f ".env.production" ]; then
    echo -e "${GREEN}✅ Archivo .env.production encontrado${NC}"
    echo ""
    echo "   CORS_ORIGIN:"
    grep "CORS_ORIGIN" .env.production | sed 's/^/   /'
    echo ""
    echo "   NODE_ENV:"
    grep "NODE_ENV" .env.production | sed 's/^/   /'
    echo ""
    
    # Verificar que CORS_ORIGIN sea correcto
    CORS_VALUE=$(grep "CORS_ORIGIN" .env.production | cut -d'=' -f2)
    if [ "$CORS_VALUE" = "$FRONTEND_URL" ]; then
        echo -e "${GREEN}   ✅ CORS_ORIGIN está configurado correctamente${NC}"
    else
        echo -e "${RED}   ❌ CORS_ORIGIN no coincide con el frontend${NC}"
        echo -e "${YELLOW}   Esperado: $FRONTEND_URL${NC}"
        echo -e "${YELLOW}   Actual: $CORS_VALUE${NC}"
    fi
else
    echo -e "${RED}❌ Archivo .env.production NO encontrado${NC}"
    echo -e "${YELLOW}   Solución: Crear .env.production con CORS_ORIGIN=$FRONTEND_URL${NC}"
fi
echo ""

# 6. Probar CORS desde el servidor
echo -e "${BLUE}6. Probando CORS (OPTIONS request)${NC}"
echo "----------------------------------------"
CORS_TEST=$(curl -s -X OPTIONS "$BACKEND_URL/auth/login" \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -i)

if echo "$CORS_TEST" | grep -q "Access-Control-Allow-Origin"; then
    echo -e "${GREEN}✅ Headers CORS presentes en la respuesta${NC}"
    echo ""
    echo "   Headers CORS encontrados:"
    echo "$CORS_TEST" | grep -i "access-control" | sed 's/^/   /'
else
    echo -e "${RED}❌ Headers CORS NO encontrados en la respuesta${NC}"
    echo ""
    echo "   Respuesta completa:"
    echo "$CORS_TEST" | head -n 20 | sed 's/^/   /'
fi
echo ""

# 7. Verificar configuración de nginx (si aplica)
if [ "$WEBSERVER" = "nginx" ]; then
    echo -e "${BLUE}7. Verificando Configuración de Nginx${NC}"
    echo "----------------------------------------"
    
    # Buscar archivos de configuración
    NGINX_CONFIGS=$(find /etc/nginx -name "*.conf" 2>/dev/null | grep -E "(rifaslsv|default|sites-enabled)")
    
    if [ -n "$NGINX_CONFIGS" ]; then
        echo "   Archivos de configuración encontrados:"
        echo "$NGINX_CONFIGS" | sed 's/^/   /'
        echo ""
        
        # Buscar configuración de backendanalis
        echo "   Buscando configuración de /backendanalis/..."
        for config in $NGINX_CONFIGS; do
            if sudo grep -q "location.*backendanalis" "$config" 2>/dev/null; then
                echo -e "${GREEN}   ✅ Configuración encontrada en: $config${NC}"
                echo ""
                echo "   Contenido del bloque location:"
                sudo grep -A 20 "location.*backendanalis" "$config" | sed 's/^/   /'
                
                # Verificar si tiene CORS configurado
                if sudo grep -q "Access-Control-Allow-Origin" "$config" 2>/dev/null; then
                    echo -e "${GREEN}   ✅ CORS configurado en nginx${NC}"
                else
                    echo -e "${RED}   ❌ CORS NO configurado en nginx${NC}"
                    echo -e "${YELLOW}   Solución: Agregar headers CORS a la configuración de nginx${NC}"
                fi
            fi
        done
    else
        echo -e "${YELLOW}   ⚠️  No se encontraron archivos de configuración de nginx${NC}"
    fi
    echo ""
fi

# 8. Verificar configuración de Apache (si aplica)
if [ "$WEBSERVER" = "apache" ]; then
    echo -e "${BLUE}7. Verificando Configuración de Apache${NC}"
    echo "----------------------------------------"
    
    # Buscar archivos de configuración
    APACHE_CONFIGS=$(find /etc/apache2 -name "*.conf" 2>/dev/null | grep -E "(rifaslsv|sites-enabled)")
    
    if [ -n "$APACHE_CONFIGS" ]; then
        echo "   Archivos de configuración encontrados:"
        echo "$APACHE_CONFIGS" | sed 's/^/   /'
        echo ""
        
        # Buscar configuración de backendanalis
        echo "   Buscando configuración de /backendanalis/..."
        for config in $APACHE_CONFIGS; do
            if sudo grep -q "backendanalis" "$config" 2>/dev/null; then
                echo -e "${GREEN}   ✅ Configuración encontrada en: $config${NC}"
                echo ""
                echo "   Contenido relevante:"
                sudo grep -A 10 "backendanalis" "$config" | sed 's/^/   /'
                
                # Verificar si tiene CORS configurado
                if sudo grep -q "Access-Control-Allow-Origin" "$config" 2>/dev/null; then
                    echo -e "${GREEN}   ✅ CORS configurado en Apache${NC}"
                else
                    echo -e "${RED}   ❌ CORS NO configurado en Apache${NC}"
                    echo -e "${YELLOW}   Solución: Agregar headers CORS a la configuración de Apache${NC}"
                fi
            fi
        done
    else
        echo -e "${YELLOW}   ⚠️  No se encontraron archivos de configuración de Apache${NC}"
    fi
    echo ""
fi

# Resumen y Recomendaciones
echo "=========================================="
echo -e "${BLUE}📊 RESUMEN Y RECOMENDACIONES${NC}"
echo "=========================================="
echo ""

# Determinar el problema principal
if ! curl -s http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
    echo -e "${RED}❌ PROBLEMA PRINCIPAL: Backend no está corriendo${NC}"
    echo ""
    echo "Soluciones:"
    echo "1. Iniciar el backend:"
    echo "   cd /ruta/al/backendanalis"
    echo "   NODE_ENV=production node dist/server.js &"
    echo ""
    echo "2. O si usas PM2:"
    echo "   pm2 start dist/server.js --name backendanalis"
    echo ""
elif ! echo "$CORS_TEST" | grep -q "Access-Control-Allow-Origin"; then
    echo -e "${RED}❌ PROBLEMA PRINCIPAL: CORS no está configurado correctamente${NC}"
    echo ""
    if [ "$WEBSERVER" = "nginx" ]; then
        echo "Solución para Nginx:"
        echo "1. Editar la configuración de nginx"
        echo "2. Agregar headers CORS al bloque location /backendanalis/"
        echo "3. Reiniciar nginx: sudo systemctl restart nginx"
        echo ""
        echo "Ver archivo: nginx-cors-config.conf para la configuración completa"
    elif [ "$WEBSERVER" = "apache" ]; then
        echo "Solución para Apache:"
        echo "1. Editar la configuración de Apache"
        echo "2. Agregar headers CORS al bloque Location /backendanalis/"
        echo "3. Reiniciar Apache: sudo systemctl restart apache2"
        echo ""
        echo "Ver archivo: apache-cors-config.conf para la configuración completa"
    else
        echo "Solución:"
        echo "1. Verificar que .env.production tenga CORS_ORIGIN=$FRONTEND_URL"
        echo "2. Reiniciar el backend con NODE_ENV=production"
    fi
else
    echo -e "${GREEN}✅ Todo parece estar configurado correctamente${NC}"
    echo ""
    echo "Si aún tienes problemas de CORS:"
    echo "1. Limpia la caché del navegador"
    echo "2. Prueba en modo incógnito"
    echo "3. Verifica que el frontend esté usando la URL correcta"
fi

echo ""
echo "=========================================="
echo "Diagnóstico completado"
echo "=========================================="
