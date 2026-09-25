const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createAuthRouter } = require('../routes/auth.routes');
const { createAuthService } = require('../services/auth.service');
const { hashPassword } = require('../services/passwords');
const { getAuthConfig } = require('../config/auth');
const { autenticar } = require('../middlewares/autenticar');
const { autorizar } = require('../middlewares/autorizar');
const { createUsuariosRepository } = require('../repositories/usuarios.repository');
const { resetAdmin } = require('../scripts/restablecer-admin');

describe('Autenticación aislada (sin MySQL)', function () {
    this.timeout(15000);
    let password, hash, config, user, app, repository, service;
    before(async () => {
        password = randomBytes(32).toString('hex');
        hash = await hashPassword(password);
        config = getAuthConfig({ JWT_SECRET: randomBytes(32).toString('hex') });
    });
    beforeEach(() => {
        user = { id: 1, nombre: 'Cuenta de prueba', correo: 'cuenta@example.invalid',
            password_hash: hash, rol: 'ADMIN', estado: 'ACTIVO', token_version: 0 };
        repository = {
            async findByCorreo(correo) { return user && correo === user.correo ? { ...user } : null; },
            async findById(id) { return user && String(id) === String(user.id) ? { ...user } : null; }
        };
        service = createAuthService({ repository, getConfig: () => config });
        app = express();
        app.use(express.json());
        app.use('/auth', createAuthRouter({ repository, getConfig: () => config }));
        app.get('/admin-test', autenticar(service), autorizar('ADMIN'), (req, res) => res.sendStatus(204));
    });
    const login = () => request(app).post('/auth/login').send({ correo: 'cuenta@example.invalid', password });
    async function token() { const result = await login(); assert.equal(result.status, 200); return result.body.access_token; }
    const me = access => request(app).get('/auth/me').set('Authorization', 'Bearer ' + access);

    it('hash Argon2id y login correcto sin filtrar contraseña/hash', async () => {
        assert.ok(hash.startsWith('$argon2id$'));
        const result = await login();
        assert.equal(result.status, 200);
        assert.equal(result.headers['cache-control'], 'no-store');
        assert.equal(result.body.token_type, 'Bearer');
        assert.equal(result.body.expires_in, 900);
        assert.deepEqual(Object.keys(result.body.usuario).sort(), ['correo','id','nombre','rol']);
        const claims = jwt.verify(result.body.access_token, config.key, { algorithms: ['HS256'] });
        assert.deepEqual(Object.keys(claims).sort(), ['aud','exp','iat','iss','sub','token_version']);
        assert.equal(claims.sub, '1');
    });
    it('contraseña incorrecta: 401 genérico', async () => {
        const result = await request(app).post('/auth/login').send({ correo: user.correo, password: randomBytes(32).toString('hex') });
        assert.equal(result.status, 401);
        assert.deepEqual(result.body, { error: 'Credenciales inválidas' });
    });
    it('usuario inexistente: mismo 401', async () => { user = null; const r = await login(); assert.equal(r.status,401); assert.equal(r.body.error,'Credenciales inválidas'); });
    for (const estado of ['PENDIENTE','INACTIVO']) {
        it('usuario ' + estado + ': mismo 401', async () => { user.estado = estado; const r = await login(); assert.equal(r.status,401); assert.equal(r.body.error,'Credenciales inválidas'); });
    }
    it('hash temporal no válido no permite login', async () => { user.password_hash = randomBytes(12).toString('hex'); await login().expect(401); });
    it('valida cuerpo de login', async () => { await request(app).post('/auth/login').send({ correo: {} }).expect(400); });
    it('token válido permite /me', async () => { const r = await me(await token()).expect(200); assert.equal(r.body.usuario.id,1); assert.equal(r.body.usuario.password_hash,undefined); });
    it('token ausente: 401', async () => { await request(app).get('/auth/me').expect(401); });
    it('token inválido: 401', async () => { await me(randomBytes(32).toString('hex')).expect(401); });
    it('firma de otra clave: 401', async () => {
        const t = jwt.sign({ token_version:0 }, randomBytes(32), { subject:'1', issuer:config.issuer, audience:config.audience, expiresIn:900 });
        await me(t).expect(401);
    });
    for (const [label, override] of [ ['vencido',{expiresIn:-1}], ['emisor incorrecto',{issuer:'otro'}], ['audiencia incorrecta',{audience:'otra'}], ['algoritmo no permitido',{algorithm:'HS384'}] ]) {
        it('rechaza token ' + label, async () => {
            const t = jwt.sign({token_version:0}, config.key, {subject:'1', issuer:config.issuer, audience:config.audience, expiresIn:900, ...override});
            await me(t).expect(401);
        });
    }
    it('rechaza token sin expiración', async () => {
        const t = jwt.sign({token_version:0}, config.key, {subject:'1', issuer:config.issuer, audience:config.audience});
        await me(t).expect(401);
    });
    it('token_version revoca tokens anteriores', async () => { const t = await token(); user.token_version++; await me(t).expect(401); });
    it('desactivar usuario revoca acceso', async () => { const t = await token(); user.estado = 'INACTIVO'; await me(t).expect(401); });
    it('eliminar usuario revoca acceso', async () => { const t = await token(); user = null; await me(t).expect(401); });
    it('ADMIN autorizado; SUPERVISOR recibe 403 y mantiene /me', async () => {
        const t = await token();
        await request(app).get('/admin-test').set('Authorization','Bearer ' + t).expect(204);
        user.rol = 'SUPERVISOR';
        await request(app).get('/admin-test').set('Authorization','Bearer ' + t).expect(403);
        const result = await me(t).expect(200);
        assert.equal(result.body.usuario.rol,'SUPERVISOR');
        await login().expect(200);
    });
    it('rol desconocido denegado', async () => { user.rol = 'RESPONSABLE'; await login().expect(401); assert.throws(() => autorizar('RESPONSABLE')); });
    it('configuración ausente falla cerrada', async () => { assert.throws(() => getAuthConfig({})); assert.throws(() => getAuthConfig({JWT_SECRET:randomBytes(8).toString('hex')})); });
    it('fallo de repositorio: 503 sin detalles internos', async () => {
        const t = await token();
        repository.findById = async () => { throw new Error('detalle interno'); };
        const r = await me(t).expect(503);
        assert.deepEqual(r.body,{error:'Autenticación no disponible'});
        repository.findByCorreo = repository.findById;
        await login().expect(503);
    });
    it('limitador específico de login', async () => {
        for (let k=0;k<10;k++) await request(app).post('/auth/login').send({}).expect(400);
        await request(app).post('/auth/login').send({}).expect(429);
    });
    it('repositorio parametriza correo e ID y solo lee', async () => {
        const calls=[];
        const repo=createUsuariosRepository({async execute(sql,params){calls.push({sql,params});return [[{id:1}]];}});
        const correo=randomBytes(8).toString('hex') + "'@example.invalid";
        await repo.findByCorreo(correo); await repo.findById('1');
        assert.deepEqual(calls[0].params,[correo]);
        assert.ok(!calls[0].sql.includes(correo));
        assert.ok(calls.every(c=>c.sql.startsWith('SELECT ')));
        assert.ok(!calls[1].sql.includes('password_hash'));
    });
    it('restablecimiento: guardia de ADMIN ACTIVO y revocación, con pool simulado', async () => {
        let call;
        await resetAdmin({async execute(sql,params){call={sql,params};return [{affectedRows:1}];}},hash);
        assert.ok(call.sql.includes("WHERE id = 1 AND rol = 'ADMIN' AND estado = 'ACTIVO'"));
        assert.ok(call.sql.includes('token_version = token_version + 1'));
        assert.equal(call.params.length,1);
        assert.ok(call.params[0] === hash);
        await assert.rejects(resetAdmin({async execute(){return [{affectedRows:0}];}},hash));
    });
});
