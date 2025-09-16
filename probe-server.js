const http = require('http');
const options = {
  hostname: '127.0.0.1',
  port: 4000,
  path: '/api/ping',
  method: 'GET',
  timeout: 5000,
};

const req = http.request(options, (res) => {
  console.log('STATUS', res.statusCode);
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('BODY', data);
    process.exit(0);
  });
});
req.on('error', (err) => {
  console.error('ERROR', err.message);
  process.exit(2);
});
req.on('timeout', () => {
  console.error('TIMEOUT');
  req.destroy();
  process.exit(3);
});
req.end();
