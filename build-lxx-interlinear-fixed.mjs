import fs from 'fs';
import path from 'path';
import readline from 'readline';

const SWETE_DIR = 'C:/Users/JoyRaptor/Downloads/bible-obsidian-plugin/Scripture-scribe/Swete';
const TYNDALE_DIR = 'C:/Users/JoyRaptor/Downloads/bible-obsidian-plugin/Scripture-scribe/STEPBible-Data-TyndaleData';
const OUT_DIR = 'C:/Users/JoyRaptor/Downloads/bible-obsidian-plugin/Scripture-scribe/src/books';

const TIPNR_PATH = path.join(TYNDALE_DIR, 'TIPNR - Translators Individualised Proper Names with all References - STEPBible.org CC BY.txt');
const TBESG_PATH = path.join(TYNDALE_DIR, 'TBESG - Translators Brief lexicon of Extended Strongs for Greek - STEPBible.org CC BY.txt');
const VERSIFICATION_PATH = path.join(SWETE_DIR, '00-Swete_versification.csv');
const WORDS_PATH = path.join(SWETE_DIR, '01-Swete_word_with_punctuations.csv');
const TRANSLIT_PATH = path.join(SWETE_DIR, '03-Swete_SBL_transliterations.csv');
const NT_INTERLINEAR_PATH = path.join(OUT_DIR, 'strongs-greek.json');

const BOOK_NAME_MAP = {
    // ── Canonical OT (both Swete and TIPNR abbreviations) ─────────────────────
    Gen: "Genesis",
    Exo: "Exodus", Exod: "Exodus",
    Lev: "Leviticus",
    Num: "Numbers",
    Deu: "Deuteronomy", Deut: "Deuteronomy",
    Jos: "Joshua", Josh: "Joshua",
    Jdg: "Judges", Judg: "Judges",
    Rut: "Ruth", Ruth: "Ruth",
    "1Sa": "1 Samuel", "1Sam": "1 Samuel",
    "2Sa": "2 Samuel", "2Sam": "2 Samuel",
    "1Ki": "1 Kings", "1Kgs": "1 Kings",
    "2Ki": "2 Kings", "2Kgs": "2 Kings",
    "1Ch": "1 Chronicles", "1Chr": "1 Chronicles",
    "2Ch": "2 Chronicles", "2Chr": "2 Chronicles",
    Ezr: "Ezra", Ezra: "Ezra",
    Neh: "Nehemiah",
    Est: "Esther", Esth: "Esther",
    Job: "Job",
    Psa: "Psalms", Ps: "Psalms",
    Pro: "Proverbs", Prov: "Proverbs",
    Ecc: "Ecclesiastes", Eccl: "Ecclesiastes",
    Sol: "Song of Solomon", Song: "Song of Solomon",
    Isa: "Isaiah",
    Jer: "Jeremiah",
    Lam: "Lamentations",
    Eze: "Ezekiel", Ezek: "Ezekiel",
    Dan: "Daniel",
    Hos: "Hosea",
    Joe: "Joel", Joel: "Joel",
    Amo: "Amos", Amos: "Amos",
    Oba: "Obadiah", Obad: "Obadiah",
    Jon: "Jonah", Jonah: "Jonah",
    Mic: "Micah",
    Nah: "Nahum",
    Hab: "Habakkuk",
    Zep: "Zephaniah", Zeph: "Zephaniah",
    Hag: "Haggai",
    Zec: "Zechariah", Zech: "Zechariah",
    Mal: "Malachi",
    // ── Apocrypha / Deuterocanonical (Swete abbreviations) ────────────────────
    "1Es": "1 Esdras",
    Wis: "Wisdom",
    Sir: "Sirach", Sip: "Sirach Prologue",
    Jdt: "Judith",
    Tob: "Tobit", Tbs: "Tobit (S)",
    Bar: "Baruch",
    Epj: "Epistle of Jeremiah",
    Dat: "Daniel (Th)",
    Sus: "Susanna", Sut: "Susanna (Th)",
    Bel: "Bel and the Dragon", Bet: "Bel (Th)",
    "1Ma": "1 Maccabees", "2Ma": "2 Maccabees",
    "3Ma": "3 Maccabees", "4Ma": "4 Maccabees",
    Pss: "Psalms of Solomon",
    "1En": "1 Enoch",
    Ode: "Odes",
};

/** Normalizes reading with encoding fallback */
function readEncodedFile(filePath) {
    const buffer = fs.readFileSync(filePath);
    if (buffer[0] === 0xFF && buffer[1] === 0xFE) return buffer.toString('utf16le');
    return buffer.toString('utf8');
}

function stripPunctuation(word) {
    if (!word) return '';
    return word.replace(/[.,;·?!()\[\]\u037E\u0387\u0589\u00B7]/g, '').trim();
}

function stripDiacritics(text) {
    if (!text) return "";
    return text.normalize("NFD")
        .replace(/[\u0300-\u036f\u1dc0-\u1dff\u20d0-\u20ff]/g, "")
        .toLowerCase();
}

/**
 * Generates candidate stems for an already-stripped (no diacritics, lowercase)
 * Greek word by removing common declension/conjugation endings.
 * Returns candidates in priority order (most specific suffix first).
 */
function greekStems(stripped) {
    if (!stripped || stripped.length < 3) return [];
    const seen = new Set();
    const out = [];
    const add = (s) => { if (s && s.length >= 2 && !seen.has(s)) { seen.add(s); out.push(s); } };

    // suffix -> what to replace it with (order = longest suffix first within each group)
    const patterns = [
        // ── 3rd decl / mixed ──────────────────────────────────────────────────
        ['εων',  'ευς'], ['εων',  ''],
        ['εως',  'υς'],  ['εως',  ''],
        ['ουσιν','ω'],   ['ουσι', 'ω'],
        ['οντος','ων'],  ['οντι', 'ων'], ['οντα', 'ων'],
        ['ματος','μα'],  ['ματι', 'μα'], ['ματα', 'μα'],
        ['ατος', 'α'],   ['ατι',  'α'],  ['ατα',  'α'],
        ['ιτης', ''],    ['ιτου', ''],
        // ── 2nd decl (ος, ου, ω, ον, οι, οις, ους) ───────────────────────────
        ['οις',  'ος'],  ['ους',  'ος'], ['ου',   'ος'],
        ['ω',    'ος'],  ['ον',   'ος'], ['οι',   'ος'],
        // ── 1st decl (α/η stems) ──────────────────────────────────────────────
        ['αις',  'α'],   ['ων',   'α'],  ['αν',   'α'],
        ['ας',   'α'],   ['αι',   'α'],
        ['ην',   'η'],   ['ης',   'η'],  ['ης',   'α'],
        ['αν',   'η'],
        // ── Verb present/imperfect ────────────────────────────────────────────
        ['ομεν', 'ω'],   ['ετε',  'ω'],  ['ουσιν','ω'],
        ['ουσα', 'ω'],   ['ει',   'ω'],  ['εις',  'ω'],
        ['εσθαι','ω'],   ['εσθε', 'ω'],
        // ── Aorist / perfect ─────────────────────────────────────────────────
        ['θησαν',''],    ['θης',  ''],   ['θητε', ''],
        ['θην',  ''],    ['θη',   ''],
        ['κασιν',''],    ['κατε', ''],   ['καμεν',''],
        ['κας',  ''],    ['κε',   ''],   ['κα',   ''],
        // ── Infinitive / participle ───────────────────────────────────────────
        ['σαι',  ''],    ['ειν',  ''],   ['ναι',  ''],
        ['ων',   ''],    ['ουσα', ''],
        // ── Misc short endings ────────────────────────────────────────────────
        ['ης',   ''],    ['ον',   ''],   ['ας',   ''],
        ['αν',   ''],    ['ων',   ''],   ['ες',   ''],
        ['ν',    ''],    ['ς',    ''],
    ];

    for (const [suffix, repl] of patterns) {
        if (stripped.endsWith(suffix) && stripped.length - suffix.length >= 2) {
            const stem = stripped.slice(0, stripped.length - suffix.length);
            add(stem + repl);
            add(stem);          // pure stem without replacement
        }
    }

    // \u2500\u2500 Compound-verb prefix stripping \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    // Greek verbs are often compounded with a preposition prefix.
    // Stripping it yields the simple verb which IS in the lexicon.
    // e.g. δια+εχωρισεν \u2192 εχωρισεν \u2192 might match \u03c7\u03c9\u03c1\u03b9\u03b6\u03c9
    //      επι+εφερετο  \u2192 εφερετο  \u2192 matches φερω via stem reducer above
    const PREPS = [
        'κατα','παρα','απο','συν','μετα','προς','εκ','εξ','επι',
        'εν','δια','αντι','περι','υπο','υπερ','προ','ανα','αμφι',
        // also with elided vowel (αν, συμ, etc.)
        'αν','συμ','συγ','συλ','συρ','συσ','εγ',
    ];
    for (const prep of PREPS) {
        if (stripped.startsWith(prep) && stripped.length > prep.length + 2) {
            const remainder = stripped.slice(prep.length);
            add(remainder);
            // Also recurse one level of stem reduction on the remainder
            const subStems = greekStems(remainder);
            for (const ss of subStems.slice(0, 6)) add(ss);
            break; // only strip one prefix
        }
    }

    // Last-resort: chop 1-3 chars for unusual proper nouns
    if (stripped.length > 4) add(stripped.slice(0, -1));
    if (stripped.length > 5) add(stripped.slice(0, -2));
    if (stripped.length > 6) add(stripped.slice(0, -3));

    return out;
}

function normalizeRef(ref) {
    const match = ref.match(/^([^.]+)\.(\d+)[.:](\d+)/);
    if (!match) return null;
    const book = BOOK_NAME_MAP[match[1]] || match[1];
    return `${book} ${match[2]}:${match[3]}`;
}


async function buildLXX() {
    console.log('--- Loading TIPNR Names ---');
    const nameRefMap = {}; // Ref -> { strippedGreekWord -> { strongs, english } }
    const globalNameMap = {
        // ── Patriarchs / early figures ──────────────────────────────
        "αβραμ":    { s: "G0011a", e: "Abram" },
        "σαρα":     { s: "G4564a", e: "Sarai" },
        "αρραν":    { s: "G5488a", e: "Haran" },
        "γενεσεις": { s: "G1078",  e: "generations" },
        "ιακωβ":    { s: "G2384",  e: "Jacob" },
        "ιωσηφ":    { s: "G2501",  e: "Joseph" },
        "ιωσηφος":  { s: "G2501",  e: "of Joseph" },
        "ιωσηφω":   { s: "G2501",  e: "to Joseph" },
        // ── Joshua and Nun ───────────────────────────────────
        "ιησους":   { s: "G2424",  e: "Joshua" },
        "ιησου":    { s: "G2424",  e: "of Joshua" },
        "ιησοι":    { s: "G2424",  e: "to Joshua" },  // dative — most common miss
        "ιησουν":   { s: "G2424",  e: "Joshua" },
        "ναυη":     { s: "G3476",  e: "Nun" },
        "ναυε":     { s: "G3476",  e: "Nun" },
        // ── Moses ────────────────────────────────────────────
        "μωυσης":   { s: "G3475",  e: "Moses" },
        "μωυση":    { s: "G3475",  e: "Moses" },
        "μωυσει":   { s: "G3475",  e: "to Moses" },
        "μωυσεα":   { s: "G3475",  e: "Moses" },
        "μωσης":    { s: "G3475",  e: "Moses" },
        "μωση":     { s: "G3475",  e: "Moses" },
        // ── David ───────────────────────────────────────────
        "δαυιδ":    { s: "G1138",  e: "David" },
        "δαβιδ":    { s: "G1138",  e: "David" },
        "δαυειδ":   { s: "G1138",  e: "David" },
        // ── Solomon ────────────────────────────────────────
        "σαλωμων":  { s: "G4672",  e: "Solomon" },
        "σαλωμωντος": { s: "G4672",  e: "of Solomon" },
        "σαλωμωντι":  { s: "G4672",  e: "to Solomon" },
        // ── Israel ──────────────────────────────────────────
        "ισραηλ":   { s: "G2474",  e: "Israel" },
        // ── Egypt ───────────────────────────────────────────
        "αιγυπτος": { s: "G0125",  e: "Egypt" },
        "αιγυπτου": { s: "G0125",  e: "of Egypt" },
        "αιγυπτω":  { s: "G0125",  e: "in Egypt" },
        "αιγυπτον": { s: "G0125",  e: "Egypt" },
        "αιγυπτιος":{ s: "G0124",  e: "Egyptian" },
        // ── Specific Missing Proper Names ───────────────────
        "σοφονιαν": { s: "", e: "Zephaniah" },
        "χουσει":   { s: "", e: "Cushi" },
        "γοδολιου": { s: "", e: "Gedaliah" },
        "αμοριου":  { s: "", e: "Amariah" },
        "εζεκιου":  { s: "", e: "Hezekiah" },
        "ιωσειου":  { s: "", e: "Josiah" },
        "αμων":     { s: "", e: "Amon" },
        "ιουδα":    { s: "G2448", e: "Judah" },
        "μωαβ":     { s: "", e: "Moab" },
        "αχααβ":    { s: "", e: "Ahab" },
        "κυρου":    { s: "", e: "Cyrus" },
        "κυρος":    { s: "", e: "Cyrus" },
        "περσων":   { s: "", e: "Persians" },
        // ── Common irregular verbs ──────────────────────────────
        "ειπεν":   { s: "G2036",  e: "He said" },
        "ειπον":   { s: "G2036",  e: "they said" },
        "ειπας":   { s: "G2036",  e: "you said" },
        "ελεγεν":   { s: "G3004",  e: "was speaking" },
        "εφη":     { s: "G5346",  e: "he declared" },
        "εγενετο":  { s: "G1096",  e: "it came to pass" },
        "εγενοντο": { s: "G1096",  e: "they became" },
        "εδωκεν":  { s: "G1325",  e: "He gave" },
        "εποιησεν": { s: "G4160",  e: "He made" },
        "εποιησαν": { s: "G4160",  e: "they made" },
        "ηλθεν":   { s: "G2064",  e: "He came" },
        "ηλθον":   { s: "G2064",  e: "they came" },
        "απεκριθη": { s: "G0611",  e: "He answered" },
        "ελαβεν":  { s: "G2983",  e: "He took" },
        "ελαβον":  { s: "G2983",  e: "they took" },
        "ειδεν":   { s: "G3708",  e: "He saw" },
        "ιδεν":     { s: "G3708",  e: "saw" },
        "εκαλεσεν": { s: "G2564",  e: "He called" },
        "εκαλεσαν": { s: "G2564",  e: "they called" },
        "κατεβη":  { s: "G2597",  e: "He went down" },
        "ανεβη":    { s: "G0305",  e: "He went up" },
        "ανεβησαν": { s: "G0305",  e: "they went up" },
    }; // strippedGreekWord → { strongs, english }

    const tipnrRaw = readEncodedFile(TIPNR_PATH);
    const tipnrLines = tipnrRaw.split(/\r?\n/);

    let currentRec = null;
    for (const line of tipnrLines) {
        // Record separator: lines containing '$' at the start (e.g. "$=Terah")
        if (line.trimStart().startsWith('$')) {
            // Flush previous record
            if (currentRec) {
                for (const gf of currentRec.greekForms) {
                    globalNameMap[gf.key] = { s: gf.strongs, e: gf.english };
                }
                for (const ref of currentRec.refs) {
                    if (!nameRefMap[ref]) nameRefMap[ref] = {};
                    for (const gf of currentRec.greekForms) {
                        nameRefMap[ref][gf.key] = { s: gf.strongs, e: gf.english };
                    }
                }
            }
            currentRec = { refs: new Set(), greekForms: [] };
            continue;
        }
        if (!line.includes('\t') || !currentRec) continue;
        const parts = line.split('\t');
        if (parts.length < 6) continue;
        // TIPNR columns: [0]=?, [1]=slug, [2]=form, [3]=english, [4]=?, [5]=refs
        const [, slug, form, english, , refsStr] = parts;
        const refs = refsStr.split(';').map(r => r.trim()).filter(r => r);
        for (const r of refs) {
            const norm = normalizeRef(r);
            if (norm) currentRec.refs.add(norm);
        }
        const formTrimmed = form.trim();
        if (formTrimmed.startsWith('G') && formTrimmed.includes('=')) {
            const eqIdx = formTrimmed.indexOf('=');
            const strongs = formTrimmed.slice(0, eqIdx).trim();
            const greekRaw = formTrimmed.slice(eqIdx + 1).trim();
            const cleanEnglish = english.replace(/\s*\([^)]+\)/g, '').trim();
            // Handle comma-separated variant forms like "Δαυείδ, Δαυίδ, Δαβίδ"
            const variants = greekRaw.split(',').map(v => v.trim()).filter(v => v);
            for (const variant of variants) {
                currentRec.greekForms.push({
                    strongs,
                    key: stripDiacritics(stripPunctuation(variant)),
                    english: cleanEnglish,
                });
            }
        }
    }
    // ── Flush the FINAL record (loop doesn't catch last one) ──────────────────
    if (currentRec) {
        for (const ref of currentRec.refs) {
            if (!nameRefMap[ref]) nameRefMap[ref] = {};
            for (const gf of currentRec.greekForms) {
                nameRefMap[ref][gf.key] = { s: gf.strongs, e: gf.english };
            }
        }
    }
    console.log(`Loaded names for ${Object.keys(nameRefMap).length} unique verses.`);

    console.log('--- Loading TBESG Lexicon ---');
    const lexMap = {};   // strippedGreekForm -> { s: strongs, e: gloss }
    const tbesgRaw = readEncodedFile(TBESG_PATH);
    const tbesgLines = tbesgRaw.split(/\r?\n/);
    let inData = false, commonAdded = 0;

    // ── DIAGNOSTIC: log first 5 data lines so you can verify column layout ───
    let diagCount = 0;

    for (const line of tbesgLines) {
        // The TBESG header sentinel — guard against variant spellings
        if (!inData && line.startsWith('EStrong#')) {
            inData = true;
            console.log(`TBESG: header detected`);
            continue;
        }
        if (!inData || !line.trim() || line.includes('====')) continue;
        const parts = line.split('\t');
        if (parts.length < 4) continue;

        // ── DIAGNOSTIC: verify columns are what we expect ────────────────────
        if (diagCount < 5) {
            console.log(`TBESG col check [${diagCount}]: strongs="${parts[0]}" greek="${parts[1]}" translit="${parts[2]}" gloss="${parts[3]}"`);
            diagCount++;
        }

        // TBESG columns: [0]=ExtStrongs  [1]=EnglishName  [2]=GreekWord  [3]=Translit
        const strongs = parts[0].trim();
        const greek   = parts[2].trim();
        const gloss   = parts[1].trim();

        if (!greek || !strongs) continue;

        const g = stripDiacritics(stripPunctuation(greek));
        if (!g) continue;

        if (!lexMap[g]) {
            lexMap[g] = { s: strongs, e: gloss };
            commonAdded++;
        }
        // Also index by Strongs number so we can do a reverse lookup (Issue 2 fix below)
        // We'll use this in the STRONGS_REVERSE map
    }
    console.log(`Loaded ${commonAdded} common words into lexicon.`);

    // ── Also build a Strongs→gloss map for reverse lookups ────────────────
    // Used later when a word's stripped form hits an alternate variant
    const strongsToGloss = {}; // strongs -> e
    for (const entry of Object.values(lexMap)) {
        if (entry.s && entry.e && !strongsToGloss[entry.s]) strongsToGloss[entry.s] = entry.e;
    }

    // ── DIAGNOSTIC: spot-check a few expected entries ────────────────────────
    const testWords = [
        { word: 'καὶ', desc: 'kai (and)' },
        { word: 'ὁ',   desc: 'ho (the)' },
        { word: 'ἐν',  desc: 'en (in)' },
        { word: 'καί', desc: 'kai acute (alt)' },
    ];
    for (const { word, desc } of testWords) {
        const key = stripDiacritics(stripPunctuation(word));
        const hit = lexMap[key];
        console.log(`TBESG lookup "${desc}" → key="${key}" → ${hit ? `✓ ${hit.s} "${hit.e}"` : '✗ MISS'}`);
    }

    console.log('--- Building NT Bridge (for inflected forms) ---');
    const ntMap = {}; // word -> { s, e }
    if (fs.existsSync(NT_INTERLINEAR_PATH)) {
        const ntInterlinear = JSON.parse(fs.readFileSync(NT_INTERLINEAR_PATH, 'utf8'));
        let ntAdded = 0;
        for (const ref in ntInterlinear) {
            for (const item of ntInterlinear[ref]) {
                const key = stripDiacritics(stripPunctuation(item.o));
                if (key && item.s && item.e && !ntMap[key]) {
                    ntMap[key] = { s: item.s, e: item.e };
                    ntAdded++;
                }
            }
        }
        console.log(`Loaded ${ntAdded} inflected forms from NT bridge.`);
    }

    console.log('--- Loading Swete Text & Versification ---');
    const versification = [];
    const vLines = readEncodedFile(VERSIFICATION_PATH).split(/\r?\n/);
    for (const line of vLines) {
        const parts = line.split('\t');
        if (parts.length >= 2) {
            const norm = normalizeRef(parts[1].trim());
            if (norm) versification.push({ id: parseInt(parts[0]), ref: norm });
        }
    }

    const wordsMap = new Map();
    const wLines = readEncodedFile(WORDS_PATH).split(/\r?\n/);
    for (const line of wLines) {
        const parts = line.split('\t');
        if (parts.length >= 2) wordsMap.set(parseInt(parts[0]), parts[1] || '');
    }

    const translitsMap = new Map();
    const tLines = readEncodedFile(TRANSLIT_PATH).split(/\r?\n/);
    for (const line of tLines) {
        const parts = line.split('\t');
        if (parts.length >= 2) translitsMap.set(parseInt(parts[0]), parts[1] || '');
    }

    console.log('--- Assembling Interlinear ---');
    const bible = {};
    const allIds = Array.from(wordsMap.keys()).sort((a, b) => a - b);
    let vIdx = 0, currentVerseWords = [];
    const matchStats = { names: 0, lexicon: 0, bridge: 0, miss: 0 };

    const flushVerse = (ref) => {
        if (ref) bible[ref] = currentVerseWords;
        currentVerseWords = [];
    };

    // ── DIAGNOSTIC: track first-miss words to verify normalization ───────────
    const missExamples = new Set();

    for (const id of allIds) {
        const wordText    = wordsMap.get(id);
        const translitText = translitsMap.get(id);
        while (vIdx + 1 < versification.length && id >= versification[vIdx + 1].id) {
            flushVerse(versification[vIdx].ref);
            vIdx++;
        }

        const g   = stripDiacritics(stripPunctuation(wordText));
        const ref = versification[vIdx].ref;
        let info  = null;

        // ── Tier 1: Exact per-verse name map ──────────────────────────────────
        if (nameRefMap[ref] && nameRefMap[ref][g]) {
            info = nameRefMap[ref][g];
            matchStats.names++;
        }
        // ── Tier 2: Global name map ────────────────────────────────────────────
        else if (globalNameMap[g]) {
            info = globalNameMap[g];
            matchStats.names++;
        }
        // ── Tier 3: Lexicon (exact stripped form) ──────────────────────────────
        else if (lexMap[g]) {
            info = lexMap[g];
            matchStats.lexicon++;
        }
        // ── Tier 4: NT bridge (inflected forms from Greek NT interlinear) ──────
        else if (ntMap[g]) {
            info = ntMap[g];
            matchStats.bridge++;
        }
        // ── Tier 5: Stem-reduction fallback ───────────────────────────────────
        // Try progressively shorter Greek stems to recover inflected forms
        // (e.g. τελευτην → τελευτη, Ιησοι → Ιησους)
        else {
            const stems = greekStems(g);
            for (const stem of stems) {
                if (nameRefMap[ref] && nameRefMap[ref][stem]) {
                    info = nameRefMap[ref][stem]; break;
                }
                if (globalNameMap[stem]) {
                    info = globalNameMap[stem]; break;
                }
                if (lexMap[stem]) {
                    info = lexMap[stem]; break;
                }
                if (ntMap[stem]) {
                    info = ntMap[stem]; break;
                }
            }
            if (info) {
                matchStats.stem = (matchStats.stem || 0) + 1;
            } else {
                matchStats.miss++;
                if (missExamples.size < 20) missExamples.add(`"${wordText}" → key="${g}"`);
            }
        }

        currentVerseWords.push({
            o: wordText,
            t: translitText || '',
            e: info ? info.e : '',
            s: info ? info.s : '',
        });
    }

    // Flush final verse
    if (vIdx < versification.length) flushVerse(versification[vIdx].ref);

    console.log(`--- Match Statistics ---`);
    console.log(`Names matched:  ${matchStats.names}`);
    console.log(`Lexicon match:  ${matchStats.lexicon}`);
    console.log(`NT Bridge match:${matchStats.bridge}`);
    console.log(`Stem reduced:   ${matchStats.stem || 0}`);
    console.log(`No match:       ${matchStats.miss}`);
    const total = matchStats.names + matchStats.lexicon + matchStats.bridge + (matchStats.stem||0) + matchStats.miss;
    console.log(`Coverage:       ${Math.round((total - matchStats.miss) / total * 100)}%  (${total - matchStats.miss}/${total} words)`);
    console.log(`--- Miss Examples (first 20 unique) ---`);
    for (const ex of missExamples) console.log(' ', ex);

    const outPath = path.join(OUT_DIR, 'strongs-lxx.json');
    fs.writeFileSync(outPath, JSON.stringify(bible));
    console.log(`Saved LXX Interlinear to ${outPath}`);
}

buildLXX().catch(console.error);
