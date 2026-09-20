require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pool = require('./config/db');

const proyectosRoutes = require('./routes/proyectos.routes');
const lineasBaseRoutes = require('./routes/lineasBase.routes');
const eventosRoutes = require('./routes/eventos.routes');
const evaluacionesImpactoRoutes = require('./routes/evaluacionesImpacto');
const proyeccionesRoutes = require('./routes/proyecciones.routes');

const app = express();

// Seguridad HTTP
app.use(helmet());

// Permitir conexión con el frontend en desarrollo
app.use(cors({
    origin: 'http://localhost:5173'
}));

app.use(express.json());

const PORT = process.env.PORT || 3000;

// Ruta principal
app.get('/', (req, res) => {
    res.send('API de Gestión Operativa funcionando');
});
// Ruta de estado de la API
app.get('/status', (req, res) => {
    res.json({
        status: 'OK',
        message: 'API de Gestión Operativa funcionando correctamente'
    });
});

// Ruta de prueba de conexión a MySQL
app.get('/db-test', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT DATABASE() AS database_name'
        );

        res.json({
            message: 'Conexión a MySQL correcta',
            database: rows[0].database_name
        });

    } catch (error) {
        console.error('Error de conexión:', error);

        res.status(500).json({
            error: 'Error de conexión a MySQL'
        });
    }
});

// Rutas de proyectos
app.use('/proyectos', proyectosRoutes);

// Rutas de líneas base
app.use('/lineas-base', lineasBaseRoutes);

// Rutas de eventos
app.use('/eventos', eventosRoutes);

// Rutas evaluaciones Impacto
app.use('/evaluaciones-impacto', evaluacionesImpactoRoutes);

app.use('/proyecciones', proyeccionesRoutes);

// Iniciar servidor
app.listen(PORT, () => {
    console.log(
        `Servidor ejecutándose en http://localhost:${PORT}`
    );
});

