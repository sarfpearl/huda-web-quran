/**
 * Record: where the recorder's chunks go while it runs. A 10-minute 1080p
 * video is ~150–230 MB — kept in memory that crashes mobile Safari — so the
 * chunks are written to the browser's private on-device storage (OPFS) as
 * they arrive, and the finished file is read back from disk.
 *
 * 1. OPFS createWritable (Chrome, Edge, Firefox, Safari 26+)
 * 2. OPFS sync access handle in a small worker (older Safari)
 * 3. memory (no OPFS: private windows, very old browsers)
 */

export interface ChunkSink {
  kind: "opfs" | "opfs-worker" | "memory";
  write(chunk: Blob): Promise<void>;
  /** The whole recording, read from where it was written. */
  finish(type: string): Promise<File>;
  discard(): Promise<void>;
}

const DIR = "huda-recordings";

async function recordingsDir(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const root = await navigator.storage?.getDirectory?.();
    return root ? await root.getDirectoryHandle(DIR, { create: true }) : null;
  } catch {
    return null;
  }
}

/** Deletes every recording file left on the device (old sessions included). */
export async function clearRecordings(keep: string[] = []): Promise<void> {
  const dir = await recordingsDir();
  if (!dir) return;
  const names: string[] = [];
  try {
    for await (const name of (dir as unknown as { keys(): AsyncIterable<string> }).keys()) names.push(name);
  } catch {
    return;
  }
  await Promise.all(names.filter((n) => !keep.includes(n)).map((n) => dir.removeEntry(n).catch(() => {})));
}

/** A file in the recordings folder to write a finished (trimmed) video into. */
export async function opfsWritable(name: string): Promise<{ stream: WritableStream<Uint8Array>; file: () => Promise<File> } | null> {
  const dir = await recordingsDir();
  if (!dir) return null;
  try {
    const handle = await dir.getFileHandle(name, { create: true });
    if (typeof (handle as FileSystemFileHandle & { createWritable?: unknown }).createWritable !== "function") return null;
    const w = await handle.createWritable();
    return { stream: w as unknown as WritableStream<Uint8Array>, file: () => handle.getFile() };
  } catch {
    return null;
  }
}

// The worker for Safari without createWritable: append each chunk through a
// sync access handle (only workers get one).
const WORKER_SRC = `
let handle, at = 0;
onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.op === "open") {
      const root = await navigator.storage.getDirectory();
      const dir = await root.getDirectoryHandle(${JSON.stringify(DIR)}, { create: true });
      const fh = await dir.getFileHandle(m.name, { create: true });
      handle = await fh.createSyncAccessHandle();
      handle.truncate(0);
      at = 0;
    } else if (m.op === "write") {
      at += handle.write(new Uint8Array(m.buf), { at });
    } else if (m.op === "close") {
      handle.flush();
      handle.close();
    }
    postMessage({ id: m.id, ok: true });
  } catch (err) {
    postMessage({ id: m.id, ok: false, error: String(err) });
  }
};`;

function workerSink(name: string, dir: FileSystemDirectoryHandle): Promise<ChunkSink | null> {
  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" })));
    } catch {
      resolve(null);
      return;
    }
    let seq = 0;
    const waiting = new Map<number, (ok: boolean) => void>();
    worker.onmessage = (e) => {
      waiting.get(e.data.id)?.(e.data.ok);
      waiting.delete(e.data.id);
    };
    const call = (msg: Record<string, unknown>, transfer: Transferable[] = []) =>
      new Promise<boolean>((done) => {
        const id = ++seq;
        waiting.set(id, done);
        worker.postMessage({ ...msg, id }, transfer);
      });
    // Writes go one after another, in order.
    let chain = Promise.resolve();
    void call({ op: "open", name }).then((ok) => {
      if (!ok) {
        worker.terminate();
        resolve(null);
        return;
      }
      resolve({
        kind: "opfs-worker",
        write(chunk) {
          chain = chain.then(async () => {
            const buf = await chunk.arrayBuffer();
            await call({ op: "write", buf }, [buf]);
          });
          return chain;
        },
        async finish(type) {
          await chain;
          await call({ op: "close" });
          worker.terminate();
          const f = await (await dir.getFileHandle(name)).getFile();
          return new File([f], name, { type });
        },
        async discard() {
          worker.terminate();
          await dir.removeEntry(name).catch(() => {});
        },
      });
    });
  });
}

export async function openChunkSink(name: string): Promise<ChunkSink> {
  const dir = await recordingsDir();
  if (dir) {
    try {
      const handle = await dir.getFileHandle(name, { create: true });
      if (typeof (handle as FileSystemFileHandle & { createWritable?: unknown }).createWritable === "function") {
        const w = await handle.createWritable();
        let chain = Promise.resolve();
        return {
          kind: "opfs",
          write(chunk) {
            chain = chain.then(() => w.write(chunk));
            return chain;
          },
          async finish(type) {
            await chain;
            await w.close();
            const f = await handle.getFile();
            return new File([f], name, { type });
          },
          async discard() {
            await chain.catch(() => {});
            await w.abort?.().catch(() => {});
            await dir.removeEntry(name).catch(() => {});
          },
        };
      }
      const viaWorker = await workerSink(name, dir);
      if (viaWorker) return viaWorker;
    } catch {
      /* fall through to memory */
    }
  }
  const parts: Blob[] = [];
  return {
    kind: "memory",
    async write(chunk) {
      parts.push(chunk);
    },
    async finish(type) {
      return new File(parts, name, { type });
    },
    async discard() {
      parts.length = 0;
    },
  };
}
