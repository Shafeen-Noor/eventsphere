/**
 * IndexedDB queue for offline photo uploads.
 * Photos stay on-device until the network is back, then sync.
 */

const DB_NAME = "eventsphere-offline";
const STORE = "pending-uploads";
const DB_VERSION = 1;

export type QueuedUpload = {
  id: string;
  slug: string;
  filename: string;
  contentType: string;
  caption: string;
  blob: Blob;
  createdAt: number;
  attempts: number;
  lastError?: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("slug", "slug", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function enqueueUpload(
  item: Omit<QueuedUpload, "id" | "createdAt" | "attempts">,
): Promise<QueuedUpload> {
  const row: QueuedUpload = {
    ...item,
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
    attempts: 0,
  };
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(row);
  await txDone(tx);
  db.close();
  return row;
}

export async function listQueued(slug?: string): Promise<QueuedUpload[]> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  const store = tx.objectStore(STORE);
  const rows = await new Promise<QueuedUpload[]>((resolve, reject) => {
    const req = slug
      ? store.index("slug").getAll(slug)
      : store.getAll();
    req.onsuccess = () => resolve(req.result as QueuedUpload[]);
    req.onerror = () => reject(req.error);
  });
  await txDone(tx);
  db.close();
  return rows.sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeQueued(id: string) {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(id);
  await txDone(tx);
  db.close();
}

export async function markQueuedError(id: string, lastError: string) {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  const existing = await new Promise<QueuedUpload | undefined>((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result as QueuedUpload | undefined);
    req.onerror = () => reject(req.error);
  });
  if (existing) {
    store.put({
      ...existing,
      attempts: existing.attempts + 1,
      lastError,
    });
  }
  await txDone(tx);
  db.close();
}

async function sha256Hex(blob: Blob) {
  const buf = await blob.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function flushQueuedUploads(
  slug: string,
  onProgress?: (info: { done: number; total: number; error?: string }) => void,
) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { flushed: 0 };

  const pending = await listQueued(slug);
  let flushed = 0;

  for (let i = 0; i < pending.length; i++) {
    const item = pending[i];
    try {
      const checksum = await sha256Hex(item.blob);
      const initRes = await fetch(`/api/events/${slug}/media/uploads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: item.filename,
          contentType: item.contentType,
          byteSize: item.blob.size,
          checksum,
          caption: item.caption,
        }),
      });
      const initData = await initRes.json().catch(() => ({}));
      if (!initRes.ok) {
        throw new Error(initData?.error?.message || "Upload init failed");
      }

      const putRes = await fetch(initData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": item.contentType },
        body: item.blob,
      });
      if (!putRes.ok) throw new Error(`Storage rejected upload (${putRes.status})`);

      const completeRes = await fetch(
        `/api/events/${slug}/media/${initData.mediaId}/complete`,
        { method: "POST" },
      );
      if (!completeRes.ok) {
        const data = await completeRes.json().catch(() => ({}));
        throw new Error(data?.error?.message || "Could not finalize upload");
      }

      await removeQueued(item.id);
      flushed += 1;
      onProgress?.({ done: flushed, total: pending.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync failed";
      await markQueuedError(item.id, message);
      onProgress?.({ done: flushed, total: pending.length, error: message });
    }
  }

  return { flushed };
}
