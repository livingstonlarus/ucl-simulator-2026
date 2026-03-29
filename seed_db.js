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
    rank INTEGER,
    is_direct_qualifier INTEGER DEFAULT 0,
    is_direct_rebalance INTEGER DEFAULT 0
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
    // Direct qualifiers flag will be added later
    { a: 'SRB', t: 'Crvena zvezda', r: 1 },
    { a: 'UKR', t: 'Shakhtar Donetsk', r: 1 }, { a: 'UKR', t: 'Dynamo Kyiv', r: 2 },
    { a: 'ALB', t: 'Egnatia', r: 1 },
    { a: 'KOS', t: 'FC Ballkani', r: 1 },
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

  const isDirectQualifier = (a, r) => {
    if (['ENG', 'ESP', 'GER', 'ITA'].includes(a) && r <= 4) return 1;
    if (a === 'FRA' && r <= 3) return 1;
    if (a === 'NED' && r <= 2) return 1;
    if (['POR', 'BEL', 'AUT'].includes(a) && r === 1) return 1;
    return 0;
  };

  const stmt = db.prepare("INSERT INTO league_standings (association, team_name, rank, is_direct_qualifier) VALUES (?, ?, ?, ?)");
  for (const s of standings) stmt.run(s.a, s.t, s.r, isDirectQualifier(s.a, s.r));
  stmt.finalize();

  const teamStmt = db.prepare("INSERT INTO teams (name, association, is_champion) VALUES (?, ?, ?)");
  for (const s of standings) teamStmt.run(s.t, s.a, s.r === 1 ? 1 : 0);
  teamStmt.finalize();

  const bInit = [
    // Q1
    { t: 1, r: 'Q1', p: 'CH', s1: 'LEAGUE_RANK', v1: 'SVK:1', s2: 'LEAGUE_RANK', v2: 'MKD:1' },
    { t: 2, r: 'Q1', p: 'CH', s1: 'LEAGUE_RANK', v1: 'KAZ:1', s2: 'LEAGUE_RANK', v2: 'SMR:1' },
    { t: 3, r: 'Q1', p: 'CH', s1: 'LEAGUE_RANK', v1: 'ALB:1', s2: 'LEAGUE_RANK', v2: 'GEO:1' },
    { t: 4, r: 'Q1', p: 'CH', s1: 'LEAGUE_RANK', v1: 'FIN:1', s2: 'LEAGUE_RANK', v2: 'EST:1' },
    { t: 5, r: 'Q1', p: 'CH', s1: 'LEAGUE_RANK', v1: 'BUL:1', s2: 'LEAGUE_RANK', v2: 'AND:1' },
    { t: 6, r: 'Q1', p: 'CH', s1: 'LEAGUE_RANK', v1: 'ISR:1', s2: 'LEAGUE_RANK', v2: 'SVN:1' },
    { t: 7, r: 'Q1', p: 'CH', s1: 'LEAGUE_RANK', v1: 'SWE:1', s2: 'LEAGUE_RANK', v2: 'FRO:1' },
    { t: 8, r: 'Q1', p: 'CH', s1: 'LEAGUE_RANK', v1: 'AZE:1', s2: 'LEAGUE_RANK', v2: 'GIB:1' },
    { t: 9, r: 'Q1', p: 'CH', s1: 'LEAGUE_RANK', v1: 'HUN:1', s2: 'LEAGUE_RANK', v2: 'WAL:1' },
    { t: 10, r: 'Q1', p: 'CH', s1: 'LEAGUE_RANK', v1: 'ROU:1', s2: 'LEAGUE_RANK', v2: 'LVA:1' },
    { t: 11, r: 'Q1', p: 'CH', s1: 'LEAGUE_RANK', v1: 'IRL:1', s2: 'LEAGUE_RANK', v2: 'ISL:1' },
    { t: 12, r: 'Q1', p: 'CH', s1: 'LEAGUE_RANK', v1: 'BIH:1', s2: 'LEAGUE_RANK', v2: 'LTU:1' },
    { t: 13, r: 'Q1', p: 'CH', s1: 'LEAGUE_RANK', v1: 'BLR:1', s2: 'LEAGUE_RANK', v2: 'ARM:1' },
    { t: 14, r: 'Q1', p: 'CH', s1: 'LEAGUE_RANK', v1: 'KOS:1', s2: 'LEAGUE_RANK', v2: 'KAZ:2' },
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
    { t: 110, r: 'Q2', p: 'CH', s1: 'LEAGUE_RANK', v1: 'CYP:1', s2: 'WINNER', v2: '4' },
    { t: 111, r: 'Q2', p: 'CH', s1: 'LEAGUE_RANK', v1: 'AUT:1', s2: 'WINNER', v2: '5' },
    { t: 112, r: 'Q2', p: 'CH', s1: 'LEAGUE_RANK', v1: 'SCO:1', s2: 'WINNER', v2: '8' },
    { t: 113, r: 'Q2', p: 'CH', s1: 'WINNER', v1: '9',      s2: 'WINNER', v2: '10' },
    { t: 114, r: 'Q2', p: 'CH', s1: 'WINNER', v1: '6',      s2: 'WINNER', v2: '13' },
    { t: 115, r: 'Q2', p: 'CH', s1: 'WINNER', v1: '2',      s2: 'LEAGUE_RANK', v2: 'MDA:1' },
    // Q3 League Path
    { t: 201, r: 'Q3', p: 'LP', s1: 'WINNER', v1: '101', s2: 'LEAGUE_RANK', v2: 'FRA:4' },
    { t: 202, r: 'Q3', p: 'LP', s1: 'WINNER', v1: '102', s2: 'LEAGUE_RANK', v2: 'POR:3' },
    { t: 203, r: 'Q3', p: 'LP', s1: 'WINNER', v1: '103', s2: 'LEAGUE_RANK', v2: 'NED:2' },
    { t: 204, r: 'Q3', p: 'LP', s1: 'LEAGUE_RANK', v1: 'AUT:2', s2: 'LEAGUE_RANK', v2: 'UKR:2' },
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
    { t: 303, r: 'Q4', p: 'CH', s1: 'WINNER', v1: '205', s2: 'LEAGUE_RANK', v2: 'SRB:1' },
    { t: 304, r: 'Q4', p: 'CH', s1: 'WINNER', v1: '206', s2: 'LEAGUE_RANK', v2: 'TUR:1' },
    { t: 305, r: 'Q4', p: 'CH', s1: 'WINNER', v1: '207', s2: 'WINNER', v2: '208' },
    { t: 306, r: 'Q4', p: 'CH', s1: 'WINNER', v1: '209', s2: 'LEAGUE_RANK', v2: 'CZE:1' }, 
    { t: 307, r: 'Q4', p: 'CH', s1: 'WINNER', v1: '210', s2: 'LEAGUE_RANK', v2: 'UKR:1' } 
  ];

  const bracketStmt = db.prepare("INSERT INTO brackets (target_id, round_name, path, team1_source, team1_value, team2_source, team2_value) VALUES (?, ?, ?, ?, ?, ?, ?)");
  for (const b of bInit) {
    bracketStmt.run(b.t, b.r, b.p, b.s1, b.v1, b.s2, b.v2);
  }
  bracketStmt.finalize();

});
