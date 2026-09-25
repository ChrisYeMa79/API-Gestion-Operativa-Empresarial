const express = require('express');
const rateLimit = require('express-rate-limit');
const { createAuthService } = require('../services/auth.service');
const { autenticar } = require('../middlewares/autenticar');
const { autorizar } = require('../middlewares/autorizar');

function createAuthRouter({ repository, getConfig }) {
    const router = express.Router();
    const service = createAuthService({ repository, getConfig });
    const loginLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, limit: 10,
        standardHeaders: 'draft-8', legacyHeaders: false,
        message: { error: 'Demasiados intentos de login. Intenta más tarde.' }
    });
    router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
    router.post('/login', loginLimiter, async (req, res) => {
        const { correo, password } = req.body || {};
        if (typeof correo !== 'string' || !correo.trim() || correo.trim().length > 150 ||
            typeof password !== 'string' || password.length === 0 || Buffer.byteLength(password, 'utf8') > 1024) {
            return res.status(400).json({ error: 'correo y password son obligatorios y deben tener un formato válido' });
        }
        try {
            const result = await service.login(correo.trim(), password);
            if (!result) return res.status(401).json({ error: 'Credenciales inválidas' });
            res.json(result);
        } catch {
            res.status(503).json({ error: 'Autenticación no disponible' });
        }
    });
    router.get('/me', autenticar(service), autorizar('ADMIN', 'SUPERVISOR'), (req, res) => {
        res.json({ usuario: req.user });
    });
    return router;
}
module.exports = { createAuthRouter };
