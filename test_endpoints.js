const http = require('http');

function postJson(urlPath, data, token = null) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: urlPath,
      method: 'POST',
      headers
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(payload);
    req.end();
  });
}

function getJson(urlPath, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: urlPath,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING SINGLE-PASSWORD AUTH VERIFICATION TESTS ---');
  try {
    // 1. Test Incorrect Login Password
    console.log('\n1. Testing Login with Incorrect Password...');
    const r1 = await postJson('/api/auth/login', { password: 'wrongPassword' });
    console.log('Status:', r1.status);
    console.log('Response:', r1.data);
    if (r1.status !== 400) {
      throw new Error('Should have failed login with wrong password.');
    }
    
    // 2. Test Correct Login Password
    console.log('\n2. Testing Login with Correct Password ("Admin123")...');
    const r2 = await postJson('/api/auth/login', { password: 'Admin123' });
    console.log('Status:', r2.status);
    console.log('Response User:', r2.data.user);
    if (r2.status !== 200 || !r2.data.token) {
      throw new Error('Should have successfully logged in.');
    }
    const token = r2.data.token;
    
    // 3. Test Profile Fetching
    console.log('\n3. Testing Fetch Profile...');
    const r3 = await getJson('/api/auth/profile', token);
    console.log('Status:', r3.status);
    console.log('Profile User:', r3.data.user);
    if (r3.status !== 200) {
      throw new Error('Failed to fetch profile.');
    }

    // 4. Test Create Conversation
    console.log('\n4. Testing Create Conversation...');
    const r4 = await postJson('/api/chat/conversations', { title: 'Security Audits' }, token);
    console.log('Status:', r4.status);
    console.log('Conversation:', r4.data.conversation);
    const convId = r4.data.conversation.id;

    // 5. Test Send Message to AI (Simulation Mode)
    console.log('\n5. Testing Send Message (Simulation Mode)...');
    const r5 = await postJson(`/api/chat/conversations/${convId}/messages`, {
      content: 'verify connection failsafes',
      model: 'gpt-3.5-turbo'
    }, token);
    console.log('Status:', r5.status);
    console.log('AI Response (truncated):', r5.data.message.content.substring(0, 100) + '...');
    console.log('Stats:', r5.data.stats);

    // 6. Test Fetch Analytics
    console.log('\n6. Testing Fetch Analytics Stats...');
    const r6 = await getJson('/api/analytics/stats', token);
    console.log('Status:', r6.status);
    console.log('Statistics:', r6.data);

    console.log('\n--- ALL NEW AUTH SCHEME API TESTS PASSED SUCCESSFULLY ---');
  } catch (e) {
    console.error('Test run error:', e);
    process.exit(1);
  }
}

runTests();
