const http = require('http');

const data = JSON.stringify({
  riderId: 'test_user',
  pickupAddress: 'Test Pickup',
  dropoffAddress: 'Test Dropoff',
  pickupAt: new Date(Date.now() + 10000000).toISOString(),
  passengers: 5,
  luggage: 4
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/later-bookings',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', d => process.stdout.write(d));
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
