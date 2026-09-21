import { Router } from "express";
import { AuthUser } from "@shiba-code/shared";
import { config } from "../config.js";
import { isEmailAllowed } from "../auth/authMiddleware.js";

export const authRouter = Router();

// Google OAuth verification via tokeninfo
authRouter.post("/google", async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: "Missing credential token" });
  }

  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
    );
    if (!response.ok) {
      return res.status(401).json({ error: "Invalid Google token" });
    }

    const payload = (await response.json()) as any;
    const email = payload.email;

    if (!isEmailAllowed(email)) {
      return res
        .status(403)
        .json({
          error: `Access denied. Email ${email} is not in the allowed list.`,
        });
    }

    const user: AuthUser = {
      id: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split("@")[0],
      picture: payload.picture,
    };

    res.cookie("shiba_user", JSON.stringify(user), {
      httpOnly: true,
      secure: !config.devMode,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return res.json({ user });
  } catch (err: any) {
    console.error("Google auth error:", err);
    return res.status(500).json({ error: "Failed to verify Google token" });
  }
});

// Dev login for local testing
authRouter.post("/dev-login", (req, res) => {
  if (!config.devMode) {
    return res
      .status(403)
      .json({ error: "Dev login only available in development mode" });
  }

  const user: AuthUser = {
    id: "dev-user-1",
    email: "developer@example.com",
    name: "Shiba Dev",
  };

  res.cookie("shiba_user", JSON.stringify(user), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  return res.json({ user });
});

authRouter.get("/me", (req, res) => {
  const cookieUser = req.cookies?.shiba_user;
  if (cookieUser) {
    try {
      const user = JSON.parse(cookieUser);
      return res.json({ user });
    } catch {}
  }

  if (config.devMode && config.allowedEmails.length === 0) {
    return res.json({
      user: {
        id: "dev-user",
        email: "dev@local.shiba",
        name: "Local Developer",
      },
    });
  }

  return res.status(401).json({ user: null });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("shiba_user");
  return res.json({ ok: true });
});
