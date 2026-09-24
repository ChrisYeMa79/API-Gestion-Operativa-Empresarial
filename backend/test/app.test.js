const request = require('supertest');
const { expect } = require('chai');
const app = require('../app');

describe('API de Gestión Operativa Empresarial', () => {

    it('GET /status debe responder 200 y confirmar que la API funciona', async () => {
        const response = await request(app)
            .get('/status');

        expect(response.status).to.equal(200);
        expect(response.body.status).to.equal('OK');
        expect(response.body.message).to.equal(
            'API de Gestión Operativa funcionando correctamente'
        );
    });

    it('Una ruta inexistente debe responder 404 de forma controlada', async () => {
        const response = await request(app)
            .get('/ruta-que-no-existe');

        expect(response.status).to.equal(404);
        expect(response.body.error).to.equal('Ruta no encontrada');
    });

    it('POST /eventos debe rechazar eventos con campos obligatorios faltantes', async () => {
    const response = await request(app)
        .post('/eventos')
        .send({
            proyecto_id: 1,
            tipo: 'CLIMA'
        });

    expect(response.status).to.equal(400);
    expect(response.body.error).to.equal('Faltan campos obligatorios');
});

it('POST /eventos debe rechazar un tipo de evento no válido', async () => {
    const response = await request(app)
        .post('/eventos')
        .send({
            proyecto_id: 1,
            tipo: 'TIPO_INVENTADO',
            descripcion: 'Evento utilizado para prueba automatizada',
            fecha_inicio: '2026-09-24',
            registrado_por: 'Prueba automatizada'
        });

    expect(response.status).to.equal(400);
    expect(response.body.error).to.equal('Tipo de evento no válido');
});

it('POST /eventos debe rechazar una fecha de inicio inválida', async () => {
    const response = await request(app)
        .post('/eventos')
        .send({
            proyecto_id: 1,
            tipo: 'CLIMA',
            descripcion: 'Evento utilizado para prueba de fecha',
            fecha_inicio: 'fecha-invalida',
            registrado_por: 'Prueba automatizada'
        });

    expect(response.status).to.equal(400);
    expect(response.body.error).to.equal(
        'fecha_inicio no tiene un formato de fecha válido'
    );
});

it('POST /eventos debe rechazar un costo observado negativo', async () => {
    const response = await request(app)
        .post('/eventos')
        .send({
            proyecto_id: 1,
            tipo: 'MAQUINARIA',
            descripcion: 'Evento utilizado para prueba de costo',
            fecha_inicio: '2026-09-24',
            costo_observado: -500,
            registrado_por: 'Prueba automatizada'
        });

    expect(response.status).to.equal(400);
    expect(response.body.error).to.equal(
        'costo_observado no puede ser negativo'
    );
});

});