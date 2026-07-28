import { Router } from "express";
import type { Response } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/authMiddleware.js";
import { User } from "../models/User.js";

const router = Router();

router.get("/", requireAuth, async (req: AuthedRequest, res: Response) => {
  const user = await User.findById(req.userId).select("name email createdAt");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  return res.status(200).json({
    message: `Welcome back, ${user.name}`,
    user: { id: user._id, name: user.name, email: user.email, memberSince: user.createdAt },
  });
});

export default router;
