const argon2 = require('argon2');
const { randomBytes } = require('node:crypto');

const options = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };
const hashPassword = password => argon2.hash(password, options);
let dummyHash;
function getDummyHash() {
    if (!dummyHash) dummyHash = hashPassword(randomBytes(32).toString('hex'));
    return dummyHash;
}
async function verifyPassword(hash, password) {
    if (typeof hash !== 'string' || !hash.startsWith('$argon2id$')) {
        await argon2.verify(await getDummyHash(), password);
        return false;
    }
    try {
        return await argon2.verify(hash, password);
    } catch {
        await argon2.verify(await getDummyHash(), password);
        return false;
    }
}
module.exports = { hashPassword, verifyPassword };
