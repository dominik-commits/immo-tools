// src/components/AnalyzerMegaMenu.tsx
import React from "react";
import { NavLink } from "react-router-dom";
import type { Module } from "@/App";

type Plan = "basis" | "pro";

type Props = {
  plan: Plan;
  modules: Module[];
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
};

const PRO_BG = "bg-violet-600";
const PRO_BG_SOFT = "bg-violet-50";
const PRO_TEXT = "text-violet-700";

function Section({
  title,
  items,
  onNavigate,
}: {
  title: string;
  items: Module[];
  onNavigate?: () => void;
}) {
  return (
    <div>
      <h4 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </h4>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((m) => (
          <NavLink
            key={m.key}
            to={m.href}
            onClick={onNavigate}
            className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-gray-50"
          >
            <span className="mt-0.5 inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gray-50">
              {m.icon}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                {m.title}
                {m.requiredPlan === "pro" && (
                  <span
                    className={`${PRO_BG_SOFT} ${PRO_TEXT} inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold ring-1 ring-violet-200`}
                    style={{ boxShadow: "inset 0 0 0 1px rgba(124,58,237,0.08)" }}
                  >
                    PRO
                  </span>
                )}
              </span>
              <span className="block text-xs text-gray-600">{m.description}</span>
            </span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}

export default function AnalyzerMegaMenu({
  plan,
  modules,
  variant = "desktop",
  onNavigate,
}: Props) {
  const basis = modules.filter((m) => m.requiredPlan !== "pro");
  const pros = modules.filter((m) => m.requiredPlan === "pro");

  if (variant === "mobile") {
    return (
      <div className="py-2">
        <Section title="Basis-Analyzer" items={basis} onNavigate={onNavigate} />
        <div className="my-3 h-px w-full bg-gray-200" />
        <Section title="PRO-Analyzer" items={pros} onNavigate={onNavigate} />
      </div>
    );
  }

  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md bg-[#0F2C8A] px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110"
      >
        Analyzer
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-[720px] max-w-[95vw] origin-top-right rounded-2xl border border-gray-200 bg-white p-3 shadow-xl"
          // minimale Sicherheitskante, falls der Button SEHR rechts sitzt
          style={{ insetInlineStart: "auto" }}
        >
          <div className="px-1 pb-2 pt-1">
            <p className="text-xs text-gray-500">
              Du nutzt aktuell:{" "}
              <span
                className={
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                  (plan === "pro" ? `${PRO_BG} text-white` : "bg-gray-100 text-gray-700")
                }
              >
                {plan === "pro" ? "PRO" : "BASIS"}
              </span>
            </p>
          </div>
          <Section title="Basis-Analyzer" items={basis} onNavigate={() => setOpen(false)} />
          <div className="my-3 h-px w-full bg-gray-200" />
          <Section title="PRO-Analyzer" items={pros} onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
