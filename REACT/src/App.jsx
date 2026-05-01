import { useEffect, useMemo, useRef, useState } from 'react'
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
    if (!chatViewportRef.current || !campaign?.messages?.length) {
      return
    }

    const viewport = chatViewportRef.current
    const frame = window.requestAnimationFrame(() => {
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: 'auto',
      })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [campaign?.messages?.length])

  const latestAssistantMessage = useMemo(() => {
    if (!campaign?.messages?.length) {
      return null
    }

    return [...campaign.messages].reverse().find((message) => message.role === 'assistant') || null
  }, [campaign])

  const quickChoices = useMemo(
    () => extractChoices(latestAssistantMessage?.content || ''),
    [latestAssistantMessage],
  )

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

  async function sendCampaignMessage(message) {
    if (!campaign?._id || !message.trim()) {
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
        body: JSON.stringify({ message }),
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

  async function sendMessage(event) {
    event.preventDefault()
    await sendCampaignMessage(draft)
  }

  async function chooseOption(choice) {
    setDraft(choice)
    await sendCampaignMessage(choice)
  }

  function startFreshCampaign() {
    window.localStorage.removeItem(STORAGE_KEY)
    setCampaign(null)
    setDraft('')
    setError('')
  }

  if (!campaign) {
    return (
      <div className="intro-shell">
        <section className="intro-panel">
          <p className="eyebrow">Gemini Dungeon Master</p>
          <h1>Start a campaign worth remembering.</h1>
          <p className="lede">
            Spin up a solo D&amp;D adventure with a persistent AI Dungeon Master
            and a cleaner tabletop-style interface.
          </p>

          {error ? <div className="error-banner">{error}</div> : null}

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

            <div className="form-row">
              <label>
                Tone
                <input
                  value={campaignForm.tone}
                  onChange={(event) =>
                    setCampaignForm((current) => ({ ...current, tone: event.target.value }))
                  }
                  placeholder="Dark intrigue, heroic fantasy..."
                />
              </label>

              <label>
                Play style
                <input
                  value={campaignForm.playStyle}
                  onChange={(event) =>
                    setCampaignForm((current) => ({ ...current, playStyle: event.target.value }))
                  }
                  placeholder="Roleplay-first, investigation-heavy..."
                />
              </label>
            </div>

            <button type="submit" className="primary" disabled={bootingCampaign}>
              {bootingCampaign ? 'Summoning the campaign...' : 'Start campaign'}
            </button>
          </form>
        </section>
      </div>
    )
  }

  return (
    <div className="session-shell">
      <main className="session-stage">
        <header className="story-header">
          <div>
            <p className="eyebrow">Live session</p>
            <h2>{campaign.title}</h2>
          </div>
          <div className="campaign-actions">
            <span className="campaign-badge">{campaign.characterName}</span>
            <span className="campaign-badge">{campaign.tone}</span>
            <button type="button" className="ghost" onClick={startFreshCampaign}>
              New campaign
            </button>
          </div>
        </header>

        {error ? <div className="error-banner">{error}</div> : null}

        <section className="chat-log" ref={chatViewportRef}>
          {campaign.messages.map((message) => (
            <article key={message._id} className={`message ${message.role}`}>
              <p className="message-role">
                {message.role === 'assistant' ? 'Dungeon Master' : campaign.characterName}
              </p>
              <p className="message-content">{message.content}</p>
            </article>
          ))}
        </section>

        {quickChoices.length > 0 ? (
          <section className="quick-choices">
            <p className="choice-label">Quick choices</p>
            <div className="choice-grid">
              {quickChoices.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  className="choice-button"
                  disabled={loading}
                  onClick={() => void chooseOption(choice)}
                >
                  {choice}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <form className="composer" onSubmit={sendMessage}>
          <textarea
            rows="4"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="What does your character say or do next?"
            disabled={loading}
          />
          <div className="composer-actions">
            <button type="submit" className="primary" disabled={loading || !draft.trim()}>
              {loading ? 'Thinking...' : 'Send action'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

function extractChoices(content) {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const choices = lines
    .map((line) => line.match(/^(?:[-*]|\d+[.)]|[A-D][.)])\s+(.+)$/i)?.[1]?.trim())
    .filter(Boolean)

  return [...new Set(choices)].slice(0, 4)
}

export default App
