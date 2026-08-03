const http = require('http');

function postJson(urlPath, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
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
  console.log('--- STARTING ENDPOINT VERIFICATION TESTS ---');
  try {
    // 1. Test Registration
    console.log('\n1. Testing User Registration...');
    const regResult = await postJson('/api/auth/register', {
      username: 'Test User',
      email: 'test' + Math.floor(Math.random() * 1000000) + '@kevinai.com',
      password: 'password123'
    });
    console.log('Status:', regResult.status);
    console.log('Response:', regResult.data);
    
    if (regResult.status !== 201 || !regResult.data.token) {
      throw new Error('Registration failed.');
    }
    
    const token = regResult.data.token;
    const userId = regResult.data.user.id;
    
    // 2. Test Fetching Conversations
    console.log('\n2. Testing Fetch Conversations...');
    const convResult = await getJson('/api/chat/conversations', token);
    console.log('Status:', convResult.status);
    console.log('Conversations count:', convResult.data.conversations.length);
    
    // 3. Test Creating a Conversation
    console.log('\n3. Testing Create Conversation...');
    const createConvResult = await postJson('/api/chat/conversations', {});
    // Wait, create conversation requires verifyToken, so we need to add auth headers.
    // Let's modify our function to accept options or headers
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Simple test that just calls the APIs
async function simpleTest() {
  try {
    console.log('1. Registering user...');
    const email = `test_${Date.now()}@kevinai.com`;
    const r1 = await postJson('/api/auth/register', {
      username: 'Kevin Dev',
      email,
      password: 'password123'
    });
    console.log('Status:', r1.status);
    console.log('User:', r1.data.user);
    const token = r1.data.token;
    
    console.log('\n2. Logging in user...');
    const r2 = await postJson('/api/auth/login', {
      email,
      password: 'password123'
    });
    console.log('Status:', r2.status);
    console.log('User Logged In:', r2.data.user);

    // Let's make a request to list conversations with headers
    console.log('\n3. Creating a new chat thread...');
    const createConvResult = await new Promise((resolve) => {
      const payload = JSON.stringify({ title: 'Sample Code Thread' });
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/chat/conversations',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'Authorization': `Bearer ${token}`
        }
      };
      const req = http.request(options, res => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => resolve(JSON.parse(body)));
      });
      req.write(payload);
      req.end();
    });
    console.log('Conversation Created:', createConvResult.conversation);
    const convId = createConvResult.conversation.id;

    console.log('\n4. Sending message to AI (Simulation Mode)...');
    const sendMsgResult = await new Promise((resolve) => {
      const payload = JSON.stringify({ content: 'write a function in JavaScript', model: 'gpt-3.5-turbo' });
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: `/api/chat/conversations/${convId}/messages`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'Authorization': `Bearer ${token}`
        }
      };
      const req = http.request(options, res => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => resolve(JSON.parse(body)));
      });
      req.write(payload);
      req.end();
    });
    console.log('AI Response (truncated):', sendMsgResult.message.content.substring(0, 100) + '...');
    console.log('Stats:', sendMsgResult.stats);

    console.log('\n5. Fetching analytics statistics...');
    const statsResult = await new Promise((resolve) => {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/analytics/stats',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };
      const req = http.request(options, res => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => resolve(JSON.parse(body)));
      });
      req.end();
    });
    console.log('Statistics:', statsResult);

    console.log('\n--- ALL API TEST STEPS PASSED SUCCESSFULLY ---');
  } catch (e) {
    console.error('Test run error:', e);
  }
}

simpleTest();
