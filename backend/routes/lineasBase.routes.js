const express = require('express');
const pool = require('../config/db');

const router = express.Router();


// =====================================================
// POST /api/v1/proyectos/:id/linea-base
// Crear la línea base de un proyecto
// =====================================================

router.post('/:id/linea-base', async (req, res) => {
    try {
        const { id } = req.params;

        const {
            fecha_inicio,
            duracion_dias,
            fecha_fin_prevista,
            costo_base
        } = req.body;


        // Validar campos obligatorios
        if (
            !fecha_inicio ||
            !duracion_dias ||
            !fecha_fin_prevista ||
            costo_base === undefined
        ) {
            return res.status(400).json({
                message:
                    'fecha_inicio, duracion_dias, fecha_fin_prevista y costo_base son obligatorios'
            });
        }


        // Validaciones básicas
        if (duracion_dias <= 0) {
            return res.status(400).json({
                message: 'duracion_dias debe ser mayor que 0'
            });
        }

        if (costo_base < 0) {
            return res.status(400).json({
                message: 'costo_base no puede ser negativo'
            });
        }


        // Verificar que el proyecto exista
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


        // La línea base se captura durante planificación
        if (proyectos[0].estado !== 'PLANIFICACION') {
            return res.status(400).json({
                message:
                    'La línea base solo puede crearse mientras el proyecto está en PLANIFICACION'
            });
        }


        // Verificar que el proyecto todavía no tenga línea base
        const [lineasExistentes] = await pool.query(
            `SELECT id
             FROM lineas_base
             WHERE proyecto_id = ?`,
            [id]
        );

        if (lineasExistentes.length > 0) {
            return res.status(409).json({
                message:
                    'El proyecto ya tiene una línea base registrada'
            });
        }


        // Crear línea base en estado BORRADOR
        const [resultado] = await pool.query(
            `INSERT INTO lineas_base (
                proyecto_id,
                fecha_inicio,
                duracion_dias,
                fecha_fin_prevista,
                costo_base,
                estado
            )
            VALUES (?, ?, ?, ?, ?, 'BORRADOR')`,
            [
                id,
                fecha_inicio,
                duracion_dias,
                fecha_fin_prevista,
                costo_base
            ]
        );


        // Consultar el registro recién creado
        const [lineasBase] = await pool.query(
            `SELECT *
             FROM lineas_base
             WHERE id = ?`,
            [resultado.insertId]
        );


        res.status(201).json({
            message: 'Línea base creada correctamente',
            linea_base: lineasBase[0]
        });

    } catch (error) {
        console.error(
            'Error al crear línea base:',
            error
        );

        res.status(500).json({
            message: 'Error al crear la línea base'
        });
    }
});

// Obtener la línea base de un proyecto
router.get('/:id/linea-base', async (req, res) => {
    try {
        const proyectoId = req.params.id;

        const [lineasBase] = await pool.query(
            `SELECT *
             FROM lineas_base
             WHERE proyecto_id = ?
             ORDER BY id DESC
             LIMIT 1`,
            [proyectoId]
        );

        if (lineasBase.length === 0) {
            return res.status(404).json({
                message: 'Línea base no encontrada'
            });
        }

        res.json(lineasBase[0]);

    } catch (error) {
        console.error('Error al obtener línea base:', error);

        res.status(500).json({
            message: 'Error al obtener la línea base'
        });
    }
});

// Confirmar la línea base de un proyecto
router.patch('/:id/linea-base/confirmar', async (req, res) => {
    try {
        const proyectoId = req.params.id;
        const { confirmada_por } = req.body;

        // Validar quién confirma
        if (!confirmada_por) {
            return res.status(400).json({
                message: 'confirmada_por es obligatorio'
            });
        }

        // Buscar la línea base del proyecto
        const [lineasBase] = await pool.query(
            `SELECT *
             FROM lineas_base
             WHERE proyecto_id = ?
             ORDER BY id DESC
             LIMIT 1`,
            [proyectoId]
        );

        if (lineasBase.length === 0) {
            return res.status(404).json({
                message: 'Línea base no encontrada'
            });
        }

        const lineaBase = lineasBase[0];

        // Evitar confirmar nuevamente
        if (lineaBase.estado === 'CONFIRMADA') {
            return res.status(400).json({
                message: 'La línea base ya está confirmada'
            });
        }

        // Confirmar la línea base
        await pool.query(
            `UPDATE lineas_base
             SET estado = 'CONFIRMADA',
                 confirmada_por = ?,
                 confirmada_en = NOW()
             WHERE id = ?`,
            [confirmada_por, lineaBase.id]
        );

        // Consultar el registro actualizado
        const [resultado] = await pool.query(
            `SELECT *
             FROM lineas_base
             WHERE id = ?`,
            [lineaBase.id]
        );

        res.json({
            message: 'Línea base confirmada correctamente',
            linea_base: resultado[0]
        });

    } catch (error) {
        console.error('Error al confirmar línea base:', error);

        res.status(500).json({
            message: 'Error al confirmar la línea base'
        });
    }
});

module.exports = router;