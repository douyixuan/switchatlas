const fs = require('fs');
const path = require('path');

const VENDORS_DIR = path.join(__dirname, '../data/vendors');
const OTHER_DIR = path.join(__dirname, '../data/other_vendors');

const POPULAR_VENDORS = [
    'Cherry', 'Gateron', 'TTC', 'Akko', 
    'Kailh', 'Zeal', 'Durock', 'JWK', 'Outemu', 'NovelKeys'
];

if (!fs.existsSync(OTHER_DIR)) {
    fs.mkdirSync(OTHER_DIR, { recursive: true });
}

console.log('Reorganizing vendors...');
const vendors = fs.readdirSync(VENDORS_DIR);

for (const vendor of vendors) {
    if (vendor.startsWith('.')) continue; // Skip hidden files
    
    const sourcePath = path.join(VENDORS_DIR, vendor);
    if (!fs.statSync(sourcePath).isDirectory()) continue;

    // Check if popular
    const isPopular = POPULAR_VENDORS.some(p => vendor.toLowerCase().includes(p.toLowerCase()));

    if (!isPopular) {
        // Move to other_vendors
        const destPath = path.join(OTHER_DIR, vendor);
        console.log(`Moving ${vendor} to other_vendors...`);
        fs.renameSync(sourcePath, destPath);
    } else {
        console.log(`Keeping ${vendor} in vendors (Popular)`);
    }
}
console.log('Reorganization complete.');
