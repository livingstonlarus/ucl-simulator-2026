import sqlite3 from 'sqlite3';

const localDb = new sqlite3.Database('./database.sqlite');
const remoteDbPath = '/tmp/remote_ucl_db.sqlite';

localDb.serialize(() => {
  // Attach remote database
  localDb.run(`ATTACH DATABASE '${remoteDbPath}' AS remote;`);

  // 1. Copy over parties
  localDb.run(`INSERT OR IGNORE INTO parties (id, name, created_at) SELECT id, name, created_at FROM remote.parties;`);

  // 2. Insert new matches from remote that don't exist locally. Set round and path to slightly sensible defaults if possible.
  // Actually, we can figure out round and path:
  // Q1 matches (id 1-14) -> round='Q1', path='CH'
  // Others: lookup in local brackets table based on matches.id = brackets.target_id
  
  localDb.run(`
    INSERT OR IGNORE INTO matches (id, party_id, team1, team2, s1a, s2a, s1r, s2r, winner, round, path)
    SELECT 
      rm.id, 
      rm.party_id, 
      rm.team1, 
      rm.team2, 
      rm.s1a, 
      rm.s2a, 
      rm.s1r, 
      rm.s2r, 
      rm.winner,
      CASE 
        WHEN rm.id BETWEEN 1 AND 14 THEN 'Q1'
        ELSE (SELECT round_name FROM brackets WHERE target_id = rm.id)
      END as round,
      CASE 
        WHEN rm.id BETWEEN 1 AND 14 THEN 'CH'
        ELSE (SELECT path FROM brackets WHERE target_id = rm.id)
      END as path
    FROM remote.matches rm;
  `);

  // 3. Update existing matches with scores from remote
  localDb.run(`
    UPDATE matches
    SET
      s1a = (SELECT s1a FROM remote.matches rm WHERE rm.id = matches.id AND rm.party_id = matches.party_id),
      s2a = (SELECT s2a FROM remote.matches rm WHERE rm.id = matches.id AND rm.party_id = matches.party_id),
      s1r = (SELECT s1r FROM remote.matches rm WHERE rm.id = matches.id AND rm.party_id = matches.party_id),
      s2r = (SELECT s2r FROM remote.matches rm WHERE rm.id = matches.id AND rm.party_id = matches.party_id),
      winner = (SELECT winner FROM remote.matches rm WHERE rm.id = matches.id AND rm.party_id = matches.party_id)
    WHERE EXISTS (
      SELECT 1 FROM remote.matches rm WHERE rm.id = matches.id AND rm.party_id = matches.party_id
    ) AND matches.winner IS NULL;  -- don't overwrite local resolved if we happened to do so? Actually, just overwrite all to be safe.
  `);

  localDb.run(`
    UPDATE matches
    SET
      s1a = rm.s1a, s2a = rm.s2a, s1r = rm.s1r, s2r = rm.s2r, winner = rm.winner
    FROM remote.matches rm
    WHERE matches.id = rm.id AND matches.party_id = rm.party_id;
  `, function(err) {
      if (err) console.error("Update error:", err);
      else console.log("Database import completed successfully.");
  });
});
