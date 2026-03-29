import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGO_MAPPING_PATH = path.join(__dirname, '../src/logoMapping.json');
const LOGOS_DIR = path.join(__dirname, '../public/assets/logos');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function smartFetch(url, options = {}) {
  let res = await fetch(url, options);
  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after') || 15;
    console.log(`⚠️ Rate limited (429) on ${url}. Waiting ${retryAfter}s...`);
    await sleep(retryAfter * 1000);
    res = await fetch(url, options);
  }
  return res;
}

async function fetchMissingLogos() {
  if (!fs.existsSync(LOGOS_DIR)) {
    fs.mkdirSync(LOGOS_DIR, { recursive: true });
  }

  let mappings;
  try {
    const data = fs.readFileSync(LOGO_MAPPING_PATH, 'utf8');
    mappings = JSON.parse(data);
  } catch (err) {
    console.error("Could not read logoMapping.json:", err);
    return;
  }

  const missingTeams = Object.keys(mappings).filter(team => mappings[team] === null);
  console.log(`Found ${missingTeams.length} teams missing logos.`);

  let successCount = 0;
  let failCount = 0;

  for (const team of missingTeams) {
    console.log(`\nProcessing: ${team}...`);
    try {
      // 1. Search for the Wikipedia page
      const searchQuery = encodeURIComponent(`${team} football club`);
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${searchQuery}&utf8=&format=json`;
      const searchRes = await smartFetch(searchUrl, { headers: { 'User-Agent': 'UCL-Simulator-Bot/2.0 (jmetillon@gmail.com)' } });
      const searchData = await searchRes.json();
      
      let bestTitle = null;
      if (searchData.query && searchData.query.search.length > 0) {
        bestTitle = searchData.query.search[0].title;
      }
      
      if (!bestTitle) {
         console.log(`❌ Could not find Wikipedia page for ${team}`);
         failCount++;
         continue;
      }
      
      console.log(`Found Wikipedia page: "${bestTitle}"`);
      
      // 2. Fetch the Wikipedia page HTML
      const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(bestTitle.replace(/ /g, '_'))}`;
      const pageRes = await smartFetch(pageUrl, { headers: { 'User-Agent': 'UCL-Simulator-Bot/2.0 (jmetillon@gmail.com)' } });
      const pageHtml = await pageRes.text();
      
      // 3. Extract infobox image src
      // Wikipedia usually wraps the logo in an infobox-image class
      const imgRegex = /<td[^>]*class="[^"]*infobox-image[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/i;
      const match = pageHtml.match(imgRegex);
      
      let imgSrc = null;
      if (match && match[1]) {
        imgSrc = match[1];
      } else {
        // Fallback: just look for the first image in the infobox table
        const infoboxRegex = /<table[^>]*class="[^"]*infobox[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/i;
        const fallbackMatch = pageHtml.match(infoboxRegex);
        if (fallbackMatch && fallbackMatch[1]) {
           imgSrc = fallbackMatch[1];
        }
      }

      if (!imgSrc) {
         console.log(`❌ Could not find an infobox image for ${team} on ${bestTitle}`);
         failCount++;
         continue;
      }

      // Format URL (handles starting with //)
      if (imgSrc.startsWith('//')) {
         imgSrc = 'https:' + imgSrc;
      }
      
      const imgExtension = imgSrc.split('.').pop().split('?')[0].toLowerCase();
      const safeExt = ['svg', 'png', 'jpg', 'jpeg', 'gif'].includes(imgExtension) ? imgExtension : 'png';
      const safeTeamName = team.replace(/[\/\\]/g, '_').replace(/\s+/g, '_');
      const filename = `${safeTeamName}.${safeExt}`;
      const savePath = path.join(LOGOS_DIR, filename);
      
      const imgDownloadRes = await smartFetch(imgSrc, { headers: { 'User-Agent': 'UCL-Simulator-Bot/2.0 (jmetillon@gmail.com)' } });
      if (!imgDownloadRes.ok) {
         throw new Error("Failed to download image from " + imgSrc);
      }
      const buffer = Buffer.from(await imgDownloadRes.arrayBuffer());
      fs.writeFileSync(savePath, buffer);
      
      // 5. Update mapping
      mappings[team] = `/assets/logos/${filename}`;
      fs.writeFileSync(LOGO_MAPPING_PATH, JSON.stringify(mappings, null, 2));
      console.log(`✅ Success: ${team} saved as ${filename}`);
      successCount++;
      
    } catch (e) {
       console.log(`❌ Error processing ${team}: ${e.message}`);
       failCount++;
    }
    
    // Throttle 1.5s
    await sleep(1500);
  }

  console.log(`\n--- FETCHING COMPLETE ---`);
  console.log(`Successfully fetched: ${successCount}`);
  console.log(`Failed/Missing: ${failCount}`);
  console.log(`logoMapping.json updated.`);
}

fetchMissingLogos();
