const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../temp_theremingoat');
const DEST_DIR = path.join(__dirname, '../data/vendors');

const KNOWN_VENDORS = {
    'Cherry': 'Cherry',
    'Gateron': 'Gateron',
    'Kailh': 'Kailh',
    'NovelKeys': 'NovelKeys',
    'Zeal': 'Zeal',
    'TTC': 'TTC',
    'Outemu': 'Outemu',
    'JWK': 'JWK',
    'Durock': 'Durock',
    'Akko': 'Akko',
    'SP-Star': 'SP-Star', 
    'KTT': 'KTT'
};

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function guessVendor(folderName) {
    const parts = folderName.split(' ');
    const firstWord = parts[0];
    
    // Check known vendors
    for (const v of Object.keys(KNOWN_VENDORS)) {
        if (folderName.toLowerCase().startsWith(v.toLowerCase())) {
            return { vendor: KNOWN_VENDORS[v], name: folderName.substring(v.length).trim() || folderName };
        }
    }
    
    // Fallback: First word is vendor
    return { vendor: firstWord, name: parts.slice(1).join(' ') || parts[0] };
}

function processSwitch(folderPath, folderName) {
    const { vendor, name } = guessVendor(folderName);
    if (!name) return; // Skip if name empty

    const files = fs.readdirSync(folderPath);
    const csvFile = files.find(f => f.toLowerCase().endsWith('.csv') && !f.toLowerCase().includes('summary')); // heuristic
    
    if (!csvFile) return;

    // Create Metadata
    const switchId = folderName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const targetDir = path.join(DEST_DIR, vendor, name.replace(/\//g, '-')); // sanitize path
    
    ensureDir(targetDir);

    // Copy CSV
    fs.copyFileSync(path.join(folderPath, csvFile), path.join(targetDir, 'force-curve.csv'));

    // Create Markdown Content with Frontmatter
    const frontmatter = [
        '---',
        `id: ${switchId}`,
        `name: ${name}`,
        `vendor: ${vendor}`,
        `type: Unknown`, // Needs analysis
        'force:',
        '  actuation: 0',
        '  bottom_out: 0',
        'travel:',
        '  actuation: 0',
        '  total: 0',
        `images:`,
        `  switch: switch-image.jpg`, // Placeholder assumption
        `  curve: force-curve.jpg`,   // Placeholder assumption
        '---',
        '',
        `# ${name}`,
        '',
        `Imported from ThereminGoat: ${folderName}`
    ].join('\n');
    
    // Write README.md if not exists (preserve manual edits)
    const mdPath = path.join(targetDir, 'README.md');
    if (!fs.existsSync(mdPath)) {
        fs.writeFileSync(mdPath, frontmatter);
    }
}

function walk(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
        if (item.startsWith('.')) continue;
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            // Check if this is a switch folder (has CSV) or a category
            const subItems = fs.readdirSync(fullPath);
            const hasCsv = subItems.some(f => f.endsWith('.csv'));
            
            if (hasCsv) {
                processSwitch(fullPath, item);
            } else {
                // Determine if we should recurse. 
                // ThereminGoat repo is mostly flat but might have categories?
                // Actually based on "Inspect" it looked flat. 
                // But let's recurse safely.
                walk(fullPath);
            }
        }
    }
}

console.log('Processing ThereminGoat data...');
if (fs.existsSync(SRC_DIR)) {
    walk(SRC_DIR);
    console.log('Done processing.');
} else {
    console.log('Source directory not found. Please clone repo first.');
}
