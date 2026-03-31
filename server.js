import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const dbFile = './database.sqlite';
const db = new sqlite3.Database(dbFile);

db.serialize(() => {
  // 1. Create parties table
  db.run(`CREATE TABLE IF NOT EXISTS parties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 2. Create matches table with party_id
  db.run(`CREATE TABLE IF NOT EXISTS matches (
    id INTEGER,
    party_id INTEGER,
    team1 TEXT,
    team2 TEXT,
    s1a TEXT,
    s2a TEXT,
    s1r TEXT,
    s2r TEXT,
    winner TEXT,
    round TEXT,
    path TEXT,
    PRIMARY KEY (id, party_id)
  )`, (err) => {
    // Migration: ensure columns exist
    db.run("ALTER TABLE matches ADD COLUMN round TEXT", (err) => {});
    db.run("ALTER TABLE matches ADD COLUMN path TEXT", (err) => {});
  });

  // 3. Create teams table
  db.run(`CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    coefficient REAL,
    association TEXT,
    is_champion INTEGER DEFAULT 0
  )`);

  // 4. Create brackets table
  db.run(`CREATE TABLE IF NOT EXISTS brackets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER,
    round_name TEXT,
    path TEXT,
    team1_source TEXT, -- 'TEAM', 'WINNER', 'LOSER'
    team1_value TEXT,
    team2_source TEXT,
    team2_value TEXT
  )`);

  // 5. Create league_matches table
  db.run(`CREATE TABLE IF NOT EXISTS league_matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    party_id INTEGER,
    matchday INTEGER,
    home_team TEXT,
    away_team TEXT,
    home_score TEXT,
    away_score TEXT,
    finished INTEGER DEFAULT 0
  )`);

  // Migration: If we have old data (without party_id in the row check, though SQLite is flexible)
  // Let's ensure at least one party exists if we have matches
  db.get("SELECT COUNT(*) as count FROM parties", (err, row) => {
    if (row && row.count === 0) {
      db.run("INSERT INTO parties (id, name) VALUES (1, 'Simulation 1')");
      db.run("UPDATE matches SET party_id = 1 WHERE party_id IS NULL");
    }
  });

  // Initialize Q1 dynamically for the default simulation if empty
  db.get("SELECT COUNT(*) as count FROM matches WHERE party_id = 1", (err, row) => {
    if (row && row.count === 0) {
      generateRound(1, 'Q1').catch(e => console.error("Error init Q1:", e));
    }
  });
});

async function generateRound(partyId, roundName) {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM brackets WHERE round_name = ?", [roundName], async (err, bracketRows) => {
      if (err) return reject(err);
      if (bracketRows.length === 0) return reject(new Error(`No bracket definition for ${roundName}`));

      db.all("SELECT * FROM matches WHERE party_id = ?", [partyId], async (err, existingMatches) => {
        if (err) return reject(err);

        // Utility to execute single DB queries as promises
        const queryDB = (sql, params) => new Promise((res, rej) => {
          db.get(sql, params, (e, row) => e ? rej(e) : res(row));
        });

        const newMatches = [];

        // Resolve winners/teams for each bracket row
        for (const b of bracketRows) {
          const resolveSource = async (source, value) => {
            if (source === 'TEAM') return value;
            if (source === 'WINNER') {
              const match = existingMatches.find(m => m.id === parseInt(value));
              return match ? match.winner : null;
            }
            if (source === 'LEAGUE_RANK') {
              const [assoc, rank] = value.split(':');
              const row = await queryDB("SELECT team_name FROM league_standings WHERE association = ? AND rank = ?", [assoc, parseInt(rank)]);
              return row ? `${row.team_name} (${assoc})` : `Unknown ${value}`;
            }
            return null;
          };

          const team1 = await resolveSource(b.team1_source, b.team1_value);
          const team2 = await resolveSource(b.team2_source, b.team2_value);
          
          newMatches.push({
            id: b.target_id,
            party_id: partyId,
            team1,
            team2,
            round: b.round_name,
            path: b.path
          });
        }

        // Validation: All teams must be resolved
        const unresolved = newMatches.filter(m => !m.team1 || !m.team2 || m.team1.startsWith('Unknown') || m.team2.startsWith('Unknown'));
        if (unresolved.length > 0) {
          return reject(new Error("Some matches could not be resolved. Ensure previous rounds are finished and league standings are set."));
        }

        // Check if round already generated
        const alreadyExists = existingMatches.some(m => newMatches.map(nm => nm.id).includes(m.id));
        if (alreadyExists) return reject(new Error(`${roundName} already generated.`));

        // Insert new matches
        const stmt = db.prepare("INSERT INTO matches (id, party_id, team1, team2, s1a, s2a, s1r, s2r, winner, round, path) VALUES (?, ?, ?, ?, '', '', '', '', null, ?, ?)");
        
        db.serialize(() => {
          for (const m of newMatches) {
            stmt.run(m.id, m.party_id, m.team1, m.team2, m.round, m.path);
          }
          stmt.finalize((err) => {
            if (err) reject(err);
            else resolve(true);
          });
        });
      });
    });
  });
}

// --- PARTIES API ---

app.get('/parties', (req, res) => {
  console.log("DEBUG: GET /parties called at", new Date().toISOString());
  db.all("SELECT * FROM parties ORDER BY created_at DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    console.log("DEBUG: Returning parties:", rows);
    res.json(rows);
  });
});

app.post('/parties', (req, res) => {
  const { name } = req.body;
  db.run("INSERT INTO parties (name) VALUES (?)", [name || "Nouvelle Simulation"], async function(err) {
    if (err) return res.status(500).json({ error: err.message });
    const newId = this.lastID;
    try {
      await generateRound(newId, 'Q1');
    } catch (e) {
      console.error("Erreur gènèration Q1 :", e);
    }
    res.json({ id: newId, name: name || "Nouvelle Simulation" });
  });
});

// --- MATCHES API ---

app.get('/matches', (req, res) => {
  const partyId = req.query.partyId || 1;
  db.all("SELECT * FROM matches WHERE party_id = ?", [partyId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const mapped = rows.map(r => ({
      ...r,
      s1a: r.s1a === null ? "" : r.s1a,
      s2a: r.s2a === null ? "" : r.s2a,
      s1r: r.s1r === null ? "" : r.s1r,
      s2r: r.s2r === null ? "" : r.s2r
    }));
    res.json(mapped);
  });
});

app.put('/matches/:id', (req, res) => {
  const { s1a, s2a, s1r, s2r, winner, partyId } = req.body;
  const id = req.params.id;
  db.run(
    "UPDATE matches SET s1a = ?, s2a = ?, s1r = ?, s2r = ?, winner = ? WHERE id = ? AND party_id = ?",
    [s1a, s2a, s1r, s2r, winner, id, partyId || 1],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});


app.post('/generate-q2', async (req, res) => {
  const partyId = req.query.partyId || 1;
  try {
    await generateRound(partyId, 'Q2');
    res.json({ success: true, message: "Q2 généré avec succès !" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/generate-q3', async (req, res) => {
  const partyId = req.query.partyId || 1;
  try {
    await generateRound(partyId, 'Q3');
    res.json({ success: true, message: "Q3 généré avec succès !" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/generate-q4', async (req, res) => {
  const partyId = req.query.partyId || 1;
  try {
    await generateRound(partyId, 'Q4');
    res.json({ success: true, message: "PO (Q4) généré avec succès !" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/generate-pots', (req, res) => {
  const partyId = req.query.partyId || 1;
  db.all("SELECT * FROM matches WHERE id >= 301 AND id <= 307 AND party_id = ?", [partyId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length < 7) return res.status(400).json({ error: "Q4 n'est pas encore généré." });
    
    const notFinished = rows.filter(r => !r.winner);
    if (notFinished.length > 0) return res.status(400).json({ error: "Tous les matchs du Q4 ne sont pas terminés." });

    const q4Winners = rows.map(r => r.winner);

    const baseDirectsSQL = `
      SELECT team_name, association FROM league_standings WHERE
        is_direct_qualifier = 1 OR is_direct_rebalance = 1
    `;

    db.all(baseDirectsSQL, [], (err, baseDirects) => {
      if (err) return res.status(500).json({ error: err.message });

      const directQualifiers = baseDirects.map(r => `${r.team_name} (${r.association})`);

      const allTeams = [...directQualifiers, ...q4Winners];
      
      // Query fantasy coefficients to sort them properly for our simulation!
      db.all("SELECT * FROM club_coefficients_fantasy", [], (err, coefRows) => {
        if (err) return res.status(500).json({ error: err.message });
      
      const coefMap = {};
      coefRows.forEach(c => coefMap[c.team_name] = c.coefficient);

      // De-duplicate in case of strict overlaps
      const uniqueTeams = [...new Set(allTeams)];

      // Sort strictly by UEFA Club Coefficient (Descending)
      uniqueTeams.sort((a, b) => {
        const coefA = coefMap[a] || 0;
        const coefB = coefMap[b] || 0;
        return coefB - coefA;
      });

      // Split into 4 pots of up to 9
      const pot1 = uniqueTeams.slice(0, 9);
      const pot2 = uniqueTeams.slice(9, 18);
      const pot3 = uniqueTeams.slice(18, 27);
      const pot4 = uniqueTeams.slice(27, 36);

      res.json({ success: true, pots: { pot1, pot2, pot3, pot4 } });
    });
  });
  });
});

import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.get('/league-matches', (req, res) => {
  const partyId = req.query.partyId || 1;
  db.all("SELECT * FROM league_matches WHERE party_id = ?", [partyId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/generate-league-matches', (req, res) => {
  const partyId = req.query.partyId || 1;
  db.all("SELECT * FROM custom_pots", [], (err, rows) => {
    if (err || rows.length === 0) return res.status(500).json({ error: "Custom pots not found." });
    
    // Group into arrays
    const pots = [ [], [], [], [] ]; 
    rows.forEach(r => pots[r.pot - 1].push(r.team_name));

    const shuffle = (array) => array.map(value => ({ value, sort: Math.random() })).sort((a, b) => a.sort - b.sort).map(({ value }) => value);
    for(let i=0; i<4; i++) {
       pots[i] = shuffle(pots[i]);
    }

    const getMatchdaysTemplate = () => [
      [[0,3],[1,20],[2,5],[4,13],[11,6],[7,18],[33,8],[23,9],[24,10],[35,12],[14,28],[30,15],[25,16],[21,17],[27,19],[31,22],[26,34],[32,29]],
      [[0,34],[1,30],[2,27],[3,4],[12,5],[6,32],[16,7],[23,8],[35,9],[10,31],[11,25],[13,22],[19,14],[20,15],[18,17],[33,21],[24,29],[28,26]],
      [[9,0],[7,1],[11,2],[20,3],[4,33],[5,10],[30,6],[18,8],[27,12],[13,34],[24,14],[23,15],[16,32],[29,17],[31,19],[21,35],[22,28],[26,25]],
      [[32,0],[35,1],[2,15],[12,3],[11,4],[13,5],[27,6],[19,7],[26,8],[9,18],[25,10],[33,14],[30,16],[31,17],[28,20],[29,21],[22,24],[34,23]],
      [[30,0],[14,1],[2,24],[25,3],[28,4],[27,5],[22,6],[11,7],[8,16],[20,9],[34,10],[33,12],[26,13],[15,35],[17,19],[31,18],[32,21],[29,23]],
      [[15,0],[13,1],[20,2],[19,3],[27,4],[26,5],[28,6],[9,7],[25,8],[10,21],[31,11],[22,12],[30,14],[29,16],[33,17],[34,18],[23,32],[35,24]],
      [[21,0],[25,1],[22,2],[3,9],[30,4],[35,5],[6,14],[10,7],[20,8],[34,11],[31,12],[23,13],[33,15],[19,16],[17,27],[29,18],[28,24],[32,26]],
      [[28,0],[34,1],[29,2],[31,3],[10,4],[16,5],[21,6],[24,7],[19,8],[33,9],[32,11],[25,12],[30,13],[22,14],[26,15],[23,17],[18,27],[35,20]]
    ];

    const teams = [...pots[0], ...pots[1], ...pots[2], ...pots[3]];
    const matches = [];

    getMatchdaysTemplate().forEach((dayMatches, dayIndex) => {
      dayMatches.forEach(([h, a]) => {
        matches.push({ matchday: dayIndex + 1, home: teams[h], away: teams[a] });
      });
    });

    db.run("DELETE FROM league_matches WHERE party_id = ?", [partyId], () => {
      const stmt = db.prepare("INSERT INTO league_matches (party_id, matchday, home_team, away_team, home_score, away_score) VALUES (?, ?, ?, ?, '', '')");
      matches.forEach(m => stmt.run(partyId, m.matchday, m.home, m.away));
      stmt.finalize(() => {
        res.json({ success: true, count: matches.length });
      });
    });
  });
});

app.put('/league-matches/:id', (req, res) => {
  const { home_score, away_score } = req.body;
  const id = req.params.id;
  const finished = (home_score !== '' && away_score !== '') ? 1 : 0;
  
  db.run("UPDATE league_matches SET home_score = ?, away_score = ?, finished = ? WHERE id = ?", 
    [home_score, away_score, finished, id], 
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, changes: this.changes });
    }
  );
});

app.get('/custom-pots', (req, res) => {
  db.all("SELECT * FROM custom_pots ORDER BY pot ASC, rank ASC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length === 0) return res.status(404).json({ error: "Custom pots non trouvés" });
    const pots = { pot1: [], pot2: [], pot3: [], pot4: [] };
    rows.forEach(r => pots[`pot${r.pot}`].push(r.team_name));
    res.json({ success: true, pots });
  });
});

app.get('/coefficients', (req, res) => {
  db.all("SELECT * FROM club_coefficients ORDER BY coefficient DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/coefficients-fantasy', (req, res) => {
  db.all("SELECT * FROM club_coefficients_fantasy ORDER BY coefficient DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/standings', (req, res) => {
  db.all("SELECT * FROM league_standings ORDER BY association ASC, rank ASC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback: Send all other requests to the React app
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✓ UCL Simulator backend + static is running at http://localhost:${PORT}`);
});
