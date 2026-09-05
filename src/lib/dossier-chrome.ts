export type DossierChromeScope = "cv" | "letter";
export type DossierHeaderMode = "compact" | "contact" | "none";
export type DossierFooterMode = "compact" | "details" | "none";

export type DossierChromeOptions = {
  headerMode: DossierHeaderMode;
  headerShowName: boolean;
  headerShowAddress: boolean;
  headerShowPhone: boolean;
  headerShowEmail: boolean;
  footerMode: DossierFooterMode;
};

export type DossierChromeState = {
  version: 1;
  sync: boolean;
  shared: DossierChromeOptions;
  cv: DossierChromeOptions;
  letter: DossierChromeOptions;
};

export type DossierChromeContact = {
  name: string;
  address: string;
  place: string;
  phone: string;
  email: string;
};

export const DOSSIER_CHROME_STORAGE_KEY = "bewerbungsdossier:chrome:v1";
const LETTER_STORAGE_KEY = "anschreiben:v1";
const EVENT = "bewerbungsdossier-chrome-change";

export const DEFAULT_DOSSIER_CHROME_OPTIONS: DossierChromeOptions = {
  headerMode: "compact",
  headerShowName: true,
  headerShowAddress: true,
  headerShowPhone: true,
  headerShowEmail: true,
  footerMode: "compact",
};

export const DEFAULT_DOSSIER_CHROME_STATE: DossierChromeState = {
  version: 1,
  sync: true,
  shared: { ...DEFAULT_DOSSIER_CHROME_OPTIONS },
  cv: { ...DEFAULT_DOSSIER_CHROME_OPTIONS },
  letter: { ...DEFAULT_DOSSIER_CHROME_OPTIONS },
};

const EMPTY_CONTACT: DossierChromeContact = {
  name: "",
  address: "",
  place: "",
  phone: "",
  email: "",
};

let cached: DossierChromeState | null = null;
let currentCvContact: DossierChromeContact = EMPTY_CONTACT;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

function normalizeOptions(value: unknown, fallback = DEFAULT_DOSSIER_CHROME_OPTIONS): DossierChromeOptions {
  if (!isRecord(value)) return { ...fallback };
  return {
    headerMode:
      value.headerMode === "contact" || value.headerMode === "none"
        ? value.headerMode
        : "compact",
    headerShowName: value.headerShowName !== false,
    headerShowAddress: value.headerShowAddress !== false,
    headerShowPhone: value.headerShowPhone !== false,
    headerShowEmail: value.headerShowEmail !== false,
    footerMode:
      value.footerMode === "details" || value.footerMode === "none"
        ? value.footerMode
        : "compact",
  };
}

function optionsFromSavedLetter(storage: Storage): DossierChromeOptions | null {
  try {
    const raw = storage.getItem(LETTER_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !isRecord(parsed.design)) return null;
    const design = parsed.design;
    return normalizeOptions({
      headerMode: design.headerMode,
      headerShowName: design.headerShowName,
      headerShowAddress: design.headerShowAddress,
      headerShowPhone: design.headerShowPhone,
      headerShowEmail: design.headerShowEmail,
      footerMode: design.footerMode === "attachments" ? "details" : design.footerMode,
    });
  } catch {
    return null;
  }
}

export function normalizeDossierChromeState(value: unknown): DossierChromeState {
  if (!isRecord(value)) return { ...DEFAULT_DOSSIER_CHROME_STATE };
  const shared = normalizeOptions(value.shared);
  return {
    version: 1,
    sync: value.sync !== false,
    shared,
    cv: normalizeOptions(value.cv, shared),
    letter: normalizeOptions(value.letter, shared),
  };
}

function read(): DossierChromeState {
  if (typeof window === "undefined") return DEFAULT_DOSSIER_CHROME_STATE;
  try {
    const raw = window.localStorage.getItem(DOSSIER_CHROME_STORAGE_KEY);
    if (raw) return normalizeDossierChromeState(JSON.parse(raw));

    // Ein bestehendes Anschreiben behält seine bisherige Kopf-/Fusswahl. Beim
    // ersten Start des gemeinsamen Systems wird sie zur gemeinsamen Vorgabe.
    const migrated = optionsFromSavedLetter(window.localStorage);
    if (migrated) {
      return {
        version: 1,
        sync: true,
        shared: migrated,
        cv: { ...migrated },
        letter: { ...migrated },
      };
    }
  } catch {
    // Blockierter oder beschädigter Storage fällt auf sichere Defaults zurück.
  }
  return DEFAULT_DOSSIER_CHROME_STATE;
}

function store(next: DossierChromeState) {
  cached = next;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DOSSIER_CHROME_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Der laufende Tab reagiert weiterhin über das Event.
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function getDossierChromeState(): DossierChromeState {
  if (!cached) cached = read();
  return cached;
}

export function getDossierChromeOptions(scope: DossierChromeScope): DossierChromeOptions {
  const state = getDossierChromeState();
  return state.sync ? state.shared : state[scope];
}

export function patchDossierChrome(scope: DossierChromeScope, patch: Partial<DossierChromeOptions>) {
  const current = getDossierChromeState();
  if (current.sync) {
    store({ ...current, shared: normalizeOptions({ ...current.shared, ...patch }, current.shared) });
    return;
  }
  store({
    ...current,
    [scope]: normalizeOptions({ ...current[scope], ...patch }, current[scope]),
  });
}

export function setDossierChromeSync(scope: DossierChromeScope, sync: boolean) {
  const current = getDossierChromeState();
  if (current.sync === sync) return;
  if (sync) {
    const source = current[scope];
    store({ ...current, sync: true, shared: { ...source } });
    return;
  }
  store({
    ...current,
    sync: false,
    cv: { ...current.shared },
    letter: { ...current.shared },
  });
}

export function subscribeDossierChrome(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const local = () => onChange();
  const storage = (event: StorageEvent) => {
    if (event.key !== DOSSIER_CHROME_STORAGE_KEY) return;
    cached = read();
    onChange();
  };
  window.addEventListener(EVENT, local);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(EVENT, local);
    window.removeEventListener("storage", storage);
  };
}

export function readPortableDossierChromeState(): DossierChromeState {
  return getDossierChromeState();
}

export function applyPortableDossierChromeState(value: unknown) {
  store(normalizeDossierChromeState(value));
}

export function effectiveDossierHeaderMode(
  scope: DossierChromeScope,
  pageIndex = 0,
): DossierHeaderMode {
  const requested = getDossierChromeOptions(scope).headerMode;
  if (pageIndex === 0) return requested;
  return requested === "none" ? "none" : "compact";
}

export function dossierHeaderContentTopMm(scope: DossierChromeScope, pageIndex = 0): number {
  const mode = effectiveDossierHeaderMode(scope, pageIndex);
  if (pageIndex > 0) return mode === "none" ? 16 : 18;
  if (mode === "contact") return 31;
  return mode === "none" ? 18 : 21;
}

export function dossierHeaderVisualHeightMm(scope: DossierChromeScope, pageIndex = 0): number {
  const mode = effectiveDossierHeaderMode(scope, pageIndex);
  if (mode === "contact") return 22;
  if (mode === "compact") return 3;
  return 0;
}

export function dossierFooterContentBottomMm(scope: DossierChromeScope): number {
  const mode = getDossierChromeOptions(scope).footerMode;
  if (mode === "none") return 10;
  return mode === "details" ? 20 : 17;
}

export function dossierFooterVisualHeightMm(scope: DossierChromeScope): number {
  const mode = getDossierChromeOptions(scope).footerMode;
  if (mode === "none") return 0;
  return mode === "details" ? 10 : 2.4;
}

export function setCurrentCvChromeContact(person: {
  vorname?: string;
  nachname?: string;
  adresse?: string;
  plzOrt?: string;
  telefon?: string;
  email?: string;
}) {
  currentCvContact = {
    name: [person.vorname, person.nachname].filter(Boolean).join(" "),
    address: person.adresse ?? "",
    place: person.plzOrt ?? "",
    phone: person.telefon ?? "",
    email: person.email ?? "",
  };
}

export function getCurrentCvChromeContact(): DossierChromeContact {
  return currentCvContact;
}
