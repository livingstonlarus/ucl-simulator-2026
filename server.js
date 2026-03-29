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

  // Migration: If we have old data (without party_id in the row check, though SQLite is flexible)
  // Let's ensure at least one party exists if we have matches
  db.get("SELECT COUNT(*) as count FROM parties", (err, row) => {
    if (row && row.count === 0) {
      db.run("INSERT INTO parties (id, name) VALUES (1, 'Simulation 1')");
      db.run("UPDATE matches SET party_id = 1 WHERE party_id IS NULL");
    }
  });

  // Helper to init Q1 for a party
  const initQ1 = (partyId) => {
    // Q1 matches determined by LEAGUE_RANK of specific associations
    const q1Associations = [
      ['SVK', 'MKD'], ['KAZ', 'SMR'], ['CYP', 'GEO'], ['FIN', 'EST'],
      ['BUL', 'AND'], ['ISR', 'SVN'], ['SWE', 'FRO'], ['AZE', 'GIB'],
      ['HUN', 'WAL'], ['ROU', 'LVA'], ['IRL', 'ISL'], ['BIH', 'LTU'],
      ['BLR', 'ARM'], ['MDA', 'KAZ'] // Note: KAZ has 2 entries in test data, but using it as defined
    ];

    db.all("SELECT * FROM league_standings WHERE rank = 1", (err, champs) => {
      const champMap = {};
      if (champs) champs.forEach(c => champMap[c.association] = `${c.team_name} (${c.association})`);
      
      const stmt = db.prepare("INSERT INTO matches (id, party_id, team1, team2, s1a, s2a, s1r, s2r, winner, round, path) VALUES (?, ?, ?, ?, '', '', '', '', null, 'Q1', 'CH')");
      
      let matchId = 1;
      for (const [a1, a2] of q1Associations) {
        // Fallback names if not in DB
        const t1 = champMap[a1] || `Champion ${a1}`;
        const t2 = champMap[a2] || `Champion ${a2}`;
        stmt.run(matchId++, partyId, t1, t2);
      }
      stmt.finalize();
    });
  };

  // Check if simulation 1 needs initialization
  db.get("SELECT COUNT(*) as count FROM matches WHERE party_id = 1", (err, row) => {
    if (row && row.count === 0) {
      initQ1(1);
    }
  });

  app.locals.initQ1 = initQ1;

  // Initialize fixed bracket definitions if empty (dynamically linked to league ranks!)
  db.get("SELECT COUNT(*) as count FROM brackets", (err, row) => {
    if (row && row.count === 0) {
      const bInit = [
        // Q2 League Path
        { t: 101, r: 'Q2', p: 'LP', s1: 'LEAGUE_RANK', v1: 'TUR:2', s2: 'LEAGUE_RANK', v2: 'CZE:2' },
        { t: 102, r: 'Q2', p: 'LP', s1: 'LEAGUE_RANK', v1: 'BEL:2', s2: 'LEAGUE_RANK', v2: 'NED:3' },
        { t: 103, r: 'Q2', p: 'LP', s1: 'LEAGUE_RANK', v1: 'SCO:2', s2: 'LEAGUE_RANK', v2: 'SUI:2' },
        // Q2 Champions Path
        { t: 104, r: 'Q2', p: 'CH', s1: 'LEAGUE_RANK', v1: 'CRO:1', s2: 'WINNER', v2: '11' },
        { t: 105, r: 'Q2', p: 'CH', s1: 'LEAGUE_RANK', v1: 'SUI:1', s2: 'WINNER', v2: '7' },
        { t: 106, r: 'Q2', p: 'CH', s1: 'LEAGUE_RANK', v1: 'DEN:1', s2: 'WINNER', v2: '12' },
        { t: 107, r: 'Q2', p: 'CH', s1: 'LEAGUE_RANK', v1: 'GRE:1', s2: 'WINNER', v2: '3' },
        { t: 108, r: 'Q2', p: 'CH', s1: 'LEAGUE_RANK', v1: 'POL:1', s2: 'WINNER', v2: '14' },
        { t: 109, r: 'Q2', p: 'CH', s1: 'LEAGUE_RANK', v1: 'NOR:1', s2: 'WINNER', v2: '1' },
        { t: 110, r: 'Q2', p: 'CH', s1: 'LEAGUE_RANK', v1: 'CYP:1', s2: 'WINNER', v2: '4' }, // Usually CYP:1
        { t: 111, r: 'Q2', p: 'CH', s1: 'LEAGUE_RANK', v1: 'AUT:1', s2: 'WINNER', v2: '5' },
        { t: 112, r: 'Q2', p: 'CH', s1: 'LEAGUE_RANK', v1: 'SCO:1', s2: 'WINNER', v2: '8' },
        { t: 113, r: 'Q2', p: 'CH', s1: 'WINNER', v2: '9',      s2: 'WINNER', v2: '10' },
        { t: 114, r: 'Q2', p: 'CH', s1: 'WINNER', v2: '6',      s2: 'WINNER', v2: '13' },
        { t: 115, r: 'Q2', p: 'CH', s1: 'WINNER', v2: '2',      s2: 'LEAGUE_RANK', v2: 'MDA:1' },
        // Q3 League Path
        { t: 201, r: 'Q3', p: 'LP', s1: 'WINNER', v1: '101', s2: 'LEAGUE_RANK', v2: 'FRA:4' },
        { t: 202, r: 'Q3', p: 'LP', s1: 'WINNER', v1: '102', s2: 'LEAGUE_RANK', v2: 'POR:3' }, // Often Benfica
        { t: 203, r: 'Q3', p: 'LP', s1: 'WINNER', v1: '103', s2: 'LEAGUE_RANK', v2: 'NED:2' },
        { t: 204, r: 'Q3', p: 'LP', s1: 'LEAGUE_RANK', v1: 'AUT:2', s2: 'TEAM', v2: 'Dynamo Kyiv (UKR)' },
        // Q3 Champions Path
        { t: 205, r: 'Q3', p: 'CH', s1: 'WINNER', v1: '104', s2: 'WINNER', v2: '105' },
        { t: 206, r: 'Q3', p: 'CH', s1: 'WINNER', v1: '106', s2: 'WINNER', v2: '107' },
        { t: 207, r: 'Q3', p: 'CH', s1: 'WINNER', v1: '108', s2: 'WINNER', v2: '109' },
        { t: 208, r: 'Q3', p: 'CH', s1: 'WINNER', v1: '110', s2: 'WINNER', v2: '111' },
        { t: 209, r: 'Q3', p: 'CH', s1: 'WINNER', v1: '112', s2: 'WINNER', v2: '113' },
        { t: 210, r: 'Q3', p: 'CH', s1: 'WINNER', v1: '114', s2: 'WINNER', v2: '115' },
        // Q4 (Play-Offs) League Path
        { t: 301, r: 'Q4', p: 'LP', s1: 'WINNER', v1: '201', s2: 'WINNER', v2: '202' },
        { t: 302, r: 'Q4', p: 'LP', s1: 'WINNER', v1: '203', s2: 'WINNER', v2: '204' },
        // Q4 (Play-Offs) Champions Path
        { t: 303, r: 'Q4', p: 'CH', s1: 'WINNER', v1: '205', s2: 'TEAM', v2: 'Crvena zvezda (SRB)' },
        { t: 304, r: 'Q4', p: 'CH', s1: 'WINNER', v1: '206', s2: 'TEAM', v2: 'Young Boys (SUI)' }, // Updated CP entrant
        { t: 305, r: 'Q4', p: 'CH', s1: 'WINNER', v1: '207', s2: 'WINNER', v2: '208' },
        { t: 306, r: 'Q4', p: 'CH', s1: 'WINNER', v1: '209', s2: 'TEAM', v2: 'Maccabi Haifa (ISR)' }, // Updated CP entrant
        { t: 307, r: 'Q4', p: 'CH', s1: 'WINNER', v1: '210', s2: 'TEAM', v2: 'Ludogorets (BUL)' } // Updated CP entrant, avoided duplicates from Q1
      ];
      const stmt = db.prepare("INSERT INTO brackets (target_id, round_name, path, team1_source, team1_value, team2_source, team2_value) VALUES (?, ?, ?, ?, ?, ?, ?)");
      for (const b of bInit) {
        stmt.run(b.t, b.r, b.p, b.s1, b.v1, b.s2, b.v2);
      }
      stmt.finalize();
    }
  });

});

// --- PARTIES API ---

app.get('/parties', (req, res) => {
  db.all("SELECT * FROM parties ORDER BY created_at DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/parties', (req, res) => {
  const { name } = req.body;
  db.run("INSERT INTO parties (name) VALUES (?)", [name || "Nouvelle Simulation"], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    const newId = this.lastID;
    app.locals.initQ1(newId);
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

// --- SHARED GENERATION HELPER ---
const generateRound = async (partyId, roundName) => {
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
};

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

    const directQualifiers = [
      "Atlético Madrid (ESP)", "Bayern Munich (GER)", "Real Madrid (ESP)", "Paris SG (FRA)",
      "Arsenal (ENG)", "Inter Milan (ITA)", "FC Barcelone (ESP)", "Sporting CP (POR)", "Aston Villa (ENG)",
      "Manchester City (ENG)", "Borussia Dortmund (GER)", "TSG Hoffenheim (GER)", "AC Milan (ITA)",
      "PSV Eindhoven (NED)", "SSC Napoli (ITA)", "Villarreal CF (ESP)", "Juventus (ITA)", "RB Leipzig (GER)",
      "Olympique Lyonnais (FRA)", "RC Lens (FRA)", "FC Porto (POR)", "Club Brugge (BEL)", "Como 1907 (ITA)",
      "Celtic Glasgow (SCO)", "VfB Stuttgart (GER)", "Galatasaray (TUR)", "Slavia Prague (CZE)",
      "Shakhtar Donetsk (UKR)", "Feyenoord (NED)"
    ];

    const allTeams = [...q4Winners, ...directQualifiers];
    
    // Sort logic to emulate pots (very simplistic for now, just split into 4 pots of 9)
    // In a real app we'd sort by coefficient. We shuffle a bit but keep top dogs high.
    const pot1 = allTeams.slice(0, 9);
    const pot2 = allTeams.slice(9, 18);
    const pot3 = allTeams.slice(18, 27);
    const pot4 = allTeams.slice(27, 36);

    res.json({ success: true, pots: { pot1, pot2, pot3, pot4 } });
  });
});

import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback: Send all other requests to the React app
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ UCL Simulator backend + static is running at http://0.0.0.0:${PORT}`);
});
