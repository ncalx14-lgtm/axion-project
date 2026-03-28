const express = require('express');
const cors = require('cors');
const path = require('path');
 
const app = express();
app.use(cors());
app.use(express.json());
 
// Serve o frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));
// Rota de health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── ROTA GEMINI ──
app.post('/chat', async (req, res) => {
  const { history, system } = req.body;
  if (!history) return res.status(400).json({ error: 'Histórico obrigatório' });

  const GEMINI_KEY = process.env.GEMINI_KEY;
  if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_KEY não configurada' });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: history,
          generationConfig: { temperature: 0.85, maxOutputTokens: 300 }
        })
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Gemini error:', err);
    res.status(500).json({ error: 'Erro interno', detail: err.message });
  }
});
 
// Rota de voz — proxy para Unreal Speech
app.post('/speak', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Texto obrigatório' });
 
  const UNREAL_API_KEY = process.env.UNREAL_API_KEY;
  if (!UNREAL_API_KEY) return res.status(500).json({ error: 'UNREAL_API_KEY não configurada' });
 
  try {
    const response = await fetch('https://api.v7.unrealspeech.com/stream', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${UNREAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Text: text,
        VoiceId: 'Scarlett',
        Bitrate: '192k',
        Speed: '0',
        Pitch: '1',
        Codec: 'libmp3lame',
      }),
    });
 
    if (!response.ok) {
      const err = await response.text();
      console.error('Unreal Speech error:', err);
      return res.status(response.status).json({ error: 'Erro Unreal Speech', detail: err });
    }
 
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
 
    res.set('Content-Type', 'audio/mpeg');
    res.set('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error('Speak error:', err);
    res.status(500).json({ error: 'Erro interno', detail: err.message });
  }
});
 
// Qualquer outra rota devolve o index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});
 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AXION SERVER ONLINE 🚀 porta ${PORT}`));
