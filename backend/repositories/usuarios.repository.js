function createUsuariosRepository(pool) {
    return {
        async findByCorreo(correo) {
            const [rows] = await pool.execute(
                'SELECT id, nombre, correo, password_hash, rol, estado, token_version FROM usuarios WHERE correo = ? LIMIT 1',
                [correo]
            );
            return rows[0] || null;
        },
        async findById(id) {
            const [rows] = await pool.execute(
                'SELECT id, nombre, correo, rol, estado, token_version FROM usuarios WHERE id = ? LIMIT 1',
                [id]
            );
            return rows[0] || null;
        }
    };
}
module.exports = { createUsuariosRepository };
