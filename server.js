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
    PRIMARY KEY (id, party_id)
  )`, (err) => {
    // If table existed, it might not have party_id. Attempt to add it.
    db.run("ALTER TABLE matches ADD COLUMN party_id INTEGER", (err) => {
      // Ignored if already exists
    });
  });

  // Migration: If we have old data (without party_id in the row check, though SQLite is flexible)
  // Let's ensure at least one party exists if we have matches
  db.get("SELECT COUNT(*) as count FROM parties", (err, row) => {
    if (row && row.count === 0) {
      db.run("INSERT INTO parties (id, name) VALUES (1, 'Simulation 1')");
      // If there are existing matches without party_id, they will be handled by the default
      db.run("UPDATE matches SET party_id = 1 WHERE party_id IS NULL");
    }
  });

  // Helper to init Q1 for a party
  const initQ1 = (partyId) => {
    const initialMatches = [
      { id: 1, team1: "Slovan Bratislava (SVK)", team2: "Struga (MKD)" },
      { id: 2, team1: "Kairat Almaty (KAZ)", team2: "Virtus (SMR)" },
      { id: 3, team1: "Pafos FC (CYP)", team2: "Dinamo Batumi (GEO)" },
      { id: 4, team1: "HJK Helsinki (FIN)", team2: "Flora Tallinn (EST)" },
      { id: 5, team1: "Ludogorets (BUL)", team2: "UE Santa Coloma (AND)" },
      { id: 6, team1: "Maccabi Tel-Aviv (ISR)", team2: "Celje (SVN)" },
      { id: 7, team1: "Malmö FF (SWE)", team2: "KÍ Klaksvík (FRO)" },
      { id: 8, team1: "Qarabağ (AZE)", team2: "Lincoln Red Imps (GIB)" },
      { id: 9, team1: "Ferencváros (HUN)", team2: "The New Saints (WAL)" },
      { id: 10, team1: "FCSB (ROU)", team2: "RFS (LVA)" },
      { id: 11, team1: "Shamrock Rovers (IRL)", team2: "Víkingur Reykjavík (ISL)" },
      { id: 12, team1: "Zrinjski Mostar (BIH)", team2: "Panevėžys (LTU)" },
      { id: 13, team1: "Dinamo Minsk (BLR)", team2: "Pyunik (ARM)" },
      { id: 14, team1: "Petrocub Hîncești (MDA)", team2: "Ordabasy (KAZ)" }
    ];
    const stmt = db.prepare("INSERT INTO matches (id, party_id, team1, team2, s1a, s2a, s1r, s2r, winner) VALUES (?, ?, ?, ?, '', '', '', '', null)");
    for (const m of initialMatches) {
      stmt.run(m.id, partyId, m.team1, m.team2);
    }
    stmt.finalize();
  };

  // Check if simulation 1 needs initialization
  db.get("SELECT COUNT(*) as count FROM matches WHERE party_id = 1", (err, row) => {
    if (row && row.count === 0) {
      initQ1(1);
    }
  });

  app.locals.initQ1 = initQ1;
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

app.post('/generate-q2', (req, res) => {
  const partyId = req.query.partyId || 1;
  db.all("SELECT * FROM matches WHERE id <= 14 AND party_id = ?", [partyId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const notFinished = rows.filter(r => !r.winner);
    if (notFinished.length > 0) {
      return res.status(400).json({ error: "Tous les matchs du Q1 ne sont pas terminés." });
    }

    db.get("SELECT COUNT(*) as count FROM matches WHERE id > 14 AND party_id = ?", [partyId], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (row.count > 0) {
        return res.status(400).json({ error: "Le Q2 est déjà généré." });
      }

      const getWinner = (id) => rows.find(r => r.id === id).winner;
      
      const q2Matches = [
        { id: 101, team1: "Fenerbahçe (TUR)", team2: "Sparta Prague (CZE)" },
        { id: 102, team1: "Union Saint-Gilloise (BEL)", team2: "FC Twente (NED)" },
        { id: 103, team1: "Rangers FC (SCO)", team2: "FC Basel (SUI)" }, 
        
        { id: 104, team1: "Dinamo Zagreb (CRO)", team2: getWinner(11) }, 
        { id: 105, team1: "FC Thun (SUI)", team2: getWinner(7) },      
        { id: 106, team1: "FC Midtjylland (DEN)", team2: getWinner(12) }, 
        { id: 107, team1: "Olympiacos (GRE)", team2: getWinner(3) },      
        { id: 108, team1: "Lech Poznań (POL)", team2: getWinner(14) },    
        { id: 109, team1: "Bodø/Glimt (NOR)", team2: getWinner(1) },      
        { id: 110, team1: "APOEL Nicosie (CYP)", team2: getWinner(4) },   
        { id: 111, team1: "Rapid Wien (AUT)", team2: getWinner(5) },      
        { id: 112, team1: "Hearts (SCO)", team2: getWinner(8) },          
        { id: 113, team1: getWinner(9), team2: getWinner(10) }, 
        { id: 114, team1: getWinner(6), team2: getWinner(13) }, 
        { id: 115, team1: getWinner(2), team2: "Sheriff Tiraspol (MDA)" } 
      ];

      const stmt = db.prepare("INSERT INTO matches (id, party_id, team1, team2, s1a, s2a, s1r, s2r, winner) VALUES (?, ?, ?, ?, '', '', '', '', null)");
      for (const m of q2Matches) {
        stmt.run(m.id, partyId, m.team1, m.team2);
      }
      stmt.finalize();

      res.json({ success: true, message: "Q2 généré avec succès !" });
    });
  });
});

app.post('/generate-q3', (req, res) => {
  const partyId = req.query.partyId || 1;
  db.all("SELECT * FROM matches WHERE id >= 101 AND id <= 115 AND party_id = ?", [partyId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Check if Q2 is fully completed (all have winners)
    if (rows.length < 15) return res.status(400).json({ error: "Q2 n'est pas encore généré." });
    const notFinished = rows.filter(r => !r.winner);
    if (notFinished.length > 0) return res.status(400).json({ error: "Tous les matchs du Q2 ne sont pas terminés." });

    // Check if Q3 already exists
    db.get("SELECT COUNT(*) as count FROM matches WHERE id >= 201 AND party_id = ?", [partyId], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (row.count > 0) return res.status(400).json({ error: "Le Q3 est déjà généré." });

      const getWinner = (id) => rows.find(r => r.id === id).winner;
      
      const q3Matches = [
        // --- VOIE DE LA LIGUE (3 gagnants Q2 + 5 entrants) = 4 matchs ---
        { id: 201, team1: getWinner(101), team2: "Olympique de Marseille (FRA)" },
        { id: 202, team1: getWinner(102), team2: "SL Benfica (POR)" },
        { id: 203, team1: getWinner(103), team2: "Feyenoord (NED)" },
        { id: 204, team1: "RB Salzburg (AUT)", team2: "Dynamo Kyiv (UKR)" }, // 2 entrants s'affrontant
        
        // --- VOIE DES CHAMPIONS (12 gagnants Q2) = 6 matchs ---
        { id: 205, team1: getWinner(104), team2: getWinner(105) }, 
        { id: 206, team1: getWinner(106), team2: getWinner(107) },      
        { id: 207, team1: getWinner(108), team2: getWinner(109) }, 
        { id: 208, team1: getWinner(110), team2: getWinner(111) },      
        { id: 209, team1: getWinner(112), team2: getWinner(113) },    
        { id: 210, team1: getWinner(114), team2: getWinner(115) } 
      ];

      const stmt = db.prepare("INSERT INTO matches (id, party_id, team1, team2, s1a, s2a, s1r, s2r, winner) VALUES (?, ?, ?, ?, '', '', '', '', null)");
      for (const m of q3Matches) {
        stmt.run(m.id, partyId, m.team1, m.team2);
      }
      stmt.finalize();

      res.json({ success: true, message: "Q3 généré avec succès !" });
    });
  });
});

app.post('/generate-q4', (req, res) => {
  const partyId = req.query.partyId || 1;
  db.all("SELECT * FROM matches WHERE id >= 201 AND id <= 210 AND party_id = ?", [partyId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (rows.length < 10) return res.status(400).json({ error: "Q3 n'est pas encore généré." });
    const notFinished = rows.filter(r => !r.winner);
    if (notFinished.length > 0) return res.status(400).json({ error: "Tous les matchs du Q3 ne sont pas terminés." });

    db.get("SELECT COUNT(*) as count FROM matches WHERE id >= 301 AND party_id = ?", [partyId], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (row.count > 0) return res.status(400).json({ error: "Le Q4 (Barrages) est déjà généré." });

      const getWinner = (id) => rows.find(r => r.id === id).winner;
      
      const q4Matches = [
        // --- BARRAGES VOIE DE LA LIGUE (4 gagnants Q3) = 2 matchs ---
        { id: 301, team1: getWinner(201), team2: getWinner(202) },
        { id: 302, team1: getWinner(203), team2: getWinner(204) },
        
        // --- BARRAGES VOIE DES CHAMPIONS (6 gagnants Q3 + 4 standard entrants) = 5 matchs ---
        { id: 303, team1: getWinner(205), team2: "Crvena zvezda (SRB)" }, 
        { id: 304, team1: getWinner(206), team2: "FC Copenhagen (DEN)" },      
        { id: 305, team1: getWinner(207), team2: getWinner(208) }, 
        { id: 306, team1: getWinner(209), team2: "PAOK Salonika (GRE)" },      
        { id: 307, team1: getWinner(210), team2: "Qarabağ (AZE)" }    
      ];

      const stmt = db.prepare("INSERT INTO matches (id, party_id, team1, team2, s1a, s2a, s1r, s2r, winner) VALUES (?, ?, ?, ?, '', '', '', '', null)");
      for (const m of q4Matches) {
        stmt.run(m.id, partyId, m.team1, m.team2);
      }
      stmt.finalize();

      res.json({ success: true, message: "Q4 généré avec succès !" });
    });
  });
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
