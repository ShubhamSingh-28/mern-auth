import jwt, { type SignOptions } from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET as string;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET as string;
const ACCESS_EXPIRY = (process.env.ACCESS_TOKEN_EXPIRY ?? "15m") as SignOptions["expiresIn"];
const REFRESH_EXPIRY = (process.env.REFRESH_TOKEN_EXPIRY ?? "7d") as SignOptions["expiresIn"];

export interface TokenPayload {
  userId: string;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
}

// Refresh tokens are stored hashed in the DB so a leaked database dump
// doesn't hand out usable tokens directly.
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
