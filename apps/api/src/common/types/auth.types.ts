import { Request } from 'express';

/** Claims carried by both the access token and the passport-validated request user. */
export interface JwtPayload {
  sub: string;
  businessId: string | null;
  role: string | null;
}

export interface RequestWithUser extends Request {
  user: JwtPayload;
}
