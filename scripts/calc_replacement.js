import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('database.sqlite');

const baseDirectsSQL = `
      SELECT team_name, association FROM league_standings WHERE
        (association IN ('ENG', 'ESP', 'GER', 'ITA') AND rank <= 4) OR
        (association = 'FRA' AND rank <= 3) OR
        (association = 'NED' AND rank <= 2) OR
        (association IN ('POR', 'BEL', 'AUT') AND rank = 1)
`;

db.all(baseDirectsSQL, [], (err, baseDirects) => {
    const directs = baseDirects.map(r => `${r.team_name} (${r.association})`);
    const rebalances = ['FC Porto (POR)', 'Galatasaray (TUR)', 'Slavia Prague (CZE)'];
    rebalances.forEach(t => { if(!directs.includes(t)) directs.push(t); });

    db.all("SELECT winner, team1, team2 FROM matches", [], (err, matches) => {
        const matchTeams = new Set();
        matches.forEach(m => {
             matchTeams.add(m.winner);
             matchTeams.add(m.team1);
             matchTeams.add(m.team2);
        });

        db.all("SELECT * FROM club_coefficients ORDER BY coefficient DESC", [], (err, coeffs) => {
             const candidates = coeffs.filter(f => !directs.includes(f.team_name) && !matchTeams.has(f.team_name));
             console.log("Top Logical Replacements from Reality:");
             candidates.slice(0, 5).forEach(c => console.log(c.team_name, c.coefficient));
        });
    });
});
