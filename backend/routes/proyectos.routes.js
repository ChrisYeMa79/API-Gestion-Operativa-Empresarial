const express = require('express');
const pool = require('../config/db');

const router = express.Router();


// =====================================================
// GET /api/v1/proyectos
// Obtener todos los proyectos no eliminados
// =====================================================

router.get('/', async (req, res) => {
    try {
        const [proyectos] = await pool.query(
            `SELECT *
             FROM proyectos
             WHERE eliminado = FALSE`
        );

        res.json(proyectos);

    } catch (error) {
        console.error('Error al obtener proyectos:', error);

        res.status(500).json({
            message: 'Error al obtener los proyectos'
        });
    }
});


// =====================================================
// GET /api/v1/proyectos/:id
// Obtener un proyecto por ID
// =====================================================

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [proyectos] = await pool.query(
            `SELECT *
             FROM proyectos
             WHERE id = ?
             AND eliminado = FALSE`,
            [id]
        );

        if (proyectos.length === 0) {
            return res.status(404).json({
                message: 'Proyecto no encontrado'
            });
        }

        res.json(proyectos[0]);

    } catch (error) {
        console.error('Error al obtener proyecto:', error);

        res.status(500).json({
            message: 'Error al obtener el proyecto'
        });
    }
});


// =====================================================
// POST /api/v1/proyectos
// Crear un nuevo proyecto
// =====================================================

router.post('/', async (req, res) => {
    try {
        const {
            nombre,
            descripcion,
            fecha_inicio,
            propietario_id
        } = req.body;

        if (!nombre || !fecha_inicio || !propietario_id) {
            return res.status(400).json({
                message:
                    'nombre, fecha_inicio y propietario_id son obligatorios'
            });
        }

        const [resultado] = await pool.query(
            `INSERT INTO proyectos (
                nombre,
                descripcion,
                fecha_inicio,
                estado,
                propietario_id
            )
            VALUES (?, ?, ?, 'PLANIFICACION', ?)`,
            [
                nombre,
                descripcion || null,
                fecha_inicio,
                propietario_id
            ]
        );

        const [proyectos] = await pool.query(
            `SELECT *
             FROM proyectos
             WHERE id = ?`,
            [resultado.insertId]
        );

        res.status(201).json({
            message: 'Proyecto creado correctamente',
            proyecto: proyectos[0]
        });

    } catch (error) {
        console.error('Error al crear proyecto:', error);

        res.status(500).json({
            message: 'Error al crear el proyecto'
        });
    }
});


module.exports = router;