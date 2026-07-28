import type { Request, Response } from "express";
import { User } from "../models/User.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} from "../utils/tokens.js";

const REFRESH_COOKIE_NAME = "refreshToken";

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function signup(req: Request, res: Response) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const user = await User.create({ name, email, password });

    const accessToken = signAccessToken({ userId: user._id.toString() });
    const refreshToken = signRefreshToken({ userId: user._id.toString() });

    user.refreshTokens.push(hashToken(refreshToken));
    await user.save();

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
    return res.status(201).json({
      accessToken,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ message: "Something went wrong during signup" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const accessToken = signAccessToken({ userId: user._id.toString() });
    const refreshToken = signRefreshToken({ userId: user._id.toString() });

    user.refreshTokens.push(hashToken(refreshToken));
    await user.save();

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
    return res.status(200).json({
      accessToken,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Something went wrong during login" });
  }
}

// Reads the refresh cookie, verifies it against the DB, rotates it (issues a new
// refresh token and invalidates the old one), and issues a fresh access token.
export async function refresh(req: Request, res: Response) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      return res.status(403).json({ message: "Refresh token is invalid or expired" });
    }

    const user = await User.findById(payload.userId);
    const hashed = hashToken(token);
    if (!user || !user.refreshTokens.includes(hashed)) {
      return res.status(403).json({ message: "Refresh token is invalid or was already used" });
    }

    // Rotate: remove the used token, issue and store a new one
    user.refreshTokens = user.refreshTokens.filter((t) => t !== hashed);
    const newRefreshToken = signRefreshToken({ userId: user._id.toString() });
    user.refreshTokens.push(hashToken(newRefreshToken));
    await user.save();

    const newAccessToken = signAccessToken({ userId: user._id.toString() });

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, refreshCookieOptions);
    return res.status(200).json({ accessToken: newAccessToken });
  } catch (err) {
    console.error("Refresh error:", err);
    return res.status(500).json({ message: "Something went wrong refreshing the session" });
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (token) {
      try {
        const payload = verifyRefreshToken(token);
        const user = await User.findById(payload.userId);
        if (user) {
          user.refreshTokens = user.refreshTokens.filter((t) => t !== hashToken(token));
          await user.save();
        }
      } catch {
        // Token was already invalid/expired — nothing to clean up server-side
      }
    }
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
    return res.status(200).json({ message: "Logged out" });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ message: "Something went wrong during logout" });
  }
}
