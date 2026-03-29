const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('database.sqlite');
const directs = [
      'Manchester City (ENG)', 'Real Madrid (ESP)', 'Bayern Munich (GER)', 'Paris SG (FRA)', 
      'Inter Milan (ITA)', 'FC Barcelona (ESP)', 'Borussia Dortmund (GER)', 'Atlético Madrid (ESP)', 'Arsenal FC (ENG)',
      'Manchester United (ENG)', 'Lille OSC (FRA)', 'Villarreal CF (ESP)', 'SSC Napoli (ITA)', 
      'AC Milan (ITA)', 'TSG Hoffenheim (GER)', 'VfB Stuttgart (GER)', 'PSV Eindhoven (NED)', 'FC Porto (POR)',
      'Sporting CP (POR)', 'Bayer Leverkusen (GER)', 'Aston Villa (ENG)', 'Como 1907 (ITA)', 
      'RC Lens (FRA)', 'Olympique Lyonnais (FRA)', 'Feyenoord (NED)', 'Club Brugge (BEL)', 'Galatasaray (TUR)',
      'Slavia Prague (CZE)', 'Celtic FC (SCO)'
];

db.all('SELECT association, team_name, rank FROM league_standings', [], (err, rows) => {
  rows.forEach(r => {
     const fullName = r.team_name + ' (' + r.association + ')';
     if (!directs.includes(fullName) && r.rank <= 5) {
        console.log('Missing from directs but in standings:', fullName, 'Rank:', r.rank);
     }
  });
});
