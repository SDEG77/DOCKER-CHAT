const cors = require('cors');
const express = require('express');
const campaignRoutes = require('./routes/campaignRoutes');
const {
  isAnyProviderConfigured,
  isGeminiConfigured,
  isGroqConfigured,
} = require('./services/geminiService');

function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN || '*',
    }),
  );
  app.use(express.json());

  app.get('/', (req, res) => {
    res.send('D&D Gemini DM API is ready.');
  });

  app.get('/api/health', (req, res) => {
    res.json({
      ok: true,
      aiProviderConfigured: isAnyProviderConfigured(),
      geminiConfigured: isGeminiConfigured(),
      groqConfigured: isGroqConfigured(),
    });
  });

  app.use('/api/campaigns', campaignRoutes);

  return app;
}

module.exports = {
  createApp,
};
