
const express = require('express');
const cors = require('cors');
const path = require('path');
 
const app = express();
app.use(cors());
app.use(express.json());
 
// Serve o frontend
app.use(express.static(path.join(__dirname, 'frontend')));
 
// Rota de health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));
 
// Rota de voz — proxy para ElevenLabs (chave fica só no backend)
app.post('/speak', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Texto obrigatório' });
 
  const ELEVEN_API_KEY = process.env.ELEVEN_API_KEY;
  const VOICE_ID = process.env.VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
 
  if (!ELEVEN_API_KEY) {
    return res.status(500).json({ error: 'ELEVEN_API_KEY não configurada' });
  }
 
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVEN_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );
 
    if (!response.ok) {
      const err = await response.text();
      console.error('ElevenLabs error:', err);
      return res.status(response.status).json({ error: 'Erro ElevenLabs', detail: err });
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
 
// Qualquer outra rota devolve o index.html (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});
 
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`AXION SERVER ONLINE 🚀 porta ${PORT}`));