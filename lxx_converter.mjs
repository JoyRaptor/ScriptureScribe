
import fs from 'fs';
import path from 'path';
import readline from 'readline';

async function processSweteText(sweteDir, outDir) {
    const versificationPath = path.join(sweteDir, '00-Swete_versification.csv');
    const wordsPath = path.join(sweteDir, '01-Swete_word_with_punctuations.csv');
    
    console.log('--- Processing Swete Versification ---');
    const versification = [];
    const vStream = fs.createReadStream(versificationPath);
    const vRl = readline.createInterface({ input: vStream, crlfDelay: Infinity });

    for await (const line of vRl) {
        const [id, ref] = line.split('\t');
        if (id && ref) {
            versification.push({ id: parseInt(id), ref: ref.trim() });
        }
    }
    
    console.log(`Loaded ${versification.length} verse markers.`);

    console.log('--- Processing Swete Words ---');
    const bible = {};
    const wStream = fs.createReadStream(wordsPath);
    const wRl = readline.createInterface({ input: wStream, crlfDelay: Infinity });

    let vIdx = 0;
    let currentVerseWords = [];

    const flushVerse = (ref) => {
        if (!ref) return;
        const [book, rest] = ref.split('.');
        const [chap, verse] = rest.split(':');
        
        if (!bible[book]) bible[book] = {};
        if (!bible[book][chap]) bible[book][chap] = {};
        bible[book][chap][verse] = currentVerseWords.join(' ');
        currentVerseWords = [];
    };

    for await (const line of wRl) {
        const [idStr, word] = line.split('\t');
        const id = parseInt(idStr);
        if (isNaN(id)) continue;

        // If we hit the next verse marker, flush the previous one
        if (vIdx + 1 < versification.length && id >= versification[vIdx + 1].id) {
            flushVerse(versification[vIdx].ref);
            vIdx++;
        }
        
        currentVerseWords.push(word);
    }
    // Flush last verse
    flushVerse(versification[vIdx].ref);

    fs.writeFileSync(path.join(outDir, 'swete-lxx.json'), JSON.stringify(bible, null, 2));
    console.log(`Saved Swete LXX to ${path.join(outDir, 'swete-lxx.json')}`);
}

async function processTBESG(tyndaleDir, outDir) {
    const tbesgPath = path.join(tyndaleDir, 'TBESG - Translators Brief lexicon of Extended Strongs for Greek - STEPBible.org CC BY.txt');
    
    console.log('--- Processing TBESG Lexicon ---');
    const definitions = {};
    const stream = fs.createReadStream(tbesgPath);
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    let inData = false;
    for await (const line of rl) {
        if (line.startsWith('EStrong#')) {
            inData = true;
            continue;
        }
        if (!inData || !line.trim() || line.startsWith('====')) continue;

        const parts = line.split('\t');
        if (parts.length < 6) continue;

        const [id, greek, translit, gloss, morph, meaning] = parts;
        
        // Map to CompactDef: { o: original, t: transliteration, g: gloss, d: definition }
        definitions[id.trim()] = {
            o: greek.trim(),
            t: translit.trim(),
            g: gloss.trim(),
            d: meaning.trim().replace(/<BR \/>/g, '\n').replace(/<[^>]*>/g, '') // Strip HTML for now, keep lines
        };
    }

    fs.writeFileSync(path.join(outDir, 'strongs-greek-lxx.json'), JSON.stringify(definitions, null, 2));
    console.log(`Saved TBESG Lexicon to ${path.join(outDir, 'strongs-greek-lxx.json')}`);
}

async function processLSJ(tyndaleDir, outDir) {
    const files = [
        'TFLSJ  0-5624 - Translators Formatted full LSJ Bible lexicon - STEPBible.org CC BY.txt',
        'TFLSJ extra - Translators Formatted full LSJ Bible lexicon - STEPBible.org CC BY.txt'
    ];
    
    console.log('--- Processing LSJ Lexicons ---');
    const definitions = {};

    for (const fileName of files) {
        const filePath = path.join(tyndaleDir, fileName);
        if (!fs.existsSync(filePath)) continue;
        
        const stream = fs.createReadStream(filePath);
        const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

        let inData = false;
        for await (const line of rl) {
            if (line.startsWith('EStrong#')) {
                inData = true;
                continue;
            }
            if (!inData || !line.trim() || line.startsWith('====')) continue;

            const parts = line.split('\t');
            if (parts.length < 5) continue;

            const [id, greek, translit, gloss, morph, meaning] = parts;
            definitions[id.trim()] = meaning.trim(); // Just store the full rich meaning
        }
    }

    fs.writeFileSync(path.join(outDir, 'lexicon-lsj.json'), JSON.stringify(definitions, null, 2));
    console.log(`Saved LSJ Lexicons to ${path.join(outDir, 'lexicon-lsj.json')}`);
}

async function processVersification(tyndaleDir, outDir) {
    const tvtmsPath = path.join(tyndaleDir, 'TVTMS - Translators Versification Traditions with Methodology for Standardisation for Eng+Heb+Lat+Grk+Others - STEPBible.org CC BY.txt');
    
    console.log('--- Processing Versification Mapping ---');
    const mapping = {
        eng2grk: {},
        grk2eng: {}
    };

    const stream = fs.createReadStream(tvtmsPath);
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    let inData = false;
    for await (const line of rl) {
        if (line.startsWith('#DataStart')) {
            inData = true;
            continue;
        }
        if (!inData || !line.trim() || line.startsWith('====') || line.startsWith('$')) continue;

        const parts = line.split('\t');
        if (parts.length < 5) continue;

        // Columns: Type, English, Hebrew, Latin, Greek
        const type = parts[0].trim();
        const eng = parts[1].trim();
        const grk = parts[4].trim();

        if (eng && grk && grk !== 'Absent' && grk !== 'NoVerse') {
            mapping.eng2grk[eng] = grk;
            mapping.grk2eng[grk] = eng;
        }
    }

    fs.writeFileSync(path.join(outDir, 'versification-mapping.json'), JSON.stringify(mapping, null, 2));
    console.log(`Saved Versification Mapping to ${path.join(outDir, 'versification-mapping.json')}`);
}

async function processMorphology(tyndaleDir, outDir) {
    const tegmcPath = path.join(tyndaleDir, 'TEGMC - Translators Expansion of Greek Morphhology Codes - STEPBible.org CC BY.txt');
    
    console.log('--- Processing Morphology Codes ---');
    const morphs = {};

    const stream = fs.createReadStream(tegmcPath);
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    let inData = false;
    for await (const line of rl) {
        if (line.startsWith('Code')) {
            inData = true;
            continue;
        }
        if (!inData || !line.trim() || line.startsWith('====')) continue;

        const [code, expansion] = line.split('\t');
        if (code && expansion) {
            morphs[code.trim()] = expansion.trim();
        }
    }

    fs.writeFileSync(path.join(outDir, 'morph-codes-greek.json'), JSON.stringify(morphs, null, 2));
    console.log(`Saved Morphology Codes to ${path.join(outDir, 'morph-codes-greek.json')}`);
}

const SWETE_DIR = 'C:/Users/JoyRaptor/Downloads/bible-obsidian-plugin/Scripture-scribe/Swete';
const TYNDALE_DIR = 'C:/Users/JoyRaptor/Downloads/bible-obsidian-plugin/Scripture-scribe/STEPBible-Data-TyndaleData';
const OUT_DIR = 'C:/Users/JoyRaptor/Downloads/bible-obsidian-plugin/Scripture-scribe/src/books';

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function run() {
    try {
        await processSweteText(SWETE_DIR, OUT_DIR);
        await processTBESG(TYNDALE_DIR, OUT_DIR);
        await processLSJ(TYNDALE_DIR, OUT_DIR);
        await processVersification(TYNDALE_DIR, OUT_DIR);
        await processMorphology(TYNDALE_DIR, OUT_DIR);
    } catch (e) {
        console.error(e);
    }
}

run();
