import express, { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { nanoid } from 'nanoid';
import { createClient } from 'redis';
import validateColor from 'validate-color';

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
  data: string | number | { [key: string]: any } | undefined,
) => {
  res.status(status).json(
    data ? ({ status, ...(status < 400 ? { data } : { error: data }) }) : { status },
  );
};

const tokenReuired = async (req: Request, res: Response, next: NextFunction) => (
  'uid' in req.body && 'token' in req.body
    && (await redis.get(`${namespace}:token:${req.body.token}`) === req.body.uid.toString())
    ? next() : respond(res, 401, 'Authentication failed')
);

app.get('/token/generate', async (_req, res) => {
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
    respond(res, 401, response.data.currentData.errorMessage);
  } else {
    const data = response.data.currentData.paste;
    data.data = data.data.trim();
    if (await redis.get(`${namespace}:token:${data.data}`) === trueValue.toString()) {
      await redis.set(`${namespace}:token:${data.data}`, data.user.uid, { EX: 60 * 60 * 24 * 3 });
      respond(res, 200, { uid: data.user.uid.toString(), token: data.data });
    } else {
      respond(res, 403, `Invalid paste content: ${data.data}`);
    }
  }
});

app.post('/token/ttl', tokenReuired, async (req, res) => {
  respond(res, 200, await redis.ttl(`${namespace}:token:${req.body.token}`));
});

app.post('/badge/mget', async (req, res) => {
  const uids: Array<string | number> = req.body;
  const badges = await Promise.all(
    uids.map((k) => redis.hGetAll(`${namespace}:${k}:badge`)),
  );
  respond(res, 200, Object.fromEntries(
    uids.map((k, i) => [k, badges[i]]),
  ));
});

app.post('/badge/set', tokenReuired, (req, res, next) => (
  'data' in req.body ? next() : respond(res, 422, 'Missing data')
), (req, res, next) => {
  const error: string[] = [];
  if (req.body.data.text.length > 16) {
    error.push('Badge is too long');
  } if (!validateColor(req.body.data.fg)) {
    error.push('Invalid color');
  }
  if (error.length) {
    respond(res, 422, error.join(', '));
  } else {
    req.body.data.text = req.body.data.text.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    next();
  }
}, async (req, res, next) => (
  await redis.exists(`${namespace}:${req.body.uid}:badge`)
  || ('activation' in req.body
    && await redis.lRem(`${namespace}:activation`, 1, req.body.activation)
  ) ? next() : respond(res, 402, 'Invalid activation')
), async (req, res) => {
  await redis.hSet(
    `${namespace}:${req.body.uid}:badge`,
    ['text', req.body.data.text,
      'bg', req.body.data.bg,
      'fg', req.body.data.fg],
  );
  respond(res, 200, { [req.body.uid.toString()]: req.body.data });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`); // eslint-disable-line no-console
});
