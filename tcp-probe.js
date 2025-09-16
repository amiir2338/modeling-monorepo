const net = require('net');
const client = new net.Socket();
client.setTimeout(3000);
client.on('connect', () => { console.log('TCP CONNECTED'); client.destroy(); process.exit(0); });
client.on('timeout', () => { console.error('TCP TIMEOUT'); client.destroy(); process.exit(2); });
client.on('error', (e) => { console.error('TCP ERROR', e.message); process.exit(3); });
client.connect(4000, '127.0.0.1');
