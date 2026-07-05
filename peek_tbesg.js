const fs = require('fs');
const path = require('path');
const file = 'C:/Users/JoyRaptor/Downloads/bible-obsidian-plugin/Scripture-scribe/TBESG.txt';
try {
    const data = fs.readFileSync(file, 'utf8');
    console.log(data.split('\n').slice(0, 100).join('\n'));
} catch (e) {
    console.log('Error reading file: ' + e.message);
}
