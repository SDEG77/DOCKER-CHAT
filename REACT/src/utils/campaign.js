export const defaultCampaignForm = {
  title: 'The Ashen Crown',
  playerName: '',
  characterName: '',
  campaignIdea:
    'A fallen kingdom stirs beneath the mountains, and ancient oaths are beginning to break.',
  tone: 'Moody heroic fantasy with mystery and danger',
  playStyle: 'Roleplay-first adventure with meaningful consequences',
}

export function createEmptyInventoryForm() {
  return {
    name: '',
    quantity: '1',
    status: 'carried',
    details: '',
  }
}

export function extractChoices(content) {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const choices = lines
    .map((line) => line.match(/^(?:[-*]|\d+[.)]|[A-D][.)])\s+(.+)$/i)?.[1]?.trim())
    .filter(Boolean)

  return [...new Set(choices)].slice(0, 4)
}

export function formatAiProvider(campaign) {
  if (!campaign?.activeAiProvider) {
    return 'No AI provider yet'
  }

  return campaign.activeAiProvider === 'groq' ? 'Groq' : 'Gemini'
}

export function formatAiMode(campaign) {
  if (!campaign?.activeAiProvider) {
    return 'No active provider state yet'
  }

  if (campaign.activeAiProvider === 'groq') {
    return campaign.activeAiMode === 'backup'
      ? 'Groq backup model'
      : 'Groq primary model'
  }

  return 'Primary provider'
}
