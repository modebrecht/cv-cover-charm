// Editors can continue in memory when storage is unavailable. An explicit import
// must instead notice every failed write, including failures caught by setters.
let failures: unknown[] | null = null;
const resets = new Set<() => void>();

export function registerDossierStorageReset(reset: () => void) {
  resets.add(reset);
}

export function resetDossierStorageCaches() {
  resets.forEach((reset) => reset());
}

export function reportDossierStorageWriteFailure(error: unknown) {
  failures?.push(error);
}

export function requireDossierStorageWrites<T>(write: () => T): T {
  const previous = failures;
  const current: unknown[] = [];
  failures = current;
  try {
    const result = write();
    if (current.length) throw current[0];
    return result;
  } finally {
    failures = previous;
    previous?.push(...current);
  }
}
