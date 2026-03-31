const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/chat', async (req, res) => {
  const { history, system } = req.body;
  if (!history) return res.status(400).json({ error: 'Histórico obrigatório' });

  const GEMINI_KEY = process.env.GEMINI_KEY;
  if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_KEY não configurada' });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_KEY}`,
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
        Text: text, VoiceId: 'Scarlett', Bitrate: '192k',
        Speed: '0', Pitch: '1', Codec: 'libmp3lame',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: 'Erro Unreal Speech', detail: err });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    res.set('Content-Type', 'audio/mpeg');
    res.set('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', detail: err.message });
  }
});

app.post('/search', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Query obrigatória' });

  const GOOGLE_KEY = process.env.GOOGLE_KEY;
  const GOOGLE_CX = process.env.GOOGLE_CX;
  if (!GOOGLE_KEY || !GOOGLE_CX) return res.status(500).json({ error: 'Chaves do Google não configuradas' });

  try {
    const searchRes = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: { key: GOOGLE_KEY, cx: GOOGLE_CX, q: query, num: 3 }
    });

    const items = searchRes.data.items || [];
    const results = await Promise.all(items.map(async (item) => {
      try {
        const pageRes = await axios.get(item.link, { timeout: 4000, headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(pageRes.data);
        $('script, style, nav, footer, header').remove();
        const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 600);
        return { title: item.title, url: item.link, content: text };
      } catch {
        return { title: item.title, url: item.link, content: item.snippet || 'Conteúdo não disponível.' };
      }
    }));

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: 'Erro na busca', detail: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AXION SERVER ONLINE 🚀 porta ${PORT}`));
