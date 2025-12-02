const https = require('https');

// Helper to fetch URL
function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function inspectRepo(owner, repo, path = '') {
    console.log(`\n--- Inspecting ${owner}/${repo}/${path} ---`);
    try {
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
        const data = await fetchUrl(url);
        const json = JSON.parse(data);
        
        if (Array.isArray(json)) {
            console.log(`Found ${json.length} items.`);
            // Log first 5 items
            json.slice(0, 5).forEach(item => {
                console.log(` - ${item.name} (${item.type})`);
            });
            
            // recursive check for 'data' folder
            const dataFolder = json.find(i => i.name === 'data' && i.type === 'dir');
            if (dataFolder) {
                console.log('Found "data" folder, inspecting...');
                await inspectRepo(owner, repo, path ? path + '/data' : 'data');
            }
        } else {
            console.log('Response not an array:', json.message || 'Unknown structure');
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

async function run() {
    await inspectRepo('ThereminGoat', 'force-curves');
    await inspectRepo('heralden', 'switchesdb', 'resources/public');
}

run();
