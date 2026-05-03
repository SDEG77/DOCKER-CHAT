const Campaign = require('../models/Campaign');
const {
  generateDungeonMasterReply,
  extractCampaignMemories,
  extractInventoryUpdates,
  isAnyProviderConfigured,
} = require('../services/geminiService');
const {
  buildInventoryItem,
  createSetupMemories,
  mergeInventory,
  mergeMemories,
} = require('../utils/campaignState');

async function getCampaign(req, res) {
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
}

async function createCampaign(req, res) {
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

    const trimmedCampaign = {
      title: title.trim(),
      playerName: playerName.trim(),
      characterName: characterName.trim(),
      campaignIdea: campaignIdea.trim(),
      tone: tone?.trim() || 'Heroic fantasy with dramatic choices',
      playStyle: playStyle?.trim() || 'Roleplay-first adventure',
    };

    const campaign = await Campaign.create({
      ...trimmedCampaign,
      messages: [],
      inventory: [],
      memories: createSetupMemories(trimmedCampaign),
    });

    const assistantMessage = await buildOpeningAssistantMessage(campaign);
    campaign.messages.push(assistantMessage);

    await applyDerivedCampaignState({
      campaign,
      userMessage: 'The campaign begins. The protagonist steps into the opening scene.',
      assistantMessage: assistantMessage.content,
    });

    await campaign.save();

    return res.status(201).json({ campaign });
  } catch (error) {
    console.error('Failed to create campaign:', error);
    return res.status(500).json({ error: 'Failed to create campaign.' });
  }
}

async function addMessage(req, res) {
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
    campaign.activeAiMode = reply.mode;
    campaign.lastAiAt = new Date();
    campaign.messages.push({
      role: 'assistant',
      content: reply.text,
    });

    await applyDerivedCampaignState({
      campaign,
      userMessage: message,
      assistantMessage: reply.text,
    });

    await campaign.save();

    return res.json({ campaign });
  } catch (error) {
    console.error('Failed to process message:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process message.',
    });
  }
}

async function addInventoryItem(req, res) {
  try {
    const campaign = await Campaign.findById(req.params.campaignId);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    campaign.inventory.push(buildInventoryItem(req.body));
    await campaign.save();

    return res.status(201).json({ campaign });
  } catch (error) {
    console.error('Failed to add inventory item:', error);
    return res.status(400).json({
      error: error.message || 'Failed to add inventory item.',
    });
  }
}

async function updateInventoryItem(req, res) {
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
}

async function deleteInventoryItem(req, res) {
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
}

async function buildOpeningAssistantMessage(campaign) {
  if (!isAnyProviderConfigured()) {
    return {
      role: 'assistant',
      content:
        'The campaign is prepared. Add a valid `GEMINI_API_KEY` or `GROQ_API_KEY` to `EXPRESS/.env`, then send your first action to let the Dungeon Master take over.',
    };
  }

  const openingScene = await generateDungeonMasterReply({
    campaign,
    userMessage: 'Begin the campaign with a vivid opening scene, then invite the player to act.',
    isOpeningScene: true,
  });

  campaign.activeAiProvider = openingScene.provider;
  campaign.activeAiModel = openingScene.model;
  campaign.activeAiMode = openingScene.mode;
  campaign.lastAiAt = new Date();

  return {
    role: 'assistant',
    content: openingScene.text,
  };
}

async function applyDerivedCampaignState({
  campaign,
  userMessage,
  assistantMessage,
}) {
  const newMemories = await extractCampaignMemories({
    campaign,
    userMessage,
    assistantMessage,
  });
  const inventoryUpdates = await extractInventoryUpdates({
    campaign,
    userMessage,
    assistantMessage,
  });

  mergeMemories(campaign, newMemories);
  mergeInventory(campaign, inventoryUpdates);
}

module.exports = {
  addInventoryItem,
  addMessage,
  createCampaign,
  deleteInventoryItem,
  getCampaign,
  updateInventoryItem,
};
