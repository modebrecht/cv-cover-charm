import { createFileRoute, Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/cover/ThemeToggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bewerbungsdossier – Titelblatt und Lebenslauf" },
      {
        name: "description",
        content:
          "Titelblatt und Lebenslauf für deine Lehrstellenbewerbung in der Schweiz – im gleichen Design, als PDF zum Herunterladen.",
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
}: {
  to: string;
  title: string;
  text: string;
  hint: string;
  art: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="group flex flex-1 flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition-shadow hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Kleine Vorschau statt eines Symbols – man sieht, was einen erwartet. */}
      <div className="flex h-44 items-center justify-center border-b bg-muted/40 p-4">{art}</div>
      <div className="flex flex-1 flex-col gap-1 p-5">
        <span className="text-lg font-semibold">{title}</span>
        <span className="text-sm text-muted-foreground">{text}</span>
        <span className="mt-3 text-sm font-medium text-primary group-hover:underline">{hint}</span>
      </div>
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
      <rect
        x="10"
        y="69"
        width="26"
        height="3"
        rx="1"
        fill="var(--color-foreground)"
        opacity="0.6"
      />
      <rect
        x="10"
        y="88"
        width="22"
        height="2"
        rx="1"
        fill="var(--color-foreground)"
        opacity="0.3"
      />
      <rect
        x="10"
        y="92"
        width="18"
        height="2"
        rx="1"
        fill="var(--color-foreground)"
        opacity="0.3"
      />
      <rect
        x="44"
        y="88"
        width="20"
        height="2"
        rx="1"
        fill="var(--color-foreground)"
        opacity="0.3"
      />
      <rect
        x="44"
        y="92"
        width="16"
        height="2"
        rx="1"
        fill="var(--color-foreground)"
        opacity="0.3"
      />
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
      <rect
        x="24"
        y="18"
        width="18"
        height="2.4"
        rx="1"
        fill="var(--color-foreground)"
        opacity="0.5"
      />
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

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-10 sm:px-6">
        <div>
          <h2 className="text-2xl font-semibold sm:text-3xl">Was möchtest du gestalten?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Beides passt zusammen: der Lebenslauf übernimmt Vorlage, Farben und deine Angaben vom
            Titelblatt.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
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
        </div>

        <p className="text-xs text-muted-foreground">
          Deine Eingaben bleiben im Browser. Zum Sichern lädst du den Entwurf als Datei herunter.
        </p>
      </main>
    </div>
  );
}
