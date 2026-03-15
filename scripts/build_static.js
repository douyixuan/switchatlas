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
<body class="theme-soft">
    <script>
        // Load saved theme immediately to prevent flash
        const savedTheme = localStorage.getItem('switchatlas-theme') || 'theme-soft';
        document.body.className = savedTheme;
    </script>
    <header>
        <a href="/" class="brand">SwitchAtlas</a>
        <div style="display: flex; align-items: center; gap: 1rem;">
            <button id="theme-button" aria-label="Toggle Theme" style="padding: 0.5rem 1rem; border-radius: 20px; border: var(--card-border); background: var(--card-bg); color: var(--text-primary); cursor: pointer; font-family: inherit; font-size: 0.9rem; font-weight: 500; transition: all 0.3s ease; box-shadow: var(--shadow-sm);">Theme</button>
            <a href="https://github.com/cedric/switchatlas" class="github-link">GitHub</a>
        </div>
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
    <script>
        const themeButton = document.getElementById('theme-button');
        const themes = ['theme-soft', 'theme-neumorphism', 'theme-glassmorphism'];
        const themeLabels = {
            'theme-soft': 'Soft Theme',
            'theme-neumorphism': 'Neumorphism',
            'theme-glassmorphism': 'Glassmorphism'
        };

        // Update button text to match current theme
        function updateButtonLabel() {
            themeButton.textContent = themeLabels[document.body.className] || 'Theme';
        }
        updateButtonLabel();

        themeButton.addEventListener('click', () => {
            const currentTheme = document.body.className;
            const currentIndex = themes.indexOf(currentTheme);
            const nextIndex = (currentIndex + 1) % themes.length;
            const nextTheme = themes[nextIndex];

            document.body.className = nextTheme;
            localStorage.setItem('switchatlas-theme', nextTheme);
            updateButtonLabel();
        });
    </script>
</body>
</html>
    `;
}

function copyFile(src, dest) {
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
    }
}

const cssContent = `
/* BASE STYLES */
:root {
    /* Fallback variables, will be overridden by theme classes */
    --bg-color: #ffffff;
    --card-bg: #f8f9fa;
    --text-primary: #212529;
    --text-secondary: #6c757d;
    --accent: #0d6efd;
    --border: #dee2e6;
    --radius-sm: 8px;
    --radius-md: 16px;
    --radius-lg: 24px;
    --shadow-sm: 0 2px 4px rgba(0,0,0,0.05);
    --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
    --shadow-hover: 0 8px 24px rgba(0,0,0,0.12);
    --header-bg: var(--card-bg);
    --sidebar-bg: var(--bg-color);
    --transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    --backdrop: none;
    --card-border: 1px solid var(--border);
}

/* THEME 1: Soft & Approachable */
body.theme-soft {
    --bg-color: #fafaf9;
    --card-bg: #ffffff;
    --text-primary: #1c1917;
    --text-secondary: #78716c;
    --accent: #8b5cf6;
    --border: #e7e5e4;
    --radius-sm: 12px;
    --radius-md: 20px;
    --radius-lg: 32px;
    --shadow-sm: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    --shadow-md: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025);
    --shadow-hover: 0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.03);
}

/* THEME 2: Neumorphism */
body.theme-neumorphism {
    --bg-color: #e0e5ec;
    --card-bg: #e0e5ec;
    --text-primary: #334155;
    --text-secondary: #64748b;
    --accent: #3b82f6;
    --border: transparent;
    --radius-sm: 12px;
    --radius-md: 20px;
    --radius-lg: 30px;
    --shadow-sm: 5px 5px 10px #bec3c9, -5px -5px 10px #ffffff;
    --shadow-md: 9px 9px 16px #bec3c9, -9px -9px 16px #ffffff;
    --shadow-hover: 12px 12px 24px #bec3c9, -12px -12px 24px #ffffff;
    --card-border: none;
}
body.theme-neumorphism header {
    box-shadow: 0 4px 10px #bec3c9;
}
body.theme-neumorphism .sidebar {
    box-shadow: 4px 0 10px #bec3c9;
    z-index: 10;
}
body.theme-neumorphism .card-image {
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
}

/* THEME 3: Glassmorphism */
body.theme-glassmorphism {
    --bg-color: #1a1a2e; /* Fallback */
    --card-bg: rgba(255, 255, 255, 0.1);
    --text-primary: #f8fafc;
    --text-secondary: #cbd5e1;
    --accent: #38bdf8;
    --border: rgba(255, 255, 255, 0.2);
    --radius-sm: 16px;
    --radius-md: 24px;
    --radius-lg: 32px;
    --shadow-sm: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
    --shadow-md: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
    --shadow-hover: 0 12px 48px 0 rgba(0, 0, 0, 0.4);
    --backdrop: blur(12px);
    --header-bg: rgba(26, 26, 46, 0.7);
    --sidebar-bg: rgba(26, 26, 46, 0.4);
}
/* Colorful background for glassmorphism */
body.theme-glassmorphism::before {
    content: '';
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    background: linear-gradient(125deg, #1a1a2e 0%, #16213e 40%, #0f3460 80%, #e94560 100%);
    z-index: -1;
}

body {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background-color: var(--bg-color);
    color: var(--text-primary);
    margin: 0;
    padding: 0;
    line-height: 1.6;
    transition: background-color 0.4s ease, color 0.4s ease;
}

header {
    background-color: var(--header-bg);
    border-bottom: var(--card-border);
    padding: 1rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 100;
    backdrop-filter: var(--backdrop);
    -webkit-backdrop-filter: var(--backdrop);
    box-shadow: var(--shadow-sm);
    transition: var(--transition);
}

.brand {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--accent);
    text-decoration: none;
    letter-spacing: -0.5px;
}

/* Form Elements */
select {
    padding: 0.5rem 1rem;
    border-radius: var(--radius-sm);
    border: var(--card-border);
    background-color: var(--card-bg);
    color: var(--text-primary);
    font-family: inherit;
    font-size: 0.9rem;
    cursor: pointer;
    box-shadow: var(--shadow-sm);
    outline: none;
    transition: var(--transition);
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.75rem center;
    padding-right: 2.5rem;
}

body.theme-glassmorphism select option {
    background-color: #1a1a2e;
    color: white;
}

.github-link {
    color: var(--text-secondary);
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s;
}
.github-link:hover {
    color: var(--accent);
}

.container {
    display: flex;
    max-width: 1400px;
    margin: 0 auto;
    min-height: calc(100vh - 70px);
}

.sidebar {
    width: 250px;
    background-color: var(--sidebar-bg);
    border-right: var(--card-border);
    padding: 1.5rem;
    overflow-y: auto;
    height: calc(100vh - 70px);
    position: sticky;
    top: 70px;
    backdrop-filter: var(--backdrop);
    -webkit-backdrop-filter: var(--backdrop);
    transition: var(--transition);
}

.sidebar h3 {
    font-size: 0.85rem;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--text-secondary);
    margin-bottom: 1rem;
    letter-spacing: 1px;
}

.sidebar ul {
    list-style: none;
    padding: 0;
    margin: 0 0 1.5rem 0;
}

.sidebar a {
    display: block;
    padding: 0.6rem 1rem;
    color: var(--text-primary);
    text-decoration: none;
    border-radius: var(--radius-sm);
    font-size: 0.95rem;
    transition: var(--transition);
    margin-bottom: 0.25rem;
    font-weight: 500;
}

.sidebar a:hover, .sidebar a.active {
    background-color: var(--card-bg);
    color: var(--accent);
    box-shadow: var(--shadow-sm);
}

.main-content {
    flex: 1;
    padding: 2.5rem;
}

.grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 2rem;
}

.card {
    background-color: var(--card-bg);
    border: var(--card-border);
    border-radius: var(--radius-md);
    overflow: hidden;
    transition: var(--transition);
    text-decoration: none;
    color: inherit;
    display: block;
    box-shadow: var(--shadow-sm);
    backdrop-filter: var(--backdrop);
    -webkit-backdrop-filter: var(--backdrop);
}

.card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-hover);
    border-color: var(--accent);
}

.card-image {
    width: 100%;
    height: 180px;
    object-fit: cover;
    background-color: rgba(0,0,0,0.05);
}

.card-body {
    padding: 1rem;
}

.card-title {
    margin: 0 0 0.5rem 0;
    font-size: 1.1rem;
}

.card-meta {
    font-size: 0.85rem;
    color: var(--text-secondary);
    display: flex;
    justify-content: space-between;
}

.pagination {
    display: flex;
    justify-content: space-between;
    margin-top: 3rem;
    padding-top: 1.5rem;
    border-top: var(--card-border);
}

.pagination a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 600;
    padding: 0.5rem 1rem;
    border-radius: var(--radius-sm);
    background-color: var(--card-bg);
    box-shadow: var(--shadow-sm);
    border: var(--card-border);
    transition: var(--transition);
}

.pagination a:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-hover);
}

/* Detail Page */
.detail-header {
    display: flex;
    gap: 3rem;
    margin-bottom: 3rem;
    align-items: flex-start;
}

.detail-image {
    width: 400px;
    border-radius: var(--radius-lg);
    border: var(--card-border);
    box-shadow: var(--shadow-md);
}

.detail-specs {
    flex: 1;
    background-color: var(--card-bg);
    padding: 2rem;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    border: var(--card-border);
    backdrop-filter: var(--backdrop);
    -webkit-backdrop-filter: var(--backdrop);
}

.detail-specs h1 {
    margin-top: 0;
    font-size: 2rem;
    color: var(--accent);
}

.spec-table {
    width: 100%;
    border-collapse: collapse;
}

.spec-table td {
    padding: 1rem 0;
    border-bottom: var(--card-border);
}
.spec-table tr:last-child td {
    border-bottom: none;
}

.spec-label {
    color: var(--text-secondary);
    width: 150px;
    font-weight: 500;
}

.curve-container {
    margin-top: 3rem;
    background-color: var(--card-bg);
    padding: 2rem;
    border-radius: var(--radius-md);
    max-width: 800px;
    box-shadow: var(--shadow-sm);
    border: var(--card-border);
    backdrop-filter: var(--backdrop);
    -webkit-backdrop-filter: var(--backdrop);
}

.curve-container img {
    border-radius: var(--radius-sm);
}

.home-hero {
    text-align: center;
    margin-bottom: 4rem;
    padding: 4rem 2rem;
    background-color: var(--card-bg);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    border: var(--card-border);
    backdrop-filter: var(--backdrop);
    -webkit-backdrop-filter: var(--backdrop);
}

.home-hero h1 {
    font-size: 3rem;
    margin-bottom: 1rem;
    font-weight: 800;
    background: linear-gradient(135deg, var(--accent), #f472b6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.home-hero p {
    color: var(--text-secondary);
    font-size: 1.25rem;
    max-width: 600px;
    margin: 0 auto;
}

.section-title {
    margin-bottom: 2rem;
    font-size: 1.8rem;
    font-weight: 700;
}

.vendor-title {
    margin-bottom: 2rem;
    font-size: 2.2rem;
    font-weight: 800;
}

.vendor-count {
    font-size: 0.5em;
    color: var(--text-secondary);
    font-weight: normal;
    vertical-align: middle;
    background: var(--card-bg);
    padding: 0.2rem 0.6rem;
    border-radius: 20px;
    border: var(--card-border);
}

@media (max-width: 768px) {
    .container { flex-direction: column; }
    .sidebar { width: 100%; height: auto; position: static; border-right: none; border-bottom: var(--card-border); }
    .detail-header { flex-direction: column; gap: 1.5rem; }
    .detail-image { width: 100%; }
}
`;

// --- MAIN BUILD ---

console.log('Building Static Site...');

// 0. Write CSS and Copy Default Assets
fs.writeFileSync(path.join(ASSETS_DIR, 'style.css'), cssContent);
const SRC_ASSETS_DIR = path.join(__dirname, '../assets');
if (fs.existsSync(SRC_ASSETS_DIR)) {
    fs.readdirSync(SRC_ASSETS_DIR).forEach(file => {
        copyFile(path.join(SRC_ASSETS_DIR, file), path.join(ASSETS_DIR, file));
    });
}

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

                    const safeName = (data.name || path.basename(dir)).replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    const detailFilename = `${safeName}.html`;
                    
                    switches.push({
                        meta: data,
                        body: body,
                        name: data.name || path.basename(dir),
                        image: webImgPath || '/assets/default-switch.png',
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
        fs.writeFileSync(path.join(vendorDistDir, 'index.html'), renderTemplate(vendor, '<h1>No switches found.</h1>', vendor));
    }

    for (let i = 0; i < chunkCount; i++) {
        const chunk = switches.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const pageNum = i + 1;
        const filename = i === 0 ? 'index.html' : `page_${pageNum}.html`;
        
        let gridHtml = `<h1 class="vendor-title">${vendor} <span class="vendor-count">(${switches.length} switches)</span></h1>`;
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
    <div class="home-hero">
        <h1>Welcome to SwitchAtlas</h1>
        <p>
            The comprehensive database of mechanical keyboard switches.
            Explore ${allSwitches.length} popular options.
        </p>
    </div>
    
    <h2 class="section-title">Featured Switches</h2>
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
