function autenticar(service) {
    return async (req, res, next) => {
        res.set('Cache-Control', 'no-store');
        const header = req.get('Authorization') || '';
        const match = /^Bearer ([^\s]+)$/i.exec(header);
        if (!match) {
            return res.status(401).set('WWW-Authenticate', 'Bearer').json({ error: 'Autenticación requerida' });
        }
        try {
            const user = await service.authenticate(match[1]);
            if (!user) return res.status(401).set('WWW-Authenticate', 'Bearer').json({ error: 'Token inválido o vencido' });
            req.user = user;
            next();
        } catch {
            // Do not log database errors: drivers may embed SQL or credentials.
            res.status(503).json({ error: 'Autenticación no disponible' });
        }
    };
}
module.exports = { autenticar };
