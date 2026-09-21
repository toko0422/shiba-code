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

        <div className="space-y-3 pt-2">
          {/* Google Sign-In Container */}
          <div ref={googleBtnRef} className="flex justify-center" />

          {/* Dev Mode Login fallback */}
          <button
            onClick={handleDevLogin}
            className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
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
