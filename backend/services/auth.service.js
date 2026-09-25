const jwt = require('jsonwebtoken');
const { verifyPassword } = require('./passwords');
const ROLES = Object.freeze(['ADMIN', 'SUPERVISOR']);
function publicUser(user) {
    return { id: user.id, nombre: user.nombre, correo: user.correo, rol: user.rol };
}
function createAuthService({ repository, getConfig }) {
    return {
        async login(correo, password) {
            const config = getConfig();
            const user = await repository.findByCorreo(correo);
            const matches = await verifyPassword(user && user.password_hash, password);
            if (!matches || !user || user.estado !== 'ACTIVO' || !ROLES.includes(user.rol) ||
                !Number.isInteger(user.token_version) || user.token_version < 0) return null;
            const access_token = jwt.sign({ token_version: user.token_version }, config.key, {
                algorithm: 'HS256', subject: String(user.id),
                issuer: config.issuer, audience: config.audience, expiresIn: config.expiresIn
            });
            return { access_token, token_type: 'Bearer', expires_in: config.expiresIn, usuario: publicUser(user) };
        },
        async authenticate(token) {
            const config = getConfig();
            let claims;
            try {
                claims = jwt.verify(token, config.key, {
                    algorithms: ['HS256'], issuer: config.issuer, audience: config.audience
                });
            } catch {
                return null;
            }
            if (!claims || typeof claims !== 'object' ||
                !/^[1-9][0-9]*$/.test(claims.sub || '') ||
                !Number.isSafeInteger(Number(claims.sub)) ||
                !Number.isInteger(claims.exp) || !Number.isInteger(claims.iat) ||
                !Number.isInteger(claims.token_version) || claims.token_version < 0) return null;
            const user = await repository.findById(claims.sub);
            if (!user || user.estado !== 'ACTIVO' || !ROLES.includes(user.rol) ||
                user.token_version !== claims.token_version) return null;
            return publicUser(user);
        }
    };
}
module.exports = { createAuthService, ROLES };
