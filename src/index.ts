import express from 'express';
import axios from 'axios';
import { nanoid } from 'nanoid';
import { createClient } from 'redis';

type Paste = import('luogu-api-docs/luogu-api').Paste;
type PasteDataResponse = import('luogu-api-docs/luogu-api').DataResponse<{
  paste: Paste, errorMessage: string,
}>;

const namespace = 'exlg';
const trueValue = '\0';
const port = process.env.PORT || 3000;

const app = express();
const redis = createClient();

redis.connect();

app.use(express.json());

const respond = (
  res: express.Response,
  status: number,
  data: string | { [key: string]: any } | undefined,
) => {
  res.status(status).json(
    data ? ({ status, ...(status < 400 ? { data } : { error: data }) }) : { status },
  );
};

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/token/generate/', async (req, res) => {
  const token = nanoid();
  await redis.set(`${namespace}:token:${token}`, trueValue, { EX: 60 });
  respond(res, 200, token);
});

app.get('/token/verify/:paste', async (req, res) => {
  const { paste } = req.params;
  if (!paste.match(/^[0-9a-z]{8}$/)) {
    respond(res, 422, 'Invalid paste ID or URL');
  }
  const response = await axios.get<PasteDataResponse>(
    `https://www.luogu.com.cn/paste/${paste}?_contentOnly`,
  );
  if (response.data.code >= 400) {
    respond(res, 422, response.data.currentData.errorMessage);
  } else {
    const data = response.data.currentData.paste;
    data.data = data.data.trim();
    if (await redis.get(`${namespace}:token:${data.data}`) === trueValue as string) {
      await redis.set(`${namespace}:token:${data.data}`, data.user.uid, { EX: 60 * 60 * 24 * 3 });
      respond(res, 200, { uid: data.user.uid, token: data.data });
    } else {
      respond(res, 403, `Invalid paste content: ${data.data}`);
    }
  }
});

app.post('/badge/mget/', async (req, res) => {
  const uids: Array<string | number> = req.body;
  const badges = await Promise.all(
    uids.map((k) => redis.hGetAll(`${namespace}:${k}:badge`)),
  );
  respond(res, 200, Object.fromEntries(
    uids.map((k, i) => [k, badges[i]]),
  ));
});

app.post(
  '/badge/set/',
  async (req, res, next) => (
    'uid' in req.body && 'token' in req.body
    && (await redis.get(`${namespace}:token:${req.body.token}`) === req.body.uid as string)
      ? next() : respond(res, 403, 'Invalid token')
  ),
  async (req, res, next) => (
    'data' in req.body ? next() : respond(res, 422, 'Missing data')
  ),
  async (req, res) => {
    redis.hSet(
      `${namespace}:${req.body.uid}:badge`,
      'text',
      req.body.data.text,
    );
    respond(res, 200, 'OK');
  },
);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`); // eslint-disable-line no-console
});
