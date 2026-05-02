const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function isGroqConfigured() {
  return Boolean(process.env.GROQ_API_KEY);
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

  return callPreferredModel({
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
  if (!isAnyProviderConfigured()) {
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

  const rawResult = await callPreferredModel({
    systemInstruction,
    prompt,
    temperature: 0.2,
    responseMimeType: 'application/json',
  });
  const rawText = rawResult.text;

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
    console.error('Failed to parse memory extraction response:', error);
    return [];
  }
}

async function extractInventoryUpdates({
  campaign,
  userMessage,
  assistantMessage,
}) {
  if (!isAnyProviderConfigured()) {
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

  const rawResult = await callPreferredModel({
    systemInstruction,
    prompt,
    temperature: 0.1,
    responseMimeType: 'application/json',
  });
  const rawText = rawResult.text;

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
    console.error('Failed to parse inventory extraction response:', error);
    return [];
  }
}

async function callPreferredModel({
  systemInstruction,
  prompt,
  temperature,
  responseMimeType,
}) {
  const providers = [
    {
      name: 'gemini',
      configured: isGeminiConfigured(),
      fn: callGemini,
    },
    {
      name: 'groq',
      configured: isGroqConfigured(),
      fn: callGroq,
    },
  ].filter((provider) => provider.configured);

  if (providers.length === 0) {
    throw new Error(
      'No AI provider is configured. Add GEMINI_API_KEY or GROQ_API_KEY to EXPRESS/.env.',
    );
  }

  let lastError;

  for (let index = 0; index < providers.length; index += 1) {
    const provider = providers[index];

    try {
      return await provider.fn({
        systemInstruction,
        prompt,
        temperature,
        responseMimeType,
      });
    } catch (error) {
      lastError = error;
      const shouldFallback = index < providers.length - 1 && isQuotaOrRetryableProviderError(error);

      console.error(`${provider.name} request failed:`, error.message);

      if (shouldFallback) {
        console.warn(`Falling back from ${provider.name} to ${providers[index + 1].name}.`);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
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
    const error = new Error(`Gemini API error: ${response.status} ${errorText}`);
    error.status = response.status;
    error.provider = 'gemini';
    throw error;
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim();

  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }

      return {
        provider: 'gemini',
        model,
        mode: 'primary',
        text,
      };
}

async function callGroq({
  systemInstruction,
  prompt,
  temperature,
}) {
  if (!isGroqConfigured()) {
    throw new Error('GROQ_API_KEY is missing.');
  }

  const groqModels = getGroqModelChain();
  let lastError;

  for (let index = 0; index < groqModels.length; index += 1) {
    const model = groqModels[index];

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          stream: false,
          temperature,
          messages: [
            {
              role: 'system',
              content: systemInstruction,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`Groq API error: ${response.status} ${errorText}`);
        error.status = response.status;
        error.provider = 'groq';
        error.model = model;
        throw error;
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content?.trim();

      if (!text) {
        const error = new Error(`Groq returned an empty response for model ${model}.`);
        error.provider = 'groq';
        error.model = model;
        throw error;
      }

      return {
        provider: 'groq',
        model,
        mode: index === 0 ? 'primary' : 'backup',
        text,
      };
    } catch (error) {
      lastError = error;

      const shouldTryNextModel =
        index < groqModels.length - 1 && isGroqModelFallbackError(error);

      console.error(`groq model ${model} failed:`, error.message);

      if (shouldTryNextModel) {
        console.warn(`Falling back from Groq model ${model} to ${groqModels[index + 1]}.`);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

function isAnyProviderConfigured() {
  return isGeminiConfigured() || isGroqConfigured();
}

function isQuotaOrRetryableProviderError(error) {
  if (!error) {
    return false;
  }

  if ([429, 500, 502, 503, 504].includes(error.status)) {
    return true;
  }

  const message = String(error.message || '').toLowerCase();

  return (
    message.includes('quota') ||
    message.includes('rate limit') ||
    message.includes('resource_exhausted') ||
    message.includes('too many requests') ||
    message.includes('exceeded your current quota') ||
    message.includes('usage limit')
  );
}

function isGroqModelFallbackError(error) {
  if (!error) {
    return false;
  }

  if ([400, 403, 404, 408, 409, 429, 500, 502, 503, 504].includes(error.status)) {
    return true;
  }

  const message = String(error.message || '').toLowerCase();

  return (
    message.includes('rate_limit_exceeded') ||
    message.includes('rate limit') ||
    message.includes('tokens per day') ||
    message.includes('model') ||
    message.includes('invalid model') ||
    message.includes('not found') ||
    message.includes('permission') ||
    message.includes('unsupported')
  );
}

function getGroqModelChain() {
  const primaryModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const fallbackModels = (process.env.GROQ_FALLBACK_MODELS || '')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);

  const defaultFallbackModels = [
    'openai/gpt-oss-20b',
    'llama-3.1-8b-instant',
    'openai/gpt-oss-120b',
  ];

  return [...new Set([primaryModel, ...fallbackModels, ...defaultFallbackModels])];
}

module.exports = {
  extractCampaignMemories,
  extractInventoryUpdates,
  generateDungeonMasterReply,
  isAnyProviderConfigured,
  isGeminiConfigured,
  isGroqConfigured,
};
