# Autenticación: primera etapa

Solo `/auth/me` está protegido. Las rutas operativas y el frontend conservan su
comportamiento anterior. No hay registro público, refresh tokens ni endpoint de
logout. Las pruebas usan contraseñas aleatorias y repositorios en memoria; no
modifican MySQL.

## Configuración JWT

`JWT_SECRET` debe contener 64 caracteres hexadecimales generados aleatoriamente
(32 bytes). No hay valor predeterminado. Sin configuración válida, las solicitudes
de autenticación que la necesitan responden 503; las rutas anteriores siguen
disponibles. Emisor: `gestion-operativa-api`; audiencia: `gestion-operativa-client`;
algoritmo: HS256; duración: 900 segundos.

Para desarrollo, en PowerShell desde `backend`, generar una clave únicamente en
el entorno de esa terminal, sin imprimirla ni escribirla en archivos:

```powershell
$env:JWT_SECRET = (node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))")
npm.cmd start
```

Conservar esa terminal para reinicios. Generar otra clave invalida los tokens
anteriores. En despliegue, inyectar una clave estable desde el gestor de secretos
del entorno. Nunca ponerla en variables VITE ni en Git. Usar HTTPS en producción.

## Preparar la credencial del ADMIN (requiere aprobación de escritura)

El comando siguiente NO se ejecutó como parte de la implementación.
Después de aprobar el cambio de la contraseña y comprobar que `backend/.env`
apunta a la base deseada, ejecutarlo personalmente en una terminal interactiva:

```powershell
cd backend
node scripts/restablecer-admin.js
```

No acepta argumentos, entrada redirigida ni contraseñas mediante variables de
entorno. Solicita una contraseña nueva y su repetición sin eco. Requiere al menos
15 caracteres y como máximo 1024 bytes UTF-8. Luego exige escribir literalmente
`RESTABLECER ADMIN 1` como confirmación, también sin eco. Ctrl+C cancela antes
del envío. No enviar la contraseña por chat ni escribirla en comandos, ejemplos,
pruebas, migraciones, `.env` o archivos del repositorio.

Después de confirmar, calcula Argon2id con salt aleatorio y ejecuta una sola
sentencia parametrizada contra `usuarios`: modifica exclusivamente la contraseña
del id 1 si continúa siendo ADMIN ACTIVO, e incrementa `token_version`.
`updated_at` cambia automáticamente por la definición actual de MySQL.
No cambia el correo, rol, estado, IDs ni otras tablas. No muestra contraseña ni
hash, tampoco errores originales del controlador SQL. No existe contraseña
predeterminada. La contraseña permanece transitoriamente en memoria; JavaScript
no permite garantizar el borrado de todas las copias en memoria.

Si se pierde la conexión durante el envío, el resultado puede ser incierto:
verificar el acceso antes de repetir el restablecimiento. No ejecutar contra
datos reales desde las pruebas ni desde un agente sin autorización explícita.

## Uso

`POST /auth/login` recibe `correo` y `password` en JSON. Devuelve `access_token`,
`token_type`, `expires_in` y `usuario` (id, nombre, correo, rol). El hash temporal
existente no permite login: primero se necesita el restablecimiento aprobado.

`GET /auth/me` requiere `Authorization: Bearer <token>`. El servidor verifica
firma, emisor, audiencia, expiración y versión; además consulta en cada petición
el estado ACTIVO y rol ADMIN/SUPERVISOR. No depende de un rol obsoleto dentro del
token. Las lecturas de autenticación usan parámetros SQL y nunca escriben datos.

En Swagger, usar `/auth/login` y después el botón **Authorize** con el token
obtenido para consultar `/auth/me`. Swagger muestra el token de respuesta en la
sesión actual: no compartir capturas ni exportarlo. No se activó persistencia
de autorización. Las contraseñas no tienen ejemplos ni defaults en OpenAPI.

El middleware `autorizar(...roles)` está disponible y probado; solo se aplica
al módulo aislado. Las restricciones de negocio se incorporarán en otra etapa.
La autorización efectiva siempre ocurre en el backend.

El login tiene un límite de 10 intentos por IP cada 15 minutos, además del límite
global. Los limitadores actuales son locales al proceso. No configurar proxies
de confianza indiscriminadamente. En un despliegue de múltiples instancias se
necesitará un almacenamiento compartido para esos contadores.

El cliente puede descartar el token al cerrar sesión, pero una copia seguirá
vigente hasta expirar o cambiar `token_version`, desactivar la cuenta o rotar
la clave. Persistencia de sesión y revocación por sesión quedan para otra etapa.

La conexión MySQL conserva su configuración existente (`rejectUnauthorized:
false`); verificar el certificado TLS queda como decisión previa al despliegue,
sin cambiarla en esta tarea.

## Verificación

Desde `backend`: `npm.cmd test`. Los tests de autenticación utilizan Argon2id y
JWT reales, pero usuarios y repositorios simulados. El test del comando de
restablecimiento también utiliza un pool simulado: no ejecuta SQL real.
