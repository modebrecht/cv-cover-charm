from pathlib import Path


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, got {count}")
    path.write_text(text.replace(old, new, 1))


path = Path("tests/e2e/dossier-regression.spec.ts")
workflow = Path(".github/workflows/finalize-dossier-flow-smokes.yml")
script = Path(".github/scripts/finalize-dossier-flow-smokes.py")

replace_once(
    path,
    '''    await expect(page.getByRole("heading", { name: "Motivationsschreiben" })).toBeVisible();
    await page.getByRole("button", { name: "Meine Kontaktdaten", exact: true }).click();
    await expect(page.getByLabel("Vorname und Nachname")).toHaveValue("Lea Müller");
    await expect(page.getByLabel("PLZ und Ort")).toHaveValue("4500 Solothurn");
    await page.getByRole("button", { name: "Firma / Lehrbetrieb", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "Lehrbetrieb", exact: true })).toHaveValue(
      "Beispiel AG",
    );''',
    '''    await expect(page.getByRole("heading", { name: "Motivationsschreiben" })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const saved = JSON.parse(localStorage.getItem("anschreiben:v1") ?? "{}");
          return {
            name: saved.data?.absenderName,
            plzOrt: saved.data?.absenderPlzOrt,
            company: saved.data?.empfaengerFirma,
          };
        }),
      )
      .toEqual({ name: "Lea Müller", plzOrt: "4500 Solothurn", company: "Beispiel AG" });''',
    "inheritance hydration state",
)

replace_once(
    path,
    '''    await page.getByRole("button", { name: "Alles übernehmen" }).click();
    await expect(page.getByRole("textbox", { name: "Lehrbetrieb", exact: true })).toHaveValue(
      "Neue Beispiel AG",
    );
    await expect(preview).toHaveAttribute("data-letter-font", "serif");''',
    '''    await page.getByRole("button", { name: "Alles übernehmen" }).click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("anschreiben:v1") ?? "{}").data?.empfaengerFirma ?? "",
        ),
      )
      .toBe("Neue Beispiel AG");
    await expect(preview).toHaveAttribute("data-letter-font", "serif");''',
    "resync company state",
)

replace_once(
    path,
    '''    await seedCoreDossier(page);
    await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Meine Kontaktdaten", exact: true }).click();
    await expect(page.getByLabel("Vorname und Nachname")).toHaveValue("Lea Müller");

    const body = page.getByRole("textbox", { name: "Brieftext" });''',
    '''    await seedCoreDossier(page);
    await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Download", exact: true })).toHaveAttribute(
      "data-editor-ready",
      "true",
    );

    const body = page.getByRole("textbox", { name: "Brieftext" });''',
    "overflow hydration contract",
)

replace_once(
    path,
    '''    await seedCoreDossier(page);
    await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });
    // Das Feld wird erst clientseitig aus dem Dossier befüllt und ist damit unser Hydration-Signal.
    await page.getByRole("button", { name: "Meine Kontaktdaten", exact: true }).click();
    await expect(page.getByLabel("Vorname und Nachname")).toHaveValue("Lea Müller");

    await page.getByRole("button", { name: "Meine Kontaktdaten Rechts" }).click();''',
    '''    await seedCoreDossier(page);
    await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Download", exact: true })).toHaveAttribute(
      "data-editor-ready",
      "true",
    );
    await page.getByRole("button", { name: "Layout", exact: true }).click();

    await page.getByRole("button", { name: "Meine Kontaktdaten Rechts" }).click();''',
    "layout section contract",
)

workflow.unlink()
script.unlink()
