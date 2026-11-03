const fs = require('fs');
const file = 'C:/Users/JoyRaptor/Downloads/bible-obsidian-plugin/Scripture-scribe/STEPBible-Data-TyndaleData/TBESG - Translators Brief lexicon of Extended Strongs for Greek - STEPBible.org CC BY.txt';
try {
    const data = fs.readFileSync(file, 'utf8');
    const lines = data.split('\n');
    console.log('--- Lines 50-100 ---');
    console.log(lines.slice(50, 100).join('\n'));
} catch (e) {
    console.log('Error reading file: ' + e.message);
}
