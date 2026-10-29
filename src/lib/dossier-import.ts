import {
  parseDossierProject,
  replaceDossierProject,
  storeDossierProject,
  type DossierProject,
} from "@/lib/dossier-project";
import {
  requireDossierStorageWrites,
  resetDossierStorageCaches,
} from "@/lib/dossier-storage-write";

export const DOSSIER_IMPORT_DATABASE = "cv-cover-charm-import-backup-v1";
export const DOSSIER_IMPORT_MARKER = "cv-cover-charm:import-journal:v1";
const STORE = "backup";
const LOCK = "cv-cover-charm-dossier-import";
type Entries = [string, string][];
type Backup = { version: 1; id: string; phase: "pending" | "committed"; entries: Entries };
type Status = { phase: "checking" | "idle" | "busy" | "reload" | "blocked"; error?: string };
const initialStatus: Status = { phase: "checking" };
let status = initialStatus;
const listeners = new Set<() => void>();

export const getDossierImportStatus = () => status;
export const getServerDossierImportStatus = () => initialStatus;
export function subscribeDossierImportStatus(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function setStatus(next: Status) {
  status = next;
  listeners.forEach((listener) => listener());
}

function isDossierKey(key: string) {
  return /^(titelblatt:|anschreiben:|lebenslauf:|bewerbungsdossier:)/.test(key);
}

function capture(): Entries {
  const storage = window.localStorage;
  const entries: Entries = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (!key || !isDossierKey(key)) continue;
    const value = storage.getItem(key);
    if (value !== null) entries.push([key, value]);
  }
  return entries.sort(([a], [b]) => a.localeCompare(b));
}

function restore(entries: Entries) {
  const storage = window.localStorage;
  const changed = new Set([...capture().map(([key]) => key), ...entries.map(([key]) => key)]);
  // Free imported values before restoring the original quota usage. Photos are
  // copied as their exact original strings, with no history/photo stripping.
  for (const key of changed) storage.removeItem(key);
  for (const [key, value] of entries) storage.setItem(key, value);
  if (JSON.stringify(capture()) !== JSON.stringify(entries)) {
    throw new Error("Der bisherige Stand konnte noch nicht vollständig wiederhergestellt werden.");
  }
  resetDossierStorageCaches();
  for (const key of changed) {
    window.dispatchEvent(new StorageEvent("storage", { key, newValue: storage.getItem(key) }));
  }
}

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DOSSIER_IMPORT_DATABASE, 1);
    let settled = false;
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onblocked = () => {
      settled = true;
      reject(new Error("Die Importsicherung wird noch von einem anderen Fenster verwendet."));
    };
    request.onerror = () => {
      settled = true;
      reject(request.error);
    };
    request.onsuccess = () => {
      if (settled) request.result.close();
      else resolve(request.result);
    };
  });
}

async function backupOperation<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await database();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(
        STORE,
        mode,
        mode === "readwrite" ? { durability: "strict" } : undefined,
      );
      const request = operation(transaction.objectStore(STORE));
      // A successful request is insufficient: only transaction completion makes
      // the backup/commit durable before browser-storage changes may proceed.
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () =>
        reject(transaction.error ?? request.error ?? new Error("Importsicherung abgebrochen."));
      transaction.onerror = () => {}; // onabort owns the failure result.
    });
  } finally {
    db.close();
  }
}

function validateBackup(value: unknown, id: string): Backup {
  const backup = value as Partial<Backup> | undefined;
  if (
    !backup ||
    backup.version !== 1 ||
    backup.id !== id ||
    (backup.phase !== "pending" && backup.phase !== "committed") ||
    !Array.isArray(backup.entries) ||
    !backup.entries.every(
      (entry) =>
        Array.isArray(entry) &&
        entry.length === 2 &&
        typeof entry[0] === "string" &&
        isDossierKey(entry[0]) &&
        typeof entry[1] === "string",
    ) ||
    new Set(backup.entries.map(([key]) => key)).size !== backup.entries.length
  )
    throw new Error(
      "Die Importsicherung konnte nicht sicher gelesen werden. Bitte dieses Fenster geöffnet lassen.",
    );
  return backup as Backup;
}

async function clearBackup() {
  // Delete the tiny marker first. A cleanup failure can leave an orphan backup,
  // but never a marker that points at an already deleted recovery record.
  window.localStorage.removeItem(DOSSIER_IMPORT_MARKER);
  try {
    await backupOperation("readwrite", (store) => store.delete("current"));
  } catch {
    /* harmless orphan */
  }
}

async function recoverLocked() {
  const id = window.localStorage.getItem(DOSSIER_IMPORT_MARKER);
  if (!id) return;
  const backup = validateBackup(
    await backupOperation("readonly", (store) => store.get("current")),
    id,
  );
  if (backup.phase === "pending") restore(backup.entries);
  await clearBackup();
}

function exclusive<T>(run: () => Promise<T>): Promise<T> {
  if (!window.navigator.locks) {
    return Promise.reject(
      new Error(
        "Dieser Browser kann den Dossierimport nicht sicher sperren. Bitte einen aktuellen Browser verwenden.",
      ),
    );
  }
  return new Promise<T>((resolve, reject) => {
    void window.navigator.locks
      .request(LOCK, { mode: "exclusive" }, async () => {
        try {
          resolve(await run());
        } catch (error) {
          reject(error);
        }
      })
      .catch(reject);
  });
}

export async function recoverDossierImport(): Promise<void> {
  try {
    // No marker means no database needs to be created/opened at startup.
    if (window.localStorage.getItem(DOSSIER_IMPORT_MARKER)) await exclusive(recoverLocked);
    setStatus({ phase: "idle" });
  } catch (error) {
    setStatus({
      phase: "blocked",
      error:
        error instanceof Error ? error.message : "Die Importsicherung konnte nicht gelesen werden.",
    });
    throw error;
  }
}

/** Successful callers reload the editor; the gate prevents old autosaves while
 * the durable journal is written and until that reload has completed. */
export async function importDossierProjectSafely(
  value: DossierProject,
  { replace = false }: { replace?: boolean } = {},
) {
  const project = parseDossierProject(value);
  if (!project) {
    throw new Error("Diese JSON-Datei enthält kein gültiges Dossier.");
  }
  if (status.phase !== "idle") throw new Error("Bitte den laufenden Dossierimport abwarten.");
  setStatus({ phase: "busy" });
  try {
    return await exclusive(async () => {
      try {
        await recoverLocked();
      } catch (error) {
        setStatus({
          phase: "blocked",
          error:
            error instanceof Error
              ? error.message
              : "Die Importsicherung konnte nicht gelesen werden.",
        });
        throw error;
      }
      const entries = capture();
      const backup: Backup = { version: 1, id: crypto.randomUUID(), phase: "pending", entries };
      await backupOperation("readwrite", (store) => store.put(backup, "current"));
      if (JSON.stringify(capture()) !== JSON.stringify(entries)) {
        throw new Error(
          "Der Entwurf wurde während der Sicherung verändert. Bitte die Datei erneut laden.",
        );
      }
      // If writing this marker fails (e.g. quota), primary data is untouched.
      window.localStorage.setItem(DOSSIER_IMPORT_MARKER, backup.id);
      try {
        const loaded = requireDossierStorageWrites(() =>
          replace ? replaceDossierProject(project) : storeDossierProject(project),
        );
        await backupOperation("readwrite", (store) =>
          store.put({ ...backup, phase: "committed" }, "current"),
        );
        // After durable commit, cleanup is best effort. Startup recognizes the
        // committed record and never rolls a completed import back.
        try {
          await clearBackup();
        } catch {
          /* committed record retained */
        }
        setStatus({ phase: "reload" });
        return loaded;
      } catch (error) {
        try {
          restore(entries);
          await clearBackup();
        } catch {
          setStatus({
            phase: "blocked",
            error:
              "Der Import wurde abgebrochen. Die vollständige Sicherung bleibt erhalten. Bitte Wiederherstellung erneut versuchen.",
          });
          throw new Error(
            "Der bisherige Stand muss vor dem Weiterarbeiten wiederhergestellt werden.",
          );
        }
        throw error;
      }
    });
  } catch (error) {
    if (getDossierImportStatus().phase !== "blocked")
      setStatus({
        phase: "idle",
        error: "Dossier konnte nicht geladen werden. Dein bisheriger Stand bleibt erhalten.",
      });
    throw error;
  }
}
