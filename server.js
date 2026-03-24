import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const dbFile = './database.sqlite';
const db = new sqlite3.Database(dbFile);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY,
    team1 TEXT,
    team2 TEXT,
    s1a TEXT,
    s2a TEXT,
    s1r TEXT,
    s2r TEXT,
    winner TEXT
  )`);

  // Initialize if empty
  db.get("SELECT COUNT(*) as count FROM matches", (err, row) => {
    if (row.count === 0) {
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
      
      const stmt = db.prepare("INSERT INTO matches (id, team1, team2, s1a, s2a, s1r, s2r, winner) VALUES (?, ?, ?, '', '', '', '', null)");
      for (const m of initialMatches) {
        stmt.run(m.id, m.team1, m.team2);
      }
      stmt.finalize();
    }
  });
});

app.get('/matches', (req, res) => {
  db.all("SELECT * FROM matches", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    // Convert nulls back to empty strings for inputs
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
  const { s1a, s2a, s1r, s2r, winner } = req.body;
  const id = req.params.id;
  db.run(
    "UPDATE matches SET s1a = ?, s2a = ?, s1r = ?, s2r = ?, winner = ? WHERE id = ?",
    [s1a, s2a, s1r, s2r, winner, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

app.post('/generate-q2', (req, res) => {
  db.all("SELECT * FROM matches WHERE id <= 14", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const notFinished = rows.filter(r => !r.winner);
    if (notFinished.length > 0) {
      return res.status(400).json({ error: "Tous les matchs du Q1 ne sont pas terminés." });
    }

    db.get("SELECT COUNT(*) as count FROM matches WHERE id > 14", (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (row.count > 0) {
        return res.status(400).json({ error: "Le Q2 est déjà généré." });
      }

      const getWinner = (id) => rows.find(r => r.id === id).winner;
      
      const q2Matches = [
        { id: 101, team1: "Sparta Prague (CZE)", team2: "Aarhus (DEN)" },
        { id: 102, team1: "Rangers FC (SCO)", team2: "FC Basel (SUI)" },
        { id: 103, team1: "Sturm Graz (AUT)", team2: "PAOK (GRE)" },
        { id: 104, team1: "Dinamo Zagreb (CRO)", team2: getWinner(1) },
        { id: 105, team1: "FC Thun (SUI)", team2: getWinner(2) },
        { id: 106, team1: "Midtjylland (DEN)", team2: getWinner(3) },
        { id: 107, team1: "Olympiacos (GRE)", team2: getWinner(4) },
        { id: 108, team1: "Lech Poznań (POL)", team2: getWinner(5) },
        { id: 109, team1: "Bodø/Glimt (NOR)", team2: getWinner(6) },
        { id: 110, team1: getWinner(7), team2: getWinner(8) },
        { id: 111, team1: getWinner(9), team2: getWinner(10) },
        { id: 112, team1: getWinner(11), team2: getWinner(12) },
        { id: 113, team1: getWinner(13), team2: getWinner(14) }
      ];

      const stmt = db.prepare("INSERT INTO matches (id, team1, team2, s1a, s2a, s1r, s2r, winner) VALUES (?, ?, ?, '', '', '', '', null)");
      for (const m of q2Matches) {
        stmt.run(m.id, m.team1, m.team2);
      }
      stmt.finalize();

      res.json({ success: true, message: "Q2 généré avec succès !" });
    });
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✓ SQLite API backend is running at http://localhost:${PORT}`);
});
