# AndesStay - Frontend

Frontend web del sistema AndesStay desarrollado con React, TypeScript y Vite.

La aplicación permite autenticar usuarios mediante Microsoft Entra ID, aplicar permisos según rol y consumir de forma segura el backend publicado mediante AWS API Gateway.

## Tecnologías

- React
- TypeScript
- Vite
- Microsoft Authentication Library (MSAL)
- Microsoft Entra ID
- AWS API Gateway

## Ejecución local

Instalar dependencias:

    npm install

Ejecutar el proyecto:

    npm run dev

La aplicación queda disponible en:

    http://localhost:4200

## Validación

Comprobar TypeScript:

    npm run check

Generar build de producción:

    npm run build

## Configuración

Crear un archivo `.env` tomando `.env.example` como referencia.

Variables principales:

    VITE_ENTRA_TENANT_ID=
    VITE_ENTRA_FRONTEND_CLIENT_ID=
    VITE_ENTRA_API_CLIENT_ID=
    VITE_API_SCOPE=
    VITE_REDIRECT_URI=http://localhost:4200
    VITE_API_BASE=

Los valores sensibles y credenciales no deben almacenarse en GitHub.

## Autenticación

El usuario inicia sesión mediante Microsoft Entra ID.

El frontend solicita un `access_token` para el scope configurado de la API y lo envía en cada llamada protegida mediante:

    Authorization: Bearer <access_token>

## Roles

AndesStay contempla los siguientes roles:

- `ADMIN`
- `RECEPCIONISTA`
- `HUESPED`

Las opciones disponibles en la interfaz dependen del rol autenticado.

## Funcionalidades

- Inicio y cierre de sesión.
- Obtención del perfil autenticado.
- Navegación según rol.
- Gestión de reservas.
- Cambio de estados de reservas.
- Consulta de disponibilidad por fechas.
- Gestión del catálogo de unidades.
- Creación, edición y desactivación de unidades.
- Manejo de errores de autenticación y autorización.
- Diseño responsive.

## Arquitectura

    Usuario
       |
       v
    React + MSAL
       |
       v
    Microsoft Entra ID
       |
       | Access Token
       v
    AWS API Gateway
       |
       v
    BFF Spring Boot
       |
       +--> Reservations
       |
       +--> Catalog
               |
               v
          AWS RDS PostgreSQL

## Seguridad

- Se utiliza `access_token` para consumir la API.
- AWS API Gateway valida el JWT mediante un JWT Authorizer.
- El BFF vuelve a validar el token recibido.
- Se utilizan scopes y roles para autorización.
- El origen de desarrollo es `http://localhost:4200`.
- El preflight CORS `OPTIONS` está configurado correctamente.
- `.env` está excluido mediante `.gitignore`.

## Infraestructura utilizada

El frontend consume una HTTP API publicada mediante AWS API Gateway.

El backend está desplegado mediante Docker Compose en una instancia AWS EC2 con Elastic IP y utiliza PostgreSQL en AWS RDS.
