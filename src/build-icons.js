const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'assets', 'icons');
const outFile = path.join(__dirname, 'iconRegistry.ts');

if (!fs.existsSync(iconsDir)) {
    console.error("Icons directory not found: " + iconsDir);
    process.exit(1);
}

const files = fs.readdirSync(iconsDir).filter(f => f.endsWith('.svg'));
let tsContent = `// AUTO-GENERATED. Run 'node src/build-icons.js' to update.\n\n`;
tsContent += `export function getIcon(name: string, size: number = 24): string {\n`;
tsContent += `  switch(name) {\n`;

for (const file of files) {
    const name = path.basename(file, '.svg');
    let content = fs.readFileSync(path.join(iconsDir, file), 'utf8').trim();
    
    // Escape backticks and dollar signs for template literals
    content = content.replace(/`/g, '\\`').replace(/\$/g, '\\$');
    
    // Inject the dynamic size style into the root SVG tag
    content = content.replace(/<svg /i, `<svg style="width:\${size}px; height:\${size}px; display:block; flex-shrink:0; max-width:100%;" `);
    
    tsContent += `    case '${name}':\n      return \`${content}\`;\n`;
}

tsContent += `    default:\n      return "";\n`;
tsContent += `  }\n}\n`;

fs.writeFileSync(outFile, tsContent);
console.log(`Generated iconRegistry.ts with ${files.length} icons.`);
