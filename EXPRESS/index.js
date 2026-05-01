const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const Campaign = require('./src/models/Campaign');
const {
  generateDungeonMasterReply,
  extractCampaignMemories,
  isGeminiConfigured,
} = require('./src/services/geminiService');

const app = express();
const PORT = process.env.PORT || 3000;

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
    geminiConfigured: isGeminiConfigured(),
  });
});

app.get('/api/campaigns/:campaignId', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.campaignId).lean();

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    return res.json({ campaign });
  } catch (error) {
    console.error('Failed to load campaign:', error);
    return res.status(500).json({ error: 'Failed to load campaign.' });
  }
});

app.post('/api/campaigns', async (req, res) => {
  try {
    const {
      title,
      playerName,
      characterName,
      campaignIdea,
      tone,
      playStyle,
    } = req.body;

    if (!title || !playerName || !characterName || !campaignIdea) {
      return res.status(400).json({
        error: 'title, playerName, characterName, and campaignIdea are required.',
      });
    }

    const campaign = await Campaign.create({
      title: title.trim(),
      playerName: playerName.trim(),
      characterName: characterName.trim(),
      campaignIdea: campaignIdea.trim(),
      tone: tone?.trim() || 'Heroic fantasy with dramatic choices',
      playStyle: playStyle?.trim() || 'Roleplay-first adventure',
      messages: [],
      memories: [
        {
          kind: 'campaign',
          content: `Campaign premise: ${campaignIdea.trim()}`,
          source: 'setup',
        },
        {
          kind: 'character',
          content: `${characterName.trim()} is the player character controlled by ${playerName.trim()}.`,
          source: 'setup',
        },
      ],
    });

    let assistantMessage;

    if (isGeminiConfigured()) {
      const openingScene = await generateDungeonMasterReply({
        campaign,
        userMessage:
          'Begin the campaign with a vivid opening scene, then invite the player to act.',
        isOpeningScene: true,
      });

      assistantMessage = {
        role: 'assistant',
        content: openingScene,
      };
    } else {
      assistantMessage = {
        role: 'assistant',
        content:
          'The campaign is prepared. Add your Gemini API key to `EXPRESS/.env`, then send your first action to let the Dungeon Master take over.',
      };
    }

    campaign.messages.push(assistantMessage);

    const newMemories = await extractCampaignMemories({
      campaign,
      userMessage:
        'The campaign begins. The protagonist steps into the opening scene.',
      assistantMessage: assistantMessage.content,
    });

    mergeMemories(campaign, newMemories);

    await campaign.save();

    return res.status(201).json({ campaign });
  } catch (error) {
    console.error('Failed to create campaign:', error);
    return res.status(500).json({ error: 'Failed to create campaign.' });
  }
});

app.post('/api/campaigns/:campaignId/messages', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.campaignId);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const message = req.body.message?.trim();

    if (!message) {
      return res.status(400).json({ error: 'A message is required.' });
    }

    campaign.messages.push({
      role: 'user',
      content: message,
    });

    if (!isGeminiConfigured()) {
      await campaign.save();
      return res.status(503).json({
        campaign,
        error:
          'Gemini is not configured yet. Add GEMINI_API_KEY to EXPRESS/.env and restart the Express container.',
      });
    }

    const reply = await generateDungeonMasterReply({
      campaign,
      userMessage: message,
      isOpeningScene: false,
    });

    campaign.messages.push({
      role: 'assistant',
      content: reply,
    });

    const newMemories = await extractCampaignMemories({
      campaign,
      userMessage: message,
      assistantMessage: reply,
    });

    mergeMemories(campaign, newMemories);

    await campaign.save();

    return res.json({ campaign });
  } catch (error) {
    console.error('Failed to process message:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process message.',
    });
  }
});

function mergeMemories(campaign, incomingMemories) {
  if (!Array.isArray(incomingMemories) || incomingMemories.length === 0) {
    return;
  }

  for (const memory of incomingMemories) {
    if (!memory?.content) {
      continue;
    }

    const normalizedContent = memory.content.trim().toLowerCase();
    const existingMemory = campaign.memories.find(
      (entry) => entry.content.trim().toLowerCase() === normalizedContent,
    );

    if (existingMemory) {
      existingMemory.kind = normalizeMemoryKind(memory.kind) || existingMemory.kind;
      existingMemory.source = memory.source || 'scene';
      existingMemory.lastReinforcedAt = new Date();
      continue;
    }

    campaign.memories.push({
      kind: normalizeMemoryKind(memory.kind),
      content: memory.content.trim(),
      source: memory.source || 'scene',
      lastReinforcedAt: new Date(),
    });
  }
}

function normalizeMemoryKind(kind) {
  const allowedKinds = new Set([
    'campaign',
    'character',
    'npc',
    'location',
    'quest',
    'item',
    'fact',
  ]);

  return allowedKinds.has(kind) ? kind : 'fact';
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => console.error('MongoDB connection error:', error));
