const http = require('http');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', (err) => reject(err));
    if (body) req.write(body);
    req.end();
  });
}

async function run() {
  const json = JSON.stringify({ email: 'client@example.com', password: 'client123' });
  const tests = [
    { host: '127.0.0.1', port: 4000, method: 'POST', path: '/api/v1/auth/login', name: 'backend-login' },
    { host: '127.0.0.1', port: 3000, method: 'POST', path: '/api/v1/auth/login', name: 'proxy-login' },
    { host: '127.0.0.1', port: 4000, method: 'GET', path: '/api/v1/jobs/my?page=1&limit=10', name: 'backend-jobs-my' },
    { host: '127.0.0.1', port: 3000, method: 'GET', path: '/api/v1/jobs/my?page=1&limit=10', name: 'proxy-jobs-my' },
  ];

  for (const t of tests) {
    try {
      console.log('\n==> ' + t.name + ' ' + t.method + ' http://' + t.host + ':' + t.port + t.path);
      const res = await request({ host: t.host, port: t.port, method: t.method, path: t.path, headers: { 'Content-Type': 'application/json', 'Content-Length': t.method === 'POST' ? Buffer.byteLength(json) : 0 } }, t.method === 'POST' ? json : null);
      console.log('STATUS:', res.statusCode);
      console.log('HEADERS:', res.headers['content-type'] || '');
      console.log('BODY:', res.body.substring(0, 2000));
    } catch (err) {
      console.error('ERROR:', err.message);
    }
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
