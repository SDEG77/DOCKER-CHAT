import { Pencil, Plus, Trash2 } from 'lucide-react'
import { formatRelativeCampaignActivity } from '../utils/campaign'

function CampaignManagerModal({
  open,
  campaign,
  campaigns,
  campaignsLoading,
  campaignDeletingId,
  onClose,
  onOpenCampaign,
  onBeginCampaignCreate,
  onBeginCampaignEdit,
  onDeleteCampaign,
}) {
  if (!open) {
    return null
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal-panel campaign-manager-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="inventory-header">
          <div>
            <p className="choice-label">Campaign vault</p>
            <h3>Switch or manage sessions</h3>
          </div>
          <div className="inventory-toolbar">
            <button type="button" className="primary" onClick={onBeginCampaignCreate}>
              <Plus size={16} />
              New campaign
            </button>
            <button type="button" className="ghost inventory-close" onClick={onClose}>
              Close
            </button>
          </div>
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
            No saved campaigns yet. Start one from the intro screen.
          </p>
        )}
      </section>
    </div>
  )
}

export default CampaignManagerModal
