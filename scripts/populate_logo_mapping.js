import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbFile);
const LOGO_MAPPING_PATH = path.join(__dirname, '../src/logoMapping.json');

db.serialize(() => {
  const sql = `
    SELECT name FROM teams 
    UNION SELECT team_name FROM league_standings 
    UNION SELECT team_name FROM club_coefficients 
    UNION SELECT team_name FROM club_coefficients_fantasy 
    UNION SELECT REPLACE(team1, substr(team1, instr(team1, ' (')), '') FROM matches 
    UNION SELECT REPLACE(team2, substr(team2, instr(team2, ' (')), '') FROM matches;
  `;

  db.all(sql, [], (err, rows) => {
    if (err) throw err;
    const allTeams = rows.map(r => r.name || r.team_name || r.REPLACE(team1)).filter(t => t);
    
    // Some logic to clean up names just in case
    const cleanTeams = [...new Set(allTeams.map(t => {
      if (t.includes(' (')) return t.split(' (')[0].trim();
      return t;
    }))];

    let mappings = {};
    if (fs.existsSync(LOGO_MAPPING_PATH)) {
      mappings = JSON.parse(fs.readFileSync(LOGO_MAPPING_PATH, 'utf8'));
    }

    cleanTeams.forEach(team => {
      if (mappings[team] === undefined) {
        mappings[team] = null; // New missing team
      }
    });

    fs.writeFileSync(LOGO_MAPPING_PATH, JSON.stringify(mappings, null, 2));
    console.log(`Updated logo mapping with ${cleanTeams.length} total teams.`);
  });
});
