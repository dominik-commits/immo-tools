// src/components/AnalyzerMegaMenu.tsx
import React from "react";
import { NavLink } from "react-router-dom";
import { ChevronDown, Lock } from "lucide-react";

// eigener Typ, damit wir nicht aus App.tsx importieren müssen
type Plan = "basis" | "pro";

type Module = {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  requiredPlan: Plan | "any";
};

type Props = {
  plan: Plan;
  modules: Module[];
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
};

const PRO_BADGE_CLASS =
  "ml-2 inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-violet-200";

export default function AnalyzerMegaMenu({
  plan,
  modules,
  variant = "desktop",
  onNavigate,
}: Props) {
  const basisModules = modules.filter((m) => m.requiredPlan !== "pro");
  const proModules = modules.filter((m) => m.requiredPlan === "pro");

  if (variant === "mobile") {
    // Mobile-Variante: kein Dropdown, wird im Header ein- und ausgeblendet
    return (
      <div className="space-y-4">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Basis-Analyzer
          </h3>
          <div className="space-y-1">
            {basisModules.map((m) => (
              <NavLink
                key={m.key}
                to={m.href}
                onClick={onNavigate}
                className="flex items-start gap-2 rounded-lg px-2 py-2 text-sm hover:bg-gray-50"
              >
                <span className="mt-0.5 h-5 w-5 flex-none text-gray-500">
                  {m.icon}
                </span>
                <span>
                  <span className="font-medium text-gray-900">{m.title}</span>
                  <span className="block text-xs text-gray-500">
                    {m.description}
                  </span>
                </span>
              </NavLink>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            PRO-Analyzer
          </h3>
          <div className="space-y-1">
            {proModules.map((m) => {
              const locked = plan !== "pro";
              return (
                <NavLink
                  key={m.key}
                  to={locked ? "/upgrade" : m.href}
                  onClick={onNavigate}
                  className="flex items-start gap-2 rounded-lg px-2 py-2 text-sm hover:bg-gray-50"
                >
                  <span className="mt-0.5 h-5 w-5 flex-none text-gray-500">
                    {m.icon}
                  </span>
                  <span>
                    <span className="flex items-center gap-1 font-medium text-gray-900">
                      {m.title}
                      <span className={PRO_BADGE_CLASS}>PRO</span>
                      {locked && (
                        <Lock className="h-3 w-3 text-violet-500" />
                      )}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {m.description}
                    </span>
                  </span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Desktop-Variante: Dropdown, das NUR per Klick geöffnet wird
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  // Klick außerhalb schließt das Menü
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleNavClick = () => {
    setOpen(false);
    onNavigate?.();
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Button: öffnet/schließt das Menü nur per Klick */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full bg-[#0F2C8A] px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#0F2C8A]/30 focus:ring-offset-1"
      >
        Analyzer
        <ChevronDown
          className={`h-4 w-4 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[480px] rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Immo-Analyzer
              </p>
              <p className="text-xs text-gray-500">
                Wähle ein Tool, um dein Objekt zu prüfen.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Basis */}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Basis-Analyzer
              </h3>
              <div className="space-y-1">
                {basisModules.map((m) => (
                  <NavLink
                    key={m.key}
                    to={m.href}
                    onClick={handleNavClick}
                    className="flex items-start gap-2 rounded-lg px-2 py-2 text-xs hover:bg-gray-50"
                  >
                    <span className="mt-0.5 h-4 w-4 flex-none text-gray-500">
                      {m.icon}
                    </span>
                    <span>
                      <span className="block text-[13px] font-medium text-gray-900">
                        {m.title}
                      </span>
                      <span className="block text-[11px] text-gray-500">
                        {m.description}
                      </span>
                    </span>
                  </NavLink>
                ))}
              </div>
            </div>

            {/* PRO */}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                PRO-Analyzer
              </h3>
              <div className="space-y-1">
                {proModules.map((m) => {
                  const locked = plan !== "pro";
                  return (
                    <NavLink
                      key={m.key}
                      to={locked ? "/upgrade" : m.href}
                      onClick={handleNavClick}
                      className="flex items-start gap-2 rounded-lg px-2 py-2 text-xs hover:bg-gray-50"
                    >
                      <span className="mt-0.5 h-4 w-4 flex-none text-gray-500">
                        {m.icon}
                      </span>
                      <span>
                        <span className="flex items-center gap-1 text-[13px] font-medium text-gray-900">
                          {m.title}
                          <span className={PRO_BADGE_CLASS}>PRO</span>
                          {locked && (
                            <Lock className="h-3 w-3 text-violet-500" />
                          )}
                        </span>
                        <span className="block text-[11px] text-gray-500">
                          {m.description}
                        </span>
                      </span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
