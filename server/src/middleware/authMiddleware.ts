import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/tokens.js";

export interface AuthedRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or malformed access token" });
  }

  const token = header.split(" ")[1];
  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.userId;
    return next();
  } catch {
    // Expired/invalid access token — client should call /api/auth/refresh and retry
    return res.status(401).json({ message: "Access token is invalid or expired" });
  }
}
