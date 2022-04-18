import app, { redis } from './app';

const port = process.env.PORT || 3000;

redis.connect();

app.listen(port, () => {
  console.log(`Listening on port ${port}`); // eslint-disable-line no-console
});
