const { exec } = require('child_process');
const http = require('http');

const server = exec('PORT=5001 npx ts-node src/server.ts');

setTimeout(async () => {
  try {
    function makeRequest(method, path, body = null) {
      return new Promise((resolve) => {
        const req = http.request({ hostname: 'localhost', port: 5001, path, method, headers: { 'Content-Type': 'application/json' } }, (res) => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => resolve({ statusCode: res.statusCode, data: JSON.parse(data) }));
        });
        if (body) req.write(JSON.stringify(body));
        req.end();
      });
    }

    console.log('--- VERIFYING PUBLIC ROUTES (Should be 200) ---');
    let res = await makeRequest('GET', '/api/v1/public/categories');
    console.log('GET /api/v1/public/categories -> Status:', res.statusCode);
    
    res = await makeRequest('POST', '/api/v1/public/analytics/track/view', {
      blog_id: "9dd47567-a479-4d48-b256-8fea92913307", read_time_sec: 10, is_bounce: false
    });
    console.log('POST /api/v1/public/analytics/track/view -> Status:', res.statusCode);

    console.log('\n--- VERIFYING ADMIN ROUTES (Should be 401) ---');
    res = await makeRequest('GET', '/api/v1/admin/categories');
    console.log('GET /api/v1/admin/categories -> Status:', res.statusCode, 'Message:', res.data.message);

    res = await makeRequest('GET', '/api/v1/admin/analytics/overview');
    console.log('GET /api/v1/admin/analytics/overview -> Status:', res.statusCode, 'Message:', res.data.message);
  } finally {
    server.kill();
  }
}, 5000); // Wait 5s for server to boot
