import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Briefcase, Building2, Calculator, ChartPie, House, Layers } from "lucide-react";

export function Home() {
  const cards = [
    {
      to: "/wohn-check",
      title: "Wohn-Check",
      desc: "In 60 Sekunden prÃ¼fen, ob sich eine Wohnimmobilie lohnt. 6 Eingaben, klare Ampel.",
      icon: <House className="h-6 w-6" />,
      highlight: true,
    },
    { to: "/gewerbe-check", title: "Gewerbe (light)",
      desc: "Gleiche Logik, Fokus auf LeerstandssensitivitÃ¤t.",
      icon: <Briefcase className="h-6 w-6" /> },
    { to: "/mfh-check", title: "MFH (light)",
      desc: "Mehrere Einheiten grob kalkulieren.",
      icon: <Building2 className="h-6 w-6" /> },
    { to: "/mietkalkulation", title: "Mietkalkulation",
      desc: "Warm/Kalt, umlagefÃ¤hig â€“ einfach erklÃ¤rt.",
      icon: <Calculator className="h-6 w-6" /> },
    { to: "/afa", title: "AfA-Rechner",
      desc: "Baujahr â€ ' Satz â€ ' AfA/Jahr. Einsteigerfreundlich.",
      icon: <Layers className="h-6 w-6" /> },
    { to: "/finanzierung", title: "Finanzierung-Check",
      desc: "AnnuitÃ¤t, DSCR, max. Kaufpreis.",
      icon: <ChartPie className="h-6 w-6" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-gradient-to-br from-white to-gray-50 p-6">
        <h1 className="text-2xl font-semibold">Willkommen zu den Immo Quick-Checks</h1>
        <p className="text-muted-foreground mt-1">
          FÃ¼r Einsteiger. Klar, spielerisch und mit ErklÃ¤rungen. WÃ¤hle deinen Check:
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link key={c.to} to={c.to}
            className={"rounded-2xl border bg-card p-5 hover:shadow transition flex flex-col gap-3 " +
              (c.highlight ? "ring-1 ring-black" : "")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {c.icon}
                <div className="font-medium">{c.title}</div>
              </div>
              <ArrowRight className="h-4 w-4" />
            </div>
            <p className="text-sm text-muted-foreground">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}


