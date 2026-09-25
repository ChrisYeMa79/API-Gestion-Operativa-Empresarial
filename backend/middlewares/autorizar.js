const { ROLES } = require('../services/auth.service');
function autorizar(...roles) {
    if (!roles.length || roles.some(role => !ROLES.includes(role))) {
        throw new Error('Rol de autorización no válido');
    }
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Autenticación requerida' });
        if (!roles.includes(req.user.rol)) return res.status(403).json({ error: 'Permisos insuficientes' });
        next();
    };
}
module.exports = { autorizar };
