import {
  Backpack,
  Bot,
  BookCopy,
  ChevronsDown,
  Menu,
  Minimize2,
} from 'lucide-react'
import {
  InventoryEditorModal,
  InventoryModal,
} from './feedback'
import CampaignManagerModal from './CampaignManagerModal'
import { formatAiMode, formatAiProvider } from '../utils/campaign'

function SessionScreen({
  campaign,
  campaigns,
  campaignsLoading,
  campaignManagerOpen,
  campaignDeletingId,
  topbarVisible,
  setTopbarVisible,
  chatViewportRef,
  quickChoices,
  loading,
  draft,
  setDraft,
  inventoryOpen,
  inventoryEditorOpen,
  inventoryForm,
  setInventoryForm,
  editingInventoryId,
  inventorySaving,
  onChooseOption,
  onSendMessage,
  onOpenInventory,
  onCloseInventory,
  onBeginInventoryCreate,
  onBeginInventoryEdit,
  onCloseInventoryEditor,
  onSaveInventoryItem,
  onDeleteInventoryItem,
  onOpenCampaignManager,
  onCloseCampaignManager,
  onOpenCampaign,
  onBeginCampaignCreate,
  onBeginCampaignEdit,
  onDeleteCampaign,
  onScrollChatToBottom,
}) {
  return (
    <>
      {!topbarVisible ? (
        <button
          type="button"
          className="floating-action topbar-toggle"
          onClick={() => setTopbarVisible(true)}
          aria-label="Show controls"
          title="Show controls"
        >
          <Menu size={20} />
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
                onClick={() => onScrollChatToBottom('smooth')}
                aria-label="Jump to bottom"
                title="Jump to bottom"
              >
                <ChevronsDown size={18} />
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={onOpenCampaignManager}
                aria-label="Open campaign vault"
                title="Campaign vault"
              >
                <BookCopy size={18} />
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => setTopbarVisible(false)}
                aria-label="Hide top bar"
                title="Hide top bar"
              >
                <Minimize2 size={18} />
              </button>
            </div>
          </header>
        ) : null}

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
                  onClick={() => void onChooseOption(choice)}
                >
                  {choice}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <form className="composer" onSubmit={onSendMessage}>
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

      <div className="ai-indicator" aria-label="Current AI details">
        <button type="button" className="ai-indicator-trigger" aria-label="Current AI">
          <Bot size={18} />
        </button>
        <div className="ai-indicator-tooltip">
          <span className="ai-indicator-label">Current AI</span>
          <strong>{formatAiProvider(campaign)}</strong>
          <span className="ai-indicator-model">{campaign.activeAiModel || 'No active model yet'}</span>
          <span className="ai-indicator-mode">{formatAiMode(campaign)}</span>
        </div>
      </div>

      <button
        type="button"
        className="floating-action inventory-fab"
        onClick={onOpenInventory}
        aria-label="Open inventory"
        title="Inventory"
      >
        <Backpack size={20} />
      </button>

      <InventoryModal
        open={inventoryOpen}
        campaign={campaign}
        inventorySaving={inventorySaving}
        onAddItem={onBeginInventoryCreate}
        onClose={onCloseInventory}
        onEditItem={onBeginInventoryEdit}
        onDeleteItem={onDeleteInventoryItem}
      />

      <InventoryEditorModal
        open={inventoryEditorOpen}
        inventoryForm={inventoryForm}
        setInventoryForm={setInventoryForm}
        editingInventoryId={editingInventoryId}
        inventorySaving={inventorySaving}
        onClose={onCloseInventoryEditor}
        onSubmit={onSaveInventoryItem}
      />

      <CampaignManagerModal
        open={campaignManagerOpen}
        campaign={campaign}
        campaigns={campaigns}
        campaignsLoading={campaignsLoading}
        campaignDeletingId={campaignDeletingId}
        onClose={onCloseCampaignManager}
        onOpenCampaign={onOpenCampaign}
        onBeginCampaignCreate={onBeginCampaignCreate}
        onBeginCampaignEdit={onBeginCampaignEdit}
        onDeleteCampaign={onDeleteCampaign}
      />
    </>
  )
}

export default SessionScreen
