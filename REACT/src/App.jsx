import { useEffect, useRef, useState } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const STORAGE_KEY = 'dnd-dm-active-campaign'

const defaultForm = {
  title: 'The Ashen Crown',
  playerName: '',
  characterName: '',
  campaignIdea:
    'A fallen kingdom stirs beneath the mountains, and ancient oaths are beginning to break.',
  tone: 'Moody heroic fantasy with mystery and danger',
  playStyle: 'Roleplay-first adventure with meaningful consequences',
}

function App() {
  const [campaignForm, setCampaignForm] = useState(defaultForm)
  const [campaign, setCampaign] = useState(null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [bootingCampaign, setBootingCampaign] = useState(false)
  const chatViewportRef = useRef(null)

  useEffect(() => {
    const campaignId = window.localStorage.getItem(STORAGE_KEY)

    if (campaignId) {
      void loadCampaign(campaignId)
    }
  }, [])

  useEffect(() => {
    if (chatViewportRef.current) {
      chatViewportRef.current.scrollTop = chatViewportRef.current.scrollHeight
    }
  }, [campaign])

  async function loadCampaign(campaignId) {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load campaign.')
      }

      setCampaign(data.campaign)
    } catch (err) {
      window.localStorage.removeItem(STORAGE_KEY)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function createCampaign(event) {
    event.preventDefault()
    setBootingCampaign(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(campaignForm),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create campaign.')
      }

      setCampaign(data.campaign)
      window.localStorage.setItem(STORAGE_KEY, data.campaign._id)
      setDraft('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBootingCampaign(false)
    }
  }

  async function sendMessage(event) {
    event.preventDefault()

    if (!campaign?._id || !draft.trim()) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaign._id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: draft }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.campaign) {
          setCampaign(data.campaign)
        }

        throw new Error(data.error || 'Failed to continue the campaign.')
      }

      setCampaign(data.campaign)
      setDraft('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function startFreshCampaign() {
    window.localStorage.removeItem(STORAGE_KEY)
    setCampaign(null)
    setDraft('')
    setError('')
  }

  return (
    <div className="shell">
      <aside className="codex-panel">
        <p className="eyebrow">Gemini + MongoDB</p>
        <h1>Dungeon Master Console</h1>
        <p className="lede">
          Build a persistent solo D&amp;D campaign where the AI remembers names,
          quests, places, and promises.
        </p>

        <form className="campaign-form" onSubmit={createCampaign}>
          <label>
            Campaign title
            <input
              value={campaignForm.title}
              onChange={(event) =>
                setCampaignForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="The Ashen Crown"
            />
          </label>

          <label>
            Your name
            <input
              value={campaignForm.playerName}
              onChange={(event) =>
                setCampaignForm((current) => ({ ...current, playerName: event.target.value }))
              }
              placeholder="Aria"
            />
          </label>

          <label>
            Character name
            <input
              value={campaignForm.characterName}
              onChange={(event) =>
                setCampaignForm((current) => ({
                  ...current,
                  characterName: event.target.value,
                }))
              }
              placeholder="Seraphine Vale"
            />
          </label>

          <label>
            Campaign premise
            <textarea
              rows="4"
              value={campaignForm.campaignIdea}
              onChange={(event) =>
                setCampaignForm((current) => ({
                  ...current,
                  campaignIdea: event.target.value,
                }))
              }
              placeholder="What kind of adventure should the DM run?"
            />
          </label>

          <label>
            Tone
            <input
              value={campaignForm.tone}
              onChange={(event) =>
                setCampaignForm((current) => ({ ...current, tone: event.target.value }))
              }
              placeholder="Dark intrigue, heroic fantasy, cosmic horror..."
            />
          </label>

          <label>
            Play style
            <input
              value={campaignForm.playStyle}
              onChange={(event) =>
                setCampaignForm((current) => ({ ...current, playStyle: event.target.value }))
              }
              placeholder="Roleplay-first, tactical, investigation-heavy..."
            />
          </label>

          <button type="submit" className="primary" disabled={bootingCampaign}>
            {bootingCampaign ? 'Summoning the campaign...' : 'Start a new campaign'}
          </button>
        </form>

        <div className="setup-card">
          <h2>API key placeholder</h2>
          <p>
            Put your Gemini key in <code>EXPRESS/.env</code> as
            <code> GEMINI_API_KEY=...</code>, then restart the Express container.
          </p>
          <button type="button" className="ghost" onClick={startFreshCampaign}>
            Clear current campaign
          </button>
        </div>
      </aside>

      <main className="play-surface">
        <section className="story-column">
          <header className="story-header">
            <div>
              <p className="eyebrow">Live session</p>
              <h2>{campaign?.title || 'No campaign loaded yet'}</h2>
            </div>
            {campaign ? (
              <div className="campaign-meta">
                <span>{campaign.characterName}</span>
                <span>{campaign.tone}</span>
              </div>
            ) : null}
          </header>

          {error ? <div className="error-banner">{error}</div> : null}

          <div className="chat-log" ref={chatViewportRef}>
            {campaign?.messages?.length ? (
              campaign.messages.map((message) => (
                <article key={message._id} className={`message ${message.role}`}>
                  <p className="message-role">
                    {message.role === 'assistant' ? 'Dungeon Master' : campaign.characterName}
                  </p>
                  <p className="message-content">{message.content}</p>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <h3>Forge the world first</h3>
                <p>
                  Fill out the campaign details on the left, then the Dungeon
                  Master will open the first scene here.
                </p>
              </div>
            )}
          </div>

          <form className="composer" onSubmit={sendMessage}>
            <textarea
              rows="4"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={
                campaign
                  ? 'What does your character say or do next?'
                  : 'Start a campaign to begin playing.'
              }
              disabled={!campaign || loading}
            />
            <button type="submit" className="primary" disabled={!campaign || loading}>
              {loading ? 'Thinking...' : 'Send action'}
            </button>
          </form>
        </section>

        <aside className="memory-column">
          <div className="memory-card">
            <p className="eyebrow">Persistent memory</p>
            <h3>What the DM remembers</h3>
            <p>
              Important quest facts, people, places, and commitments are stored
              in MongoDB so the campaign stays consistent.
            </p>
          </div>

          <div className="memory-list">
            {campaign?.memories?.length ? (
              campaign.memories
                .slice()
                .reverse()
                .map((memory) => (
                  <article key={memory._id} className="memory-entry">
                    <span className="memory-kind">{memory.kind}</span>
                    <p>{memory.content}</p>
                  </article>
                ))
            ) : (
              <div className="memory-entry placeholder">
                <p>Important campaign details will appear here as the story unfolds.</p>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  )
}

export default App
