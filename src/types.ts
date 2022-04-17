import type { Request as _Request } from 'express';
import type { DataResponse, Paste } from 'luogu-api-docs/luogu-api';

export type PasteDataResponse = DataResponse<{
  paste: Paste, errorMessage: string,
}>;

export interface Badge {
  text: string;
  bg: string;
  fg: string;
  fw: string;
  font: string;
  border: string;
}

type UId = number | string;

interface BaseReqBody {
  [key: string]: any;
}

interface DataRequiredReqBody<Data = any> extends BaseReqBody {
  data: Data;
}

interface TokenRequiredReqBody extends BaseReqBody {
  uid: UId,
  token: string,
}

interface ActivationRequiredReqBody extends TokenRequiredReqBody {
  activation?: string;
}

interface Request<ReqBody = BaseReqBody> extends _Request {
  body: ReqBody;
}

export type TokenRequiredRequest = Request<TokenRequiredReqBody>;
export type ActivationRequiredRequest = Request<ActivationRequiredReqBody>;

export type TokenTTLRequest = TokenRequiredRequest;
export type BadgeMGetRequest = Request<TokenRequiredReqBody & DataRequiredReqBody<UId[]>>;
export type BadgeSetRequest = Request<ActivationRequiredReqBody & DataRequiredReqBody<Badge>>;
