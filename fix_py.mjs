import fs from 'fs';

const pyFile = '../build-interlinear-complete.py';
let pySource = fs.readFileSync(pyFile, 'utf8');

pySource = pySource.replace(
  /VERSE_LINE_RE = re.compile.*/,
  "VERSE_LINE_RE = re.compile(r'^([A-Za-z0-9]+)\\\\.(\\\\d+)\\\\.(\\\\d+)(?:\\\\([^)]+\\\\))?#\\\\d+')"
);

fs.writeFileSync(pyFile, pySource);
console.log('Fixed regex correctly to SINGLE backslashes');
