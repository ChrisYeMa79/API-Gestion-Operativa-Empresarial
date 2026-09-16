const express = require('express');
const pool = require('../config/db');
const { calcularDiasUnicos } = require('../utils/calcularImpactos');

const router = express.Router();

// Generar y guardar una proyección para un proyecto
router.post('/proyecto/:proyectoId', async (req, res) => {
    try {
        const { proyectoId } = req.params;

        const [lineasBase] = await pool.query(
            `SELECT
                id,
                proyecto_id,
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

        // Obtener evaluaciones confirmadas y vigentes del proyecto
const [impactos] = await pool.query(
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
       AND ei.vigente = 1`,
    [proyectoId]
);

// Preparar periodos que afectan el plazo
const periodos = impactos
    .filter(
        impacto =>
            impacto.afecta_plazo === 1 &&
            impacto.impacto_inicio &&
            impacto.impacto_fin
    )
    .map(impacto => ({
        inicio: impacto.impacto_inicio,
        fin: impacto.impacto_fin
    }));

// Calcular días brutos
const diasBrutos = impactos.reduce(
    (total, impacto) =>
        total + Number(impacto.dias_adicionales || 0),
    0
);

// Calcular días efectivos sin duplicar superposiciones
const atrasoEfectivoDias = calcularDiasUnicos(periodos);

// Calcular días superpuestos
const diasSuperpuestos = diasBrutos - atrasoEfectivoDias;

// Calcular costo adicional
const costoAdicional = impactos.reduce(
    (total, impacto) =>
        total + Number(impacto.monto_adicional || 0),
    0
);

// Calcular fecha fin proyectada
const fechaFinBase = new Date(lineaBase.fecha_fin_prevista);

const fechaFinProyectada = new Date(fechaFinBase);

fechaFinProyectada.setUTCDate(
    fechaFinProyectada.getUTCDate() + atrasoEfectivoDias
);

    // Calcular costo proyectado
const costoProyectado =
    Number(lineaBase.costo_base) + costoAdicional;

    // Guardar proyección calculada
const [result] = await pool.query(
    `INSERT INTO proyecciones
    (
        proyecto_id,
        linea_base_id,
        atraso_efectivo_dias,
        fecha_fin_proyectada,
        costo_adicional,
        costo_proyectado,
        comentarios
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
        Number(proyectoId),
        lineaBase.id,
        atrasoEfectivoDias,
        fechaFinProyectada.toISOString().split('T')[0],
        costoAdicional,
        costoProyectado,
        'Proyección generada a partir de impactos confirmados y vigentes'
    ]
);

    res.status(201).json({
    message: 'Proyección generada y guardada correctamente',
    id_proyeccion: result.insertId,
    proyecto_id: Number(proyectoId),
    linea_base: lineaBase,
    evaluaciones_confirmadas: impactos.length,
    dias_brutos: diasBrutos,
    dias_superpuestos: diasSuperpuestos,
    atraso_efectivo_dias: atrasoEfectivoDias,
    fecha_fin_proyectada: fechaFinProyectada
        .toISOString()
        .split('T')[0],
    costo_adicional: costoAdicional,
    costo_proyectado: costoProyectado
});


    } catch (error) {
        console.error(
            'Error al generar proyección:',
            error
        );

        res.status(500).json({
            error: 'Error al generar la proyección'
        });
    }
});

// Obtener únicamente la proyección actual de un proyecto
// Optimización: evita transferir todo el historial cuando
// el consumidor sólo necesita el estado operativo actual.
router.get('/proyecto/:proyectoId/actual', async (req, res) => {
    try {
        const { proyectoId } = req.params;

        const [proyecciones] = await pool.query(
            `SELECT
                id,
                proyecto_id,
                linea_base_id,
                fecha_calculo,
                atraso_efectivo_dias,
                fecha_fin_proyectada,
                costo_adicional,
                costo_proyectado,
                comentarios
             FROM proyecciones
             WHERE proyecto_id = ?
             ORDER BY fecha_calculo DESC
             LIMIT 1`,
            [Number(proyectoId)]
        );

        if (proyecciones.length === 0) {
            return res.status(404).json({
                error: 'No existen proyecciones para este proyecto'
            });
        }

        res.status(200).json({
            message: 'Proyección actual obtenida correctamente',
            proyecto_id: Number(proyectoId),
            proyeccion: proyecciones[0]
        });

    } catch (error) {
        console.error(
            'Error al obtener proyección actual:',
            error
        );

        res.status(500).json({
            error: 'Error al obtener la proyección actual'
        });
    }
});

// Obtener historial de proyecciones de un proyecto
router.get('/proyecto/:proyectoId', async (req, res) => {
    try {
        const { proyectoId } = req.params;

        const [proyecciones] = await pool.query(
    `SELECT
        id,
        proyecto_id,
        linea_base_id,
        fecha_calculo,
        atraso_efectivo_dias,
        fecha_fin_proyectada,
        costo_adicional,
        costo_proyectado,
        comentarios
     FROM proyecciones
     WHERE proyecto_id = ?
     ORDER BY fecha_calculo DESC`,
    [Number(proyectoId)]
);
        res.status(200).json({
            message: 'Historial de proyecciones obtenido correctamente',
            proyecto_id: Number(proyectoId),
            total_proyecciones: proyecciones.length,
            proyecciones
        });

    } catch (error) {
        console.error(
            'Error al obtener historial de proyecciones:',
            error
        );

        res.status(500).json({
            error: 'Error al obtener historial de proyecciones'
        });
    }
});

module.exports = router;