let supabase;
try {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
} catch(e) {
  console.error('Supabase init error:', e);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const clientApiKey = req.headers['x-api-key'];
    if (!clientApiKey) return res.status(401).json({ error: 'Nedostaje API ključ' });

    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('api_key', clientApiKey)
      .eq('active', true)
      .single();

    if (error || !client) return res.status(401).json({ error: 'Nevažeći API ključ' });

    const { type, message, language } = req.body;
    if (!message) return res.status(400).json({ error: 'Nedostaje poruka' });

    const systemPrompt = `Ti si profesionalni poslovni asistent.
Opis biznisa: ${client.biznis || 'Nije naveden.'}
Ton komunikacije: ${client.ton || 'Profesionalan i ljubazan.'}
${client.faq ? `Baza znanja:\n${client.faq}` : ''}
Odgovaraj na jeziku: ${language || 'bosanski'}.`;

    const userPrompt = type === 'email'
      ? `Napiši profesionalni poslovni mejl. Uključi Subject i tijelo mejla.\n\nSituacija: "${message}"`
      : `Odgovori na ovaj support upit kupca:\n"${message}"`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }]
        })
      }
    );

    const geminiData = await geminiRes.json();
    const answer = geminiData.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n');

    await supabase.from('usage_logs').insert({
      client_id: client.id,
      type: type || 'support'
    });

    return res.status(200).json({ answer });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Greška na serveru' });
  }
};Ton komunikacije: ${client.ton || 'Profesionalan i ljubazan.'}
${client.faq ? `Baza znanja:\n${client.faq}` : ''}
Odgovaraj na jeziku: ${language || 'bosanski'}.`;

    const userPrompt = type === 'email'
      ? `Napiši profesionalni poslovni mejl. Uključi Subject i tijelo mejla.\n\nSituacija: "${message}"`
      : `Odgovori na ovaj support upit kupca:\n"${message}"`;

    // 4. Pozovi Gemini
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }]
        })
      }
    );

    const geminiData = await geminiRes.json();
    const answer = geminiData.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n');

    // 5. Logiraj korištenje
    await supabase.from('usage_logs').insert({
      client_id: client.id,
      type: type || 'support'
    });

    return res.status(200).json({ answer });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Greška na serveru' });
  }
}
