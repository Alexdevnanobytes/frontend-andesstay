# AndesStay - Frontend

Frontend web de AndesStay desarrollado con React, TypeScript y Vite.

La aplicación permite autenticación mediante Microsoft Entra ID y, de forma opcional, Amazon Cognito. El frontend consume el backend publicado mediante AWS API Gateway.

## Tecnologías

- React
- TypeScript
- Vite
- Microsoft Authentication Library (MSAL)
- Microsoft Entra ID
- Amazon Cognito
- OIDC
- AWS API Gateway

## Ejecución local

Instalar dependencias:

    npm install

Ejecutar:

    npm run dev

La aplicación queda disponible en:

    http://localhost:4200

## Validación

Comprobar TypeScript:

    npm run check

Generar build:

    npm run build

## Variables de entorno

Crear un archivo `.env` tomando `.env.example` como referencia.

### Microsoft Entra ID

    VITE_ENTRA_TENANT_ID=
    VITE_ENTRA_FRONTEND_CLIENT_ID=
    VITE_ENTRA_API_CLIENT_ID=
    VITE_API_SCOPE=
    VITE_API_BASE=
    VITE_REDIRECT_URI=http://localhost:4200/

### Amazon Cognito

Cognito es opcional. Si no está configurado, la aplicación muestra solamente el inicio de sesión mediante Microsoft Entra ID.

    VITE_COGNITO_AUTHORITY=
    VITE_COGNITO_CLIENT_ID=
    VITE_COGNITO_DOMAIN=
    VITE_COGNITO_API_SCOPE=andesstay-api/access_as_user

Opcionalmente, si el frontend consume directamente el BFF sin pasar por API Gateway:

    VITE_COGNITO_API_PATH=/api

Los valores sensibles y las credenciales reales no deben almacenarse en GitHub.

## Autenticación

AndesStay soporta dos proveedores de identidad.

### Microsoft Entra ID

El frontend utiliza MSAL para iniciar sesión y solicitar un `access_token`.

El token se envía al backend mediante:

    Authorization: Bearer <access_token>

La ruta utilizada normalmente para las llamadas autenticadas mediante Entra es:

    /api

### Amazon Cognito

El frontend utiliza el flujo OIDC del User Pool y el Hosted UI de Amazon Cognito.

El access token de Cognito se utiliza para consumir el backend.

Por defecto, las solicitudes de Cognito utilizan:

    /cognito/api

Este prefijo puede modificarse mediante `VITE_COGNITO_API_PATH`.

## Logout de Cognito

Amazon Cognito no expone `end_session_endpoint` en la metadata OIDC utilizada por la aplicación.

Por esta razón, el frontend:

1. elimina la sesión OIDC local;
2. construye manualmente la URL del Hosted UI;
3. redirige a:

    /logout?client_id=...&logout_uri=...

De esta manera se cierra también la sesión del Hosted UI de Cognito.

## Scopes

Microsoft Entra ID utiliza:

    api://<API_CLIENT_ID>/access_as_user

Amazon Cognito utiliza:

    andesstay-api/access_as_user

El backend normaliza ambos al permiso:

    access_as_user

## Roles

AndesStay utiliza:

- `ADMIN`
- `RECEPCIONISTA`
- `HUESPED`

Entra entrega los roles mediante sus claims.

Cognito utiliza los grupos del User Pool para representar los mismos roles.

## Funcionalidades

- Inicio y cierre de sesión.
- Autenticación con Microsoft Entra ID.
- Autenticación opcional con Amazon Cognito.
- Obtención del perfil autenticado.
- Navegación según rol.
- Gestión de reservas.
- Cambio de estado de reservas.
- Consulta de disponibilidad.
- Gestión del catálogo.
- Creación, modificación y desactivación de unidades.
- Manejo de errores de autenticación y autorización.
- Diseño responsive.

## Arquitectura

    Usuario
       |
       v
    React
       |
       +--> Microsoft Entra ID
       |
       +--> Amazon Cognito
                 |
                 | Access Token
                 v
           AWS API Gateway
                 |
                 v
             BFF :8080
              /     \
             v       v
    Reservations   Catalog
             \       /
              v     v
         AWS RDS PostgreSQL

## Comunicación con la API

El frontend selecciona el prefijo de API según el proveedor activo.

Con Microsoft Entra ID:

    /api

Con Amazon Cognito:

    /cognito/api

La URL base se configura mediante:

    VITE_API_BASE

## Seguridad

- Se utilizan access tokens para consumir la API.
- No se utiliza el ID token como token de autorización.
- AWS API Gateway protege las rutas autenticadas.
- El BFF vuelve a validar los JWT.
- Se utilizan scopes y roles.
- El frontend no almacena secretos en el repositorio.
- `.env` se encuentra excluido mediante `.gitignore`.
- CORS permite el origen de desarrollo `http://localhost:4200`.
- Los preflight `OPTIONS` están configurados para funcionar sin bloquear la autorización.

## Infraestructura

El frontend consume APIs publicadas mediante AWS API Gateway.

El backend está desplegado con Docker Compose en AWS EC2 y utiliza PostgreSQL alojado en AWS RDS.
