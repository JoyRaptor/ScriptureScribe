# Third-party notices

ScriptureScribe's own code is MIT-licensed (see `LICENSE`). The Bible texts, lexicons and other data it ships come from the projects below, and each keeps its own license. Every one of them allows free redistribution; the table says what each asks in return.

| Plugin files | What it is | Source | License |
|---|---|---|---|
| `kjv.json`, `kjv-formatted.json` | King James Version (1769 text) | Supplied-word italics from the [eBible.org KJV USFM](https://ebible.org/eng-kjv/) | Public domain. In the UK the KJV is under Crown letters patent. |
| `enoch-charles.json` | 1 Enoch gap supplement | R. H. Charles, *The Book of Enoch* (1917) | Public domain |
| `hebrew-books/`, `strongs-hebrew.json`, `search-data/hebrew.json` | Hebrew OT interlinear | [STEPBible](https://www.stepbible.org) TAHOT, Translators Amalgamated Hebrew OT | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| `greek-books/`, `strongs-greek.json`, `search-data/greek.json` | Greek NT interlinear | STEPBible TAGNT, Translators Amalgamated Greek NT | CC BY 4.0 |
| `strongs-definitions.json`, `strongs-greek-lxx.json`, `definitions/strongs-*`, `definitions/lxx-*` | Strong's lexicon entries | STEPBible TBESG and TBESH (Greek entries based on Abbott-Smith) | CC BY 4.0 |
| `lexicon-lsj.json`, `definitions/lsj-*` | Liddell–Scott–Jones lexicon | STEPBible TFLSJ, edited from the full LSJ by Tyndale House | CC BY 4.0 |
| `morph-codes-greek.json` | Greek grammar code descriptions | STEPBible TEGMC | CC BY 4.0 |
| `versification-mapping.json` | English ↔ Greek verse numbering | STEPBible TVTMS | CC BY 4.0 |
| `swete-lxx.json`, `lxx-books/`, `strongs-lxx.json`, `search-data/lxx.json` | Septuagint (Swete) with transliteration, glosses and Strong's numbers | Greek text and SBL transliterations from [eliranwong/LXX-Swete-1930](https://github.com/eliranwong/LXX-Swete-1930) (Swete's text is public domain); glosses and Strong's numbers from STEPBible TBESG and TIPNR | Data files: [GPL-3.0](LICENSES/GPL-3.0.txt) (from LXX-Swete-1930), with CC BY 4.0 STEPBible tagging |
| `cross-refs.json` | Cross-references | [OpenBible.info](https://www.openbible.info/labs/cross-references/) | [CC BY](https://creativecommons.org/licenses/by/4.0/) |
| `verse-vectors.bin` | Meaning-search index of the KJV | Computed by ScriptureScribe with the [all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) model | Model: Apache-2.0 |
| `semantic-runtime.js` | Meaning-search engine | Bundles [Transformers.js](https://github.com/xenova/transformers.js) 2.17 (Apache-2.0) and [ONNX Runtime Web](https://github.com/microsoft/onnxruntime) 1.18 (MIT) | [Apache-2.0](LICENSES/Apache-2.0.txt), MIT |

## Attribution

Data created by [STEPBible.org](https://www.stepbible.org) based on work at Tyndale House Cambridge (CC BY 4.0). Cross-references from OpenBible.info (CC BY). Septuagint data from LXX-Swete-1930 by Eliran Wong and contributors (GPL-3.0).

## Changes made

ScriptureScribe reshapes this data for fast lookup in Obsidian. It splits files per book and per lexicon entry, converts book names and verse keys to one format, adds the KJV's supplied-word italics, fills 2,083 Hebrew display verses from TAHOT, and adds 44 1 Enoch verses from Charles. [DATA-SOURCES.md](DATA-SOURCES.md) has the details. None of the source wording was rewritten.

## The GPL-licensed Septuagint files

The Swete files listed above are distributed under the GNU General Public License v3 ([full text](LICENSES/GPL-3.0.txt)). They are data files loaded at run time and aggregated with the plugin, not part of its program code. The plugin code stays MIT. You may copy, change and share those files under the GPL; the original files are at [eliranwong/LXX-Swete-1930](https://github.com/eliranwong/LXX-Swete-1930), and the converted versions ship in the plugin folder.

## Demo vault

The study notes are © JoyRaptor and included for demonstration. The *Royal Velvet* theme is by [caro401](https://github.com/caro401/royal-velvet) under the MIT license; the license text is at the top of its `theme.css`.

## Not included

The repository's `LXX/` folder once held a CCAT/Rahlfs Septuagint SWORD module, which is licensed for non-commercial use only. ScriptureScribe never used it, and it is not in the current repository or in any download.
