const express = require('express');
const { createClient } = require('redis');

const port = 3000;
const namespace = 'exlg';
const key = 'badge';

const app = express();
const client = createClient();

client.on('error', (err) => {
  console.error('Redis Client Error', err); // eslint-disable-line no-console
});
client.connect();

app.use(express.json());

app.get('/get', async (req, res) => {
  const q = await client.mGet(
    req.body.map((k) => `${namespace}:${k}:${key}`),
  );
  res.send(
    Object.fromEntries(
      req.body.map((k, i) => [k, q[i]]),
    ),
  );
});

app.get('/set', async (req, res) => {
  await client.mSet(
    Object.keys(req.body).map((k) => [`${namespace}:${k}:${key}`, req.body[k]]),
  );
  res.send(req.body);
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`); // eslint-disable-line no-console
});
