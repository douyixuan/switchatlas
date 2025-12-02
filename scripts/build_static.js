const fs = require('fs');
const path = require('path');
const marked = require('marked'); // We need marked installed

const DATA_DIR = path.join(__dirname, '../data/vendors');
const DIST_DIR = path.join(__dirname, '../dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');

// Ensure dist structure
if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR, { recursive: true });
if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

// --- HELPERS ---

function parseFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/);
    if (!match) return { data: {}, body: content };
    
    const yamlBlock = match[1];
    const body = match[2];
    const data = {};
    const lines = yamlBlock.split('\n');
    let parentKey = null;

    for (const line of lines) {
        if (!line.trim() || line.startsWith('#')) continue;
        const kvMatch = line.match(/^([a-z0-9_]+):\s*(.*)$/i);
        const nestedMatch = line.match(/^  ([a-z0-9_]+):\s*(.*)$/i);
        const parentMatch = line.match(/^([a-z0-9_]+):$/i);

        if (parentMatch) {
            parentKey = parentMatch[1];
            data[parentKey] = {};
        } else if (nestedMatch && parentKey) {
            data[parentKey][nestedMatch[1]] = nestedMatch[2];
        } else if (kvMatch) {
            parentKey = null;
            data[kvMatch[1]] = kvMatch[2];
        }
    }
    return { data, body };
}

function renderTemplate(title, content, activeVendor = '') {
    // Generate Sidebar Links
    const vendors = fs.readdirSync(DATA_DIR).filter(f => fs.statSync(path.join(DATA_DIR, f)).isDirectory());
    const sidebarHtml = vendors.map(v => {
        const activeClass = v === activeVendor ? 'class="active"' : '';
        return `<li><a href="/vendors/${v}/index.html" ${activeClass}>${v}</a></li>`;
    }).join('\n');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | SwitchAtlas</title>
    <link rel="stylesheet" href="/assets/style.css">
</head>
<body>
    <header>
        <a href="/" class="brand">SwitchAtlas</a>
        <a href="https://github.com/cedric/switchatlas" style="color: var(--text-secondary); text-decoration: none;">GitHub</a>
    </header>
    <div class="container">
        <aside class="sidebar">
            <h3>Vendors</h3>
            <ul>
                ${sidebarHtml}
            </ul>
        </aside>
        <main class="main-content">
            ${content}
        </main>
    </div>
</body>
</html>
    `;
}

function copyFile(src, dest) {
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
    }
}

// --- MAIN BUILD ---

console.log('Building Static Site...');

// 1. Build Vendor Pages (Pagination)
const vendors = fs.readdirSync(DATA_DIR);
const allSwitches = [];

vendors.forEach(vendor => {
    const vendorPath = path.join(DATA_DIR, vendor);
    if (!fs.statSync(vendorPath).isDirectory()) return;
    
    // Output dir for vendor
    const vendorDistDir = path.join(DIST_DIR, 'vendors', vendor);
    fs.mkdirSync(vendorDistDir, { recursive: true });

    // Collect Switches
    const switches = [];
    const walk = (dir) => {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                walk(fullPath);
            } else if (file === 'README.md') {
                if (dir !== vendorPath) {
                    const raw = fs.readFileSync(fullPath, 'utf8');
                    const { data, body } = parseFrontmatter(raw);
                    const relDir = path.relative(DATA_DIR, dir); // e.g. Cherry/MX/Red -> MX/Red ? No, rel to VENDORS_DIR
                    // Actually relative to the switch dir to copy images
                    
                    // Copy Images
                    let webImgPath = '';
                    let webCurvePath = '';
                    
                    // Switch Image
                    if (data.images && data.images.switch) {
                        const srcImg = path.join(dir, data.images.switch);
                        if (fs.existsSync(srcImg) && fs.statSync(srcImg).size > 100) {
                            const destImgName = `${Date.now()}_${path.basename(srcImg)}`;
                            copyFile(srcImg, path.join(vendorDistDir, destImgName));
                            webImgPath = `/vendors/${vendor}/${destImgName}`;
                        }
                    }
                    
                    // Curve Image
                    if (data.images && data.images.curve) {
                        const srcImg = path.join(dir, data.images.curve);
                        if (fs.existsSync(srcImg) && fs.statSync(srcImg).size > 100) {
                            const destImgName = `${Date.now()}_curve_${path.basename(srcImg)}`;
                            copyFile(srcImg, path.join(vendorDistDir, destImgName));
                            webCurvePath = `/vendors/${vendor}/${destImgName}`;
                        }
                    }

                    // Generate Detail HTML for Switch ??
                    // Actually, let's just create a modal or detail page? 
                    // Let's make a detail page for each switch to be static friendly.
                    const safeName = (data.name || path.basename(dir)).replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    const detailFilename = `${safeName}.html`;
                    
                    switches.push({
                        meta: data,
                        body: body,
                        name: data.name || path.basename(dir),
                        image: webImgPath || 'https://huggingface.co/front/assets/huggingface_logo-noborder.svg',
                        curve: webCurvePath,
                        link: `/vendors/${vendor}/${detailFilename}`,
                        filename: detailFilename,
                        fullVendor: vendor
                    });
                }
            }
        });
    };
    walk(vendorPath);
    
    switches.sort((a,b) => a.name.localeCompare(b.name));

    // Generate Detail Pages
    switches.forEach(sw => {
        const detailHtml = `
            <div class="detail-header">
                <img src="${sw.image}" class="detail-image" alt="${sw.name}">
                <div class="detail-specs">
                    <h1>${sw.name}</h1>
                    <div style="margin-bottom: 2rem;">
                         ${marked.parse(sw.body || '')}
                    </div>
                    <table class="spec-table">
                        <tr><td class="spec-label">Type</td><td>${sw.meta.type || 'Unknown'}</td></tr>
                        <tr><td class="spec-label">Actuation Force</td><td>${sw.meta.force ? sw.meta.force.actuation + 'g' : '?'}</td></tr>
                        <tr><td class="spec-label">Bottom Out</td><td>${sw.meta.force ? sw.meta.force.bottom_out + 'g' : '?'}</td></tr>
                        <tr><td class="spec-label">Travel</td><td>${sw.meta.travel ? sw.meta.travel.actuation + 'mm / ' + sw.meta.travel.total + 'mm' : '?'}</td></tr>
                        <tr><td class="spec-label">Mount</td><td>${sw.meta.mount || '?'}</td></tr>
                    </table>
                </div>
            </div>
            ${sw.curve ? `
            <div class="curve-container">
                <h3>Force Curve</h3>
                <img src="${sw.curve}" style="width: 100%;" alt="Force Curve">
            </div>` : ''}
        `;
        
        fs.writeFileSync(
            path.join(vendorDistDir, sw.filename), 
            renderTemplate(sw.name, detailHtml, vendor)
        );
    });

    // Generate Pagination Pages
    const CHUNK_SIZE = 12;
    const chunkCount = Math.ceil(switches.length / CHUNK_SIZE);
    
    if (chunkCount === 0) {
        // Empty vendor page
        fs.writeFileSync(path.join(vendorDistDir, 'index.html'), renderTemplate(vendor, '<h1>No switches found.</h1>', vendor));
    }

    for (let i = 0; i < chunkCount; i++) {
        const chunk = switches.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const pageNum = i + 1;
        const filename = i === 0 ? 'index.html' : `page_${pageNum}.html`;
        
        let gridHtml = `<h1 style="margin-bottom: 1.5rem">${vendor} <span style="font-size: 0.6em; color: var(--text-secondary); font-weight: normal">(${switches.length} switches)</span></h1>`;
        gridHtml += `<div class="grid">`;
        
        chunk.forEach(sw => {
            gridHtml += `
                <a href="${sw.link}" class="card">
                    <img src="${sw.image}" class="card-image" loading="lazy" alt="${sw.name}">
                    <div class="card-body">
                        <h4 class="card-title">${sw.name}</h4>
                        <div class="card-meta">
                            <span>${sw.meta.type || 'Switch'}</span>
                            <span>${sw.meta.force ? sw.meta.force.actuation + 'g' : ''}</span>
                        </div>
                    </div>
                </a>
            `;
        });
        gridHtml += `</div>`;
        
        // Paginator
        gridHtml += `<div class="pagination">`;
        if (i > 0) {
             gridHtml += `<a href="${i === 1 ? 'index.html' : 'page_' + i + '.html'}">&larr; Previous</a>`;
        } else {
             gridHtml += `<span></span>`;
        }
        if (i < chunkCount - 1) {
             gridHtml += `<a href="page_${pageNum + 1}.html">Next &rarr;</a>`;
        }
        gridHtml += `</div>`;

        fs.writeFileSync(
            path.join(vendorDistDir, filename), 
            renderTemplate(`${vendor} - Page ${pageNum}`, gridHtml, vendor)
        );
    }
    
    // Tracking for Home
    if (switches.length > 0) {
        allSwitches.push(...switches.slice(0, 4)); // Take first 4 for home preview
    }
});

// 2. Build Home Page
const homeHtml = `
    <div style="text-align: center; margin-bottom: 3rem;">
        <h1 style="font-size: 2.5rem; margin-bottom: 1rem;">Welcome to SwitchAtlas</h1>
        <p style="color: var(--text-secondary); font-size: 1.2rem; max-width: 600px; margin: 0 auto;">
            The comprehensive database of mechanical keyboard switches.
            Explore ${allSwitches.length} popular options.
        </p>
    </div>
    
    <h2 style="margin-bottom: 1.5rem">Featured Switches</h2>
    <div class="grid">
        ${allSwitches.slice(0, 8).map(sw => `
            <a href="${sw.link}" class="card">
                <img src="${sw.image}" class="card-image" loading="lazy" alt="${sw.name}">
                <div class="card-body">
                    <h4 class="card-title">${sw.name}</h4>
                    <div class="card-meta">
                         <span>${sw.meta.type || 'Switch'}</span>
                         <span>${sw.fullVendor}</span>
                    </div>
                </div>
            </a>
        `).join('')}
    </div>
`;

fs.writeFileSync(path.join(DIST_DIR, 'index.html'), renderTemplate('Home', homeHtml));

console.log('Static site built in /dist');
