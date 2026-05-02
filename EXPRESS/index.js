const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const Campaign = require('./src/models/Campaign');
const {
  generateDungeonMasterReply,
  extractCampaignMemories,
  extractInventoryUpdates,
  isAnyProviderConfigured,
  isGeminiConfigured,
  isGroqConfigured,
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
    aiProviderConfigured: isAnyProviderConfigured(),
    geminiConfigured: isGeminiConfigured(),
    groqConfigured: isGroqConfigured(),
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
      inventory: [],
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

    if (isAnyProviderConfigured()) {
      const openingScene = await generateDungeonMasterReply({
        campaign,
        userMessage:
          'Begin the campaign with a vivid opening scene, then invite the player to act.',
        isOpeningScene: true,
      });

      campaign.activeAiProvider = openingScene.provider;
      campaign.activeAiModel = openingScene.model;
      campaign.lastAiAt = new Date();

      assistantMessage = {
        role: 'assistant',
        content: openingScene.text,
      };
    } else {
      assistantMessage = {
        role: 'assistant',
        content:
          'The campaign is prepared. Add a valid `GEMINI_API_KEY` or `GROQ_API_KEY` to `EXPRESS/.env`, then send your first action to let the Dungeon Master take over.',
      };
    }

    campaign.messages.push(assistantMessage);

    const newMemories = await extractCampaignMemories({
      campaign,
      userMessage:
        'The campaign begins. The protagonist steps into the opening scene.',
      assistantMessage: assistantMessage.content,
    });
    const inventoryUpdates = await extractInventoryUpdates({
      campaign,
      userMessage:
        'The campaign begins. The protagonist steps into the opening scene.',
      assistantMessage: assistantMessage.content,
    });

    mergeMemories(campaign, newMemories);
    mergeInventory(campaign, inventoryUpdates);

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

    if (!isAnyProviderConfigured()) {
      await campaign.save();
      return res.status(503).json({
        campaign,
        error:
          'No AI provider is configured yet. Add GEMINI_API_KEY or GROQ_API_KEY to EXPRESS/.env and restart the Express container.',
      });
    }

    const reply = await generateDungeonMasterReply({
      campaign,
      userMessage: message,
      isOpeningScene: false,
    });

    campaign.activeAiProvider = reply.provider;
    campaign.activeAiModel = reply.model;
    campaign.lastAiAt = new Date();

    campaign.messages.push({
      role: 'assistant',
      content: reply.text,
    });

    const newMemories = await extractCampaignMemories({
      campaign,
      userMessage: message,
      assistantMessage: reply.text,
    });
    const inventoryUpdates = await extractInventoryUpdates({
      campaign,
      userMessage: message,
      assistantMessage: reply.text,
    });

    mergeMemories(campaign, newMemories);
    mergeInventory(campaign, inventoryUpdates);

    await campaign.save();

    return res.json({ campaign });
  } catch (error) {
    console.error('Failed to process message:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process message.',
    });
  }
});

app.post('/api/campaigns/:campaignId/inventory', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.campaignId);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const item = buildInventoryItem(req.body);

    campaign.inventory.push(item);
    await campaign.save();

    return res.status(201).json({ campaign });
  } catch (error) {
    console.error('Failed to add inventory item:', error);
    return res.status(400).json({
      error: error.message || 'Failed to add inventory item.',
    });
  }
});

app.put('/api/campaigns/:campaignId/inventory/:itemId', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.campaignId);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const item = campaign.inventory.id(req.params.itemId);

    if (!item) {
      return res.status(404).json({ error: 'Inventory item not found.' });
    }

    const updates = buildInventoryItem(req.body);
    item.name = updates.name;
    item.quantity = updates.quantity;
    item.status = updates.status;
    item.details = updates.details;

    await campaign.save();

    return res.json({ campaign });
  } catch (error) {
    console.error('Failed to update inventory item:', error);
    return res.status(400).json({
      error: error.message || 'Failed to update inventory item.',
    });
  }
});

app.delete('/api/campaigns/:campaignId/inventory/:itemId', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.campaignId);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const item = campaign.inventory.id(req.params.itemId);

    if (!item) {
      return res.status(404).json({ error: 'Inventory item not found.' });
    }

    item.deleteOne();
    await campaign.save();

    return res.json({ campaign });
  } catch (error) {
    console.error('Failed to delete inventory item:', error);
    return res.status(400).json({
      error: error.message || 'Failed to delete inventory item.',
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

function mergeInventory(campaign, updates) {
  if (!Array.isArray(updates) || updates.length === 0) {
    return;
  }

  for (const update of updates) {
    const name = update?.name?.trim();

    if (!name) {
      continue;
    }

    const normalizedName = name.toLowerCase();
    const action = normalizeInventoryAction(update.action);
    const quantity = normalizeInventoryQuantity(update.quantity, action);
    const status = normalizeInventoryStatus(update.status);
    const existingItem = campaign.inventory.find(
      (item) => item.name.trim().toLowerCase() === normalizedName,
    );

    if (action === 'remove') {
      if (!existingItem) {
        continue;
      }

      existingItem.quantity = Math.max(0, existingItem.quantity - quantity);

      if (existingItem.quantity === 0) {
        campaign.inventory.pull(existingItem._id);
      }
      continue;
    }

    if (action === 'set') {
      if (quantity <= 0) {
        if (existingItem) {
          campaign.inventory.pull(existingItem._id);
        }
        continue;
      }

      if (existingItem) {
        existingItem.quantity = quantity;
        existingItem.status = status;
        existingItem.details = update.details || existingItem.details;
      } else {
        campaign.inventory.push({
          name,
          quantity,
          status,
          details: update.details || '',
        });
      }
      continue;
    }

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.status = status;
      existingItem.details = update.details || existingItem.details;
      continue;
    }

    campaign.inventory.push({
      name,
      quantity,
      status,
      details: update.details || '',
    });
  }
}

function normalizeInventoryAction(action) {
  const allowedActions = new Set(['add', 'remove', 'set']);
  return allowedActions.has(action) ? action : 'add';
}

function normalizeInventoryQuantity(quantity, action = 'add') {
  if (!Number.isFinite(quantity)) {
    return 1;
  }

  const minimum = action === 'set' ? 0 : 1;
  return Math.max(minimum, Math.floor(quantity));
}

function normalizeInventoryStatus(status) {
  const allowedStatuses = new Set(['carried', 'equipped', 'stored']);
  return allowedStatuses.has(status) ? status : 'carried';
}

function buildInventoryItem(input) {
  const name = input?.name?.trim();

  if (!name) {
    throw new Error('Inventory item name is required.');
  }

  return {
    name,
    quantity: normalizeInventoryQuantity(Number(input.quantity), 'set') || 1,
    status: normalizeInventoryStatus(input.status),
    details: input?.details?.trim() || '',
  };
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
