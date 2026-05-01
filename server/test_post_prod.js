const https = require('https');

const data = JSON.stringify({
  riderId: '3781faec-0875-4a1b-941e-8fc897497e39',
  pickupAddress: 'Test Pickup',
  dropoffAddress: 'Test Dropoff',
  pickupAt: new Date(Date.now() + 86400000).toISOString(),
  passengers: 5,
  luggage: 4
});

const options = {
  hostname: 'uto-production.up.railway.app',
  port: 443,
  path: '/api/later-bookings',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', d => process.stdout.write(d));
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
