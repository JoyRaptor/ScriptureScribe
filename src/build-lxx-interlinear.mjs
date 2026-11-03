import fs from 'fs';
import path from 'path';

const SWETE_DIR = 'C:/Users/JoyRaptor/Downloads/bible-obsidian-plugin/Scripture-scribe/Swete';
const TYNDALE_DIR = 'C:/Users/JoyRaptor/Downloads/bible-obsidian-plugin/Scripture-scribe/STEPBible-Data-TyndaleData';
const BOOKS_DIR = 'C:/Users/JoyRaptor/Downloads/bible-obsidian-plugin/Scripture-scribe/src/books';

const TIPNR_PATH = path.join(TYNDALE_DIR, 'TIPNR - Translators Individualised Proper Names with all References - STEPBible.org CC BY.txt');
const TBESG_PATH = path.join(TYNDALE_DIR, 'TBESG - Translators Brief lexicon of Extended Strongs for Greek - STEPBible.org CC BY.txt');
const VERSIFICATION_PATH = path.join(SWETE_DIR, '00-Swete_versification.csv');
const WORDS_PATH = path.join(SWETE_DIR, '01-Swete_word_with_punctuations.csv');
const TRANSLIT_PATH = path.join(SWETE_DIR, '03-Swete_SBL_transliterations.csv');
const NT_INTERLINEAR_PATH = path.join(BOOKS_DIR, 'strongs-greek.json');

const BOOK_NAME_MAP = {
    Gen: "Genesis", Exod: "Exodus", Lev: "Leviticus", Num: "Numbers", Deut: "Deuteronomy",
    Josh: "Joshua", Judg: "Judges", Ruth: "Ruth",
    "1Sam": "1 Samuel", "2Sam": "2 Samuel", "1Kgs": "1 Kings", "2Kgs": "2 Kings",
    "1Chr": "1 Chronicles", "2Chr": "2 Chronicles",
    Ezra: "Ezra", Neh: "Nehemiah", Esth: "Esther", Job: "Job",
    Ps: "Psalms", Prov: "Proverbs", Eccl: "Ecclesiastes", Song: "Song of Solomon",
    Isa: "Isaiah", Jer: "Jeremiah", Lam: "Lamentations", Ezek: "Ezekiel", Dan: "Daniel",
    Hos: "Hosea", Joel: "Joel", Amos: "Amos", Obad: "Obadiah", Jonah: "Jonah",
    Mic: "Micah", Nah: "Nahum", Hab: "Habakkuk", Zeph: "Zephaniah", Hag: "Haggai",
    Zech: "Zechariah", Mal: "Malachi",
};

function readEncodedFile(filePath) {
    const buffer = fs.readFileSync(filePath);
    if (buffer[0] === 0xFF && buffer[1] === 0xFE) return buffer.toString('utf16le');
    return buffer.toString('utf8');
}

function stripPunctuation(word) {
    if (!word) return '';
    return word.replace(/[.,;·?!()\[\]\u037E\u0387]/g, '').trim();
}

function stripDiacritics(text) {
    if (!text) return "";
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function normalizeRef(ref) {
    const match = ref.match(/^([^.]+)\.(\d+)[.:](\d+)/);
    if (!match) return null;
    const book = BOOK_NAME_MAP[match[1]] || match[1];
    return `${book} ${match[2]}:${match[3]}`;
}

async function buildLXX() {
    console.log('--- Loading TIPNR Names ---');
    const nameRefMap = {}; 
    const tipnrRaw = readEncodedFile(TIPNR_PATH);
    const tipnrLines = tipnrRaw.split(/\r?\n/);
    let currentRec = null;
    for (const line of tipnrLines) {
        if (line.includes('$')) {
            if (currentRec) {
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
        const [, slug, form, english, , refsStr] = parts;
        const refs = refsStr.split(';').map(r => r.trim()).filter(r => r);
        for (const r of refs) {
            const norm = normalizeRef(r);
            if (norm) currentRec.refs.add(norm);
        }
        if (form.trim().startsWith('G')) {
            const [strongs, greek] = form.trim().split('=');
            currentRec.greekForms.push({ 
                strongs: strongs.trim(), 
                key: stripDiacritics(stripPunctuation(greek)), 
                english: english.trim() 
            });
        }
    }

    console.log('--- Loading TBESG Lexicon ---');
    const lexMap = {}; 
    const tbesgRaw = readEncodedFile(TBESG_PATH);
    const tbesgLines = tbesgRaw.split(/\r?\n/);
    let inData = false, commonAdded = 0;
    for (const line of tbesgLines) {
        if (line.includes('EStrong#')) { inData = true; continue; }
        if (!inData || !line.trim() || line.includes('====')) continue;
        const parts = line.split('\t');
        // Handle potential prepended tabs
        let sIdx = 0;
        while (sIdx < parts.length && !parts[sIdx].trim().startsWith('G')) sIdx++;
        if (sIdx + 3 >= parts.length) continue;

        const strongs = parts[sIdx].trim();
        const greek = parts[sIdx + 1].trim();
        const gloss = parts[sIdx + 3].trim();
        const g = stripDiacritics(stripPunctuation(greek));
        if (!lexMap[g]) {
            lexMap[g] = { s: strongs, e: gloss };
            commonAdded++;
        }
    }
    console.log(`Loaded ${commonAdded} primary root definitions.`);

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
        const parts = line.trim().split('\t');
        if (parts.length >= 2) {
            const norm = normalizeRef(parts[1].trim());
            if (norm) versification.push({ id: parseInt(parts[0]), ref: norm });
        }
    }

    const wordsMap = new Map();
    const wLines = readEncodedFile(WORDS_PATH).split(/\r?\n/);
    for (const line of wLines) {
        const parts = line.trim().split('\t');
        if (parts.length >= 2) wordsMap.set(parseInt(parts[0]), parts[1] || '');
    }

    const translitsMap = new Map();
    const tLines = readEncodedFile(TRANSLIT_PATH).split(/\r?\n/);
    for (const line of tLines) {
        const parts = line.trim().split('\t');
        if (parts.length >= 2) translitsMap.set(parseInt(parts[0]), parts[1] || '');
    }

    console.log('--- Assembling Interlinear ---');
    const bible = {};
    const allIds = Array.from(wordsMap.keys()).sort((a, b) => a - b);
    let vIdx = 0, currentVerseWords = [], matchStats = { names: 0, lexicon: 0, bridge: 0, miss: 0 };

    for (const id of allIds) {
        const wordText = wordsMap.get(id);
        const translitText = translitsMap.get(id);
        while (vIdx + 1 < versification.length && id >= versification[vIdx + 1].id) {
            if (currentVerseWords.length > 0) bible[versification[vIdx].ref] = currentVerseWords;
            currentVerseWords = [];
            vIdx++;
        }

        const g = stripDiacritics(stripPunctuation(wordText));
        const ref = versification[vIdx].ref;
        let info = null;

        if (nameRefMap[ref] && nameRefMap[ref][g]) {
            info = nameRefMap[ref][g];
            matchStats.names++;
        } else if (lexMap[g]) {
            info = lexMap[g];
            matchStats.lexicon++;
        } else if (ntMap[g]) {
            info = ntMap[g];
            matchStats.bridge++;
        } else {
            matchStats.miss++;
        }

        currentVerseWords.push({
            o: wordText,
            t: translitText || '',
            e: info ? info.e : '',
            s: info ? info.s : ''
        });
    }
    if (currentVerseWords.length > 0) bible[versification[vIdx].ref] = currentVerseWords;

    console.log(`--- Match Statistics ---`);
    console.log(`Names matched:  ${matchStats.names}`);
    console.log(`Lexicon match:  ${matchStats.lexicon}`);
    console.log(`NT Bridge match: ${matchStats.bridge}`);
    console.log(`No match:       ${matchStats.miss}`);

    const outPath = path.join(BOOKS_DIR, 'strongs-lxx.json');
    fs.writeFileSync(outPath, JSON.stringify(bible));
    console.log(`Saved LXX Interlinear to ${outPath}`);
}

buildLXX().catch(console.error);
