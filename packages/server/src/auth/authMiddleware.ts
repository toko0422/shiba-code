import { Request, Response, NextFunction } from "express";
import { AuthUser } from "@shiba-code/shared";
import { config } from "../config.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // If allowedEmails is empty and in dev mode, allow dev user
  const authHeader = req.headers.authorization;
  const cookieUser = req.cookies?.shiba_user;

  if (cookieUser) {
    try {
      const user = JSON.parse(cookieUser) as AuthUser;
      if (isEmailAllowed(user.email)) {
        req.user = user;
        return next();
      }
    } catch {
      // invalid cookie
    }
  }

  // Dev bypass if configured or in devMode with no allowedEmails specified
  if (config.devMode && config.allowedEmails.length === 0) {
    req.user = {
      id: "dev-user",
      email: "dev@local.shiba",
      name: "Local Developer",
    };
    return next();
  }

  return res
    .status(401)
    .json({ error: "Unauthorized: Please login with Google" });
}

export function isEmailAllowed(email: string): boolean {
  if (config.allowedEmails.length === 0) {
    // If no whitelist is configured, allow in dev mode, or allow anyone in initial setup
    return true;
  }
  return config.allowedEmails.includes(email.toLowerCase());
}
