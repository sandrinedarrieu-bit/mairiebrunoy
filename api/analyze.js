export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { situation } = req.body;

  if (!situation) {
    return res.status(400).json({ error: 'Situation manquante' });
  }

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
        max_tokens: 300,
        system: `Tu es un assistant qui analyse des descriptions de demandes habitants pour la Mairie de Brunoy.
À partir d'une description en langage naturel, tu extrais les informations suivantes et tu réponds UNIQUEMENT avec un JSON valide, sans aucun texte avant ou après :
{
  "objet": "description courte et claire de la demande (max 60 caractères)",
  "service": "un seul parmi : Voirie, État civil, Social, Urbanisme, Propreté",
  "statut": "Nouvelle",
  "delai": nombre de jours estimé (entier entre 1 et 60)
}
Règles pour le délai : urgence/danger = 1-2j, voirie/propreté = 3-7j, social = 5-10j, urbanisme = 15-30j.`,
        messages: [{
          role: 'user',
          content: situation
        }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: `Erreur API Anthropic: ${err}` });
    }

    const data = await response.json();
    const texte = data.content?.[0]?.text || '{}';

    let resultat;
    try {
      resultat = JSON.parse(texte);
    } catch {
      return res.status(500).json({ error: 'Réponse Claude invalide', raw: texte });
    }

    // Ajouter les headers CORS pour Bubble
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    return res.status(200).json({
      objet: resultat.objet || '',
      service: resultat.service || 'Voirie',
      statut: resultat.statut || 'Nouvelle',
      delai: resultat.delai || 7
    });

  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur: ' + error.message });
  }
}
