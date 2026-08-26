from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {count}")
    file.write_text(text.replace(old, new, 1))


def replace_all(path: str, old: str, new: str, minimum: int = 1) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count < minimum:
        raise SystemExit(f"{path}: expected at least {minimum} matches, found {count}")
    file.write_text(text.replace(old, new))


route = "src/routes/anschreiben.tsx"

replace_once(
    route,
    '''const inputClass =
  "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
''',
    '''const inputClass =
  "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

/** Standard-Anrede und -Gruss allein bedeuten noch nicht, dass der Brief begonnen wurde. */
function letterHasStarted(data: LetterData): boolean {
  return [
    data.absenderName,
    data.absenderAdresse,
    data.absenderPlzOrt,
    data.absenderTelefon,
    data.absenderEmail,
    data.empfaengerFirma,
    data.empfaengerName,
    data.empfaengerAdresse,
    data.empfaengerPlzOrt,
    data.ort,
    data.datum,
    data.betreff,
    data.text,
    data.richTextHtml,
    data.unterschrift,
  ].some((value) => !!value?.trim());
}

/** Ort/Datum werden im Titelblatt vorbelegt und reichen allein nicht für einen echten Entwurf. */
function titlePageHasMeaningfulSource(source: LetterDossierSource | null): boolean {
  if (!source) return false;
  const personal =
    source.personalSource === "Titelblatt" &&
    [
      source.personalData.absenderName,
      source.personalData.absenderAdresse,
      source.personalData.absenderPlzOrt,
      source.personalData.absenderTelefon,
      source.personalData.absenderEmail,
    ].some((value) => !!value?.trim());
  const application =
    source.applicationSource === "Titelblatt" &&
    [
      source.applicationData.empfaengerFirma,
      source.applicationData.empfaengerName,
      source.applicationData.empfaengerAdresse,
      source.applicationData.empfaengerPlzOrt,
      source.applicationData.betreff,
    ].some((value) => !!value?.trim());
  return personal || application;
}
''',
)

replace_once(
    route,
    '''  useEffect(() => {
    const dossier = refreshSource();
    let loadedLetter = false;

    try {
      const raw = window.localStorage.getItem(LETTER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SavedLetter>;
        if (parsed.data && typeof parsed.data === "object") {
          setData({ ...EMPTY_LETTER, ...parsed.data });
          loadedLetter = true;
        }
        if (parsed.design) setDesign(normalizeLetterDesign(parsed.design));
        setSaveState("saved");
      }
    } catch {
      setSaveState("error");
    }

    // Wie beim Lebenslauf: erster Besuch startet aus dem bereits vorhandenen
    // Dossier. Das Brief-Design startet bewusst neutral und kann später manuell
    // übernommen werden. Ein erneut geöffnetes Anschreiben bleibt exakt gespeichert.
    if (!loadedLetter) {
      if (dossier.hasPersonal) {
        setData((current) => mergeNonEmptyLetterData(current, dossier.personalData));
      }
      if (dossier.hasApplication) {
        setData((current) => mergeNonEmptyLetterData(current, dossier.applicationData));
      }
      const automatic = [
        dossier.hasPersonal ? "persönliche Angaben" : null,
        dossier.hasApplication ? "Betriebsdaten" : null,
      ].filter(Boolean);
      if (automatic.length) {
        setTransferNote({
          kind: "ok",
          text: `Beim ersten Öffnen übernommen: ${automatic.join(", ")}.`,
        });
      }
    }

    setHydrated(true);
  }, [refreshSource]);
''',
    '''  useEffect(() => {
    const dossier = refreshSource();
    let nextData: LetterData = { ...EMPTY_LETTER };
    let nextDesign: LetterDesign = emptyLetterDesign();
    let savedDataLoaded = false;

    try {
      const raw = window.localStorage.getItem(LETTER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SavedLetter>;
        if (parsed.data && typeof parsed.data === "object") {
          nextData = { ...EMPTY_LETTER, ...parsed.data };
          savedDataLoaded = true;
        }
        if (parsed.design) nextDesign = normalizeLetterDesign(parsed.design);
        setSaveState("saved");
      }
    } catch {
      setSaveState("error");
    }

    // Ein technisch vorhandener, aber inhaltlich leerer Autosave zählt wie ein
    // erster Besuch. Sobald das Titelblatt echte Angaben enthält, startet der
    // Bewerbungsbrief mit denselben Daten und derselben Designsprache.
    if ((!savedDataLoaded || !letterHasStarted(nextData)) && titlePageHasMeaningfulSource(dossier)) {
      const automatic: string[] = [];
      if (dossier.personalSource === "Titelblatt" && dossier.hasPersonal) {
        nextData = mergeNonEmptyLetterData(nextData, dossier.personalData);
        automatic.push("persönliche Angaben");
      }
      if (dossier.applicationSource === "Titelblatt" && dossier.hasApplication) {
        nextData = mergeNonEmptyLetterData(nextData, dossier.applicationData);
        automatic.push("Betriebsdaten");
      }
      if (dossier.designSource === "Titelblatt" && dossier.design) {
        nextDesign = { ...nextDesign, ...dossier.design };
        automatic.push("Design");
      }
      if (automatic.length) {
        setTransferNote({
          kind: "ok",
          text: `Automatisch vom Titelblatt übernommen: ${automatic.join(", ")}.`,
        });
      }
    }

    setData(nextData);
    setDesign(nextDesign);
    setHydrated(true);
  }, [refreshSource]);
''',
)

replace_once(
    route,
    '''  const template = useMemo(
    () =>
      design.template === "brief"
        ? null
        : (TEMPLATES.find((candidate) => candidate.id === design.template) ?? TEMPLATES[0]),
    [design.template],
  );

  const patch = (value: Partial<LetterData>) => setData((current) => ({ ...current, ...value }));
''',
    '''  const template = useMemo(
    () =>
      design.template === "brief"
        ? null
        : (TEMPLATES.find((candidate) => candidate.id === design.template) ?? TEMPLATES[0]),
    [design.template],
  );
  const titlePageReady = titlePageHasMeaningfulSource(source);
  const titlePageTemplateName = useMemo(() => {
    if (source?.designSource !== "Titelblatt" || !source.design) return null;
    return (
      TEMPLATES.find((candidate) => candidate.id === source.design?.template)?.name ??
      source.design.template
    );
  }, [source]);

  const patch = (value: Partial<LetterData>) => setData((current) => ({ ...current, ...value }));
''',
)

replace_once(
    route,
    '''  const syncFromDossier = () => {
    const dossier = refreshSource();
    const done: string[] = [];

    if (takeover.personal && dossier.hasPersonal) {
      setData((current) => mergeNonEmptyLetterData(current, dossier.personalData));
      done.push("persönliche Angaben");
    }
    if (takeover.application && dossier.hasApplication) {
      setData((current) => mergeNonEmptyLetterData(current, dossier.applicationData));
      done.push("Betriebsdaten");
    }
    if (takeover.design && dossier.design) {
      setDesign(dossier.design);
      done.push("Design");
    }

    setTransferNote(
      done.length
        ? { kind: "ok", text: `Übernommen: ${done.join(", ")}. Dein Brieftext bleibt erhalten.` }
        : {
            kind: "error",
            text: "Für die Auswahl gibt es noch keine gespeicherten Angaben im Dossier.",
          },
    );
  };
''',
    '''  const syncAllFromTitlePage = () => {
    const dossier = refreshSource();
    if (!titlePageHasMeaningfulSource(dossier)) {
      setTransferNote({
        kind: "error",
        text: "Fülle zuerst dein Titelblatt aus.",
      });
      return;
    }

    const done: string[] = [];
    if (dossier.personalSource === "Titelblatt" && dossier.hasPersonal) {
      setData((current) => mergeNonEmptyLetterData(current, dossier.personalData));
      done.push("persönliche Angaben");
    }
    if (dossier.applicationSource === "Titelblatt" && dossier.hasApplication) {
      setData((current) => mergeNonEmptyLetterData(current, dossier.applicationData));
      done.push("Betriebsdaten");
    }
    if (dossier.designSource === "Titelblatt" && dossier.design) {
      setDesign((current) => ({ ...current, ...dossier.design! }));
      done.push("Design");
    }

    setTransferNote({
      kind: "ok",
      text: `Alles vom Titelblatt übernommen: ${done.join(", ")}. Dein Brieftext bleibt erhalten.`,
    });
  };

  const syncFromDossier = () => {
    const dossier = refreshSource();
    const done: string[] = [];

    if (takeover.personal && dossier.hasPersonal) {
      setData((current) => mergeNonEmptyLetterData(current, dossier.personalData));
      done.push("persönliche Angaben");
    }
    if (takeover.application && dossier.hasApplication) {
      setData((current) => mergeNonEmptyLetterData(current, dossier.applicationData));
      done.push("Betriebsdaten");
    }
    if (takeover.design && dossier.design) {
      setDesign((current) => ({ ...current, ...dossier.design! }));
      done.push("Design");
    }

    setTransferNote(
      done.length
        ? { kind: "ok", text: `Übernommen: ${done.join(", ")}. Dein Brieftext bleibt erhalten.` }
        : {
            kind: "error",
            text: "Für die Auswahl gibt es noch keine gespeicherten Angaben im Dossier.",
          },
    );
  };
''',
)

replace_once(
    route,
    '''          <h1 className="truncate text-sm font-semibold sm:text-base">Anschreiben</h1>
''',
    '''          <h1 className="truncate text-sm font-semibold sm:text-base">Bewerbungsbrief</h1>
''',
)

replace_once(
    route,
    '''            <Section
              title="Vom Dossier übernehmen"
              open={open.uebernehmen}
              onToggle={() => toggle("uebernehmen")}
            >
''',
    '''            <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">
              <div className="text-sm font-semibold text-foreground">Mit dem Titelblatt abgleichen</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Übernimmt Kontaktdaten, Lehrbetrieb, Ort, Datum und Betreff sowie Vorlage, Farben
                und Schrift. Dein eigener Brieftext bleibt erhalten.
              </p>
              <button
                type="button"
                onClick={syncAllFromTitlePage}
                disabled={!titlePageReady}
                className="mt-3 w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Alles vom Titelblatt übernehmen
              </button>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {titlePageReady
                  ? titlePageTemplateName
                    ? `Titelblatt-Vorlage: ${titlePageTemplateName}`
                    : "Titelblatt-Daten gefunden."
                  : "Fülle zuerst dein Titelblatt aus."}
              </p>
            </div>

            <Section
              title="Einzeln übernehmen"
              open={open.uebernehmen}
              onToggle={() => toggle("uebernehmen")}
            >
''',
)

replace_once(
    route,
    '''                  Aus Dossier übernehmen
''',
    '''                  Auswahl übernehmen
''',
)

replace_once(
    route,
    '''      { title: "Anschreiben für die Lehrstellenbewerbung" },
      {
        name: "description",
        content:
          "Persönliches Anschreiben für deine Lehrstellenbewerbung – passend zu Titelblatt und Lebenslauf.",
      },
''',
    '''      { title: "Bewerbungsbrief für die Lehrstellenbewerbung" },
      {
        name: "description",
        content:
          "Persönlicher Bewerbungsbrief für deine Lehrstellenbewerbung – passend zu Titelblatt und Lebenslauf.",
      },
''',
)

canvas = "src/components/letter/LetterCanvas.tsx"
replace_once(
    canvas,
    '''  const placeholder =
    "Hier entsteht dein persönliches Anschreiben. Erkläre, weshalb du dich für diesen Beruf und diesen Lehrbetrieb interessierst und was du mitbringst.";
''',
    '''  const placeholder =
    "Hier entsteht dein persönlicher Bewerbungsbrief. Erkläre, weshalb du dich für diesen Beruf und diesen Lehrbetrieb interessierst und was du mitbringst.";
''',
)
replace_once(canvas, 'aria-label="Vorschau Anschreiben"', 'aria-label="Vorschau Bewerbungsbrief"')

# Nutzerseitige Terminologie im restlichen Dossier vereinheitlichen.
for path in [
    "src/routes/index.tsx",
    "src/components/dossier/DossierExportDialog.tsx",
    "src/routes/titelblatt.tsx",
    "src/routes/lebenslauf.tsx",
]:
    replace_all(path, "Anschreiben", "Bewerbungsbrief")

# Regression: Ein vorhandener leerer Autosave muss wie ein erster Besuch behandelt werden.
test_file = "tests/e2e/dossier-regression.spec.ts"
replace_once(
    test_file,
    '''  test("letter first-open transfer autosaves and later transfer preserves the body", async ({
    page,
  }) => {
    await seedCoreDossier(page);
    await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Anschreiben" })).toBeVisible();
    await expect(page.getByLabel("Vorname und Nachname")).toHaveValue("Lea Müller");
    await expect(page.getByRole("textbox", { name: "Lehrbetrieb", exact: true })).toHaveValue(
      "Beispiel AG",
    );
    await expect(page.getByLabel("PLZ und Ort").nth(1)).toHaveValue("4500 Solothurn");
    await expect(page.getByRole("textbox", { name: "Titel / Betreff", exact: true })).toHaveValue(
      "Bewerbung um eine Lehrstelle als Informatiker/in EFZ",
    );
    const preview = page.getByLabel("Vorschau Anschreiben");
    await expect(preview).toBeVisible();
    await expect(preview).toHaveAttribute("data-letter-template", "brief");
    await expect(preview.locator('[data-letter-background="brief"]')).toHaveCSS(
      "background-color",
      "rgb(255, 255, 255)",
    );
    await expect
      .poll(() =>
        page.evaluate(
          () => JSON.parse(localStorage.getItem("anschreiben:v1") ?? "{}").design?.template ?? "",
        ),
      )
      .toBe("brief");
    await expect(page.getByRole("button", { name: "Farben", exact: true })).toHaveCount(0);

    const body = page.getByLabel("Brieftext");
    const preservedBody = "Mein individuell geschriebener Brieftext bleibt erhalten.";
    await body.fill(preservedBody);
    await expect
      .poll(() =>
        page.evaluate(
          () => JSON.parse(localStorage.getItem("anschreiben:v1") ?? "{}").data?.text ?? "",
        ),
      )
      .toBe(preservedBody);

    await page.evaluate(() => {
      const cover = JSON.parse(localStorage.getItem("titelblatt:v3") ?? "{}");
      cover.data.lehrbetrieb = "Neue Beispiel AG";
      cover.data.ansprechperson = "Frau Anna Neu";
      localStorage.setItem("titelblatt:v3", JSON.stringify(cover));
    });

    await page.getByRole("button", { name: "Aus Dossier übernehmen" }).click();
    await expect(page.getByRole("textbox", { name: "Lehrbetrieb", exact: true })).toHaveValue(
      "Neue Beispiel AG",
    );
    await expect(body).toHaveText(preservedBody);
    await expect
      .poll(() =>
        page.evaluate(
          () => JSON.parse(localStorage.getItem("anschreiben:v1") ?? "{}").data?.text ?? "",
        ),
      )
      .toBe(preservedBody);
  });
''',
    '''  test("empty saved Bewerbungsbrief inherits title-page data and design and can re-sync all", async ({
    page,
  }) => {
    await seedCoreDossier(page);
    await page.evaluate(() => {
      localStorage.setItem(
        "anschreiben:v1",
        JSON.stringify({
          version: 1,
          data: {
            absenderName: "",
            absenderAdresse: "",
            absenderPlzOrt: "",
            absenderTelefon: "",
            absenderEmail: "",
            empfaengerFirma: "",
            empfaengerName: "",
            empfaengerAdresse: "",
            empfaengerPlzOrt: "",
            ort: "",
            datum: "",
            betreff: "",
            anrede: "Guten Tag",
            text: "",
            richTextHtml: "",
            gruss: "Freundliche Grüsse",
            unterschrift: "",
          },
          design: {
            template: "brief",
            colors: { bg: "#ffffff", primary: "#111111", accent: "#111111" },
            font: "sans",
          },
        }),
      );
    });
    await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Bewerbungsbrief" })).toBeVisible();
    await expect(page.getByLabel("Vorname und Nachname")).toHaveValue("Lea Müller");
    await expect(page.getByRole("textbox", { name: "Lehrbetrieb", exact: true })).toHaveValue(
      "Beispiel AG",
    );
    await expect(page.getByLabel("PLZ und Ort").nth(1)).toHaveValue("4500 Solothurn");
    await expect(page.getByRole("textbox", { name: "Titel / Betreff", exact: true })).toHaveValue(
      "Bewerbung um eine Lehrstelle als Informatiker/in EFZ",
    );
    const preview = page.getByLabel("Vorschau Bewerbungsbrief");
    await expect(preview).toBeVisible();
    await expect(preview).toHaveAttribute("data-letter-template", "modern");
    await expect(page.getByRole("button", { name: "Farben", exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Alles vom Titelblatt übernehmen", exact: true }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const saved = JSON.parse(localStorage.getItem("anschreiben:v1") ?? "{}");
          return {
            template: saved.design?.template,
            accent: saved.design?.colors?.accent,
            font: saved.design?.font,
            name: saved.data?.absenderName,
          };
        }),
      )
      .toEqual({ template: "modern", accent: "#d6a47d", font: "sans", name: "Lea Müller" });

    const body = page.getByLabel("Brieftext");
    const preservedBody = "Mein individuell geschriebener Brieftext bleibt erhalten.";
    await body.fill(preservedBody);
    await expect
      .poll(() =>
        page.evaluate(
          () => JSON.parse(localStorage.getItem("anschreiben:v1") ?? "{}").data?.text ?? "",
        ),
      )
      .toBe(preservedBody);

    await page.evaluate(() => {
      const cover = JSON.parse(localStorage.getItem("titelblatt:v3") ?? "{}");
      cover.data.lehrbetrieb = "Neue Beispiel AG";
      cover.data.ansprechperson = "Frau Anna Neu";
      cover.colors.modern.accent = "#38bdf8";
      cover.font = "serif";
      localStorage.setItem("titelblatt:v3", JSON.stringify(cover));
    });

    await page.getByRole("button", { name: "Alles vom Titelblatt übernehmen" }).click();
    await expect(page.getByRole("textbox", { name: "Lehrbetrieb", exact: true })).toHaveValue(
      "Neue Beispiel AG",
    );
    await expect(preview).toHaveAttribute("data-letter-font", "serif");
    await expect(body).toHaveText(preservedBody);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const saved = JSON.parse(localStorage.getItem("anschreiben:v1") ?? "{}");
          return {
            accent: saved.design?.colors?.accent,
            font: saved.design?.font,
            text: saved.data?.text,
          };
        }),
      )
      .toEqual({ accent: "#38bdf8", font: "serif", text: preservedBody });
  });
''',
)

replace_once(
    test_file,
    '''    await page.getByRole("button", { name: "Vorlage", exact: true }).click();
    await expect(page.getByRole("button", { name: "Brief", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.getByRole("button", { name: "Editorial", exact: true }).click();
''',
    '''    await page.getByRole("button", { name: "Vorlage", exact: true }).click();
    await expect(page.getByRole("button", { name: "Modern", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.getByRole("button", { name: "Brief", exact: true }).click();
    await expect(preview).toHaveAttribute("data-letter-template", "brief");
    await expect(page.getByRole("button", { name: "Farben", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Editorial", exact: true }).click();
''',
)

replace_all(test_file, "Vorschau Anschreiben", "Vorschau Bewerbungsbrief", minimum=1)
replace_all(test_file, 'name: "Anschreiben"', 'name: "Bewerbungsbrief"', minimum=1)
replace_all(test_file, "Gesamtdossier verfügbar, sobald Anschreiben ausgefüllt ist.", "Gesamtdossier verfügbar, sobald Bewerbungsbrief ausgefüllt ist.")
replace_all(test_file, "Noch nicht vollständig: Anschreiben.", "Noch nicht vollständig: Bewerbungsbrief.")
replace_all(test_file, "Reihenfolge: Titelblatt, Anschreiben und", "Reihenfolge: Titelblatt, Bewerbungsbrief und")

print("Bewerbungsbrief terminology and title-page sync migration applied")
