"""Build the two release downloads into dist/:

  scripture-scribe.zip            the plugin folder, with all Bible/lexicon data and license notices
  ScriptureScribe-demo-vault.zip  the demo vault with that plugin preinstalled, opening on "Start Here"

The plugin is taken from the demo vault's installed copy (which holds the full data set), so install
the current build there first:  cp main.js styles.css manifest.json <vault>/.obsidian/plugins/scripture-scribe/

  python scripts/package-release.py [--vault "C:/+Projects/ScriptureScribe-demo-vault"]
"""
import argparse, json, os, shutil, tempfile, zipfile

repo = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser()
ap.add_argument("--vault", default=os.path.join(os.path.dirname(repo), "ScriptureScribe-demo-vault"))
args = ap.parse_args()
vault = os.path.abspath(args.vault)
plugin_src = os.path.join(vault, ".obsidian", "plugins", "scripture-scribe")
same = lambda a, b: os.path.normcase(os.path.normpath(a)) == os.path.normcase(os.path.normpath(b))

def zipdir(parent, folder, out):
    if os.path.exists(out): os.remove(out)
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for d, _, files in os.walk(os.path.join(parent, folder)):
            for f in files:
                p = os.path.join(d, f)
                z.write(p, os.path.relpath(p, parent).replace(os.sep, "/"))
    print(f"{os.path.relpath(out, repo)}  {os.path.getsize(out) / 1e6:.1f} MB")

stage = tempfile.mkdtemp(prefix="ss-release-")
os.makedirs(os.path.join(repo, "dist"), exist_ok=True)

# Plugin: installed copy minus per-user state (settings, index caches, backups, seeded skins).
plugin = os.path.join(stage, "scripture-scribe")
shutil.copytree(plugin_src, plugin, ignore=lambda d, names: [n for n in names if n.endswith(".bak") or n == "data.json"
    or n.startswith("vault-index-cache") or (same(d, plugin_src) and n == "skins")])
for f in ("main.js", "styles.css", "manifest.json", "LICENSE", "THIRD-PARTY-NOTICES.md"):
    shutil.copy(os.path.join(repo, f), plugin)
shutil.copytree(os.path.join(repo, "LICENSES"), os.path.join(plugin, "LICENSES"))
with open(os.path.join(plugin, "INSTALL.txt"), "w", encoding="utf8") as f:
    f.write("ScriptureScribe - install\n"
            "1. Copy THIS folder (\"scripture-scribe\") into:  <your vault>/.obsidian/plugins/\n"
            "2. In Obsidian: Settings -> Community plugins -> turn off Restricted mode -> refresh -> enable ScriptureScribe.\n"
            "Full guide: https://github.com/JoyRaptor/ScriptureScribe#-install-in-2-minutes\n"
            "Licenses: LICENSE (plugin code, MIT) and THIRD-PARTY-NOTICES.md (bundled Bible and lexicon data).\n")
zipdir(stage, "scripture-scribe", os.path.join(repo, "dist", "scripture-scribe.zip"))

# Demo vault: notes, theme and settings, the plugin above, its skins, and a workspace opening "Start Here".
demo = os.path.join(stage, "ScriptureScribe-demo-vault")
shutil.copytree(vault, demo, ignore=lambda d, names: [n for n in names if n == "workspace.json" or n.endswith(".bak")
    or n.startswith("vault-index-cache") or (same(d, os.path.join(vault, ".obsidian", "plugins")) and n == "scripture-scribe")])
demo_plugin = os.path.join(demo, ".obsidian", "plugins", "scripture-scribe")
shutil.copytree(plugin, demo_plugin)
if os.path.isdir(os.path.join(plugin_src, "skins")):
    shutil.copytree(os.path.join(plugin_src, "skins"), os.path.join(demo_plugin, "skins"))
settings_path = os.path.join(plugin_src, "data.json")
if os.path.exists(settings_path):
    with open(settings_path, encoding="utf8") as f:
        settings = json.load(f)
    vh = settings.get("vaultHighlight", {})
    if vh.get("textColor") not in ("auto", "dark", "light"): vh["textColor"] = "auto"  # legacy "inverted"
    with open(os.path.join(demo_plugin, "data.json"), "w", encoding="utf8") as f:
        json.dump(settings, f, indent=2)
leaf = {"id": "l", "type": "leaf", "state": {"type": "markdown", "state": {"file": "Start Here.md", "mode": "preview"}}}
with open(os.path.join(demo, ".obsidian", "workspace.json"), "w", encoding="utf8") as f:
    json.dump({"main": {"id": "m", "type": "split", "direction": "vertical",
                        "children": [{"id": "t", "type": "tabs", "children": [leaf]}]},
               "active": "l", "lastOpenFiles": ["Start Here.md"]}, f, indent=1)
zipdir(stage, "ScriptureScribe-demo-vault", os.path.join(repo, "dist", "ScriptureScribe-demo-vault.zip"))
shutil.rmtree(stage, ignore_errors=True)
