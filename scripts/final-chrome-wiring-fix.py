from pathlib import Path


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {count}\n--- old ---\n{old}")
    p.write_text(text.replace(old, new, 1))


def replace_all(path: str, old: str, new: str, minimum: int = 1):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count < minimum:
        raise SystemExit(f"{path}: expected at least {minimum} matches, found {count}\n--- old ---\n{old}")
    p.write_text(text.replace(old, new))
    return count


Path("src/lib/dossier-contact.ts").write_text(r'''import type { CoverData } from "@/components/cover/types";
import type { CvData } from "@/components/cv/types";
import type { LetterData } from "@/components/letter/types";
import {
  coverPdfDocumentFromSaved,
  cvPdfDocumentFromSaved,
  letterPdfDocumentFromSaved,
} from "@/lib/dossier-pdf-document";
import {
  COVER_STORAGE_KEY,
  CV_STORAGE_KEY,
  LETTER_STORAGE_KEY,
  readStoredDossierPart,
} from "@/lib/dossier-project";
import type { DossierChromeContact } from "@/lib/dossier-chrome";

const emptyContact = (): DossierChromeContact => ({
  name: "",
  address: "",
  place: "",
  phone: "",
  email: "",
});

const clean = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

export function dossierContactFromCover(data: CoverData | null | undefined): DossierChromeContact {
  if (!data) return emptyContact();
  return {
    name: [clean(data.vorname), clean(data.nachname)].filter(Boolean).join(" "),
    address: clean(data.adresse),
    place: clean(data.plzOrt),
    phone: clean(data.telefon),
    email: clean(data.email),
  };
}

export function dossierContactFromCv(data: CvData | null | undefined): DossierChromeContact {
  if (!data?.person) return emptyContact();
  const person = data.person;
  return {
    name: [clean(person.vorname), clean(person.nachname)].filter(Boolean).join(" "),
    address: clean(person.adresse),
    place: clean(person.plzOrt),
    phone: clean(person.telefon),
    email: clean(person.email),
  };
}

export function dossierContactFromLetter(
  data: LetterData | null | undefined,
): DossierChromeContact {
  if (!data) return emptyContact();
  return {
    name: clean(data.absenderName),
    address: clean(data.absenderAdresse),
    place: clean(data.absenderPlzOrt),
    phone: clean(data.absenderTelefon),
    email: clean(data.absenderEmail),
  };
}

/**
 * One dossier-level contact source for synchronized headers.
 *
 * Existing product semantics already prefer the title page for personal data,
 * then the CV, then the motivation letter. Resolve field-by-field so a partly
 * filled title page can still use missing contact details from the CV/letter.
 */
export function resolveDossierContact({
  cover,
  cv,
  letter,
}: {
  cover?: CoverData | null;
  cv?: CvData | null;
  letter?: LetterData | null;
}): DossierChromeContact {
  const sources = [
    dossierContactFromCover(cover),
    dossierContactFromCv(cv),
    dossierContactFromLetter(letter),
  ];
  const pick = (key: keyof DossierChromeContact) =>
    sources.map((source) => source[key]).find((value) => !!value) ?? "";
  return {
    name: pick("name"),
    address: pick("address"),
    place: pick("place"),
    phone: pick("phone"),
    email: pick("email"),
  };
}

/**
 * Resolve the same synchronized header contact in either editor. The currently
 * edited document can be supplied as an override so its in-memory changes do
 * not have to wait for autosave before the header updates.
 */
export function readDossierContact({
  cover,
  cv,
  letter,
}: {
  cover?: CoverData | null;
  cv?: CvData | null;
  letter?: LetterData | null;
} = {}): DossierChromeContact {
  const storedCover =
    cover === undefined
      ? coverPdfDocumentFromSaved(readStoredDossierPart(COVER_STORAGE_KEY))?.data
      : cover;
  const storedCv =
    cv === undefined ? cvPdfDocumentFromSaved(readStoredDossierPart(CV_STORAGE_KEY))?.data : cv;
  const storedLetter =
    letter === undefined
      ? letterPdfDocumentFromSaved(readStoredDossierPart(LETTER_STORAGE_KEY))?.data
      : letter;
  return resolveDossierContact({ cover: storedCover, cv: storedCv, letter: storedLetter });
}
''')

# No nested chrome mirror in normal letter persistence anymore.
replace_once(
    "src/lib/dossier-chrome.ts",
    '''    const design = parsed.design;
    const designMatches =
      design.headerMode === options.headerMode &&
      design.headerShowName === options.headerShowName &&
      design.headerShowAddress === options.headerShowAddress &&
      design.headerShowPhone === options.headerShowPhone &&
      design.headerShowEmail === options.headerShowEmail &&
      design.footerMode === footerMode;
    const nestedChromeMatches =
      isRecord(parsed.chrome) &&
      JSON.stringify(normalizeDossierChromeState(parsed.chrome)) === JSON.stringify(next);
    if (designMatches && nestedChromeMatches) return;

    window.localStorage.setItem(
      LETTER_STORAGE_KEY,
      JSON.stringify({
        ...parsed,
        // Bestehende v1-Briefe dürfen die Information weiter mittragen, aber
        // diese Kopie ist nur noch Spiegel der kanonischen Dossier-Einstellung.
        chrome: next,
        design: {
          ...design,
          headerMode: options.headerMode,
          headerShowName: options.headerShowName,
          headerShowAddress: options.headerShowAddress,
          headerShowPhone: options.headerShowPhone,
          headerShowEmail: options.headerShowEmail,
          footerMode,
        },
      }),
    );''',
    '''    const design = parsed.design;
    const designMatches =
      design.headerMode === options.headerMode &&
      design.headerShowName === options.headerShowName &&
      design.headerShowAddress === options.headerShowAddress &&
      design.headerShowPhone === options.headerShowPhone &&
      design.headerShowEmail === options.headerShowEmail &&
      design.footerMode === footerMode;
    if (designMatches && parsed.chrome == null) return;

    const nextLetter = {
      ...parsed,
      design: {
        ...design,
        headerMode: options.headerMode,
        headerShowName: options.headerShowName,
        headerShowAddress: options.headerShowAddress,
        headerShowPhone: options.headerShowPhone,
        headerShowEmail: options.headerShowEmail,
        footerMode,
      },
    };
    // `bewerbungsdossier:chrome:v1` is the only live authority. Strip old
    // embedded copies whenever the compatibility design mirror is touched.
    delete nextLetter.chrome;
    window.localStorage.setItem(LETTER_STORAGE_KEY, JSON.stringify(nextLetter));''',
)

# CV canvas accepts an explicit shared contact snapshot.
replace_once(
    "src/components/cv/CvCanvas.tsx",
    '''type Props = Omit<BaseProps, "chromeOptions" | "chromeContact"> & {
  chromeOptions?: DossierChromeOptions;
};''',
    '''type Props = Omit<BaseProps, "chromeOptions" | "chromeContact"> & {
  chromeOptions?: DossierChromeOptions;
  chromeContact?: DossierChromeContact;
};''',
)
replace_once(
    "src/components/cv/CvCanvas.tsx",
    '''export function CvCanvas({ chromeOptions = DEFAULT_DOSSIER_CHROME_OPTIONS, ...props }: Props) {
  const contact = useMemo(() => contactFromCv(props.data), [props.data]);
  const data = useMemo(() => cvBodyData(props.data, chromeOptions), [props.data, chromeOptions]);

  return (
    <BaseCvCanvas {...props} data={data} chromeOptions={chromeOptions} chromeContact={contact} />
  );
}''',
    '''export function CvCanvas({
  chromeOptions = DEFAULT_DOSSIER_CHROME_OPTIONS,
  chromeContact,
  ...props
}: Props) {
  const localContact = useMemo(() => contactFromCv(props.data), [props.data]);
  const data = useMemo(() => cvBodyData(props.data, chromeOptions), [props.data, chromeOptions]);

  return (
    <BaseCvCanvas
      {...props}
      data={data}
      chromeOptions={chromeOptions}
      chromeContact={chromeContact ?? localContact}
    />
  );
}''',
)

# Letter canvas accepts the same explicit shared contact snapshot.
replace_once(
    "src/components/letter/LetterCanvas.tsx",
    '''import type { DossierChromeOptions } from "@/lib/dossier-chrome";''',
    '''import type { DossierChromeContact, DossierChromeOptions } from "@/lib/dossier-chrome";''',
)
replace_once(
    "src/components/letter/LetterCanvas.tsx",
    '''  chromeOptions,
  onOverflowChange,''',
    '''  chromeOptions,
  chromeContact,
  onOverflowChange,''',
)
replace_once(
    "src/components/letter/LetterCanvas.tsx",
    '''  chromeOptions?: DossierChromeOptions;
  onOverflowChange?: (overflow: boolean) => void;''',
    '''  chromeOptions?: DossierChromeOptions;
  chromeContact?: DossierChromeContact;
  onOverflowChange?: (overflow: boolean) => void;''',
)
replace_once(
    "src/components/letter/LetterCanvas.tsx",
    '''        contact={{
          name: data.absenderName,
          address: data.absenderAdresse,
          place: data.absenderPlzOrt,
          phone: data.absenderTelefon,
          email: data.absenderEmail,
        }}''',
    '''        contact={
          chromeContact ?? {
            name: data.absenderName,
            address: data.absenderAdresse,
            place: data.absenderPlzOrt,
            phone: data.absenderTelefon,
            email: data.absenderEmail,
          }
        }''',
)

# Combined PDF resolves one contact once and passes it to both document renderers.
replace_once(
    "src/components/dossier/DossierPdfCanvas.tsx",
    '''import { DEFAULT_DOSSIER_CHROME_STATE, type DossierChromeState } from "@/lib/dossier-chrome";''',
    '''import { DEFAULT_DOSSIER_CHROME_STATE, type DossierChromeState } from "@/lib/dossier-chrome";
import { resolveDossierContact } from "@/lib/dossier-contact";''',
)
replace_once(
    "src/components/dossier/DossierPdfCanvas.tsx",
    '''  const storedLetter =
    letter === undefined
      ? letterPdfDocumentFromSaved(readStoredDossierPart(LETTER_STORAGE_KEY))
      : letter;

  return (''',
    '''  const storedLetter =
    letter === undefined
      ? letterPdfDocumentFromSaved(readStoredDossierPart(LETTER_STORAGE_KEY))
      : letter;
  const sharedChromeContact = chromeState.sync
    ? resolveDossierContact({
        cover: cover?.data,
        cv: cv?.data,
        letter: storedLetter?.data,
      })
    : undefined;

  return (''',
)
replace_once(
    "src/components/dossier/DossierPdfCanvas.tsx",
    '''            chromeOptions={letterChromeOptions}
            exportMode''',
    '''            chromeOptions={letterChromeOptions}
            chromeContact={sharedChromeContact}
            exportMode''',
)
replace_once(
    "src/components/dossier/DossierPdfCanvas.tsx",
    '''          chromeOptions={cvChromeOptions}
          elements={cv.elements}''',
    '''          chromeOptions={cvChromeOptions}
          chromeContact={sharedChromeContact}
          elements={cv.elements}''',
)

# Letter route: canonical store is the only normal persistence source; history keeps scoped chrome.
replace_once(
    "src/routes/anschreiben.tsx",
    '''import { readPhoto } from "@/lib/image";''',
    '''import { readPhoto } from "@/lib/image";
import { readDossierContact } from "@/lib/dossier-contact";''',
)
replace_all(
    "src/routes/anschreiben.tsx",
    '''        if (parsed.chrome) applyPortableDossierChromeState(parsed.chrome);
''',
    '''''',
    minimum=2,
)
replace_once(
    "src/routes/anschreiben.tsx",
    '''  const chromeOptions = chromeState.sync ? chromeState.shared : chromeState.letter;
  const [hydrated, setHydrated] = useState(false);''',
    '''  const chromeOptions = chromeState.sync ? chromeState.shared : chromeState.letter;
  const [hydrated, setHydrated] = useState(false);''',
)
# Insert shared contact after all state declarations but before render-use; using data is already initialized.
replace_once(
    "src/routes/anschreiben.tsx",
    '''  const refreshSource = useCallback(() => {
    const next = readLetterDossierSource();''',
    '''  const chromeContact = chromeState.sync ? readDossierContact({ letter: data }) : undefined;

  const refreshSource = useCallback(() => {
    const next = readLetterDossierSource();''',
)
replace_once(
    "src/routes/anschreiben.tsx",
    '''  const snapshotPayload = useCallback(
    (): SavedLetter => ({ version: 1, data, design, chrome: chromeState }),
    [data, design, chromeState],
  );

  const keepSnapshot = useCallback(
    (label: string, force = false) => {
      const payload = snapshotPayload() as unknown as Record<string, unknown>;
      if (!hasContent(payload)) return;
      setHistory(pushSnapshot(HISTORY_KEYS.letter, payload, label, force));
    },
    [snapshotPayload],
  );''',
    '''  const snapshotPayload = useCallback(
    (): SavedLetter => ({ version: 1, data, design }),
    [data, design],
  );

  const historyPayload = useCallback(
    () => ({ ...snapshotPayload(), chrome: chromeState }) as unknown as Record<string, unknown>,
    [snapshotPayload, chromeState],
  );

  const keepSnapshot = useCallback(
    (label: string, force = false) => {
      const payload = historyPayload();
      if (!hasContent(payload)) return;
      setHistory(pushSnapshot(HISTORY_KEYS.letter, payload, label, force));
    },
    [historyPayload],
  );''',
)
replace_all(
    "src/routes/anschreiben.tsx",
    '''                chromeOptions={chromeOptions}
''',
    '''                chromeOptions={chromeOptions}
                chromeContact={chromeContact}
''',
    minimum=1,
)
# Standalone export indentation differs.
replace_all(
    "src/routes/anschreiben.tsx",
    '''            chromeOptions={chromeOptions}
            exportMode''',
    '''            chromeOptions={chromeOptions}
            chromeContact={chromeContact}
            exportMode''',
    minimum=1,
)

# CV route uses the same dossier contact whenever synchronization is on.
replace_once(
    "src/routes/lebenslauf.tsx",
    '''import { registerCabinPdfFonts } from "@/lib/pdf-fonts";''',
    '''import { registerCabinPdfFonts } from "@/lib/pdf-fonts";
import { readDossierContact } from "@/lib/dossier-contact";''',
)
replace_once(
    "src/routes/lebenslauf.tsx",
    '''  const chromeOptions = chromeState.sync ? chromeState.shared : chromeState.cv;
  const [data, setData] = useState<CvData>(emptyCv);''',
    '''  const chromeOptions = chromeState.sync ? chromeState.shared : chromeState.cv;
  const [data, setData] = useState<CvData>(emptyCv);''',
)
replace_once(
    "src/routes/lebenslauf.tsx",
    '''  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));''',
    '''  const chromeContact = chromeState.sync ? readDossierContact({ cv: data }) : undefined;

  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));''',
)
replace_all(
    "src/routes/lebenslauf.tsx",
    '''      chromeOptions={chromeOptions}
      elements={elements}''',
    '''      chromeOptions={chromeOptions}
      chromeContact={chromeContact}
      elements={elements}''',
    minimum=1,
)
replace_all(
    "src/routes/lebenslauf.tsx",
    '''          chromeOptions={chromeOptions}
          elements={elements}''',
    '''          chromeOptions={chromeOptions}
          chromeContact={chromeContact}
          elements={elements}''',
    minimum=1,
)

# Browser contract: stale nested copies disappear instead of being mirrored.
replace_once(
    "tests/e2e/dossier-chrome-sync.spec.ts",
    '''    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("anschreiben:v1") ?? "null")?.chrome?.shared
              ?.headerMode,
        ),
      )
      .toBe("contact");''',
    '''    await expect
      .poll(() =>
        page.evaluate(() => JSON.parse(localStorage.getItem("anschreiben:v1") ?? "null")?.chrome),
      )
      .toBeUndefined();''',
)
# Add a common-contact/split/rejoin browser test before the last existing test.
marker = '''  test("CV contact header owns integrated fields exactly once and leaves unchecked fields in the body", async ({
    page,
  }) => {'''
addition = r'''  test("sync uses one dossier contact source, splits cleanly, and rejoins from the active branch", async ({
    page,
  }) => {
    await seedCv(page);
    await page.evaluate(() => {
      localStorage.setItem(
        "anschreiben:v1",
        JSON.stringify({
          version: 1,
          data: {
            absenderName: "Andere Person",
            absenderAdresse: "Briefweg 9",
            absenderPlzOrt: "3000 Bern",
            absenderTelefon: "+41 31 000 00 00",
            absenderEmail: "anderes@example.ch",
            betreff: "Bewerbung Informatik",
            text: "Motivation",
          },
          design: { template: "brief", colors: {}, font: "freundlich" },
        }),
      );
    });
    await page.reload({ waitUntil: "domcontentloaded" });

    const cv = previewCv(page);
    const controls = cvControls(page);
    await controls.locator('[data-cv-header-mode-control]').selectOption("contact");
    await expect(cv.locator("[data-dossier-integrated-contact]").first()).toContainText("Lea Müller");
    await expect(cv.locator("[data-dossier-integrated-contact]").first()).not.toContainText(
      "Andere Person",
    );

    await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });
    const letterHeader = page.locator("[data-dossier-integrated-contact]").first();
    await expect(letterHeader).toContainText("Lea Müller");
    await expect(letterHeader).not.toContainText("Andere Person");

    await page.getByRole("button", { name: "Layout", exact: true }).click();
    const letterControls = page.locator('[data-dossier-chrome-controls="letter"]');
    await letterControls.locator('[data-dossier-chrome-sync]').uncheck();
    await expect(letterHeader).toContainText("Andere Person");
    await letterControls.locator('[data-letter-header-mode-control]').selectOption("none");

    await page.goto(`${BASE_URL}/lebenslauf`, { waitUntil: "domcontentloaded" });
    await expect(previewCv(page).locator('[data-dossier-chrome="cv"]').first()).toHaveAttribute(
      "data-dossier-header-mode",
      "contact",
    );

    const cvControlsAfterSplit = cvControls(page);
    await cvControlsAfterSplit.locator('[data-dossier-chrome-sync]').check();
    await expect
      .poll(() =>
        page.evaluate(
          (key) => JSON.parse(localStorage.getItem(key) ?? "null")?.shared?.headerMode,
          CHROME_KEY,
        ),
      )
      .toBe("contact");

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(previewCv(page).locator('[data-dossier-chrome="cv"]').first()).toHaveAttribute(
      "data-dossier-header-mode",
      "contact",
    );
    await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-dossier-integrated-contact]").first()).toContainText("Lea Müller");
  });

'''
replace_once("tests/e2e/dossier-chrome-sync.spec.ts", marker, addition + marker)

# Existing dossier project roundtrip now explicitly guards chrome persistence.
replace_once(
    "tests/e2e/dossier-state-roundtrip.spec.ts",
    '''    await page.goto(`${BASE_URL}/titelblatt`, { waitUntil: "domcontentloaded" });
    const titleDownload = page.getByRole("button", { name: "Download", exact: true });''',
    '''    await page.evaluate(() => {
      localStorage.setItem(
        "bewerbungsdossier:chrome:v1",
        JSON.stringify({
          version: 1,
          sync: false,
          shared: {
            headerMode: "compact",
            headerShowName: true,
            headerShowAddress: true,
            headerShowPhone: true,
            headerShowEmail: true,
            footerMode: "compact",
          },
          cv: {
            headerMode: "contact",
            headerShowName: true,
            headerShowAddress: true,
            headerShowPhone: false,
            headerShowEmail: true,
            footerMode: "details",
          },
          letter: {
            headerMode: "none",
            headerShowName: true,
            headerShowAddress: false,
            headerShowPhone: true,
            headerShowEmail: false,
            footerMode: "none",
          },
        }),
      );
    });

    await page.goto(`${BASE_URL}/titelblatt`, { waitUntil: "domcontentloaded" });
    const titleDownload = page.getByRole("button", { name: "Download", exact: true });''',
)
replace_once(
    "tests/e2e/dossier-state-roundtrip.spec.ts",
    '''    const before = await page.evaluate(() => ({
      cover: JSON.parse(localStorage.getItem("titelblatt:v3") ?? "null"),
      letter: JSON.parse(localStorage.getItem("anschreiben:v1") ?? "null"),
      cv: JSON.parse(localStorage.getItem("lebenslauf:v1") ?? "null"),
    }));''',
    '''    const before = await page.evaluate(() => ({
      cover: JSON.parse(localStorage.getItem("titelblatt:v3") ?? "null"),
      letter: JSON.parse(localStorage.getItem("anschreiben:v1") ?? "null"),
      cv: JSON.parse(localStorage.getItem("lebenslauf:v1") ?? "null"),
      chrome: JSON.parse(localStorage.getItem("bewerbungsdossier:chrome:v1") ?? "null"),
    }));''',
)
replace_once(
    "tests/e2e/dossier-state-roundtrip.spec.ts",
    '''    expect(before.cv?.data?.person?.vorname).toBe("Lea");''',
    '''    expect(before.cv?.data?.person?.vorname).toBe("Lea");
    expect(before.chrome?.sync).toBe(false);
    expect(before.chrome?.cv?.headerMode).toBe("contact");
    expect(before.chrome?.letter?.headerMode).toBe("none");''',
)
replace_once(
    "tests/e2e/dossier-state-roundtrip.spec.ts",
    '''          mirrored: localStorage.getItem("lebenslauf:layout-mirror:v1"),
        })),''',
    '''          mirrored: localStorage.getItem("lebenslauf:layout-mirror:v1"),
          chrome: JSON.parse(localStorage.getItem("bewerbungsdossier:chrome:v1") ?? "null"),
        })),''',
)
replace_once(
    "tests/e2e/dossier-state-roundtrip.spec.ts",
    '''        mirrored: "true",
      });''',
    '''        mirrored: "true",
        chrome: before.chrome,
      });''',
)

Path("tests/unit/dossier-contact.test.ts").write_text(r'''import { describe, expect, test } from "bun:test";
import { emptyCv } from "@/components/cv/types";
import { EMPTY_LETTER } from "@/components/letter/types";
import { resolveDossierContact } from "@/lib/dossier-contact";

const cover = {
  meta: { title: "", author: "", subject: "", keywords: "" },
  kicker: "",
  eyebrow: "",
  beruf: "",
  lehrbeginn: "",
  vorname: "Lea",
  nachname: "Müller",
  adresse: "Dorfstrasse 12",
  plzOrt: "",
  telefon: "",
  email: "lea.cover@example.ch",
  geburtsdatum: "",
  lehrbetrieb: "",
  ansprechperson: "",
  betriebAdresse: "",
  ort: "",
  datum: "",
  labelKontakt: "",
  labelEmpfaenger: "",
  foto: null,
};

describe("shared dossier contact", () => {
  test("resolves one field-wise contact with cover -> CV -> letter priority", () => {
    const cv = {
      ...emptyCv,
      person: {
        ...emptyCv.person,
        vorname: "CV",
        nachname: "Person",
        adresse: "CV-Weg 5",
        plzOrt: "4500 Solothurn",
        telefon: "+41 79 111 22 33",
        email: "cv@example.ch",
      },
    };
    const letter = {
      ...EMPTY_LETTER,
      absenderName: "Brief Person",
      absenderAdresse: "Briefweg 9",
      absenderPlzOrt: "3000 Bern",
      absenderTelefon: "+41 31 000 00 00",
      absenderEmail: "brief@example.ch",
    };

    expect(resolveDossierContact({ cover, cv, letter })).toEqual({
      name: "Lea Müller",
      address: "Dorfstrasse 12",
      place: "4500 Solothurn",
      phone: "+41 79 111 22 33",
      email: "lea.cover@example.ch",
    });
  });

  test("falls back to the motivation letter when no cover or CV contact exists", () => {
    const letter = {
      ...EMPTY_LETTER,
      absenderName: "Brief Person",
      absenderAdresse: "Briefweg 9",
      absenderPlzOrt: "3000 Bern",
      absenderTelefon: "+41 31 000 00 00",
      absenderEmail: "brief@example.ch",
    };
    expect(resolveDossierContact({ letter })).toEqual({
      name: "Brief Person",
      address: "Briefweg 9",
      place: "3000 Bern",
      phone: "+41 31 000 00 00",
      email: "brief@example.ch",
    });
  });
});
''')

print("final chrome wiring patch applied")
