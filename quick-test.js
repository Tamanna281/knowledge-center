// quick-test.js
const http = require('http');

const data = JSON.stringify({
    question: 'Which product sold the most?'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/intent/extract',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

console.log('🚀 Sending request to http://localhost:3000/api/intent/extract');

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers)}`);

    let body = '';

    res.on('data', (chunk) => {
        body += chunk;
    });

    res.on('end', () => {
        console.log('\n📦 Response Body:');
        try {
            const parsed = JSON.parse(body);
            console.log(JSON.stringify(parsed, null, 2));
        } catch (e) {
            console.log(body);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request error:', error);
});

req.write(data);
req.end();
