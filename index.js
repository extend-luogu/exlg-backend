const express = require('express');
const { createClient } = require('redis');

const port = 3000;
const namespace = 'exlg';
const key = 'badge';

const app = express();
const client = createClient();

const dict = (keys, values) => Object.assign(...keys.map((k, i) => ({ [k]: values[i] })));

client.on('error', (err) => console.error('Redis Client Error', err)); // eslint-disable-line no-console
client.connect();

app.use(express.json());

app.get('/get', async (req, res) => {
  res.send(dict(req.body, await client.mGet(req.body.map((k) => `${namespace}:${k}:${key}`))));
});

app.get('/set', async (req, res) => {
  await client.mSet(dict(Object.keys(req.body).map((k) => `${namespace}:${k}:${key}`), Object.values(req.body)));
  res.send(req.body);
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`); // eslint-disable-line no-console
});
