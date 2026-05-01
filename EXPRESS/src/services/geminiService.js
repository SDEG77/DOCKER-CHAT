const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

async function generateDungeonMasterReply({
  campaign,
  userMessage,
  isOpeningScene,
}) {
  const recentMessages = campaign.messages.slice(-10);
  const importantMemories = campaign.memories
    .slice()
    .sort((a, b) => new Date(b.lastReinforcedAt) - new Date(a.lastReinforcedAt))
    .slice(0, 12);
  const inventorySnapshot = campaign.inventory?.slice(0, 20) || [];

  const systemInstruction = [
    'You are an expert Dungeons & Dragons Dungeon Master running a one-player campaign.',
    'Stay in character as the DM.',
    'Be vivid, reactive, and specific.',
    'Respect continuity and use the memory list as canon unless the player changes something in-world.',
    'Give the player meaningful choices and consequences.',
    "Never decide the player character's actions for them.",
    'Keep replies focused, usually 2 to 5 paragraphs.',
    'When appropriate, present a short list of immediate options at the end.',
  ].join(' ');

  const prompt = [
    `Campaign title: ${campaign.title}`,
    `Player name: ${campaign.playerName}`,
    `Player character: ${campaign.characterName}`,
    `Tone: ${campaign.tone}`,
    `Play style: ${campaign.playStyle}`,
    `Campaign concept: ${campaign.campaignIdea}`,
    '',
    'Important campaign memory:',
    importantMemories.length > 0
      ? importantMemories
          .map((memory, index) => `${index + 1}. [${memory.kind}] ${memory.content}`)
          .join('\n')
      : 'No stored memories yet.',
    '',
    'Current player inventory:',
    inventorySnapshot.length > 0
      ? inventorySnapshot
          .map(
            (item, index) =>
              `${index + 1}. ${item.name} x${item.quantity}${item.details ? ` (${item.details})` : ''} [${item.status}]`,
          )
          .join('\n')
      : 'No tracked inventory yet.',
    '',
    'Recent conversation:',
    recentMessages.length > 0
      ? recentMessages
          .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
          .join('\n\n')
      : 'No previous conversation.',
    '',
    isOpeningScene
      ? 'Task: Open the adventure with a compelling first scene and end by inviting the player to respond.'
      : `Player's latest action or statement: ${userMessage}`,
  ].join('\n');

  return callGemini({
    systemInstruction,
    prompt,
    temperature: 0.9,
  });
}

async function extractCampaignMemories({
  campaign,
  userMessage,
  assistantMessage,
}) {
  if (!isGeminiConfigured()) {
    return [];
  }

  const systemInstruction = [
    'You extract durable Dungeons & Dragons campaign memory.',
    'Return only JSON.',
    'Capture only facts that matter later: named NPCs, places, quests, items, vows, alliances, discoveries, and character-defining decisions.',
    'Do not include temporary flavor details.',
  ].join(' ');

  const prompt = [
    `Campaign title: ${campaign.title}`,
    `Player character: ${campaign.characterName}`,
    '',
    'Return a JSON object in this shape:',
    '{"memories":[{"kind":"npc|location|quest|item|character|campaign|fact","content":"short sentence","source":"setup|scene"}]}',
    '',
    'Conversation chunk to inspect:',
    `USER: ${userMessage}`,
    `ASSISTANT: ${assistantMessage}`,
  ].join('\n');

  const rawText = await callGemini({
    systemInstruction,
    prompt,
    temperature: 0.2,
    responseMimeType: 'application/json',
  });

  try {
    const cleaned = rawText.replace(/```json|```/gi, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed.memories)) {
      return [];
    }

    return parsed.memories
      .filter((memory) => typeof memory.content === 'string' && memory.content.trim())
      .map((memory) => ({
        kind: memory.kind,
        content: memory.content.trim(),
        source: memory.source || 'scene',
      }));
  } catch (error) {
    console.error('Failed to parse Gemini memory response:', error);
    return [];
  }
}

async function extractInventoryUpdates({
  campaign,
  userMessage,
  assistantMessage,
}) {
  if (!isGeminiConfigured()) {
    return [];
  }

  const currentInventory = campaign.inventory?.length
    ? campaign.inventory
        .map(
          (item, index) =>
            `${index + 1}. ${item.name} x${item.quantity}${item.details ? ` (${item.details})` : ''} [${item.status}]`,
        )
        .join('\n')
    : 'Inventory is currently empty.';

  const systemInstruction = [
    'You maintain a Dungeons & Dragons player inventory ledger.',
    'Return only JSON.',
    'Only track concrete possessions the player character actually gains, consumes, equips, stores, gives away, loses, or destroys.',
    'Ignore scenery, money not clearly acquired, and vague possibilities.',
  ].join(' ');

  const prompt = [
    `Campaign title: ${campaign.title}`,
    `Player character: ${campaign.characterName}`,
    '',
    'Current inventory:',
    currentInventory,
    '',
    'Return JSON in this shape:',
    '{"updates":[{"action":"add|remove|set","name":"item name","quantity":1,"details":"short optional note","status":"carried|equipped|stored"}]}',
    '',
    'Conversation chunk to inspect:',
    `USER: ${userMessage}`,
    `ASSISTANT: ${assistantMessage}`,
  ].join('\n');

  const rawText = await callGemini({
    systemInstruction,
    prompt,
    temperature: 0.1,
    responseMimeType: 'application/json',
  });

  try {
    const cleaned = rawText.replace(/```json|```/gi, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed.updates)) {
      return [];
    }

    return parsed.updates
      .filter((update) => typeof update.name === 'string' && update.name.trim())
      .map((update) => ({
        action: update.action,
        name: update.name.trim(),
        quantity: Number.isFinite(update.quantity) ? update.quantity : 1,
        details: typeof update.details === 'string' ? update.details.trim() : '',
        status: update.status,
      }));
  } catch (error) {
    console.error('Failed to parse Gemini inventory response:', error);
    return [];
  }
}

async function callGemini({
  systemInstruction,
  prompt,
  temperature,
  responseMimeType,
}) {
  if (!isGeminiConfigured()) {
    throw new Error('GEMINI_API_KEY is missing.');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const endpoint = `${GEMINI_API_URL}/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature,
        responseMimeType,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim();

  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }

  return text;
}

module.exports = {
  extractCampaignMemories,
  extractInventoryUpdates,
  generateDungeonMasterReply,
  isGeminiConfigured,
};
