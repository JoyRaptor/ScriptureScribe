import type { DataAdapter } from "obsidian";
import DEFAULT_SKIN_HTML from "./cards/default-skin.html";
import VELVET_RAINBOW_HTML from "./cards/velvet-rainbow.html";
import VELVET_AURORA_HTML from "./cards/velvet-aurora.html";
import OBSIDIAN_MINIMAL_HTML from "./cards/obsidian-minimal.html";
import SKIN_GUIDE_MD from "./cards/SKIN-GUIDE.md";

// Skins live in <plugin folder>/skins/. Files starting with "_" are reference
// material owned by the plugin (rewritten on every start) and are not listed
// as selectable skins. Everything else ending in .html is a user skin. A few
// starter skins are copied in (see writeStarter for when they are refreshed).

const STARTER_SKINS: Record<string, string> = {
  "Velvet Rainbow.html": VELVET_RAINBOW_HTML,
  "Velvet Aurora.html": VELVET_AURORA_HTML,
  "Obsidian Minimal.html": OBSIDIAN_MINIMAL_HTML,
};

// Bump when a starter skin changes. Files carrying an older "ss-starter vN"
// marker (or the unmarked first release of Velvet Rainbow) are refreshed;
// a skin whose marker line was deleted belongs to the user and is never touched.
const STARTER_VERSION = 2;
const LEGACY_V1_MARKER = "matches the Royal Velvet Obsidian theme</title>";

async function writeStarter(adapter: DataAdapter, path: string, html: string): Promise<void> {
  if (!(await adapter.exists(path))) { await adapter.write(path, html); return; }
  const cur = await adapter.read(path);
  const m = /ss-starter v(\d+)/.exec(cur);
  if ((m && Number(m[1]) < STARTER_VERSION) || cur.includes(LEGACY_V1_MARKER)) await adapter.write(path, html);
}

const SKIN_DIR = "skins";
const EXAMPLE_FILE = "_example-built-in.html";
const GUIDE_FILE = "SKIN-GUIDE.md";

export const BUILTIN_SKIN_HTML: string = DEFAULT_SKIN_HTML;
export const BUILTIN_SKIN_LABEL = "Violet & Gold (built-in)";
export const SKIN_GUIDE_TEXT: string = SKIN_GUIDE_MD;

function dir(pluginDir: string): string { return `${pluginDir}/${SKIN_DIR}`; }

export function skinsFolderPath(pluginDir: string): string { return dir(pluginDir); }

/** Create the skins folder and (re)write the guide + reference skin, and add starter skins if absent. */
export async function seedSkinFolder(adapter: DataAdapter, pluginDir: string): Promise<void> {
  try {
    const d = dir(pluginDir);
    if (!(await adapter.exists(d))) await adapter.mkdir(d);
    await adapter.write(`${d}/${GUIDE_FILE}`, SKIN_GUIDE_MD);
    await adapter.write(`${d}/${EXAMPLE_FILE}`, DEFAULT_SKIN_HTML);
    for (const [name, html] of Object.entries(STARTER_SKINS)) {
      await writeStarter(adapter, `${d}/${name}`, html);
    }
  } catch (e) {
    console.warn("ScriptureScribe: could not seed skins folder", e);
  }
}

/** File names of the user's selectable skins (e.g. "papyrus.html"). */
export async function listSkins(adapter: DataAdapter, pluginDir: string): Promise<string[]> {
  try {
    const d = dir(pluginDir);
    if (!(await adapter.exists(d))) return [];
    const listing = await adapter.list(d);
    return listing.files
      .map((f) => f.split("/").pop() ?? f)
      .filter((n) => /\.html?$/i.test(n) && !n.startsWith("_"))
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

/** Skin HTML by file name, or null if missing/unsafe (caller falls back to built-in). */
export async function readSkin(adapter: DataAdapter, pluginDir: string, name: string): Promise<string | null> {
  if (!name || /[\\/]/.test(name) || name.startsWith(".")) return null;
  try {
    const p = `${dir(pluginDir)}/${name}`;
    if (!(await adapter.exists(p))) return null;
    return await adapter.read(p);
  } catch {
    return null;
  }
}
