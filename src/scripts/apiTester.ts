/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
// FILE: src/scripts/apiTester.ts
// DESC: Dynamic CLI utility to test API endpoints using system curl.
// USAGE: npx ts-node src/scripts/apiTester.ts -m POST -u /admin/auth/login -d '{"email":"admin@bionix.com", "password":"..."}'

import { execSync } from 'child_process';

const BASE_URL = 'http://localhost:5000/api/v1';

// ADMIN LOGIN CREDENTIALS
// {
// "email":"admin@alltechtamil.com",
// "password":"Admin@123"
// }

function run() {
  const args = process.argv.slice(2);
  const params: Record<string, string> = {};

  // 1. Parse CLI Arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-m' || args[i] === '--method') params.method = args[++i];
    if (args[i] === '-u' || args[i] === '--url') params.url = args[++i];
    if (args[i] === '-d' || args[i] === '--data') params.data = args[++i];
    if (args[i] === '-t' || args[i] === '--token') params.token = args[++i];
  }

  const method = (params.method || 'GET').toUpperCase();
  let url = params.url || '/health';
  if (!url.startsWith('http')) {
    url = `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  // 2. Build Curl Command
  let curlCmd = `curl -s -w "\\n%{http_code}" -X ${method} "${url}"`;
  curlCmd += ` -H "Content-Type: application/json"`;

  if (params.token) {
    curlCmd += ` -H "Authorization: Bearer ${params.token}"`;
  }

  if (params.data && method !== 'GET' && method !== 'HEAD') {
    // Escape single quotes in data
    const escapedData = params.data.replace(/'/g, "'\\''");
    curlCmd += ` -d '${escapedData}'`;
  }

  console.log(`\n🚀 [TESTING] ${method} ${url}`);

  try {
    const startTime = Date.now();
    const output = execSync(curlCmd).toString();
    const duration = Date.now() - startTime;

    const lines = output.trim().split('\n');
    const statusCode = lines.pop();
    const responseBody = lines.join('\n');

    const statusColor = parseInt(statusCode || '0') < 400 ? '\x1b[32m' : '\x1b[31m';
    const resetColor = '\x1b[0m';

    console.log(`\n⏱️  [DURATION] ${duration}ms`);
    console.log(`📊 [STATUS] ${statusColor}${statusCode}${resetColor}`);

    try {
      const json = JSON.parse(responseBody);
      console.log(`✨ [RESPONSE]\n${JSON.stringify(json, null, 2)}`);
    } catch {
      console.log(`📄 [RESPONSE]\n${responseBody}`);
    }
  } catch (error: any) {
    console.error(`\n❌ [ERROR] ${error.message}`);
  }
}

run();
