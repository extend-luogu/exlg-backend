import EXLG from './app';

const port = process.env.PORT || 3000;

const { app, redis } = new EXLG();

redis.connect();

app.listen(port, () => {
  console.log(`Listening on port ${port}`); // eslint-disable-line no-console
});
