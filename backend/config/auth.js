function getAuthConfig(env = process.env) {
    // Fail closed only for auth requests; legacy routes remain available.
    if (!/^[a-fA-F0-9]{64}$/.test(env.JWT_SECRET || '')) {
        throw new Error('AUTH_CONFIG');
    }
    return {
        key: Buffer.from(env.JWT_SECRET, 'hex'),
        issuer: 'gestion-operativa-api',
        audience: 'gestion-operativa-client',
        expiresIn: 900
    };
}
module.exports = { getAuthConfig };
