import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, IUser } from "./models";

export interface AuthRequest extends Request {
  user?: IUser;
}

export interface JwtPayload {
  userId: string;
}

export function generateToken(userId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not defined");
  return jwt.sign({ userId }, secret, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not defined");
  return jwt.verify(token, secret) as JwtPayload;
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId).select("-password");
    
    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function adminMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.role !== "admin") {
    res.status(403).json({ message: "Admin access required" });
    return;
  }
  next();
}
