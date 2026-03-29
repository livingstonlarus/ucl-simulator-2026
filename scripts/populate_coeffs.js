import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./database.sqlite');

const coefficients = [
  { team: "Manchester City (ENG)", pts: 148.000 },
  { team: "Bayern Munich (GER)", pts: 144.000 },
  { team: "Real Madrid (ESP)", pts: 136.000 },
  { team: "Paris SG (FRA)", pts: 116.000 },
  { team: "Liverpool FC (ENG)", pts: 114.000 },
  { team: "Inter Milan (ITA)", pts: 101.000 },
  { team: "AS Roma (ITA)", pts: 100.000 },
  { team: "Borussia Dortmund (GER)", pts: 97.000 },
  { team: "Manchester United (ENG)", pts: 92.000 },
  { team: "FC Barcelona (ESP)", pts: 91.000 },
  { team: "Bayer Leverkusen (GER)", pts: 90.000 },
  { team: "Atlético Madrid (ESP)", pts: 89.000 },
  { team: "Juventus (ITA)", pts: 80.000 },
  { team: "SSC Napoli (ITA)", pts: 80.000 },
  { team: "SL Benfica (POR)", pts: 79.000 },
  { team: "FC Porto (POR)", pts: 77.000 },
  { team: "Arsenal FC (ENG)", pts: 72.000 },
  { team: "Club Brugge (BEL)", pts: 64.000 },
  { team: "Sporting CP (POR)", pts: 54.500 },
  { team: "AC Milan (ITA)", pts: 59.000 },
  { team: "Feyenoord (NED)", pts: 57.000 },
  { team: "PSV Eindhoven (NED)", pts: 54.000 },
  { team: "Slavia Prague (CZE)", pts: 53.000 },
  { team: "FC Basel (SUI)", pts: 52.000 },
  { team: "Olympiacos (GRE)", pts: 48.000 },
  { team: "Lille OSC (FRA)", pts: 47.000 },
  { team: "Olympique Lyonnais (FRA)", pts: 44.000 },
  { team: "Celtic FC (SCO)", pts: 32.000 },
  { team: "Galatasaray (TUR)", pts: 31.500 },
  { team: "Bodø/Glimt (NOR)", pts: 28.000 },
  { team: "Aston Villa (ENG)", pts: 20.860 },
  { team: "Villarreal CF (ESP)", pts: 82.000 },
  { team: "TSG Hoffenheim (GER)", pts: 17.324 },
  { team: "VfB Stuttgart (GER)", pts: 17.324 },
  { team: "Como 1907 (ITA)", pts: 18.056 },
  { team: "RC Lens (FRA)", pts: 13.366 },
  { team: "FC Thun (SUI)", pts: 6.595 },
  { team: "Hearts (SCO)", pts: 7.210 },
  { team: "AEK Athens (GRE)", pts: 10.000 }
];

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS club_coefficients (
    team_name TEXT PRIMARY KEY,
    coefficient REAL
  )`);
  
  const stmt = db.prepare("INSERT OR REPLACE INTO club_coefficients (team_name, coefficient) VALUES (?, ?)");
  for (const c of coefficients) {
    stmt.run(c.team, c.pts);
  }
  stmt.finalize(() => {
    console.log("Coefficients seeded successfully.");
    db.close();
  });
});
