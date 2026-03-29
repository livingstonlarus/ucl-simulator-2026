import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('database.sqlite');

db.all("SELECT * FROM club_coefficients_fantasy", [], (err, coefs) => {
  db.all("SELECT team_name, association FROM league_standings", [], (err, standings) => {
    
    // Create a set of valid full names from standings
    const validNames = new Set(standings.map(s => `${s.team_name} (${s.association})`));
    
    const toDelete = [];
    coefs.forEach(c => {
      if (!validNames.has(c.team_name)) {
        console.log("Found invalid team in coefficients:", c.team_name);
        toDelete.push(c.team_name);
      }
    });

    if (toDelete.length > 0) {
      const placeholders = toDelete.map(() => '?').join(',');
      db.run(`DELETE FROM club_coefficients_fantasy WHERE team_name IN (${placeholders})`, toDelete, function(err) {
        console.log("Deleted from fantasy:", this.changes);
        db.run(`DELETE FROM club_coefficients WHERE team_name IN (${placeholders})`, toDelete, function(err) {
           console.log("Deleted from normal:", this.changes);
        });
      });
    } else {
      console.log("All teams in coefficients are valid.");
    }
  });
});
