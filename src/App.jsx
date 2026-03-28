import { useState, useEffect } from 'react';
import './index.css';
import logos from './logoMapping.json';

function App() {
  const [party, setParty] = useState(null);
  const [parties, setParties] = useState([]);
  const [matches, setMatches] = useState([]);
  const [newPartyName, setNewPartyName] = useState("");

  useEffect(() => {
    fetch('/parties')
      .then(res => res.json())
      .then(data => setParties(data || []));
  }, []);

  useEffect(() => {
    if (party) {
      fetch(`/matches?partyId=${party.id}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            setMatches(data);
          }
        })
        .catch(e => console.error("Could not fetch matches:", e));
    }
  }, [party]);

  const handleCreateParty = () => {
    if (!newPartyName.trim()) return;
    fetch('/parties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newPartyName })
    })
    .then(res => res.json())
    .then(newP => {
      setParties([newP, ...parties]);
      setParty(newP);
      setNewPartyName("");
    });
  };

  const saveMatch = (match) => {
    fetch(`/matches/${match.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...match, partyId: party.id })
    }).catch(e => console.error("Error saving match:", e));
  };
  
  // ... rest of the logic remains same but using 'party.id' where needed ...
  const handleChange = (id, field, value) => {
    setMatches(matches.map(m => {
      if (m.id === id) {
        const newMatch = { ...m, [field]: value };
        if (newMatch.s1a !== "" && newMatch.s2a !== "" && newMatch.s1r !== "" && newMatch.s2r !== "") {
          const t1Total = parseInt(newMatch.s1a || 0) + parseInt(newMatch.s2r || 0);
          const t2Total = parseInt(newMatch.s2a || 0) + parseInt(newMatch.s1r || 0);
          if (t1Total > t2Total) newMatch.winner = newMatch.team1;
          else if (t2Total > t1Total) newMatch.winner = newMatch.team2;
          else newMatch.winner = "Penalties?";
        } else {
          newMatch.winner = null;
        }
        saveMatch(newMatch);
        return newMatch;
      }
      return m;
    }));
  };

  const handleGenerateRandomScores = (id) => {
    const randomScore = () => Math.floor(Math.random() * 4);
    setMatches(matches.map(m => {
      if (m.id === id) {
        const s1a = randomScore().toString();
        const s2a = randomScore().toString();
        const s1r = randomScore().toString();
        const s2r = randomScore().toString();
        const newMatch = { ...m, s1a, s2a, s1r, s2r };
        const t1Total = parseInt(s1a) + parseInt(s2r);
        const t2Total = parseInt(s2a) + parseInt(s1r);
        if (t1Total > t2Total) newMatch.winner = newMatch.team1;
        else if (t2Total > t1Total) newMatch.winner = newMatch.team2;
        else newMatch.winner = "Penalties?";
        saveMatch(newMatch);
        return newMatch;
      }
      return m;
    }));
  };

  const handlePenaltyWinner = (id, winnerTeam) => {
    setMatches(matches.map(m => {
      if (m.id === id) {
        const newMatch = { ...m, winner: winnerTeam };
        saveMatch(newMatch);
        return newMatch;
      }
      return m;
    }));
  };

  const handleGenerateQ2 = () => {
    fetch(`/generate-q2?partyId=${party.id}`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.error) alert("Erreur : " + data.error);
        else fetch(`/matches?partyId=${party.id}`).then(r => r.json()).then(data => setMatches(data));
      })
      .catch(e => console.error(e));
  };

  const handleGenerateQ3 = () => {
    fetch(`/generate-q3?partyId=${party.id}`, { method: 'POST' })
      .then(res => {
        if (!res.ok) alert("Assurez-vous que tous les matchs du Q2 sont terminés.");
        else fetch(`/matches?partyId=${party.id}`).then(r => r.json()).then(data => setMatches(data));
      })
      .catch(e => console.error(e));
  };

  const getLogo = (teamFull) => {
    if (!teamFull) return null;
    const teamName = teamFull.split(' (')[0].trim();
    return logos[teamName] || null;
  };

  const q1Matches = matches.filter(m => m.id <= 14);
  const q2League = matches.filter(m => m.id >= 101 && m.id <= 103);
  const q2Champions = matches.filter(m => m.id >= 104 && m.id <= 115);
  const q3League = matches.filter(m => m.id >= 201 && m.id <= 204);
  const q3Champions = matches.filter(m => m.id >= 205 && m.id <= 210);

  if (!party) {
    return (
      <div className="app-container home-screen">
        <header className="header">
          <h1>UCL 2026/27 <span>Simulator</span></h1>
          <p>Gérez vos simulations de qualifications</p>
        </header>
        
        <div className="party-selector">
          <div className="new-party">
            <input type="text" placeholder="Nom de la nouvelle partie..." value={newPartyName} onChange={e => setNewPartyName(e.target.value)} />
            <button className="next-btn" onClick={handleCreateParty}>Créer une partie</button>
          </div>

          <h3>Continuer une simulation</h3>
          <div className="party-list">
            {parties.map(p => (
              <div key={p.id} className="party-item" onClick={() => setParty(p)}>
                <span>{p.name}</span>
                <small>{new Date(p.created_at).toLocaleDateString()}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="back-nav" onClick={() => setParty(null)}>← Retour à l'accueil</div>
        <h1>UCL 2026/27 <span>Simulator</span></h1>
        <p className="party-name">Partie : {party.name}</p>
      </header>

      {q1Matches.length > 0 && (
         <div className="round-section">
           <h2 className="round-title">Q1 - Voie des Champions</h2>
           <MatchList list={q1Matches} />
         </div>
      )}

      {q2League.length > 0 && (
         <div className="round-section">
           <h2 className="round-title">Q2 - Voie de la Ligue</h2>
           <MatchList list={q2League} />
         </div>
      )}

      {q2Champions.length > 0 && (
         <div className="round-section">
           <h2 className="round-title">Q2 - Voie des Champions</h2>
           <MatchList list={q2Champions} />
         </div>
      )}

      {q3League.length > 0 && (
         <div className="round-section">
           <h2 className="round-title">Q3 - Voie de la Ligue</h2>
           <MatchList list={q3League} />
         </div>
      )}

      {q3Champions.length > 0 && (
         <div className="round-section">
           <h2 className="round-title">Q3 - Voie des Champions</h2>
           <MatchList list={q3Champions} />
         </div>
      )}

      {matches.length > 0 && q2League.length === 0 && q2Champions.length === 0 && (
        <footer className="footer">
          <button className="next-btn" onClick={handleGenerateQ2}>Générer le Q2</button>
        </footer>
      )}

      {q2League.length > 0 && q2Champions.length > 0 && q3League.length === 0 && q3Champions.length === 0 && (
        <footer className="footer">
          <button className="next-btn" onClick={handleGenerateQ3}>Générer le Q3</button>
        </footer>
      )}
    </div>
  );

  function MatchList({ list }) {
    return (
      <div className="matches-grid">
        {list.map(match => (
          <div key={match.id} className="match-card">
            <div className="match-header">
              <div className="match-title">Match {match.id}</div>
              <button className="random-btn" onClick={() => handleGenerateRandomScores(match.id)} tabIndex="-1">
                🎲 Auto
              </button>
            </div>
            
            <div className="match-row aller">
              <span className="leg-badge">Aller</span>
              <div className="team team1">
                {getLogo(match.team1) && <img src={getLogo(match.team1)} alt="" className="team-logo" />}
                <span>{match.team1}</span>
              </div>
              <div className="inputs">
                <input type="number" min="0" value={match.s1a} onChange={(e) => handleChange(match.id, 's1a', e.target.value)} />
                <span>-</span>
                <input type="number" min="0" value={match.s2a} onChange={(e) => handleChange(match.id, 's2a', e.target.value)} />
              </div>
              <div className="team team2">
                <span>{match.team2}</span>
                {getLogo(match.team2) && <img src={getLogo(match.team2)} alt="" className="team-logo" />}
              </div>
            </div>

            <div className="match-row retour">
              <span className="leg-badge">Retour</span>
              <div className="team team2">
                {getLogo(match.team2) && <img src={getLogo(match.team2)} alt="" className="team-logo" />}
                <span>{match.team2}</span>
              </div>
              <div className="inputs">
                <input type="number" min="0" value={match.s1r} onChange={(e) => handleChange(match.id, 's1r', e.target.value)} />
                <span>-</span>
                <input type="number" min="0" value={match.s2r} onChange={(e) => handleChange(match.id, 's2r', e.target.value)} />
              </div>
              <div className="team team1">
                <span>{match.team1}</span>
                {getLogo(match.team1) && <img src={getLogo(match.team1)} alt="" className="team-logo" />}
              </div>
            </div>

            {match.winner && (
              <div className="winner-section">
                  {match.winner === "Penalties?" ? (
                    <div className="penalties-resolve">
                        <p>Égalité au score cumulé !</p>
                        <button onClick={() => handlePenaltyWinner(match.id, match.team1)}>{match.team1}</button>
                        <button onClick={() => handlePenaltyWinner(match.id, match.team2)}>{match.team2}</button>
                    </div>
                  ) : (
                    <div className="winner-badge">
                        Qualifié 👉 
                        {getLogo(match.winner) && <img src={getLogo(match.winner)} alt="" className="team-logo-winner" />}
                        <strong>{match.winner}</strong>
                    </div>
                  )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }
}

export default App;
