import { createFileRoute, Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/cover/ThemeToggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bewerbungsdossier – Titelblatt, Anschreiben und Lebenslauf" },
      {
        name: "description",
        content:
          "Titelblatt, Anschreiben und Lebenslauf für deine Lehrstellenbewerbung in der Schweiz – im gleichen Design.",
      },
    ],
  }),
  component: Start,
});

/** Eine Kachel des Startbildschirms. */
function Card({
  to,
  title,
  text,
  hint,
  art,
  disabled = false,
}: {
  to?: string;
  title: string;
  text: string;
  hint: string;
  art: React.ReactNode;
  disabled?: boolean;
}) {
  const content = (
    <>
      {/* Kleine Vorschau statt eines Symbols – man sieht, was einen erwartet. */}
      <div className="flex h-44 items-center justify-center border-b bg-muted/40 p-4">{art}</div>
      <div className="flex flex-1 flex-col gap-1 p-5">
        <span className="text-lg font-semibold">{title}</span>
        <span className="text-sm text-muted-foreground">{text}</span>
        <span
          className={`mt-3 text-sm font-medium ${
            disabled ? "text-muted-foreground" : "text-primary group-hover:underline"
          }`}
        >
          {hint}
        </span>
      </div>
    </>
  );

  if (disabled || !to) {
    return (
      <div
        className="flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card text-left opacity-75 shadow-sm"
        aria-disabled="true"
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      to={to}
      className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition-shadow hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {content}
    </Link>
  );
}

/** Miniatur eines Titelblatts: grosse Fläche, wenig Text. */
function CoverArt() {
  return (
    <svg viewBox="0 0 74 105" className="h-full w-auto drop-shadow" aria-hidden="true">
      <rect width="74" height="105" rx="2" fill="var(--color-background)" />
      <circle cx="52" cy="24" r="14" fill="var(--color-primary)" opacity="0.15" />
      <circle cx="52" cy="24" r="9" fill="var(--color-primary)" opacity="0.55" />
      <rect x="10" y="52" width="12" height="2.4" rx="1.2" fill="var(--color-primary)" />
      <rect x="10" y="59" width="44" height="6" rx="1" fill="var(--color-foreground)" />
      <rect x="10" y="69" width="26" height="3" rx="1" fill="var(--color-foreground)" opacity="0.6" />
      <rect x="10" y="88" width="22" height="2" rx="1" fill="var(--color-foreground)" opacity="0.3" />
      <rect x="10" y="92" width="18" height="2" rx="1" fill="var(--color-foreground)" opacity="0.3" />
      <rect x="44" y="88" width="20" height="2" rx="1" fill="var(--color-foreground)" opacity="0.3" />
      <rect x="44" y="92" width="16" height="2" rx="1" fill="var(--color-foreground)" opacity="0.3" />
    </svg>
  );
}

/** Miniatur eines Lebenslaufs: viel Text, blasser Hintergrund. */
function CvArt() {
  return (
    <svg viewBox="0 0 74 105" className="h-full w-auto drop-shadow" aria-hidden="true">
      <rect width="74" height="105" rx="2" fill="var(--color-background)" />
      <circle cx="60" cy="16" r="10" fill="var(--color-primary)" opacity="0.12" />
      <circle cx="13" cy="15" r="7" fill="var(--color-primary)" opacity="0.5" />
      <rect x="24" y="11" width="26" height="4" rx="1" fill="var(--color-foreground)" />
      <rect x="24" y="18" width="18" height="2.4" rx="1" fill="var(--color-foreground)" opacity="0.5" />
      {[30, 50, 70].map((y) => (
        <g key={y}>
          <rect x="10" y={y} width="14" height="2.4" rx="1.2" fill="var(--color-primary)" />
          {[0, 5, 10].map((d) => (
            <rect
              key={d}
              x="10"
              y={y + 6 + d}
              width={d === 10 ? 38 : 54}
              height="2"
              rx="1"
              fill="var(--color-foreground)"
              opacity="0.35"
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

/** Miniatur eines Anschreibens: klare Briefstruktur und viel Fliesstext. */
function LetterArt() {
  return (
    <svg viewBox="0 0 74 105" className="h-full w-auto drop-shadow" aria-hidden="true">
      <rect width="74" height="105" rx="2" fill="var(--color-background)" />
      <rect x="8" y="8" width="58" height="6" rx="1" fill="var(--color-primary)" opacity="0.18" />
      <rect x="10" y="10" width="22" height="2" rx="1" fill="var(--color-primary)" />
      <rect x="10" y="23" width="24" height="2" rx="1" fill="var(--color-foreground)" opacity="0.3" />
      <rect x="10" y="27" width="20" height="2" rx="1" fill="var(--color-foreground)" opacity="0.3" />
      <rect x="44" y="34" width="20" height="2" rx="1" fill="var(--color-foreground)" opacity="0.3" />
      <rect x="10" y="43" width="42" height="3" rx="1" fill="var(--color-foreground)" opacity="0.75" />
      {[53, 58, 63, 71, 76, 81].map((y, index) => (
        <rect
          key={y}
          x="10"
          y={y}
          width={index === 2 || index === 5 ? 42 : 54}
          height="2"
          rx="1"
          fill="var(--color-foreground)"
          opacity="0.32"
        />
      ))}
      <rect x="10" y="92" width="18" height="2" rx="1" fill="var(--color-primary)" opacity="0.7" />
    </svg>
  );
}

/** Miniatur des Gesamtdossiers: mehrere zusammengehörige A4-Seiten. */
function DossierArt() {
  return (
    <svg viewBox="0 0 92 105" className="h-full w-auto drop-shadow" aria-hidden="true">
      <rect x="28" y="7" width="56" height="88" rx="2" fill="var(--color-muted)" />
      <rect x="18" y="11" width="56" height="88" rx="2" fill="var(--color-background)" />
      <rect x="8" y="15" width="56" height="88" rx="2" fill="var(--color-background)" stroke="var(--color-border)" />
      <rect x="15" y="25" width="10" height="2.5" rx="1" fill="var(--color-primary)" />
      <rect x="15" y="32" width="34" height="5" rx="1" fill="var(--color-foreground)" />
      {[48, 54, 60, 70, 76, 82].map((y, index) => (
        <rect
          key={y}
          x="15"
          y={y}
          width={index === 2 || index === 5 ? 30 : 40}
          height="2"
          rx="1"
          fill="var(--color-foreground)"
          opacity="0.28"
        />
      ))}
      <path
        d="M67 68v17m0 0-6-6m6 6 6-6"
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Start() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center gap-3 border-b px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold sm:text-base">Bewerbungsdossier</h1>
          <p className="hidden truncate text-xs text-muted-foreground sm:block">
            Für die Lehrstellenbewerbung in der Schweiz
          </p>
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-6 px-4 py-10 sm:px-6">
        <div>
          <h2 className="text-2xl font-semibold sm:text-3xl">Was möchtest du machen?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Titelblatt, Anschreiben und Lebenslauf gehören zusammen und verwenden dieselbe
            Designsprache.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card
            to="/titelblatt"
            title="Titelblatt"
            text="Das Deckblatt deiner Bewerbung – mit Foto, Beruf und Empfänger."
            hint="Titelblatt gestalten →"
            art={<CoverArt />}
          />
          <Card
            to="/lebenslauf"
            title="Lebenslauf"
            text="Schule, Praktika, Sprachen und Hobbys – im gleichen Design."
            hint="Lebenslauf gestalten →"
            art={<CvArt />}
          />
          <Card
            to="/anschreiben"
            title="Anschreiben"
            text="Dein persönlicher Bewerbungsbrief – passend zu Titelblatt und Lebenslauf."
            hint="Anschreiben verfassen →"
            art={<LetterArt />}
          />
          <Card
            title="Gesamtdossier herunterladen"
            text="Alle fertigen Seiten prüfen und gemeinsam als PDF herunterladen."
            hint="Wird nach der Dossier-Erweiterung aktiviert"
            art={<DossierArt />}
            disabled
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Deine Eingaben bleiben im Browser. Zum Sichern lädst du den Entwurf als Datei herunter.
        </p>
      </main>
    </div>
  );
}
