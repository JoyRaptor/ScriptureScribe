import fs from 'fs';

const pyFile = '../build-interlinear-complete.py';
let pySource = fs.readFileSync(pyFile, 'utf8');

const regexStr = String.raw`VERSE_LINE_RE = re.compile(r'^([A-Za-z0-9]+)\.(\d+)\.(\d+)(?:\([^)]+\))?#\d+')`;

pySource = pySource.replace(
  /VERSE_LINE_RE = re.compile.*/,
  regexStr
);

fs.writeFileSync(pyFile, pySource);
console.log('Fixed regex correctly to SINGLE backslashes');
