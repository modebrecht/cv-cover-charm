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

export type DossierChromeHistorySnapshot = {
  version: 1;
  scope: DossierChromeScope;
  options: DossierChromeOptions;
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

let cached: DossierChromeState | null = null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

function normalizeOptions(
  value: unknown,
  fallback = DEFAULT_DOSSIER_CHROME_OPTIONS,
): DossierChromeOptions {
  if (!isRecord(value)) return { ...fallback };
  return {
    headerMode:
      value.headerMode === "contact" || value.headerMode === "none" ? value.headerMode : "compact",
    headerShowName: value.headerShowName !== false,
    headerShowAddress: value.headerShowAddress !== false,
    headerShowPhone: value.headerShowPhone !== false,
    headerShowEmail: value.headerShowEmail !== false,
    footerMode:
      value.footerMode === "details" || value.footerMode === "none" ? value.footerMode : "compact",
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
  if (!isRecord(value)) {
    return {
      ...DEFAULT_DOSSIER_CHROME_STATE,
      shared: { ...DEFAULT_DOSSIER_CHROME_STATE.shared },
      cv: { ...DEFAULT_DOSSIER_CHROME_STATE.cv },
      letter: { ...DEFAULT_DOSSIER_CHROME_STATE.letter },
    };
  }
  const shared = normalizeOptions(value.shared);
  return {
    version: 1,
    sync: value.sync !== false,
    shared,
    cv: normalizeOptions(value.cv, shared),
    letter: normalizeOptions(value.letter, shared),
  };
}

/**
 * History is document-scoped. Persist only the effective chrome options of the
 * document that owns the history entry; never capture another document's
 * independent branch or the global sync flag.
 *
 * Existing history entries may still contain a full DossierChromeState. Passing
 * one here migrates it to the compact, scope-safe representation in memory.
 */
export function createDossierChromeHistorySnapshot(
  value: unknown,
  scope: DossierChromeScope,
): DossierChromeHistorySnapshot {
  if (isRecord(value) && value.scope === scope && isRecord(value.options)) {
    return {
      version: 1,
      scope,
      options: normalizeOptions(value.options),
    };
  }

  const state = normalizeDossierChromeState(value);
  const options = state.sync ? state.shared : state[scope];
  return {
    version: 1,
    scope,
    options: { ...options },
  };
}

/**
 * Restore one history snapshot into the current chrome topology. The current
 * sync mode stays authoritative: with sync off only the owning document branch
 * changes; with sync on only the shared branch changes. Latent CV/letter
 * branches are never rolled back by another document's history.
 */
export function restoreDossierChromeHistoryState(
  current: DossierChromeState,
  value: unknown,
): DossierChromeState {
  if (
    !isRecord(value) ||
    (value.scope !== "cv" && value.scope !== "letter") ||
    !isRecord(value.options)
  ) {
    return current;
  }

  const scope = value.scope as DossierChromeScope;
  const fallback = current.sync ? current.shared : current[scope];
  const options = normalizeOptions(value.options, fallback);

  if (current.sync) {
    return {
      ...current,
      shared: options,
    };
  }

  return {
    ...current,
    [scope]: options,
  };
}

function read(): DossierChromeState {
  if (typeof window === "undefined") return normalizeDossierChromeState(null);
  try {
    const raw = window.localStorage?.getItem(DOSSIER_CHROME_STORAGE_KEY);
    if (raw) return normalizeDossierChromeState(JSON.parse(raw));

    // Ein bestehendes Anschreiben behält seine bisherige Kopf-/Fusswahl. Beim
    // ersten Start des gemeinsamen Systems wird sie zur gemeinsamen Vorgabe.
    if (window.localStorage) {
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
    }
  } catch {
    // Blockierter oder beschädigter Storage fällt auf sichere Defaults zurück.
  }
  return normalizeDossierChromeState(null);
}

function mirrorLegacyLetterDesign(next: DossierChromeState) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const raw = window.localStorage.getItem(LETTER_STORAGE_KEY);
    if (!raw) return;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !isRecord(parsed.design)) return;

    const options = next.sync ? next.shared : next.letter;
    const footerMode = options.footerMode === "details" ? "attachments" : options.footerMode;
    const design = parsed.design;
    const designMatches =
      design.headerMode === options.headerMode &&
      design.headerShowName === options.headerShowName &&
      design.headerShowAddress === options.headerShowAddress &&
      design.headerShowPhone === options.headerShowPhone &&
      design.headerShowEmail === options.headerShowEmail &&
      design.footerMode === footerMode;
    if (designMatches && parsed.chrome == null) return;

    const nextLetter: Record<string, unknown> = {
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
    window.localStorage.setItem(LETTER_STORAGE_KEY, JSON.stringify(nextLetter));
  } catch {
    // Der neue gemeinsame Speicher bleibt die kanonische Quelle. Die Spiegelung
    // existiert nur für ältere Einzelbrief-Stände und Browser-Automation.
  }
}

function store(next: DossierChromeState) {
  cached = next;
  if (typeof window === "undefined") return;
  try {
    window.localStorage?.setItem(DOSSIER_CHROME_STORAGE_KEY, JSON.stringify(next));
    mirrorLegacyLetterDesign(next);
  } catch {
    // Der laufende Tab reagiert weiterhin über das Event.
  }
  if (typeof window.dispatchEvent === "function" && typeof CustomEvent !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT));
  }
}

export function getDossierChromeState(): DossierChromeState {
  if (!cached) cached = read();
  return cached;
}

export function getDossierChromeOptions(scope: DossierChromeScope): DossierChromeOptions {
  const state = getDossierChromeState();
  return state.sync ? state.shared : state[scope];
}

export function patchDossierChromeState(
  state: DossierChromeState,
  scope: DossierChromeScope,
  patch: Partial<DossierChromeOptions>,
): DossierChromeState {
  if (state.sync) {
    return {
      ...state,
      shared: normalizeOptions({ ...state.shared, ...patch }, state.shared),
    };
  }
  return {
    ...state,
    [scope]: normalizeOptions({ ...state[scope], ...patch }, state[scope]),
  };
}

export function patchDossierChrome(
  scope: DossierChromeScope,
  patch: Partial<DossierChromeOptions>,
) {
  store(patchDossierChromeState(getDossierChromeState(), scope, patch));
}

export function setDossierChromeSyncState(
  state: DossierChromeState,
  scope: DossierChromeScope,
  sync: boolean,
): DossierChromeState {
  if (state.sync === sync) return state;
  if (sync) {
    const source = state[scope];
    return { ...state, sync: true, shared: { ...source } };
  }
  return {
    ...state,
    sync: false,
    cv: { ...state.shared },
    letter: { ...state.shared },
  };
}

export function setDossierChromeSync(scope: DossierChromeScope, sync: boolean) {
  store(setDossierChromeSyncState(getDossierChromeState(), scope, sync));
}

export function subscribeDossierChrome(onChange: () => void) {
  if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
    return () => {};
  }
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

export function applyPortableDossierChromeState(
  value: unknown,
  { replaceExisting = false }: { replaceExisting?: boolean } = {},
) {
  const current = getDossierChromeState();
  const historyRestored = restoreDossierChromeHistoryState(current, value);
  if (historyRestored !== current) {
    store(historyRestored);
    return;
  }

  if (!replaceExisting && typeof window !== "undefined") {
    try {
      const existing = window.localStorage?.getItem(DOSSIER_CHROME_STORAGE_KEY);
      if (existing) {
        // Ein eingebetteter Letter-Snapshot ist nur noch Kompatibilitätsdaten.
        // Sobald die dedizierte Dossier-Quelle existiert, darf er sie nicht
        // beim Öffnen oder bei einem Fokuswechsel zurückrollen.
        cached = normalizeDossierChromeState(JSON.parse(existing));
        return;
      }
    } catch {
      // Beschädigter kanonischer Speicher darf durch einen portablen Stand
      // repariert werden.
    }
  }
  store(normalizeDossierChromeState(value));
}

export function effectiveDossierHeaderModeForOptions(
  options: DossierChromeOptions,
  pageIndex = 0,
): DossierHeaderMode {
  const requested = options.headerMode;
  if (pageIndex === 0) return requested;
  return requested === "none" ? "none" : "compact";
}

export function dossierHeaderContentTopMmForOptions(
  options: DossierChromeOptions,
  pageIndex = 0,
): number {
  const mode = effectiveDossierHeaderModeForOptions(options, pageIndex);
  if (pageIndex > 0) return mode === "none" ? 16 : 18;
  if (mode === "contact") return 31;
  if (mode === "none") return 18;
  return 21;
}

export function dossierHeaderVisualHeightMmForOptions(
  options: DossierChromeOptions,
  pageIndex = 0,
): number {
  const mode = effectiveDossierHeaderModeForOptions(options, pageIndex);
  if (mode === "contact") return 22;
  if (mode === "compact") return 3;
  return 0;
}

export function dossierFooterContentBottomMmForOptions(options: DossierChromeOptions): number {
  if (options.footerMode === "none") return 10;
  return options.footerMode === "details" ? 20 : 17;
}

export function dossierFooterVisualHeightMmForOptions(options: DossierChromeOptions): number {
  if (options.footerMode === "none") return 0;
  return options.footerMode === "details" ? 10 : 2.4;
}

// Compatibility wrappers for callers that intentionally read the live store.
// Layout engines should use the pure option-based helpers above.
export function effectiveDossierHeaderMode(
  scope: DossierChromeScope,
  pageIndex = 0,
): DossierHeaderMode {
  return effectiveDossierHeaderModeForOptions(getDossierChromeOptions(scope), pageIndex);
}

export function dossierHeaderContentTopMm(scope: DossierChromeScope, pageIndex = 0): number {
  return dossierHeaderContentTopMmForOptions(getDossierChromeOptions(scope), pageIndex);
}

export function dossierHeaderVisualHeightMm(scope: DossierChromeScope, pageIndex = 0): number {
  return dossierHeaderVisualHeightMmForOptions(getDossierChromeOptions(scope), pageIndex);
}

export function dossierFooterContentBottomMm(scope: DossierChromeScope): number {
  return dossierFooterContentBottomMmForOptions(getDossierChromeOptions(scope));
}

export function dossierFooterVisualHeightMm(scope: DossierChromeScope): number {
  return dossierFooterVisualHeightMmForOptions(getDossierChromeOptions(scope));
}
