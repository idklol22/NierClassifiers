const crypto = require('crypto');

const key = `ll_live_${crypto.randomBytes(32).toString('base64url')}`;
const hash = crypto.createHash('sha256').update(key).digest('hex');
console.log(`API key (show once):\n${key}\n\nPut only this hash in API_KEY_HASHES:\n${hash}`);
