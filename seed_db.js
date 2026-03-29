import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
  db.run("DROP TABLE IF EXISTS league_standings");
  db.run("DROP TABLE IF EXISTS brackets");
  db.run("DROP TABLE IF EXISTS teams");
  db.run("DROP TABLE IF EXISTS matches");
  db.run("DROP TABLE IF EXISTS parties");

  db.run(`CREATE TABLE parties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE matches (
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
  )`);

  db.run(`CREATE TABLE teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    association TEXT,
    coefficient REAL,
    is_champion INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE league_standings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    association TEXT,
    team_name TEXT,
    rank INTEGER
  )`);

  db.run(`CREATE TABLE brackets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER,
    round_name TEXT,
    path TEXT,
    team1_source TEXT,
    team1_value TEXT,
    team2_source TEXT,
    team2_value TEXT
  )`);

  // Insert the "invented" league standings from the chats
  const standings = [
    // France (FRA)
    { a: 'FRA', t: 'Paris SG', r: 1 }, { a: 'FRA', t: 'RC Lens', r: 2 }, { a: 'FRA', t: 'Olympique Lyonnais', r: 3 }, { a: 'FRA', t: 'Olympique de Marseille', r: 4 }, { a: 'FRA', t: 'AS Monaco', r: 5 },
    // England (ENG)
    { a: 'ENG', t: 'Arsenal FC', r: 1 }, { a: 'ENG', t: 'Manchester City', r: 2 }, { a: 'ENG', t: 'Manchester United', r: 3 }, { a: 'ENG', t: 'Chelsea FC', r: 4 }, { a: 'ENG', t: 'Aston Villa', r: 5 },
    // Spain (ESP)
    { a: 'ESP', t: 'Real Madrid', r: 1 }, { a: 'ESP', t: 'FC Barcelona', r: 2 }, { a: 'ESP', t: 'Atlético Madrid', r: 3 }, { a: 'ESP', t: 'Villarreal CF', r: 4 }, { a: 'ESP', t: 'Real Betis', r: 5 },
    // Italy (ITA)
    { a: 'ITA', t: 'SSC Napoli', r: 1 }, { a: 'ITA', t: 'Inter Milan', r: 2 }, { a: 'ITA', t: 'AC Milan', r: 3 }, { a: 'ITA', t: 'Como 1907', r: 4 }, { a: 'ITA', t: 'Juventus FC', r: 5 },
    // Germany (GER)
    { a: 'GER', t: 'Bayern Munich', r: 1 }, { a: 'GER', t: 'Borussia Dortmund', r: 2 }, { a: 'GER', t: 'TSG Hoffenheim', r: 3 }, { a: 'GER', t: 'VfB Stuttgart', r: 4 }, { a: 'GER', t: 'RB Leipzig', r: 5 },
    // Portugal (POR)
    { a: 'POR', t: 'Sporting CP', r: 1 }, { a: 'POR', t: 'FC Porto', r: 2 }, { a: 'POR', t: 'SL Benfica', r: 3 },
    // Netherlands (NED)
    { a: 'NED', t: 'PSV Eindhoven', r: 1 }, { a: 'NED', t: 'Feyenoord', r: 2 }, { a: 'NED', t: 'FC Twente', r: 3 },
    // Belgium (BEL)
    { a: 'BEL', t: 'Club Brugge', r: 1 }, { a: 'BEL', t: 'Union Saint-Gilloise', r: 2 },
    // Turkey (TUR)
    { a: 'TUR', t: 'Galatasaray', r: 1 }, { a: 'TUR', t: 'Fenerbahçe', r: 2 },
    // Denmark (DEN)
    { a: 'DEN', t: 'FC Midtjylland', r: 1 }, { a: 'DEN', t: 'Aarhus', r: 2 },
    // Greece (GRE)
    { a: 'GRE', t: 'Olympiacos', r: 1 }, { a: 'GRE', t: 'PAOK', r: 2 }, { a: 'GRE', t: 'AEK Athens', r: 3 }, { a: 'GRE', t: 'Panathinaikos', r: 4 },
    // Czechia (CZE)
    { a: 'CZE', t: 'Slavia Prague', r: 1 }, { a: 'CZE', t: 'Sparta Prague', r: 2 }, { a: 'CZE', t: 'Viktoria Plzeň', r: 3 },
    // Scotland (SCO)
    { a: 'SCO', t: 'Hearts', r: 1 }, { a: 'SCO', t: 'Rangers FC', r: 2 }, { a: 'SCO', t: 'Celtic FC', r: 3 },
    // Austria (AUT)
    { a: 'AUT', t: 'Rapid Wien', r: 1 }, { a: 'AUT', t: 'Sturm Graz', r: 2 }, { a: 'AUT', t: 'Austria Wien', r: 3 },
    // Switzerland (SUI)
    { a: 'SUI', t: 'FC Thun', r: 1 }, { a: 'SUI', t: 'FC Basel', r: 2 }, { a: 'SUI', t: 'St.Gallen', r: 3 },
    // Croatia (CRO)
    { a: 'CRO', t: 'Dinamo Zagreb', r: 1 },
    // Poland (POL)
    { a: 'POL', t: 'Lech Poznań', r: 1 },
    // Norway (NOR)
    { a: 'NOR', t: 'Bodø/Glimt', r: 1 },
    // Let's add the minor champions for Q1 exactly as we had them, treating them as r=1.
    { a: 'SVK', t: 'Slovan Bratislava', r: 1 }, { a: 'MKD', t: 'Struga', r: 1 }, { a: 'KAZ', t: 'Kairat Almaty', r: 1 }, { a: 'SMR', t: 'Virtus', r: 1 },
    { a: 'CYP', t: 'Pafos FC', r: 1 }, { a: 'GEO', t: 'Dinamo Batumi', r: 1 }, { a: 'FIN', t: 'HJK Helsinki', r: 1 }, { a: 'EST', t: 'Flora Tallinn', r: 1 },
    { a: 'BUL', t: 'Ludogorets', r: 1 }, { a: 'AND', t: 'UE Santa Coloma', r: 1 }, { a: 'ISR', t: 'Maccabi Tel-Aviv', r: 1 }, { a: 'SVN', t: 'Celje', r: 1 },
    { a: 'SWE', t: 'Malmö FF', r: 1 }, { a: 'FRO', t: 'KÍ Klaksvík', r: 1 }, { a: 'AZE', t: 'Qarabağ', r: 1 }, { a: 'GIB', t: 'Lincoln Red Imps', r: 1 },
    { a: 'HUN', t: 'Ferencváros', r: 1 }, { a: 'WAL', t: 'The New Saints', r: 1 }, { a: 'ROU', t: 'FCSB', r: 1 }, { a: 'LVA', t: 'RFS', r: 1 },
    { a: 'IRL', t: 'Shamrock Rovers', r: 1 }, { a: 'ISL', t: 'Víkingur Reykjavík', r: 1 }, { a: 'BIH', t: 'Zrinjski Mostar', r: 1 }, { a: 'LTU', t: 'Panevėžys', r: 1 },
    { a: 'BLR', t: 'Dinamo Minsk', r: 1 }, { a: 'ARM', t: 'Pyunik', r: 1 }, { a: 'MDA', t: 'Petrocub Hîncești', r: 1 }, { a: 'KAZ', t: 'Ordabasy', r: 1 }
  ];

  const stmt = db.prepare("INSERT INTO league_standings (association, team_name, rank) VALUES (?, ?, ?)");
  for (const s of standings) stmt.run(s.a, s.t, s.r);
  stmt.finalize();

  const teamStmt = db.prepare("INSERT INTO teams (name, association, is_champion) VALUES (?, ?, ?)");
  for (const s of standings) teamStmt.run(s.t, s.a, s.r === 1 ? 1 : 0);
  teamStmt.finalize();

});
