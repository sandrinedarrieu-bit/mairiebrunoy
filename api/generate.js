export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { situation, ton } = req.body;

  if (!situation) {
    return res.status(400).json({ error: 'Situation manquante' });
  }

  const tonLabel = ton === 'formel'
    ? 'formel et administratif'
    : ton === 'bienveillant'
    ? 'bienveillant et accessible'
    : 'ferme mais respectueux';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: `Tu es un assistant de rédaction pour les agents de la Mairie de Brunoy (91800, Essonne). Tu rédiges des courriers administratifs officiels destinés aux habitants.
Règles strictes :
- Utilise toujours la formule de politesse complète adaptée au ton demandé
- Termine toujours par "[SERVICE CONCERNÉ]\\nVille de Brunoy"
- Mets entre [crochets] les informations à compléter par l'agent (dates, noms, références)
- Ne jamais inventer de données personnelles
- Ton : ${tonLabel}
- Réponds UNIQUEMENT avec le texte du courrier, sans introduction ni commentaire`,
        messages: [{
          role: 'user',
          content: `Rédige un courrier pour la situation suivante : ${situation}`
        }]
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      return res.status(500).json({ error: `Erreur API Anthropic (${response.status}) : ${errBody}` });
    }

    const data = await response.json();
    const texte = data.content?.[0]?.text || 'Erreur lors de la génération.';
    return res.status(200).json({ courrier: texte });

  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur. Veuillez réessayer.' });
  }
}
