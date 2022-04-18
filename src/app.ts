import express, { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { nanoid } from 'nanoid/non-secure';
import { createClient } from 'redis';
import validateColor from 'validate-color';
import type {
  PasteDataResponse,
  TokenRequiredRequest, ActivationRequiredRequest,
  TokenTTLRequest, BadgeMGetRequest, BadgeSetRequest,
} from './types';

const namespace = 'exlg';

const app = express();
const redis = createClient();

app.use(express.json());

app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

const respond = (res: Response, status: number, data: string | number | { [key: string]: any }) => {
  res.status(status).json({ status, ...(status < 400 ? { data } : { error: data }) });
};

const tokenReuired = async (req: TokenRequiredRequest, res: Response, next: NextFunction) => {
  if (req.body.uid && req.body.token
    && (await redis.get(`${namespace}:token:${req.body.token}`) === req.body.uid.toString())
  ) {
    if (!(await redis.get(`${namespace}:${req.body.uid}:blacklisted`))) {
      next();
    } else respond(res, 403, "You've been blacklisted! Please contact the admin.");
  } else respond(res, 401, 'Authentication failed');
};

const activationRequired = async (
  req: ActivationRequiredRequest,
  res: Response,
  next: NextFunction,
) => (
  await redis.exists(`${namespace}:${req.body.uid}:badge`)
    || (req.body.activation && await redis.lRem(`${namespace}:activation`, 1, req.body.activation))
    ? next() : respond(res, 402, 'Invalid activation')
);

const dataRequired = (req: Request, res: Response, next: NextFunction) => (
  req.body.data ? next() : respond(res, 422, 'Missing data')
);

app.get('/token/generate', async (_req, res) => {
  const token = nanoid();
  await redis.set(`${namespace}:token:${token}`, '0', { EX: 60 });
  respond(res, 200, token);
});

app.get('/token/verify/:paste', async (req, res) => {
  const { paste } = req.params;
  if (!paste.match(/^[0-9a-z]{8}$/)) {
    respond(res, 422, 'Invalid paste ID or URL');
    return;
  }
  const response = await axios.get<PasteDataResponse>(
    `https://www.luogu.com.cn/paste/${paste}?_contentOnly`,
  );
  if (response.data.code >= 400) {
    respond(res, 401, response.data.currentData.errorMessage);
  } else {
    const data = response.data.currentData.paste;
    data.data = data.data.trim();
    if (await redis.get(`${namespace}:token:${data.data}`) === '0') {
      await redis.set(`${namespace}:token:${data.data}`, data.user.uid, { EX: 60 * 60 * 24 * 3 });
      respond(res, 200, { uid: data.user.uid.toString(), token: data.data });
    } else {
      respond(res, 403, `Invalid paste content: ${data.data}`);
    }
  }
});

app.post('/token/ttl', tokenReuired, async (req: TokenTTLRequest, res) => {
  respond(res, 200, await redis.ttl(`${namespace}:token:${req.body.token}`));
});

app.post('/badge/mget', tokenReuired, dataRequired, async (req: BadgeMGetRequest, res) => {
  const { data: uids } = req.body;
  const badges = await Promise.all(
    uids.map((k) => redis.hGetAll(`${namespace}:${k}:badge`)),
  );
  respond(res, 200, Object.fromEntries(
    uids.map((k, i) => [k, badges[i]]),
  ));
});

app.post('/badge/set', tokenReuired, dataRequired, (req: BadgeSetRequest, res, next) => {
  const error: string[] = [];
  if (req.body.data.text.length > 16) {
    error.push('Badge is too long');
  } if (!validateColor(req.body.data.fg)) {
    error.push('Invalid color');
  }
  if (error.length) {
    respond(res, 422, error.join(', '));
  } else {
    req.body.data.text = req.body.data.text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    next();
  }
}, activationRequired, async (req: BadgeSetRequest, res) => {
  await redis.hSet(`${namespace}:${req.body.uid}:badge`, [
    'text', req.body.data.text.trim(),
    'bg', req.body.data.bg,
    'fg', req.body.data.fg,
    'fw', req.body.data.fw,
    'font', req.body.data.font,
    'border', req.body.data.border,
  ]);
  respond(res, 200, { [req.body.uid.toString()]: req.body.data });
});

export default app;
export { redis, namespace };
