import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('./database.sqlite');

const customPots = [
    // Pot 1
    { pot: 1, rank: 1, team: 'Paris SG (FRA)' },
    { pot: 1, rank: 2, team: 'Real Madrid (ESP)' },
    { pot: 1, rank: 3, team: 'Bayern Munich (GER)' },
    { pot: 1, rank: 4, team: 'Atlético Madrid (ESP)' },
    { pot: 1, rank: 5, team: 'Manchester City (ENG)' },
    { pot: 1, rank: 6, team: 'Arsenal FC (ENG)' },
    { pot: 1, rank: 7, team: 'Inter Milan (ITA)' },
    { pot: 1, rank: 8, team: 'Borussia Dortmund (GER)' },
    { pot: 1, rank: 9, team: 'FC Barcelona (ESP)' },

    // Pot 2
    { pot: 2, rank: 1, team: 'Aston Villa (ENG)' },
    { pot: 2, rank: 2, team: 'Sporting CP (POR)' },
    { pot: 2, rank: 3, team: 'AC Milan (ITA)' },
    { pot: 2, rank: 4, team: 'SL Benfica (POR)' },
    { pot: 2, rank: 5, team: 'Villarreal CF (ESP)' },
    { pot: 2, rank: 6, team: 'Club Brugge (BEL)' },
    { pot: 2, rank: 7, team: 'PSV Eindhoven (NED)' },
    { pot: 2, rank: 8, team: 'FC Porto (POR)' },
    { pot: 2, rank: 9, team: 'Manchester United (ENG)' },

    // Pot 3
    { pot: 3, rank: 1, team: 'Galatasaray (TUR)' },
    { pot: 3, rank: 2, team: 'SSC Napoli (ITA)' },
    { pot: 3, rank: 3, team: 'Olympiacos (GRE)' },
    { pot: 3, rank: 4, team: 'Fenerbahçe (TUR)' },
    { pot: 3, rank: 5, team: 'RC Lens (FRA)' },
    { pot: 3, rank: 6, team: 'VfB Stuttgart (GER)' },
    { pot: 3, rank: 7, team: 'Slavia Prague (CZE)' },
    { pot: 3, rank: 8, team: 'Olympique Lyonnais (FRA)' },
    { pot: 3, rank: 9, team: 'Feyenoord (NED)' },

    // Pot 4
    { pot: 4, rank: 1, team: 'Crvena zvezda (SRB)' },
    { pot: 4, rank: 2, team: 'FC Midtjylland (DEN)' },
    { pot: 4, rank: 3, team: 'FC Basel (SUI)' },
    { pot: 4, rank: 4, team: 'TSG Hoffenheim (GER)' },
    { pot: 4, rank: 5, team: 'AEK Athens (GRE)' },
    { pot: 4, rank: 6, team: 'Hearts (SCO)' },
    { pot: 4, rank: 7, team: 'Viking FK (NOR)' },
    { pot: 4, rank: 8, team: 'Como 1907 (ITA)' },
    { pot: 4, rank: 9, team: 'FC Thun (SUI)' },
];

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS custom_pots (
        pot INTEGER,
        rank INTEGER,
        team_name TEXT
    )`);
    db.run(`DELETE FROM custom_pots`);

    const stmt = db.prepare("INSERT INTO custom_pots (pot, rank, team_name) VALUES (?, ?, ?)");
    for (const p of customPots) {
        stmt.run(p.pot, p.rank, p.team);
    }
    stmt.finalize(() => {
        console.log("Custom pots populated.");
    });
});
