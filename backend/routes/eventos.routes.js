const express = require('express');
const pool = require('../config/db');

const router = express.Router();

// Crear un nuevo evento
router.post('/', async (req, res) => {
    try {

        const {
            proyecto_id,
            tipo,
            descripcion,
            fecha_inicio,
            fecha_fin,
            afecta_operacion,
            costo_observado,
            registrado_por
        } = req.body;

        // Validación básica de campos obligatorios
        if (
            !proyecto_id ||
            !tipo ||
            !descripcion ||
            !fecha_inicio ||
            !registrado_por
        ) {
            return res.status(400).json({
                error: 'Faltan campos obligatorios'
            });
        }

        const [result] = await pool.query(
            `INSERT INTO eventos
            (
                proyecto_id,
                tipo,
                descripcion,
                fecha_inicio,
                fecha_fin,
                afecta_operacion,
                costo_observado,
                registrado_por
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                proyecto_id,
                tipo,
                descripcion,
                fecha_inicio,
                fecha_fin || null,
                afecta_operacion ?? 1,
                costo_observado ?? 0,
                registrado_por
            ]
        );

        res.status(201).json({
            message: 'Evento registrado correctamente',
            id_evento: result.insertId
        });

    } catch (error) {

        console.error(
            'Error al registrar evento:',
            error
        );

        res.status(500).json({
            error: 'Error al registrar el evento'
        });
    }
});

// Confirmar un evento
router.patch('/:id/confirmar', async (req, res) => {
    try {

        const { id } = req.params;
        const { confirmado_por } = req.body;

        // Validar que se indique quién confirma
        if (!confirmado_por) {
            return res.status(400).json({
                error: 'Debe indicar el usuario que confirma el evento'
            });
        }

        // Buscar el evento
        const [eventos] = await pool.query(
            `SELECT id, estado_registro
             FROM eventos
             WHERE id = ? AND eliminado = 0`,
            [id]
        );

        // Verificar que exista
        if (eventos.length === 0) {
            return res.status(404).json({
                error: 'Evento no encontrado'
            });
        }

        // Evitar confirmar dos veces
        if (eventos[0].estado_registro === 'CONFIRMADO') {
            return res.status(409).json({
                error: 'El evento ya está confirmado'
            });
        }

        // Confirmar el evento
        await pool.query(
            `UPDATE eventos
             SET estado_registro = 'CONFIRMADO',
                 confirmado_por = ?,
                 confirmado_en = NOW()
             WHERE id = ?`,
            [confirmado_por, id]
        );

        res.status(200).json({
            message: 'Evento confirmado correctamente',
            id_evento: Number(id)
        });

    } catch (error) {

        console.error(
            'Error al confirmar evento:',
            error
        );

        res.status(500).json({
            error: 'Error al confirmar el evento'
        });
    }
});
// Obtener eventos de un proyecto
router.get('/proyecto/:proyectoId', async (req, res) => {
    try {
        const { proyectoId } = req.params;

        const [eventos] = await pool.query(
            `SELECT
                id,
                tipo,
                descripcion,
                fecha_inicio,
                fecha_fin,
                afecta_operacion,
                costo_observado,
                estado_registro
             FROM eventos
             WHERE proyecto_id = ?
               AND eliminado = 0
             ORDER BY fecha_inicio DESC`,
            [proyectoId]
        );

        res.status(200).json({
            proyecto_id: Number(proyectoId),
            total_eventos: eventos.length,
            eventos
        });

    } catch (error) {
        console.error(
            'Error al obtener eventos:',
            error
        );

        res.status(500).json({
            error: 'Error al obtener los eventos'
        });
    }
});
module.exports = router;