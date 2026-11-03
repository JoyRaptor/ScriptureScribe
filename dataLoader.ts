import { normalizePath } from "obsidian";

let directory = "";
let adapter: any = null;
let generation = 0;
const pending = new Map<string, Promise<void>>();

/** Shared, single-flight disk loading. Failed loads may be retried. */
export function configureDataLoader(dir: string, vaultAdapter: any): void {
  directory = dir;
  adapter = vaultAdapter;
  generation++;
  pending.clear();
}

export function ensureData(file: string, setter: (data: any) => void): Promise<void> {
  if (!adapter) return Promise.resolve(); // standalone tests inject their own stores
  const existing = pending.get(file);
  if (existing) return existing;
  const current = generation;
  const task = adapter.read(normalizePath(`${directory}/${file}`)).then((raw: string) => {
    if (current === generation) setter(JSON.parse(raw));
  }).catch((error: unknown) => {
    pending.delete(file);
    console.warn(`ScriptureScribe: could not load ${file}`, error);
  });
  pending.set(file, task);
  return task;
}

export function clearDataLoader(): void {
  adapter = null;
  generation++;
  pending.clear();
}
