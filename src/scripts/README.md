# Scripts de Base de Datos

Este directorio contiene scripts útiles para gestionar la base de datos del sistema de inventario.

## 📋 Scripts Disponibles

### 1. Crear Usuario Administrador (`seedAdmin.ts`)

Crea un único usuario administrador en la base de datos.

**Uso:**
```bash
npm run seed:admin
```

**Configuración:**

Puedes personalizar las credenciales del administrador de dos formas:

#### Opción 1: Variables de Entorno (Recomendado)

Agrega estas variables a tu archivo `.env`:

```env
ADMIN_EMAIL=admin@inventario.com
ADMIN_PASSWORD=Admin123!
ADMIN_NAME=Administrador
```

#### Opción 2: Valores por Defecto

Si no configuras las variables de entorno, se usarán estos valores:
- **Email:** admin@inventario.com
- **Password:** Admin123!
- **Nombre:** Administrador
- **Rol:** admin
- **Estado:** Activo

**Características:**
- ✅ Verifica si el usuario ya existe antes de crear
- ✅ Hashea la contraseña automáticamente
- ✅ Muestra las credenciales al finalizar
- ⚠️ No sobrescribe usuarios existentes

**Ejemplo de salida:**
```
🌱 Starting admin user seed...

✅ Database connection established
✅ Database synchronized

✅ Admin user created successfully!

📋 Admin User Details:
   ID: 123e4567-e89b-12d3-a456-426614174000
   Email: admin@inventario.com
   Name: Administrador
   Role: admin
   Active: true

🔐 Login Credentials:
   Email: admin@inventario.com
   Password: Admin123!

⚠️  IMPORTANT: Change the password after first login!

👋 Database connection closed
✅ Seed completed successfully
```

---

### 2. Seed Completo de Base de Datos (`seedDatabase.ts`)

Crea datos de prueba completos incluyendo usuarios, categorías, productos, etc.

**Uso:**
```bash
npm run seed
```

---

### 3. Crear Admin (Scripts Alternativos)

Existen otros scripts para crear administradores:

```bash
npm run create-admin
npm run create-admin-simple
```

---

## 🔒 Seguridad

### Contraseñas Seguras

Para producción, asegúrate de usar contraseñas seguras:

**Requisitos mínimos:**
- Al menos 8 caracteres
- Incluir mayúsculas y minúsculas
- Incluir números
- Incluir caracteres especiales

**Ejemplo de contraseña segura:**
```
Admin2024!SecureP@ss
```

### Cambiar Contraseña Después del Primer Login

**IMPORTANTE:** Siempre cambia la contraseña del administrador después del primer inicio de sesión, especialmente en producción.

---

## 🚀 Uso en Producción

### Paso 1: Configurar Variables de Entorno

Crea un archivo `.env.production` con credenciales seguras:

```env
NODE_ENV=production
ADMIN_EMAIL=admin@tuempresa.com
ADMIN_PASSWORD=TuContraseñaSegura2024!
ADMIN_NAME=Administrador Principal
```

### Paso 2: Ejecutar el Script

```bash
NODE_ENV=production npm run seed:admin
```

### Paso 3: Verificar

Inicia sesión con las credenciales configuradas y cambia la contraseña inmediatamente.

---

## 🛠️ Troubleshooting

### Error: "Admin user already exists"

El usuario administrador ya existe en la base de datos. Si necesitas recrearlo:

1. Elimina el usuario desde la aplicación
2. O elimina la base de datos y vuelve a ejecutar el script

### Error: "Database connection failed"

Verifica que:
- La ruta de la base de datos en `.env` sea correcta
- El directorio `database/` exista
- Tengas permisos de escritura en el directorio

### Error: "Password must be at least 8 characters long"

La contraseña configurada es muy corta. Usa una contraseña de al menos 8 caracteres.

---

## 📝 Notas Adicionales

- El script sincroniza automáticamente la base de datos (crea tablas si no existen)
- Las contraseñas se hashean automáticamente usando bcrypt
- El script es idempotente: puedes ejecutarlo múltiples veces sin problemas
- Si el usuario ya existe, el script no lo sobrescribe

---

## 🔗 Scripts Relacionados

- `npm run dev` - Inicia el servidor en modo desarrollo
- `npm run build` - Compila el proyecto
- `npm run start` - Inicia el servidor en producción
- `npm run migrate:expiry` - Ejecuta migraciones de base de datos
