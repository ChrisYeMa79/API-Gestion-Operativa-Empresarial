const path = require('node:path');
const readline = require('node:readline');
const { timingSafeEqual } = require('node:crypto');
const { hashPassword } = require('../services/passwords');

// Raw TTY input: passwords never echo; only authorization uses visible input.
function readInput(prompt, visible = false) {
    return new Promise((resolve, reject) => {
        const input = process.stdin;
        let value = '';
        process.stdout.write(prompt);
        readline.emitKeypressEvents(input);
        input.setRawMode(true);
        input.resume();
        function finish(error) {
            input.removeListener('keypress', onKey);
            input.setRawMode(false);
            input.pause();
            process.stdout.write('\n');
            const result = value;
            value = '';
            if (error) reject(error); else resolve(result);
        }
        function onKey(text, key = {}) {
            if (key.ctrl && (key.name === 'c' || key.name === 'd')) return finish(new Error('Cancelado'));
            if (key.name === 'return' || key.name === 'enter') return finish();
            if (key.name === 'backspace') {
                if (visible && value.length > 0) process.stdout.write('\b \b');
                value = Array.from(value).slice(0, -1).join('');
                return;
            }
            if (key.ctrl || key.meta || !text || /[\x00-\x1f\x7f]/.test(text)) return;
            if (Buffer.byteLength(value + text, 'utf8') > 1024) return finish(new Error('Entrada demasiado larga'));
            value += text;
            if (visible) process.stdout.write(text);
        }
        input.on('keypress', onKey);
    });
}

// Dependency injection allows testing the write guard without connecting to MySQL.
async function resetAdmin(pool, hash) {
    const [result] = await pool.execute(
        "UPDATE usuarios SET password_hash = ?, token_version = token_version + 1 WHERE id = 1 AND rol = 'ADMIN' AND estado = 'ACTIVO'",
        [hash]
    );
    if (result.affectedRows !== 1) throw new Error('ADMIN no actualizado');
}

async function main() {
    if (process.argv.length !== 2 || !process.stdin.isTTY || !process.stdout.isTTY) {
        throw new Error('Se requiere terminal interactiva sin argumentos');
    }
    console.log('Se reemplazará la contraseña del ADMIN ACTIVO id 1 en la base configurada en backend/.env.');
    console.log('Se incrementará token_version y se actualizará updated_at. Ctrl+C cancela antes del envío.');
    let password = await readInput('Nueva contraseña (15 caracteres mínimo, sin eco): ');
    let confirmation = await readInput('Repite la contraseña (sin eco): ');
    if (Array.from(password).length < 15 || Buffer.byteLength(password, 'utf8') > 1024) {
        throw new Error('Longitud inválida');
    }
    const a = Buffer.from(password, 'utf8');
    const b = Buffer.from(confirmation, 'utf8');
    const matches = a.length === b.length && timingSafeEqual(a, b);
    a.fill(0); b.fill(0); confirmation = '';
    if (!matches) throw new Error('Las entradas no coinciden');
    const approval = await readInput('Escribe RESTABLECER ADMIN 1 para autorizar la escritura: ', true);
    if (approval !== 'RESTABLECER ADMIN 1') {
        const error = new Error('Frase de autorización incorrecta');
        error.code = 'AUTHORIZATION_PHRASE_MISMATCH';
        throw error;
    }
    const hash = await hashPassword(password);
    password = '';
    require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
    const pool = require('../config/db');
    try {
        await resetAdmin(pool, hash);
        console.log('Contraseña actualizada; tokens anteriores invalidados.');
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    main().catch((error) => {
        // Never print the original error: mysql2 errors can contain the hash/SQL.
        if (error.code === 'AUTHORIZATION_PHRASE_MISMATCH') {
            console.error('La frase de autorización fue incorrecta. Debes escribir exactamente RESTABLECER ADMIN 1. No se realizó el restablecimiento.');
        } else {
            console.error('No se completó el restablecimiento. Revisa los requisitos y el estado de la cuenta antes de reintentar.');
        }
        process.exitCode = 1;
    });
}
module.exports = { resetAdmin };
