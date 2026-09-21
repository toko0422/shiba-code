import React, { useEffect, useRef } from "react";
import { Lock, Sparkles } from "lucide-react";
import { api } from "../api/client.js";
import { AuthUser } from "@shiba-code/shared";

declare global {
  interface Window {
    google?: any;
  }
}

interface LoginModalProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if Google Identity script is loaded
    if (window.google?.accounts?.id && googleBtnRef.current) {
      window.google.accounts.id.initialize({
        client_id: (window as any).__GOOGLE_CLIENT_ID__ || "",
        callback: async (response: any) => {
          try {
            const res = await fetch("/api/auth/google", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ credential: response.credential }),
              credentials: "include",
            });
            const data = await res.json();
            if (data.user) {
              onLoginSuccess(data.user);
            } else {
              alert(data.error || "Login failed");
            }
          } catch (err) {
            console.error("Google login failed:", err);
          }
        },
      });

      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "filled_black",
        size: "large",
        shape: "pill",
        width: 250,
      });
    }
  }, [onLoginSuccess]);

  const handleDevLogin = async () => {
    try {
      const { user } = await api.devLogin();
      onLoginSuccess(user);
    } catch (err) {
      alert("Dev login failed");
    }
  };

  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) {
      setErrorMessage(decodeURIComponent(err));
      // Clean up the URL query parameter without full reload
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-5 shadow-2xl shadow-amber-500/5">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-3xl">
          🐕
        </div>

        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center justify-center gap-1.5">
            Shiba Code
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            スマホから AI エージェント（Antigravity / Codex）で並列開発
          </p>
        </div>

        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-3 rounded-xl text-left">
            {errorMessage}
          </div>
        )}

        <div className="space-y-3 pt-2">
          {/* GitHub Sign-In Button */}
          <a
            href="/api/auth/github"
            className="w-full bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 text-slate-100 text-xs font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <svg
              className="w-4 h-4 fill-current"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            <span>GitHub でログイン (OAuth)</span>
          </a>

          {/* Google Sign-In Container */}
          <div ref={googleBtnRef} className="flex justify-center" />

          {/* Dev Mode Login fallback */}
          <button
            onClick={handleDevLogin}
            className="w-full bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-xs font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles size={14} className="text-amber-400" />
            <span>開発用ログイン (Dev Login)</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
          <Lock size={11} />
          <span>個人専用プライベートアクセス</span>
        </div>
      </div>
    </div>
  );
};
