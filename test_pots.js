import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('./database.sqlite');

const queries = [
    {a: 'ENG', ranks: [1,2,3,4,5]},
    {a: 'ESP', ranks: [1,2,3,4,5]},
    {a: 'ITA', ranks: [1,2,3,4]},
    {a: 'GER', ranks: [1,2,3,4]},
    {a: 'FRA', ranks: [1,2,3]},
    {a: 'NED', ranks: [1,2]},
    {a: 'POR', ranks: [1, 2]}, 
    {a: 'BEL', ranks: [1]},
    {a: 'TUR', ranks: [1]},
    {a: 'CZE', ranks: [1]},
];

db.serialize(() => {
    let teams = [];
    let processed = 0;
    
    // Convert logic to handle each rank sequentially to avoid async mess
    const processQuery = (idx) => {
        if (idx >= queries.length) {
            console.log(teams.map(t => `"${t}"`).join(', '));
            console.log("Count:", teams.length);
            return;
        }
        
        const q = queries[idx];
        const placeholders = q.ranks.map(() => '?').join(',');
        db.all(`SELECT team_name, association FROM league_standings WHERE association = ? AND rank IN (${placeholders})`, [q.a, ...q.ranks], (err, rows) => {
            if (rows) {
                rows.forEach(r => teams.push(`${r.team_name} (${r.association})`));
            }
            processQuery(idx + 1);
        });
    };
    
    processQuery(0);
});
