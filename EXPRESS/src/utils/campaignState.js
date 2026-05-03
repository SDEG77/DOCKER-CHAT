function createSetupMemories({
  campaignIdea,
  characterName,
  playerName,
}) {
  return [
    {
      kind: 'campaign',
      content: `Campaign premise: ${campaignIdea}`,
      source: 'setup',
    },
    {
      kind: 'character',
      content: `${characterName} is the player character controlled by ${playerName}.`,
      source: 'setup',
    },
  ];
}

function syncSetupMemories(campaign, {
  campaignIdea,
  characterName,
  playerName,
}) {
  const setupMemories = createSetupMemories({
    campaignIdea,
    characterName,
    playerName,
  });

  for (const setupMemory of setupMemories) {
    const existingMemory = campaign.memories.find(
      (memory) => memory.source === 'setup' && memory.kind === setupMemory.kind,
    );

    if (existingMemory) {
      existingMemory.content = setupMemory.content;
      existingMemory.lastReinforcedAt = new Date();
      continue;
    }

    campaign.memories.push({
      ...setupMemory,
      lastReinforcedAt: new Date(),
    });
  }
}

function buildCampaignSummary(campaign) {
  return {
    _id: campaign._id,
    title: campaign.title,
    playerName: campaign.playerName,
    characterName: campaign.characterName,
    tone: campaign.tone,
    playStyle: campaign.playStyle,
    campaignIdea: campaign.campaignIdea,
    activeAiProvider: campaign.activeAiProvider,
    activeAiModel: campaign.activeAiModel,
    activeAiMode: campaign.activeAiMode,
    lastAiAt: campaign.lastAiAt,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
    messageCount: campaign.messageCount ?? campaign.messages?.length ?? 0,
    memoryCount: campaign.memoryCount ?? campaign.memories?.length ?? 0,
    inventoryCount: campaign.inventoryCount ?? campaign.inventory?.length ?? 0,
  };
}

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

module.exports = {
  buildCampaignSummary,
  buildInventoryItem,
  createSetupMemories,
  mergeInventory,
  mergeMemories,
  syncSetupMemories,
};
