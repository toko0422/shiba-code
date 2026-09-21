import React from "react";
import { GitFork, Terminal, GitCompare, Settings } from "lucide-react";

export type ActiveTab = "worktrees" | "terminal" | "diff" | "repos";

interface BottomNavProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  uncommittedCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  uncommittedCount = 0,
}) => {
  const tabs = [
    {
      id: "terminal" as ActiveTab,
      label: "Agent",
      icon: Terminal,
      highlight: true,
    },
    {
      id: "worktrees" as ActiveTab,
      label: "Worktrees",
      icon: GitFork,
    },
    {
      id: "diff" as ActiveTab,
      label: "Diff",
      icon: GitCompare,
      badge: uncommittedCount > 0 ? uncommittedCount : null,
    },
    {
      id: "repos" as ActiveTab,
      label: "Repos",
      icon: Settings,
    },
  ];

  return (
    <nav className="safe-bottom bg-slate-900/95 backdrop-blur border-t border-slate-800 text-slate-400 flex items-center justify-around py-1.5 px-2 z-20 shrink-0">
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = activeTab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChangeTab(t.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 relative transition-colors ${
              isActive ? "text-amber-400 font-semibold" : "hover:text-slate-200"
            }`}
          >
            <div className="relative">
              <Icon
                size={20}
                className={isActive ? "stroke-[2.5]" : "stroke-2"}
              />
              {t.badge && (
                <span className="absolute -top-1 -right-2 bg-amber-500 text-slate-950 text-[10px] font-bold px-1 rounded-full min-w-[14px] text-center">
                  {t.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
