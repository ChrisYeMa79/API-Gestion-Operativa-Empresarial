const { calcularDiasUnicos } = require('./utils/calcularImpactos');

const periodos = [
    {
        inicio: '2026-09-03',
        fin: '2026-09-05'
    },
    {
        inicio: '2026-09-10',
        fin: '2026-09-14'
    },
    {
        inicio: '2026-09-12',
        fin: '2026-09-15'
    }
];

const resultado = calcularDiasUnicos(periodos);

console.log('Días únicos de impacto:', resultado);