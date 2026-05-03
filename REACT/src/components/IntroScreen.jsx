import { Pencil, Plus, Trash2 } from 'lucide-react'
import { formatRelativeCampaignActivity } from '../utils/campaign'

function IntroScreen({
  aiInfoOpen,
  campaign,
  campaigns,
  campaignsLoading,
  campaignForm,
  editingCampaignId,
  campaignSaving,
  campaignDeletingId,
  onSaveCampaign,
  onCampaignFormChange,
  onOpenAiInfo,
  onOpenCampaign,
  onBeginCampaignCreate,
  onBeginCampaignEdit,
  onDeleteCampaign,
  onCancelCampaignForm,
}) {
  const formHeading = editingCampaignId
    ? 'Update this campaign'
    : 'Start a campaign worth remembering.'

  return (
    <div className="intro-layout intro-layout-wide">
      <div className="intro-actions">
        <button type="button" className="ghost" onClick={onOpenAiInfo} aria-pressed={aiInfoOpen}>
          View AIs
        </button>
      </div>

      <section className="intro-panel">
        <p className="eyebrow">AI Dungeon Master</p>
        <h1>{formHeading}</h1>
        <p className="lede">
          Create a fresh adventure, or jump back into any saved campaign without losing the others.
        </p>

        <form className="campaign-form" onSubmit={onSaveCampaign}>
          <label>
            Campaign title
            <input
              value={campaignForm.title}
              onChange={(event) =>
                onCampaignFormChange((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="The Ashen Crown"
            />
          </label>

          <label>
            Your name
            <input
              value={campaignForm.playerName}
              onChange={(event) =>
                onCampaignFormChange((current) => ({
                  ...current,
                  playerName: event.target.value,
                }))
              }
              placeholder="Aria"
            />
          </label>

          <label>
            Character name
            <input
              value={campaignForm.characterName}
              onChange={(event) =>
                onCampaignFormChange((current) => ({
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
                onCampaignFormChange((current) => ({
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
              <textarea
                rows="4"
                value={campaignForm.tone}
                onChange={(event) =>
                  onCampaignFormChange((current) => ({
                    ...current,
                    tone: event.target.value,
                  }))
                }
                placeholder="Describe the tone in more detail, like grim political fantasy, cozy adventure, tragic heroism, or eerie mystery..."
              />
            </label>

            <label>
              Play style
              <textarea
                rows="4"
                value={campaignForm.playStyle}
                onChange={(event) =>
                  onCampaignFormChange((current) => ({
                    ...current,
                    playStyle: event.target.value,
                  }))
                }
                placeholder="Describe how you want the campaign to play, like roleplay-heavy, tactical combat, slow-burn mystery, exploration, or character drama..."
              />
            </label>
          </div>

          <div className="campaign-form-actions">
            <button type="submit" className="primary" disabled={campaignSaving}>
              {campaignSaving
                ? editingCampaignId
                  ? 'Updating campaign...'
                  : 'Summoning the campaign...'
                : editingCampaignId
                  ? 'Update campaign'
                  : 'Start campaign'}
            </button>
            {(editingCampaignId || campaign) ? (
              <button type="button" className="ghost" onClick={onCancelCampaignForm}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <aside className="campaign-library">
        <div className="campaign-library-header">
          <div>
            <p className="eyebrow">Campaign vault</p>
            <h3>Saved sessions</h3>
          </div>
          <button type="button" className="ghost" onClick={onBeginCampaignCreate}>
            <Plus size={16} />
            New
          </button>
        </div>

        {campaignsLoading ? (
          <p className="campaign-library-empty">Loading campaign vault...</p>
        ) : campaigns.length > 0 ? (
          <div className="campaign-library-list">
            {campaigns.map((entry) => {
              const isActive = campaign?._id === entry._id

              return (
                <article key={entry._id} className={`campaign-card ${isActive ? 'active' : ''}`}>
                  <div className="campaign-card-copy">
                    <div className="campaign-card-title-row">
                      <strong>{entry.title}</strong>
                      {isActive ? <span className="campaign-badge">Active</span> : null}
                    </div>
                    <p>{entry.characterName} led by {entry.playerName}</p>
                    <p className="campaign-card-meta">
                      {entry.messageCount} messages / {entry.memoryCount} memories / {entry.inventoryCount} items
                    </p>
                    <p className="campaign-card-meta">
                      Last touched {formatRelativeCampaignActivity(entry)}
                    </p>
                  </div>
                  <div className="campaign-card-actions">
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => void onOpenCampaign(entry._id)}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => onBeginCampaignEdit(entry)}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className="ghost inventory-action danger"
                      onClick={() => void onDeleteCampaign(entry._id)}
                      disabled={campaignDeletingId === entry._id}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <p className="campaign-library-empty">
            No campaigns yet. Your first one will show up here once created.
          </p>
        )}
      </aside>

      <p className="intro-credit">Sigrae Derf Gabriel</p>
    </div>
  )
}

export default IntroScreen
