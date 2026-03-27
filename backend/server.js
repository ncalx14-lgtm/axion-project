const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();

app.use(cors());
app.use(express.json());

// usa variável de ambiente (seguro)
const ELEVEN_API_KEY = process.env.ELEVEN_API_KEY;
const VOICE_ID = process.env.VOICE_ID;

// teste rápido
app.get("/", (req, res) => {
  res.send("AXION SERVER ONLINE 🚀");
});

// rota de voz
app.post("/speak", async (req, res) => {
  const { text } = req.body;

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVEN_API_KEY
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.9
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ERRO ELEVEN:", errorText);
      return res.status(500).send(errorText);
    }

    const audioBuffer = await response.arrayBuffer();

    res.setHeader("Content-Type", "audio/mpeg");
    res.send(Buffer.from(audioBuffer));

  } catch (err) {
    console.error("ERRO SERVIDOR:", err);
    res.status(500).send("Erro ao gerar voz");
  }
});

// porta dinâmica (OBRIGATÓRIO pro deploy)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🔥 AXION SERVER ONLINE");
});