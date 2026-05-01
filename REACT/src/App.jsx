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
  const [topbarVisible, setTopbarVisible] = useState(true)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [inventoryEditorOpen, setInventoryEditorOpen] = useState(false)
  const [inventoryForm, setInventoryForm] = useState(createEmptyInventoryForm())
  const [editingInventoryId, setEditingInventoryId] = useState(null)
  const [inventorySaving, setInventorySaving] = useState(false)
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

  async function saveInventoryItem(event) {
    event.preventDefault()

    if (!campaign?._id || !inventoryForm.name.trim()) {
      return
    }

    setInventorySaving(true)
    setError('')

    try {
      const isEditing = Boolean(editingInventoryId)
      const endpoint = isEditing
        ? `${API_BASE_URL}/api/campaigns/${campaign._id}/inventory/${editingInventoryId}`
        : `${API_BASE_URL}/api/campaigns/${campaign._id}/inventory`

      const response = await fetch(endpoint, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...inventoryForm,
          quantity: Number(inventoryForm.quantity),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save inventory item.')
      }

      setCampaign(data.campaign)
      closeInventoryEditor()
    } catch (err) {
      setError(err.message)
    } finally {
      setInventorySaving(false)
    }
  }

  async function deleteInventoryItem(itemId) {
    if (!campaign?._id) {
      return
    }

    setInventorySaving(true)
    setError('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/campaigns/${campaign._id}/inventory/${itemId}`,
        {
          method: 'DELETE',
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete inventory item.')
      }

      setCampaign(data.campaign)

      if (editingInventoryId === itemId) {
        closeInventoryEditor()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setInventorySaving(false)
    }
  }

  function openInventoryModal() {
    setInventoryOpen(true)
  }

  function closeInventoryModal() {
    setInventoryOpen(false)
  }

  function beginInventoryCreate() {
    setEditingInventoryId(null)
    setInventoryForm(createEmptyInventoryForm())
    setInventoryEditorOpen(true)
  }

  function beginInventoryEdit(item) {
    setEditingInventoryId(item._id)
    setInventoryForm({
      name: item.name,
      quantity: String(item.quantity),
      status: item.status,
      details: item.details || '',
    })
    setInventoryEditorOpen(true)
  }

  function closeInventoryEditor() {
    setEditingInventoryId(null)
    setInventoryForm(createEmptyInventoryForm())
    setInventoryEditorOpen(false)
  }

  function startFreshCampaign() {
    window.localStorage.removeItem(STORAGE_KEY)
    setCampaign(null)
    setTopbarVisible(true)
    setInventoryOpen(false)
    closeInventoryEditor()
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
      {!topbarVisible ? (
        <button
          type="button"
          className="floating-action topbar-toggle"
          onClick={() => setTopbarVisible(true)}
          aria-label="Show controls"
          title="Show controls"
        >
          <MenuIcon />
        </button>
      ) : null}

      <main className={`session-stage ${topbarVisible ? 'with-topbar' : 'without-topbar'}`}>
        {topbarVisible ? (
          <header className="story-header fixed">
            <div>
              <p className="eyebrow">Live session</p>
              <h2>{campaign.title}</h2>
            </div>
            <div className="campaign-actions">
              <span className="campaign-badge">{campaign.characterName}</span>
              <span className="campaign-badge">{campaign.tone}</span>
              <button
                type="button"
                className="icon-button"
                onClick={() => setTopbarVisible(false)}
                aria-label="Hide top bar"
                title="Hide top bar"
              >
                <MinimizeIcon />
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={startFreshCampaign}
                aria-label="Start new campaign"
                title="New campaign"
              >
                <RefreshIcon />
              </button>
            </div>
          </header>
        ) : null}

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

      <button
        type="button"
        className="floating-action inventory-fab"
        onClick={openInventoryModal}
        aria-label="Open inventory"
        title="Inventory"
      >
        <BackpackIcon />
      </button>

      {inventoryOpen ? (
        <div className="modal-backdrop" onClick={closeInventoryModal}>
          <section
            className="modal-panel inventory-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="inventory-header">
              <div>
                <p className="choice-label">Inventory</p>
                <h3>Current carried gear</h3>
              </div>
              <div className="inventory-toolbar">
                <button
                  type="button"
                  className="primary"
                  onClick={beginInventoryCreate}
                  disabled={inventorySaving}
                >
                  Add new item
                </button>
                <button
                  type="button"
                  className="ghost inventory-close"
                  onClick={closeInventoryModal}
                >
                  Close
                </button>
              </div>
            </div>

            {campaign.inventory?.length ? (
              <div className="inventory-list">
                {campaign.inventory.map((item) => (
                  <article key={item._id} className="inventory-item">
                    <div className="inventory-main">
                      <strong>{item.name}</strong>
                      <span className="campaign-badge">x{item.quantity}</span>
                      <span className="campaign-badge">{item.status}</span>
                    </div>
                    {item.details ? <p className="inventory-details">{item.details}</p> : null}
                    <div className="inventory-item-actions">
                      <button
                        type="button"
                        className="ghost inventory-action"
                        onClick={() => beginInventoryEdit(item)}
                        disabled={inventorySaving}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="ghost inventory-action danger"
                        onClick={() => void deleteInventoryItem(item._id)}
                        disabled={inventorySaving}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="inventory-empty">
                Your character is not carrying any tracked items yet.
              </p>
            )}
          </section>
        </div>
      ) : null}

      {inventoryEditorOpen ? (
        <div className="modal-backdrop" onClick={closeInventoryEditor}>
          <section
            className="modal-panel inventory-editor-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="inventory-header">
              <div>
                <p className="choice-label">Inventory editor</p>
                <h3>{editingInventoryId ? 'Edit item' : 'Add item'}</h3>
              </div>
              <button
                type="button"
                className="ghost inventory-close"
                onClick={closeInventoryEditor}
              >
                Close
              </button>
            </div>

            <form className="inventory-form" onSubmit={saveInventoryItem}>
              <div className="inventory-form-grid">
                <label>
                  Item name
                  <input
                    value={inventoryForm.name}
                    onChange={(event) =>
                      setInventoryForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Rope"
                    disabled={inventorySaving}
                  />
                </label>

                <label>
                  Quantity
                  <input
                    type="number"
                    min="1"
                    value={inventoryForm.quantity}
                    onChange={(event) =>
                      setInventoryForm((current) => ({ ...current, quantity: event.target.value }))
                    }
                    disabled={inventorySaving}
                  />
                </label>

                <label>
                  Status
                  <select
                    value={inventoryForm.status}
                    onChange={(event) =>
                      setInventoryForm((current) => ({ ...current, status: event.target.value }))
                    }
                    disabled={inventorySaving}
                  >
                    <option value="carried">Carried</option>
                    <option value="equipped">Equipped</option>
                    <option value="stored">Stored</option>
                  </select>
                </label>
              </div>

              <label>
                Details
                <input
                  value={inventoryForm.details}
                  onChange={(event) =>
                    setInventoryForm((current) => ({ ...current, details: event.target.value }))
                  }
                  placeholder="Silk rope, 50 ft."
                  disabled={inventorySaving}
                />
              </label>

              <div className="inventory-form-actions">
                <button type="submit" className="primary" disabled={inventorySaving}>
                  {inventorySaving
                    ? 'Saving...'
                    : editingInventoryId
                      ? 'Update item'
                      : 'Add item'}
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={closeInventoryEditor}
                  disabled={inventorySaving}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  )
}

function createEmptyInventoryForm() {
  return {
    name: '',
    quantity: '1',
    status: 'carried',
    details: '',
  }
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

function BackpackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 5.5a3 3 0 0 1 6 0V7h1.5A2.5 2.5 0 0 1 19 9.5v9A2.5 2.5 0 0 1 16.5 21h-9A2.5 2.5 0 0 1 5 18.5v-9A2.5 2.5 0 0 1 7.5 7H9V5.5Zm2 0V7h2V5.5a1 1 0 0 0-2 0ZM8 11a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H9a1 1 0 0 1-1-1Zm1.5 3.5h5a1 1 0 1 1 0 2h-5a1 1 0 1 1 0-2Z" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H6A1 1 0 0 1 5 7Zm0 5a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1Zm1 4a1 1 0 1 0 0 2h12a1 1 0 1 0 0-2H6Z" />
    </svg>
  )
}

function MinimizeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 12.5A1.5 1.5 0 0 1 7.5 11h9a1.5 1.5 0 1 1 0 3h-9A1.5 1.5 0 0 1 6 12.5Z" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5a7 7 0 0 1 6.32 4H16.5a1 1 0 1 0 0 2H21a1 1 0 0 0 1-1V5.5a1 1 0 1 0-2 0v1.27A9 9 0 1 0 21 12a1 1 0 1 0-2 0 7 7 0 1 1-7-7Z" />
    </svg>
  )
}
