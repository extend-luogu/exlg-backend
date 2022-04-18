import supertest from 'supertest';
import _axios from 'axios';
import { customAlphabet, nanoid } from 'nanoid/non-secure';
import app, { redis, namespace } from '../app';

const db = 1;
const uid = 108135; const blacklisted = 224978;
const activation = nanoid();

jest.mock('axios');
const axios = _axios as jest.Mocked<typeof _axios>;

beforeAll(async () => {
  await redis.connect();
  await redis.select(db);
  await redis.flushDb();
  await redis.rPush(`${namespace}:activation`, activation);
  await redis.set(`${namespace}:${blacklisted}:blacklisted`, 'true');
});

const request = supertest(app);

const pasteId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8);
const paste200 = (data: string, _uid: number | string = uid) => ({
  data: {
    code: 200,
    currentTemplate: 'PasteShow',
    currentData: {
      paste: {
        data,
        user: {
          uid: _uid,
          name: 'wangxinhe',
        },
        time: Math.floor(Date.now() / 1000),
        public: true,
      },
    },
    currentTime: Math.floor(Date.now() / 1000),
  },
});
const paste404 = () => ({
  data: {
    code: 404,
    currentTemplate: 'InternalError',
    currentData: {
      errorType: 'LuoguFramework\\HttpFoundation\\Controller\\Exception\\HttpException\\NotFoundHttpException',
      errorMessage: '剪贴板内容未找到',
      errorTrace: '',
    },
    currentTime: Math.floor(Date.now() / 1000),
  },
});

const badge = (text: string = 'wxh', fg: string = 'ghostwhite') => ({
  text,
  bg: 'deepskyblue',
  fg,
});

const generateToken = () => request.get('/token/generate');

const verifyToken = async (_uid: number | string = uid) => {
  axios.get.mockResolvedValue(paste200((await generateToken()).body.data, _uid));
  return request.get(`/token/verify/${pasteId()}`);
};

test('Token generation', async () => {
  const response = await generateToken();
  expect(response.statusCode).toBe(200);
  expect(response.body.status).toBe(200);
  expect(response.body.data).toHaveLength(21);
});

test('Invalid paste ID', async () => {
  const response = await request.get(`/token/verify/${pasteId(9)}`);
  expect(response.statusCode).toBe(422);
  expect(response.body.status).toBe(422);
});
test('Paste 404', async () => {
  axios.get.mockResolvedValue(paste404());
  const response = await request.get(`/token/verify/${pasteId()}`);
  expect(response.statusCode).toBe(401);
  expect(response.body.status).toBe(401);
});
test('Failing token verification', async () => {
  axios.get.mockResolvedValue(paste200(''));
  const response = await request.get(`/token/verify/${pasteId()}`);
  expect(response.statusCode).toBe(403);
  expect(response.body.status).toBe(403);
});
test('Token verification', async () => {
  const response = await verifyToken();
  expect(response.statusCode).toBe(200);
  expect(response.body.status).toBe(200);
});

test('Token TTL', async () => {
  const response = await request.post('/token/ttl').send({ uid, token: (await verifyToken()).body.data.token });
  expect(response.statusCode).toBe(200);
  expect(response.body.status).toBe(200);
  expect(response.body.data).toBeGreaterThan(0);
});
test('401 Paste not found', async () => {
  const response = await request.post('/token/ttl').send({ uid, token: nanoid() });
  expect(response.statusCode).toBe(401);
  expect(response.body.status).toBe(401);
});

test('Failing activation', async () => {
  const response = await request.post('/badge/set').send({
    uid,
    token: (await verifyToken()).body.data.token,
    data: badge(),
  });
  expect(response.statusCode).toBe(402);
  expect(response.body.status).toBe(402);
});
test('Invalid badge', async () => {
  const response = await request.post('/badge/set').send({
    uid,
    token: (await verifyToken()).body.data.token,
    data: badge('wxh wxh wxh wxh wxh', 'goatwhite'),
  });
  expect(response.statusCode).toBe(422);
  expect(response.body.status).toBe(422);
  expect(response.body.error).toContain('Invalid color');
  expect(response.body.error).toContain('too long');
});
test('Setting badge', async () => {
  expect(await redis.lRange(`${namespace}:activation`, 0, -1)).toContain(activation);
  const response = await request.post('/badge/set').send({
    uid,
    token: (await verifyToken()).body.data.token,
    activation,
    data: badge(),
  });
  expect(response.statusCode).toBe(200);
  expect(response.body.status).toBe(200);
  expect(response.body.data).toMatchObject({ [uid.toString()]: badge() });
  expect(await redis.lRange(`${namespace}:activation`, 0, -1)).toHaveLength(0);
});

test('Getting badges', async () => {
  const response = await request.post('/badge/mget').send({
    uid,
    token: (await verifyToken()).body.data.token,
    data: [uid, blacklisted],
  });
  expect(response.statusCode).toBe(200);
  expect(response.body.status).toBe(200);
  expect(response.body.data).toMatchObject({
    [uid.toString()]: badge(),
    [blacklisted.toString()]: {},
  });
});
test('Blacklisted user', async () => {
  const response = await request.post('/badge/mget').send({
    uid: blacklisted,
    token: (await verifyToken(blacklisted)).body.data.token,
  });
  expect(response.statusCode).toBe(403);
  expect(response.body.status).toBe(403);
});
test('422 Missing data', async () => {
  const response = await request.post('/badge/mget').send({
    uid,
    token: (await verifyToken()).body.data.token,
  });
  expect(response.statusCode).toBe(422);
  expect(response.body.status).toBe(422);
});

afterAll(async () => {
  await redis.flushDb();
  await redis.disconnect();
});
