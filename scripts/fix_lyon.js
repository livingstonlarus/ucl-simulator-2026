import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGOS_DIR = path.join(__dirname, '../public/assets/logos');

async function fixLyon() {
    const pageUrl = `https://en.wikipedia.org/wiki/Olympique_Lyonnais`;
    const pageRes = await fetch(pageUrl, { headers: { 'User-Agent': 'UCL-Simulator-Bot/2.0 (jmetillon@gmail.com)' } });
    const pageHtml = await pageRes.text();
    
    // Extract infobox image src
    const imgRegex = /<td[^>]*class="[^"]*infobox-image[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/i;
    const match = pageHtml.match(imgRegex);
    let imgSrc = match ? match[1] : null;

    if (!imgSrc) {
        console.log('Failed to find image on Olympique_Lyonnais page.');
        return;
    }

    if (imgSrc.startsWith('//')) {
        imgSrc = 'https:' + imgSrc;
    }

    console.log(`Downloading: ${imgSrc}`);
    const imgDownloadRes = await fetch(imgSrc, { headers: { 'User-Agent': 'UCL-Simulator-Bot/2.0 (jmetillon@gmail.com)' } });
    if (!imgDownloadRes.ok) {
        console.error("Failed to download image");
        return;
    }

    // Keep it as a png if it came as a thumb png, or svg if original.
    // The previous mapping points to `/assets/logos/Olympique_Lyonnais.png`. We'll just overwrite it.
    const savePath = path.join(LOGOS_DIR, 'Olympique_Lyonnais.png');
    
    const buffer = Buffer.from(await imgDownloadRes.arrayBuffer());
    fs.writeFileSync(savePath, buffer);
    console.log('✅ Success: Overwrote Olympique Lyonnais logo.');
}

fixLyon();
