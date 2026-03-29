import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGOS_DIR = path.join(__dirname, '../public/assets/logos');

const teamsToFix = [
    { teamName: 'SSC Napoli', wikiPage: 'SSC_Napoli', filePrefix: 'SSC_Napoli' },
    { teamName: 'SL Benfica', wikiPage: 'S.L._Benfica', filePrefix: 'SL_Benfica' },
    { teamName: 'Bodø/Glimt', wikiPage: 'FK_Bodø/Glimt', filePrefix: 'Bodø_Glimt' }
];

async function fixLogos() {
    for (const team of teamsToFix) {
        const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(team.wikiPage)}`;
        console.log(`Processing ${team.teamName} via ${pageUrl}...`);
        
        const pageRes = await fetch(pageUrl, { headers: { 'User-Agent': 'UCL-Simulator-Bot/3.0 (jmetillon@gmail.com)' } });
        const pageHtml = await pageRes.text();
        
        // Extract infobox image src
        const imgRegex = /<td[^>]*class="[^"]*infobox-image[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/i;
        const match = pageHtml.match(imgRegex);
        let imgSrc = match ? match[1] : null;

        if (!imgSrc) {
            console.log(`❌ Failed to find image for ${team.teamName}.`);
            continue;
        }

        if (imgSrc.startsWith('//')) {
            imgSrc = 'https:' + imgSrc;
        }

        console.log(`Downloading: ${imgSrc}`);
        const imgDownloadRes = await fetch(imgSrc, { headers: { 'User-Agent': 'UCL-Simulator-Bot/3.0 (jmetillon@gmail.com)' } });
        
        if (!imgDownloadRes.ok) {
            console.error(`❌ Failed to download image for ${team.teamName}: ${imgDownloadRes.statusText}`);
            continue;
        }

        // Just use .png regardless, as we're saving thumbs and keeping same filenames
        const savePath = path.join(LOGOS_DIR, `${team.filePrefix}.png`);
        
        const buffer = Buffer.from(await imgDownloadRes.arrayBuffer());
        fs.writeFileSync(savePath, buffer);
        console.log(`✅ Success: Overwrote logo for ${team.teamName}.`);
    }
}

fixLogos();
