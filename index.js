const express = require('express');
const { createClient } = require('redis');

const app = express();
const client = createClient();
const port = 3000;

client.on('error', (err) => console.error('Redis Client Error', err)); // eslint-disable-line no-console
client.connect();

app.use(express.json());

app.get('/get', async (req, res) => {
  const q = await Promise.all(req.body.map((key) => client.get(key)));
  res.send(Object.assign(...req.body.map((key, i) => ({ [key]: q[i] }))));
});

app.get('/set', (req, res) => {
  Object.entries(req.body).forEach(([key, value]) => {
    client.set(key, value);
  });
  res.send(req.body);
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`); // eslint-disable-line no-console
});
