const express = require('express');
const pool = require('../config/db');
const { calcularDiasUnicos } = require('../utils/calcularImpactos');

const router = express.Router();

// Crear una evaluación de impacto
router.post('/', async (req, res) => {
    try {

        const {
            evento_id,
            afecta_plazo,
            dias_adicionales,
            impacto_inicio,
            impacto_fin,
            afecta_costo,
            monto_adicional,
            justificacion,
            evaluado_por
        } = req.body;

        // Validar campos obligatorios
        if (!evento_id || !evaluado_por) {
            return res.status(400).json({
                error: 'Faltan campos obligatorios'
            });
        }

        // Validar datos de impacto en plazo
        if (afecta_plazo === 1) {
            if (!impacto_inicio || !impacto_fin) {
                return res.status(400).json({
                    error: 'Si afecta el plazo, impacto_inicio e impacto_fin son obligatorios'
                });
            }
        }

        // Validar orden de fechas
        if (
            impacto_inicio &&
            impacto_fin &&
            new Date(impacto_fin) < new Date(impacto_inicio)
        ) {
            return res.status(400).json({
                error: 'impacto_fin no puede ser anterior a impacto_inicio'
            });
        }

        // Verificar que el evento exista y esté confirmado
        const [eventos] = await pool.query(
            `SELECT id, estado_registro
             FROM eventos
             WHERE id = ?
             AND eliminado = 0`,
            [evento_id]
        );

        if (eventos.length === 0) {
            return res.status(404).json({
                error: 'Evento no encontrado'
            });
        }

        if (eventos[0].estado_registro !== 'CONFIRMADO') {
            return res.status(409).json({
                error: 'El evento debe estar confirmado antes de evaluarlo'
            });
        }

        // Crear evaluación
        const [result] = await pool.query(
            `INSERT INTO evaluaciones_impacto
    (
        evento_id,
        afecta_plazo,
        dias_adicionales,
        impacto_inicio,
        impacto_fin,
        afecta_costo,
        monto_adicional,
        justificacion,
        evaluado_por
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                evento_id,
                afecta_plazo ?? 0,
                dias_adicionales ?? 0,
                impacto_inicio || null,
                impacto_fin || null,
                afecta_costo ?? 0,
                monto_adicional ?? 0,
                justificacion || null,
                evaluado_por
            ]
        );
        res.status(201).json({
            message: 'Evaluación de impacto registrada correctamente',
            id_evaluacion: result.insertId
        });

    } catch (error) {

        console.error(
            'Error al registrar evaluación de impacto:',
            error
        );

        res.status(500).json({
            error: 'Error al registrar la evaluación de impacto'
        });
    }
});

// Confirmar una evaluación de impacto
router.patch('/:id/confirmar', async (req, res) => {
    try {

        const { id } = req.params;
        const { confirmada_por } = req.body;

        // Validar quién confirma
        if (!confirmada_por) {
            return res.status(400).json({
                error: 'Debe indicar el usuario que confirma la evaluación'
            });
        }

        // Buscar la evaluación
        const [evaluaciones] = await pool.query(
            `SELECT id, estado_registro, vigente
             FROM evaluaciones_impacto
             WHERE id = ?`,
            [id]
        );

        // Verificar que exista
        if (evaluaciones.length === 0) {
            return res.status(404).json({
                error: 'Evaluación de impacto no encontrada'
            });
        }

        // Verificar que siga vigente
        if (evaluaciones[0].vigente !== 1) {
            return res.status(409).json({
                error: 'La evaluación ya no está vigente'
            });
        }

        // Evitar confirmar dos veces
        if (evaluaciones[0].estado_registro === 'CONFIRMADA') {
            return res.status(409).json({
                error: 'La evaluación ya está confirmada'
            });
        }

        // Confirmar evaluación
        await pool.query(
            `UPDATE evaluaciones_impacto
             SET estado_registro = 'CONFIRMADA',
                 confirmada_por = ?,
                 confirmada_en = NOW()
             WHERE id = ?`,
            [confirmada_por, id]
        );

        res.status(200).json({
            message: 'Evaluación de impacto confirmada correctamente',
            id_evaluacion: Number(id)
        });

    } catch (error) {

        console.error(
            'Error al confirmar evaluación de impacto:',
            error
        );

        res.status(500).json({
            error: 'Error al confirmar la evaluación de impacto'
        });
    }
});

// Obtener evaluaciones de impacto confirmadas y vigentes
router.get('/confirmadas', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT *
             FROM evaluaciones_impacto
             WHERE estado_registro = 'CONFIRMADA'
             AND vigente = 1`
        );

        res.status(200).json(rows);

    } catch (error) {
        console.error(
            'Error al obtener evaluaciones confirmadas:',
            error
        );

        res.status(500).json({
            error: 'Error al obtener evaluaciones confirmadas'
        });
    }
});

// Obtener impactos confirmados y vigentes de un proyecto
router.get('/proyecto/:proyectoId/confirmadas', async (req, res) => {
    try {
        const { proyectoId } = req.params;

        const [rows] = await pool.query(
            `SELECT
                ei.id AS evaluacion_id,
                ei.evento_id,
                e.proyecto_id,
                e.tipo,
                e.descripcion,
                e.fecha_inicio,
                e.fecha_fin,
                ei.afecta_plazo,
                ei.dias_adicionales,
                ei.impacto_inicio,
                ei.impacto_fin,
                ei.afecta_costo,
                ei.monto_adicional,
                ei.justificacion
             FROM evaluaciones_impacto ei
             INNER JOIN eventos e
                ON ei.evento_id = e.id
             WHERE e.proyecto_id = ?
               AND ei.estado_registro = 'CONFIRMADA'
               AND ei.vigente = 1
             ORDER BY e.fecha_inicio ASC`,
            [proyectoId]
        );

        res.status(200).json(rows);

    } catch (error) {
        console.error(
            'Error al obtener impactos confirmados del proyecto:',
            error
        );

        res.status(500).json({
            error: 'Error al obtener impactos confirmados del proyecto'
        });
    }
});

// Obtener resumen de impactos confirmados de un proyecto
router.get('/proyecto/:proyectoId/resumen', async (req, res) => {
    try {
        const { proyectoId } = req.params;

        // Obtener línea base confirmada del proyecto
const [lineasBase] = await pool.query(
    `SELECT
        id,
        proyecto_id,
        DATE_FORMAT(fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
        duracion_dias,
        DATE_FORMAT(fecha_fin_prevista, '%Y-%m-%d') AS fecha_fin_prevista,
        costo_base
     FROM lineas_base
     WHERE proyecto_id = ?
       AND estado = 'CONFIRMADA'
     LIMIT 1`,
    [proyectoId]
);

if (lineasBase.length === 0) {
    return res.status(404).json({
        error: 'No existe una línea base confirmada para este proyecto'
    });
}

const lineaBase = lineasBase[0];

        const [rows] = await pool.query(
            `SELECT
                ei.afecta_plazo,           
                ei.dias_adicionales,
                ei.impacto_inicio,
                ei.impacto_fin,
                ei.monto_adicional
             FROM evaluaciones_impacto ei
             INNER JOIN eventos e
                ON ei.evento_id = e.id
             WHERE e.proyecto_id = ?
               AND ei.estado_registro = 'CONFIRMADA'
               AND ei.vigente = 1
               `,
            [proyectoId]
        );

        
            const periodos = rows
    .filter(
        row =>
            row.afecta_plazo === 1 &&
            row.impacto_inicio &&
            row.impacto_fin
    )
            .map(row => ({
                inicio: row.impacto_inicio,
                fin: row.impacto_fin
            }));

        const diasBrutos = rows.reduce(
            (total, row) => total + Number(row.dias_adicionales || 0),
            0
        );

        const atrasoEfectivoDias = calcularDiasUnicos(periodos);

        const diasSuperpuestos = diasBrutos - atrasoEfectivoDias;

        const costoAdicional = rows.reduce(
            (total, row) => total + Number(row.monto_adicional || 0),
            0
        );

        // Calcular fecha fin proyectada
const fechaFinBase = new Date(lineaBase.fecha_fin_prevista);

const fechaFinProyectada = new Date(fechaFinBase);
fechaFinProyectada.setUTCDate(
    fechaFinProyectada.getUTCDate() + atrasoEfectivoDias
);

// Calcular costo proyectado
const costoBase = Number(lineaBase.costo_base);
const costoProyectado = costoBase + costoAdicional;

        res.status(200).json({
    proyecto_id: Number(proyectoId),
    evaluaciones_confirmadas: rows.length,

    fecha_fin_base: lineaBase.fecha_fin_prevista,
    atraso_efectivo_dias: atrasoEfectivoDias,
    fecha_fin_proyectada: fechaFinProyectada
        .toISOString()
        .split('T')[0],

    dias_brutos: diasBrutos,
    dias_superpuestos: diasSuperpuestos,

    costo_base: costoBase,
    costo_adicional: costoAdicional,
    costo_proyectado: costoProyectado
});
    } catch (error) {
        console.error(
            'Error al obtener resumen de impactos:',
            error
        );

        res.status(500).json({
            error: 'Error al obtener resumen de impactos'
        });
    }
});
module.exports = router;