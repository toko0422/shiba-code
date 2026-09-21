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

// GitHub OAuth: Redirect to GitHub authorization URL
authRouter.get("/github", (req, res) => {
  if (!config.githubClientId) {
    return res.status(400).json({
      error: "GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env",
    });
  }

  const state =
    Math.random().toString(36).substring(2) + Date.now().toString(36);
  res.cookie("shiba_github_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 10 * 60 * 1000, // 10 minutes
  });

  const redirectUri =
    config.githubCallbackUrl ||
    `${req.protocol}://${req.get("host")}/api/auth/github/callback`;

  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", config.githubClientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "repo,read:user,user:email");
  authUrl.searchParams.set("state", state);

  return res.redirect(authUrl.toString());
});

// GitHub OAuth: Callback
authRouter.get("/github/callback", async (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    return res.redirect(
      `/?error=${encodeURIComponent(String(error_description || error))}`,
    );
  }

  const savedState = req.cookies?.shiba_github_state;
  res.clearCookie("shiba_github_state");

  if (!state || !savedState || state !== savedState) {
    return res.redirect("/?error=invalid_oauth_state");
  }

  if (!code) {
    return res.redirect("/?error=missing_oauth_code");
  }

  try {
    const redirectUri =
      config.githubCallbackUrl ||
      `${req.protocol}://${req.get("host")}/api/auth/github/callback`;

    const tokenRes = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: config.githubClientId,
          client_secret: config.githubClientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      },
    );

    if (!tokenRes.ok) {
      return res.redirect("/?error=failed_to_exchange_token");
    }

    const tokenData = (await tokenRes.json()) as any;
    if (tokenData.error || !tokenData.access_token) {
      return res.redirect(
        `/?error=${encodeURIComponent(tokenData.error_description || "oauth_failed")}`,
      );
    }

    const accessToken = tokenData.access_token as string;

    // Fetch user profile from GitHub
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "Shiba-Code",
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!userRes.ok) {
      return res.redirect("/?error=failed_to_fetch_github_user");
    }

    const ghUser = (await userRes.json()) as any;

    // Fetch primary email if not visible in profile
    let email = ghUser.email;
    if (!email) {
      try {
        const emailsRes = await fetch("https://api.github.com/user/emails", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": "Shiba-Code",
            Accept: "application/vnd.github.v3+json",
          },
        });
        if (emailsRes.ok) {
          const emails = (await emailsRes.json()) as any[];
          const primary = emails.find((e) => e.primary) || emails[0];
          if (primary) email = primary.email;
        }
      } catch {
        // ignore email fetch failure
      }
    }
    email = email || `${ghUser.login}@users.noreply.github.com`;

    if (!isEmailAllowed(email)) {
      return res.redirect(
        `/?error=${encodeURIComponent(`Access denied. Email ${email} is not in the allowed list.`)}`,
      );
    }

    // Save GitHub Auth Data
    const { store } = await import("../store.js");
    store.saveGitHubAuth({
      accessToken,
      username: ghUser.login,
      avatarUrl: ghUser.avatar_url,
      email,
      updatedAt: new Date().toISOString(),
    });

    // Set user session cookie
    const user: AuthUser = {
      id: `gh-${ghUser.id}`,
      email,
      name: ghUser.name || ghUser.login,
      picture: ghUser.avatar_url,
    };

    res.cookie("shiba_user", JSON.stringify(user), {
      httpOnly: true,
      secure: !config.devMode,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.redirect("/");
  } catch (err) {
    console.error("GitHub OAuth error:", err);
    return res.redirect("/?error=github_oauth_internal_error");
  }
});

// GitHub Status
authRouter.get("/github/status", async (_req, res) => {
  const { store } = await import("../store.js");
  const auth = store.getGitHubAuth();
  const hasEnvToken = Boolean(config.githubToken);
  const connected = Boolean(auth?.accessToken || hasEnvToken);

  return res.json({
    connected,
    username: auth?.username || (hasEnvToken ? "env-token-user" : undefined),
    avatarUrl: auth?.avatarUrl,
    hasOAuthConfig: Boolean(config.githubClientId && config.githubClientSecret),
  });
});

// Manually register/update Personal Access Token (PAT)
authRouter.post("/github/token", async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== "string" || !token.trim()) {
    return res.status(400).json({ error: "Token is required" });
  }

  const cleanToken = token.trim();
  try {
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        "User-Agent": "Shiba-Code",
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!userRes.ok) {
      return res.status(400).json({
        error:
          "Invalid GitHub Personal Access Token or insufficient permissions",
      });
    }

    const ghUser = (await userRes.json()) as any;
    const { store } = await import("../store.js");
    store.saveGitHubAuth({
      accessToken: cleanToken,
      username: ghUser.login,
      avatarUrl: ghUser.avatar_url,
      email: ghUser.email,
      updatedAt: new Date().toISOString(),
    });

    return res.json({
      ok: true,
      username: ghUser.login,
      avatarUrl: ghUser.avatar_url,
    });
  } catch (err: any) {
    console.error("Failed to verify GitHub token:", err);
    return res
      .status(500)
      .json({ error: err.message || "Failed to verify token" });
  }
});

// Disconnect GitHub
authRouter.post("/github/disconnect", async (_req, res) => {
  const { store } = await import("../store.js");
  store.deleteGitHubAuth();
  return res.json({ ok: true });
});
