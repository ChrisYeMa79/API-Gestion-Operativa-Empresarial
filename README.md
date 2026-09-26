# API de Gestión Operativa Empresarial

Proyecto final desarrollado para el módulo de **Backend Avanzado**.

La aplicación permite registrar y analizar eventos que afectan la operación de un proyecto, evaluar su impacto y generar proyecciones actualizadas de **tiempo y costo**, conservando una línea base original como referencia.

El sistema fue diseñado inicialmente tomando una obra como caso de uso, pero su lógica puede adaptarse a otros entornos operativos como logística, mantenimiento, maquinaria, transporte o servicios.

---

## 1. Objetivo del proyecto

El objetivo es proporcionar una herramienta que permita comparar el estado real de una operación contra una **línea base previamente confirmada**.

El flujo general es:

**Proyecto → Línea base → Eventos → Evaluación de impacto → Proyección actualizada**

La aplicación considera principalmente:

- Tiempo.
- Costo.
- Eventos operativos.
- Evaluaciones confirmadas.
- Superposición de periodos afectados.
- Historial de proyecciones.

La decisión sobre si un evento realmente afecta la operación permanece bajo **criterio humano**, mientras que el sistema realiza los cálculos posteriores de manera automática.

---

## 2. Arquitectura general

El proyecto utiliza una arquitectura separada en frontend y backend:

```text
API-Gestion-Operativa-Empresarial/
│
├── backend/
│   ├── config/
│   ├── routes/
│   ├── utils/
│   ├── app.js
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

### Flujo de comunicación

```text
React + Vite
     │
     │ HTTP / JSON
     ▼
Node.js + Express
     │
     ▼
    MySQL
```

---

## 3. Tecnologías utilizadas

### Backend

- Node.js
- Express
- MySQL
- mysql2
- dotenv
- Helmet
- CORS
- express-rate-limit

### Frontend

- React
- React DOM
- Vite
- CSS
- JavaScript

### Herramientas de desarrollo

- Visual Studio Code
- XAMPP / MySQL
- Git
- GitHub
- Thunder Client / herramientas de prueba de API
- Mocha
- Chai
- Supertest

---

## 4. Módulos principales

La API está organizada mediante rutas independientes:

```text
backend/routes/
├── proyectos.routes.js
├── lineasBase.routes.js
├── eventos.routes.js
├── evaluacionesImpacto.js
└── proyecciones.routes.js
```

Esta separación permite mantener una estructura modular y facilita el mantenimiento y crecimiento del sistema.

---

## 5. Flujo operativo

### 5.1 Proyecto

Representa la operación que será monitoreada.

Un proyecto puede contener información general, presupuesto, fechas y otros datos necesarios para identificar la operación.

### 5.2 Línea base

La línea base representa la planeación original del proyecto.

Contiene elementos como:

- Fecha de inicio.
- Duración.
- Fecha prevista de finalización.
- Costo base.
- Recursos previstos.

Para generar una proyección, el sistema requiere una línea base con estado:

```text
CONFIRMADA
```

De esta manera se conserva una referencia estable contra la cual comparar los cambios posteriores.

### 5.3 Eventos

Los eventos representan situaciones ocurridas durante la ejecución.

Ejemplos:

- Suministro.
- Maquinaria.
- Personal.
- Clima.
- Otros eventos operativos.

Un evento no genera automáticamente un atraso. Primero debe ser evaluado.

### 5.4 Evaluaciones de impacto

La evaluación permite determinar si un evento realmente afecta:

- El plazo.
- El costo.
- La operación.

Para generar una nueva proyección únicamente se consideran evaluaciones:

```text
CONFIRMADAS
```

y que además se encuentren:

```text
VIGENTES
```

Esto evita utilizar evaluaciones preliminares, descartadas o que ya no deben influir en el cálculo actual.

### 5.5 Proyecciones

A partir de la línea base y de las evaluaciones válidas, el sistema calcula:

- Días brutos de afectación.
- Días superpuestos.
- Atraso efectivo.
- Nueva fecha de terminación.
- Costo adicional.
- Costo proyectado.

La proyección generada se almacena en la base de datos para conservar un historial.

---

## 6. Control de superposición de eventos

Una de las reglas principales del sistema consiste en evitar que dos eventos ocurridos durante las mismas fechas dupliquen artificialmente el atraso.

La lógica se encuentra en:

```text
backend/utils/calcularImpactos.js
```

mediante la función:

```javascript
calcularDiasUnicos(periodos)
```

El procedimiento:

1. Convierte las fechas de los periodos recibidos.
2. Ordena cronológicamente los intervalos.
3. Detecta periodos que se superponen.
4. Fusiona los intervalos coincidentes.
5. Calcula únicamente los días efectivos.

Ejemplo conceptual:

```text
Evento A: 1 ───────── 5
Evento B:       4 ───────── 8
```

La aplicación no considera estos periodos como dos atrasos independientes completos.

Los días coincidentes se contabilizan una sola vez.

Esto permite obtener un **atraso efectivo** más cercano al impacto real de la operación.

---

## 7. Generación de proyecciones

La lógica principal se encuentra en:

```text
backend/routes/proyecciones.routes.js
```

Para generar una nueva proyección, el sistema:

1. Busca la línea base confirmada.
2. Obtiene únicamente evaluaciones confirmadas y vigentes.
3. Identifica los periodos que afectan el plazo.
4. Calcula los días brutos.
5. Elimina duplicidades provocadas por superposición.
6. Obtiene el atraso efectivo.
7. Calcula el costo adicional.
8. Calcula la nueva fecha de terminación.
9. Calcula el costo proyectado.
10. Guarda la nueva proyección en MySQL.

Conceptualmente:

```text
Fecha fin proyectada =
Fecha fin línea base + atraso efectivo
```

y:

```text
Costo proyectado =
Costo base + costo adicional
```

---

## 8. Green Software y optimización

Durante el desarrollo se aplicó un criterio de **Green Software**, buscando evitar transferencia y procesamiento innecesario de información.

Originalmente, para mostrar el estado actual del proyecto era posible recuperar el historial completo de proyecciones.

Se implementó un endpoint específico para recuperar únicamente la última proyección:

```text
GET /proyecciones/proyecto/:proyectoId/actual
```

La consulta utiliza:

```sql
ORDER BY fecha_calculo DESC
LIMIT 1
```

De esta forma, cuando el frontend únicamente necesita mostrar el estado operativo actual, la API no transfiere todo el historial.

### Resultado medido durante las pruebas

```text
Respuesta anterior aproximada: 722 bytes
Respuesta optimizada:          386 bytes
Reducción aproximada:          46.5 %
```

El historial completo continúa disponible mediante su endpoint correspondiente cuando realmente es requerido.

Esta optimización reduce:

- Datos transferidos.
- Procesamiento innecesario.
- Uso de red.
- Carga del cliente.

---

## 9. Seguridad

### Helmet

Se utiliza:

```javascript
app.use(helmet());
```

Helmet agrega encabezados HTTP orientados a mejorar la seguridad de la aplicación.

Ubicación:

```text
backend/app.js
```

### CORS

Se implementó CORS para controlar qué frontend puede realizar solicitudes al backend.

Durante desarrollo:

```text
http://localhost:5173
```

Ubicación:

```text
backend/app.js
```

CORS utiliza la variable de entorno `FRONTEND_URL` para definir el origen autorizado. En producción corresponde al frontend desplegado en Netlify; el valor predeterminado para desarrollo local es `http://localhost:5173`.

### Variables de entorno

La aplicación utiliza:

```javascript
require('dotenv').config();
```

Los datos de configuración de la base de datos se mantienen mediante variables de entorno.

Esto permite separar la configuración sensible del código fuente.

### .gitignore

Los archivos sensibles y dependencias que no deben formar parte del repositorio se excluyen mediante `.gitignore`.

Entre ellos:

```text
node_modules
.env
```
### Rate limiting

La API utiliza `express-rate-limit` para limitar la cantidad de solicitudes realizadas desde una misma IP.

La configuración actual permite un máximo de 100 solicitudes por IP dentro de una ventana de 15 minutos.

Este control ayuda a reducir abuso de la API y solicitudes excesivas.

### Límite del cuerpo de las peticiones

Express está configurado para limitar el tamaño de las solicitudes JSON:

```javascript
app.use(express.json({ limit: '100kb' }));

### Validación del lado del servidor

Los datos recibidos por la API son validados en el backend antes de ser procesados o enviados a MySQL.

Entre las validaciones implementadas se encuentran:

- Campos obligatorios.
- Tipos de evento permitidos.
- Identificadores numéricos válidos.
- Formatos de fecha.
- Coherencia entre fecha de inicio y fecha de fin.
- Rechazo de costos negativos.

Las validaciones del frontend mejoran la experiencia del usuario, pero el backend conserva la responsabilidad final de validar los datos.

### Manejo seguro de errores

La aplicación dispone de manejo controlado para rutas inexistentes y errores internos.

Las rutas no encontradas responden con código HTTP `404` y un mensaje controlado.

Los errores internos responden con código HTTP `500` sin enviar al cliente detalles técnicos internos de la aplicación.

### Reducción de exposición de información

Se deshabilitó la cabecera que identifica automáticamente el framework utilizado por el servidor.

También se retiraron rutas y archivos utilizados exclusivamente durante las etapas de prueba y desarrollo.

### Revisión de dependencias

Se ejecutó `npm audit` tanto en backend como en frontend.

Resultado actual: `found 0 vulnerabilities`.

### Pruebas automatizadas de seguridad y validación

El backend incorpora pruebas automatizadas mediante:

- Mocha
- Chai
- Supertest

Actualmente se verifican seis escenarios:

1. Respuesta correcta de `GET /status`.
2. Manejo controlado de una ruta inexistente.
3. Rechazo de eventos con campos obligatorios faltantes.
4. Rechazo de tipos de evento no válidos.
5. Rechazo de fechas de inicio inválidas.
6. Rechazo de costos observados negativos.

Resultado actual: `6 passing`.

### Consideraciones para producción

El proyecto está desplegado en producción: el frontend en Netlify, la API en Render y la base de datos MySQL en Aiven.

La configuración de producción se gestiona mediante variables de entorno: `VITE_API_URL` define la URL de la API para el frontend, `FRONTEND_URL` define el origen autorizado por CORS y las variables del backend proporcionan la configuración de conexión a MySQL y autenticación.
---

## 10. Conexión con MySQL

La configuración de base de datos se encuentra en:

```text
backend/config/db.js
```

La API dispone también de un endpoint de comprobación:

```text
GET /db-test
```

que permite verificar la conexión con MySQL.

Existe además un endpoint de estado:

```text
GET /status
```

para verificar que la API se encuentra funcionando correctamente.

---

## 11. Endpoints principales

### Estado de la API

```text
GET /
GET /status
GET /db-test
```

### Proyectos

```text
GET /proyectos/:id
```

### Línea base

```text
POST /proyectos/:id/linea-base
```

### Eventos

```text
POST /eventos
GET /eventos/proyecto/:id
```

### Evaluaciones de impacto

Permiten registrar y consultar la valoración de los eventos ocurridos durante la operación.

### Proyecciones

Generar una nueva proyección:

```text
POST /proyecciones/proyecto/:proyectoId
```

Obtener únicamente la proyección vigente:

```text
GET /proyecciones/proyecto/:proyectoId/actual
```

Consultar historial:

```text
GET /proyecciones/proyecto/:proyectoId
```

---

## 12. Frontend

El frontend fue desarrollado con:

```text
React + Vite
```

Su estructura principal se encuentra en:

```text
frontend/src/
├── assets/
├── App.css
├── App.jsx
├── index.css
└── main.jsx
```

La interfaz permite visualizar y trabajar con los principales módulos del sistema:

- Línea base.
- Eventos.
- Evaluaciones.
- Historial de proyecciones.

El panel principal muestra indicadores como:

- Atraso efectivo.
- Fecha fin proyectada.
- Costo adicional.
- Costo proyectado.

La interfaz fue adaptada para diferentes tamaños de pantalla mediante diseño responsive.

---

## 13. Validaciones y manejo de errores

La API incorpora validaciones para evitar almacenar información incompleta o inconsistente.

Entre las validaciones implementadas se encuentran:

- Existencia de línea base.
- Línea base confirmada.
- Evaluaciones confirmadas.
- Evaluaciones vigentes.
- Campos obligatorios según el tipo de operación.
- Identificadores numéricos válidos.
- Tipos de evento permitidos.
- Formatos de fecha válidos.
- Coherencia entre fecha de inicio y fecha de fin.
- Valores numéricos válidos.
- Rechazo de costos negativos.
También se utilizan códigos HTTP según el resultado de la solicitud, incluyendo:

```text
200  Solicitud correcta
201  Recurso generado correctamente
400  Solicitud inválida
404  Recurso no encontrado
500  Error interno
```

---

## 14. Tabla de cumplimiento y evidencias

| Requisito / característica | Implementación | Ubicación principal |
|---|---|---|
| API REST | Node.js + Express | `backend/app.js` |
| Arquitectura modular | Rutas independientes | `backend/routes/` |
| Base de datos | MySQL + mysql2 | `backend/config/db.js` |
| Variables de entorno | dotenv | `backend/app.js` |
| Seguridad HTTP | Helmet | `backend/app.js` |
| Control de origen | CORS | `backend/app.js` |
| Rate limiting | express-rate-limit | `backend/app.js` |
| Límite de payload | JSON limitado a 100kb | `backend/app.js` |
| Manejo seguro de errores | Respuestas controladas 404 / 500 | `backend/app.js` |
| Validación server-side | Validación de entradas antes del procesamiento | `backend/routes/` |
| Pruebas automatizadas | Mocha + Chai + Supertest, 6 pruebas | `backend/test/app.test.js` |
| Auditoría de dependencias | npm audit: 0 vulnerabilidades | `backend/package.json` / `frontend/package.json` |
| Línea base | Registro y validación | `backend/routes/lineasBase.routes.js` |
| Eventos operativos | Registro y consulta | `backend/routes/eventos.routes.js` |
| Evaluación humana | Evaluaciones de impacto | `backend/routes/evaluacionesImpacto.js` |
| Proyecciones | Tiempo y costo | `backend/routes/proyecciones.routes.js` |
| Superposición | Fusión de periodos | `backend/utils/calcularImpactos.js` |
| Green Software | Endpoint optimizado de estado actual | `backend/routes/proyecciones.routes.js` |
| Frontend | React + Vite | `frontend/src/` |
| Configuración del frontend | URL del backend mediante VITE_API_URL | `frontend/.env.example` / `frontend/src/App.jsx` |
| Interfaz responsive | CSS adaptable | `frontend/src/App.css` |
| Control de versiones | Git / GitHub | Repositorio del proyecto |

---

## 15. Instalación

### Requisitos

Para ejecutar el proyecto localmente se requiere:

- Node.js
- npm
- MySQL
- Git
- Navegador web

### Clonar repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd API-Gestion-Operativa-Empresarial
```

### Backend

Entrar a:

```bash
cd backend
```

Instalar dependencias:

```bash
npm install
```

Configurar las variables necesarias en `.env`.

Ejemplo de estructura:

```env
DB_HOST=localhost
DB_USER=usuario
DB_PASSWORD=contraseña
DB_NAME=gestion_operativa
PORT=3000
```

Iniciar backend:

```bash
npm start
```

Servidor local:

```text
http://localhost:3000
```

### Frontend

Desde la raíz del proyecto:

```bash
cd frontend
```

Instalar dependencias:

```bash
npm install
```

Iniciar Vite:

```bash
npm run dev
```

Frontend local:

```text
http://localhost:5173
```

---

## 16. Scripts disponibles
### Backend

```bash
npm start
npm test

### Frontend

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

---

## 17. Estado actual del proyecto

El proyecto está desplegado en producción con Netlify, Render y MySQL en Aiven. También se encuentra verificado en entorno local el flujo:

```text
MySQL
  ↓
Node.js / Express
  ↓
API REST
  ↓
React / Vite
  ↓
Interfaz de usuario
```

Se encuentran operativos los módulos:

```text
Línea base
Eventos
Evaluaciones
Historial
```
El proyecto también cuenta actualmente con:

- Validaciones server-side reforzadas.
- Manejo controlado de errores HTTP.
- Helmet y CORS.
- Rate limiting.
- Límite de tamaño para solicitudes JSON.
- Variables de entorno para configuración sensible.
- URL del backend configurable desde el frontend mediante `VITE_API_URL`.
- 6 pruebas automatizadas del backend ejecutadas correctamente.
- Auditoría de dependencias del backend: 0 vulnerabilidades.
- Auditoría de dependencias del frontend: 0 vulnerabilidades.
- Compilación de producción del frontend verificada mediante `npm run build`.
- Repositorio Git actualizado y respaldado en GitHub.


---

## 18. Despliegue

El proyecto se encuentra desplegado en producción con frontend y backend separados:

- Frontend React + Vite: Netlify.
- Backend/API Node.js + Express: Render.
- Base de datos MySQL: Aiven.

El frontend genera su compilación de producción mediante `npm run build`, proceso que fue ejecutado y verificado correctamente.

La variable de entorno `VITE_API_URL` configura la URL pública de la API de Render en el frontend. En el backend, `FRONTEND_URL` define el dominio del frontend de Netlify autorizado por CORS. Las variables de entorno del backend configuran la conexión a MySQL en Aiven y la autenticación, sin incorporar secretos al código fuente.

La instalación local descrita anteriormente se mantiene disponible para desarrollo y pruebas.

---

## 19. Posibles ampliaciones

El proyecto ya implementa autenticación JWT y control de acceso mediante los roles ADMIN y SUPERVISOR en las rutas que incorporan estos controles. Esto no implica que todas las rutas de la API estén protegidas.

La arquitectura permite considerar futuras funcionalidades como:

- Gestión de múltiples organizaciones.
- Paneles estadísticos.
- Indicadores operativos.
- Notificaciones.
- Auditoría de modificaciones.
- Integración con sistemas externos.
- Contenedores.

---

## 20. Autor

**Ing. Christian Yépez**

Proyecto académico — Backend Avanzado  
API de Gestión Operativa Empresarial