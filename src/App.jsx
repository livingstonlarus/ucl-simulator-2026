import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import './index.css';
import logos from './logoMapping.json';

const flags = {
  FRA: '🇫🇷', ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', ESP: '🇪🇸', ITA: '🇮🇹', GER: '🇩🇪', POR: '🇵🇹', NED: '🇳🇱', BEL: '🇧🇪', TUR: '🇹🇷',
  DEN: '🇩🇰', GRE: '🇬🇷', CZE: '🇨🇿', SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', AUT: '🇦🇹', SUI: '🇨🇭', CRO: '🇭🇷', POL: '🇵🇱', NOR: '🇳🇴',
  SVK: '🇸🇰', MKD: '🇲🇰', KAZ: '🇰🇿', SMR: '🇸🇲', CYP: '🇨🇾', GEO: '🇬🇪', FIN: '🇫🇮', EST: '🇪🇪', BUL: '🇧🇬',
  AND: '🇦🇩', ISR: '🇮🇱', SVN: '🇸🇮', SWE: '🇸🇪', FRO: '🇫🇴', AZE: '🇦🇿', GIB: '🇬🇮', HUN: '🇭🇺', WAL: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  ROU: '🇷🇴', LVA: '🇱🇻', IRL: '🇮🇪', ISL: '🇮🇸', BIH: '🇧🇦', LTU: '🇱🇹', BLR: '🇧🇾', ARM: '🇦🇲', MDA: '🇲🇩',
  SRB: '🇷🇸', UKR: '🇺🇦', ALB: '🇦🇱', KOS: '🇽🇰'
};

function App() {
  const [party, setParty] = useState(null);
  const [parties, setParties] = useState([]);
  const [matches, setMatches] = useState([]);
  const [newPartyName, setNewPartyName] = useState("");
  const [pots, setPots] = useState(null);
  const [standings, setStandings] = useState([]);
  const [coeffs, setCoeffs] = useState({});
  const [fantasyCoeffs, setFantasyCoeffs] = useState({});
  const [leagueMatches, setLeagueMatches] = useState([]);

  useEffect(() => {
    fetch('/parties')
      .then(res => res.json())
      .then(data => setParties(data || []));

    fetch('/standings')
      .then(res => res.json())
      .then(data => setStandings(data || []));

    fetch('/coefficients')
      .then(res => res.json())
      .then(data => {
        const coefMap = {};
        if (data) data.forEach(c => coefMap[c.team_name] = c.coefficient);
        setCoeffs(coefMap);
      });

    fetch('/coefficients-fantasy')
      .then(res => res.json())
      .then(data => {
        const coefMap = {};
        if (data) data.forEach(c => coefMap[c.team_name] = c.coefficient);
        setFantasyCoeffs(coefMap);
      });
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

      fetch(`/league-matches?partyId=${party.id}`)
        .then(res => res.json())
        .then(data => setLeagueMatches(data || []))
        .catch(e => console.error(e));
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

  const handleGenerateQ4 = () => {
    fetch(`/generate-q4?partyId=${party.id}`, { method: 'POST' })
      .then(res => {
        if (!res.ok) alert("Assurez-vous que tous les matchs du Q3 sont terminés.");
        else fetch(`/matches?partyId=${party.id}`).then(r => r.json()).then(data => setMatches(data));
      })
      .catch(e => console.error(e));
  };

  const handleGeneratePots = () => {
    fetch(`/generate-pots?partyId=${party.id}`, { method: 'POST' })
      .then(res => {
        if (!res.ok) alert("Assurez-vous que tous les matchs des Barrages (Q4) sont terminés.");
        else return res.json();
      })
      .then(data => {
        if (data && data.pots) {
          setPots(data.pots);
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#00F0FF', '#7000FF', '#FFFFFF']
          });
        }
      })
      .catch(e => console.error(e));
  };

  const handleLoadCustomPots = () => {
    fetch('/custom-pots')
      .then(res => {
        if (!res.ok) throw new Error("Erreur de chargement des chapeaux personnalisés.");
        return res.json();
      })
      .then(data => {
        if (data && data.pots) {
          setPots(data.pots);
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#00F0FF', '#7000FF', '#FFFFFF']
          });
        }
      })
      .catch(e => alert(e.message));
  };

  const handleLeagueMatchChange = (id, field, value) => {
    setLeagueMatches(leagueMatches.map(m => {
      if (m.id === id) {
        const newMatch = { ...m, [field]: value };
        fetch(`/league-matches/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ home_score: newMatch.home_score, away_score: newMatch.away_score })
        }).catch(e => console.error(e));
        return newMatch;
      }
      return m;
    }));
  };

  const handleGenerateLeagueMatches = () => {
    fetch(`/generate-league-matches?partyId=${party.id}`, { method: 'POST' })
      .then(res => {
        if (!res.ok) throw new Error("Erreur lors de la génération des matchs.");
        return res.json();
      })
      .then(() => fetch(`/league-matches?partyId=${party.id}`))
      .then(res => res.json())
      .then(data => {
        setLeagueMatches(data || []);
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#00F0FF', '#7000FF', '#FFFFFF'] });
      })
      .catch(e => alert(e.message));
  };

  const printTeams = (teamList) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Veuillez autoriser les pop-ups pour imprimer.");
      return;
    }

    const teamsHtml = teamList.map(teamName => {
      const staticLogo = getLogo(teamName);
      const imgHtml = staticLogo ? `<img src="${staticLogo}" alt="${teamName}" />` : '<div style="height:20mm;"></div>';
      return `
        <div class="cell">
          ${imgHtml}
          <div class="team-name">${teamName}</div>
        </div>
      `;
    }).join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Imprimer les Logos</title>
        <style>
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: #fff;
            color: #000;
          }
          .print-controls {
            text-align: center;
            margin: 20px 0;
          }
          .print-btn {
            padding: 10px 20px;
            font-size: 16px;
            background: #007bff;
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          .print-container {
            width: 190mm; /* A4 width (210) minus 2x10mm margins */
            margin: 0 auto;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(4, 47.5mm);
            border-top: 1px solid #000;
            border-left: 1px solid #000;
          }
          .cell {
            border-right: 1px solid #000;
            border-bottom: 1px solid #000;
            height: 47.5mm; /* Perfect square (190mm / 4) */
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
            padding: 2mm;
            text-align: center;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .cell img {
            max-width: 100%;
            max-height: 28mm;
            object-fit: contain;
            margin-bottom: 3mm;
          }
          .team-name {
            font-size: 11px;
            font-weight: bold;
            line-height: 1.1;
            margin-top: 2px;
            max-height: 8mm;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }
          @media print {
            .print-controls { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="print-controls">
          <button class="print-btn" onclick="window.print()">🖨️ Lancer l'impression</button>
        </div>
        <div class="print-container">
          <div class="grid">
            ${teamsHtml}
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handlePrint = () => {
    if (!pots) return;
    const allTeams = [];
    Object.keys(pots).forEach(potKey => {
      pots[potKey].forEach(team => allTeams.push(team));
    });
    printTeams(allTeams);
  };

  const handlePrintFantasy = () => {
    const sortedTeams = Object.entries(fantasyCoeffs)
      .sort((a, b) => b[1] - a[1])
      .map(([team]) => team);
    printTeams(sortedTeams);
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
  const q4League = matches.filter(m => m.id >= 301 && m.id <= 302);
  const q4Champions = matches.filter(m => m.id >= 303 && m.id <= 307);

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

        <div className="standings-viewer">
          <h3>Classements Nationaux (Base de Données)</h3>
          <p style={{textAlign: 'center', opacity: 0.7, marginBottom: '1rem'}}>Voici la simulation dont partira le moteur (Top 5 personnalisés, etc.)</p>
          <div className="standings-grid">
            {Object.entries(
              standings.reduce((acc, s) => {
                if(!acc[s.association]) acc[s.association] = [];
                acc[s.association].push(s);
                return acc;
              }, {})
            ).map(([assoc, teams]) => (
              <div key={assoc} className="standings-card">
                <div className="standings-card-header">{flags[assoc] || ''} {assoc}</div>
                <div className="standings-list">
                  {teams.map(t => (
                    <div key={t.id} className="standings-row">
                      <span className="standings-rank">{t.rank}</span>
                      {getLogo(t.team_name) && <img src={getLogo(t.team_name)} alt="" className="team-logo" style={{width: '20px', height: '20px', marginRight: '8px'}} />}
                      <span className="standings-team">{t.team_name}</span>
                      {t.rank === 1 && <span className="standings-champ" title="Champion">🏆</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: '1200px', marginTop: '4rem' }}>
          
          <div className="coeff-board" style={{ margin: 0, flex: '1 1 400px' }}>
            <div className="coeff-header" style={{ opacity: 0.8, fontSize: '1.1rem' }}>Classement UEFA 5 Ans (Réalité)</div>
            <div className="coeff-list">
              {Object.entries(coeffs)
                .sort((a, b) => b[1] - a[1])
                .map(([team, pts], index) => (
                  <div key={team} className="coeff-item">
                    <span className="coeff-rank">{index + 1}.</span>
                    {getLogo(team) && <img src={getLogo(team)} alt="" className="team-logo" style={{width: '24px', height: '24px', marginRight: '8px'}} />}
                    <span className="coeff-team">{team}</span>
                    <span className="coeff-pts" style={{ color: '#888' }}>{Math.round(pts)}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="coeff-board" style={{ margin: 0, flex: '1 1 400px', border: '2px solid var(--neon-cyan)', position: 'relative' }}>
            <div className="coeff-header">Classement UEFA 5 Ans (Fantasy)</div>
            <div className="coeff-list">
              {Object.entries(fantasyCoeffs)
                .sort((a, b) => b[1] - a[1])
                .map(([team, pts], index) => (
                  <div key={team} className="coeff-item">
                    <span className="coeff-rank">{index + 1}.</span>
                    {getLogo(team) && <img src={getLogo(team)} alt="" className="team-logo" style={{width: '24px', height: '24px', marginRight: '8px'}} />}
                    <span className="coeff-team">{team}</span>
                    <span className="coeff-pts">{Math.round(pts)}</span>
                  </div>
                ))}
            </div>
            <div style={{ textAlign: 'center', margin: '2rem 0' }}>
              <button className="next-btn" onClick={handlePrintFantasy} style={{ backgroundColor: '#ff003c', color: '#fff', fontSize: '1.2rem' }}>
                🖨️ IMPRIMER LES ÉTIQUETTES
              </button>
            </div>
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

      {q4League.length > 0 && (
         <div className="round-section">
           <h2 className="round-title">Barrages (Q4) - Voie de la Ligue</h2>
           <MatchList list={q4League} />
         </div>
      )}

      {q4Champions.length > 0 && (
         <div className="round-section">
           <h2 className="round-title">Barrages (Q4) - Voie des Champions</h2>
           <MatchList list={q4Champions} />
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

      {q3League.length > 0 && q3Champions.length > 0 && q4League.length === 0 && q4Champions.length === 0 && (
        <footer className="footer">
          <button className="next-btn" onClick={handleGenerateQ4}>Générer les Barrages (Q4)</button>
        </footer>
      )}

      {q4League.length > 0 && q4Champions.length > 0 && !pots && (
        <footer className="footer" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
          <button className="next-btn generate-pots-btn" onClick={handleGeneratePots}>🎲 Générer les Chapeaux (Phase de Ligue)</button>
          <button className="next-btn" onClick={handleLoadCustomPots} style={{ backgroundColor: '#202020', border: '1px solid #00F0FF', width: '100%', maxWidth: '500px' }}>📜 AFFICHER MES CHAPEAUX PERSONNALISES</button>
        </footer>
      )}

      {pots && (
        <div className="pots-section">
          <h2 className="round-title">Chapeaux - Phase de Ligue (Top 36)</h2>
          <div className="pots-grid">
            {Object.keys(pots).map((potKey, index) => (
              <div key={potKey} className="pot-card">
                <h3>Chapeau {index + 1}</h3>
                <ul>
                  {pots[potKey].map(team => (
                    <li key={team} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {getLogo(team) && <img src={getLogo(team)} alt="" className="pot-team-logo" />}
                        <span>{team}</span>
                      </div>
                      {fantasyCoeffs[team] ? <strong style={{ color: '#00F0FF', fontSize: '0.85rem' }}>{Math.round(fantasyCoeffs[team])}</strong> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '3rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button className="next-btn" onClick={handlePrint} style={{ backgroundColor: '#ff003c', color: '#fff', fontSize: '1.2rem', margin: 0 }}>
              🖨️ IMPRIMER LES ÉTIQUETTES
            </button>
            <button className="next-btn" onClick={handleGenerateLeagueMatches} style={{ backgroundColor: '#00F0FF', color: '#000', fontSize: '1.2rem', margin: 0 }}>
              ⚽ GENERER LES MATCHS
            </button>
          </div>
        </div>
      )}

      {leagueMatches.length > 0 && (
        <div className="league-matches-section" style={{ marginTop: '3rem', width: '100%' }}>
          {Object.entries(leagueMatches.reduce((acc, match) => {
            const day = match.matchday || 1;
            if (!acc[day]) acc[day] = [];
            acc[day].push(match);
            return acc;
          }, {})).sort((a,b) => parseInt(a[0]) - parseInt(b[0])).map(([day, matches]) => (
            <div key={day} style={{ marginBottom: '2rem' }}>
              <h2 className="round-title">Journée {day} ({matches.length} Matchs)</h2>
              <div className="matches-grid">
                {matches.map(m => (
                  <div key={m.id} className="match-card" style={{ padding: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1, textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                      <span>{m.home_team}</span>
                      {getLogo(m.home_team) && <img src={getLogo(m.home_team)} style={{width: 24, height: 24, objectFit: 'contain'}} alt=""/>}
                    </div>
                    <div style={{ margin: '0 15px', fontWeight: 'bold', color: 'var(--neon-cyan)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <input type="number" min="0" value={m.home_score || ''} onChange={(e) => handleLeagueMatchChange(m.id, 'home_score', e.target.value)} style={{ width: '40px', textAlign: 'center', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px' }} />
                      - 
                      <input type="number" min="0" value={m.away_score || ''} onChange={(e) => handleLeagueMatchChange(m.id, 'away_score', e.target.value)} style={{ width: '40px', textAlign: 'center', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px' }} />
                    </div>
                    <div style={{ flex: 1, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {getLogo(m.away_team) && <img src={getLogo(m.away_team)} style={{width: 24, height: 24, objectFit: 'contain'}} alt=""/>}
                      <span>{m.away_team}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
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
