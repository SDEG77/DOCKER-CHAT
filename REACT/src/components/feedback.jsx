import { Eye, TriangleAlert, X } from 'lucide-react'

export function Toast({ toast, onClose, onViewError }) {
  if (!toast) {
    return null
  }

  return (
    <div className="toast">
      <div className="toast-icon">
        <TriangleAlert size={18} />
      </div>
      <div className="toast-copy">
        <strong>Request failed</strong>
        <p title={toast.summary}>{toast.summary}</p>
      </div>
      <div className="toast-actions">
        <button type="button" className="ghost toast-button" onClick={onViewError}>
          <Eye size={16} />
          View error
        </button>
        <button
          type="button"
          className="ghost toast-icon-button"
          onClick={onClose}
          aria-label="Close toast"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

export function ErrorViewer({ open, detail, onClose }) {
  if (!open || !detail) {
    return null
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-panel error-viewer" onClick={(event) => event.stopPropagation()}>
        <div className="inventory-header">
          <div>
            <p className="choice-label">Error details</p>
            <h3>Full provider response</h3>
          </div>
          <button type="button" className="ghost inventory-close" onClick={onClose}>
            Close
          </button>
        </div>
        <pre className="error-detail">{detail}</pre>
      </section>
    </div>
  )
}

export function AiInfoModal({ open, onClose }) {
  if (!open) {
    return null
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-panel ai-info-modal" onClick={(event) => event.stopPropagation()}>
        <div className="inventory-header">
          <div>
            <p className="choice-label">Available AI providers</p>
            <h3>Providers used by this project</h3>
          </div>
          <button type="button" className="ghost inventory-close" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="ai-provider-grid">
          <article className="ai-provider-card">
            <p className="choice-label">Primary</p>
            <h4>Gemini</h4>
            <p className="ai-provider-model">Default model: `gemini-2.5-flash`</p>
            <p className="ai-provider-copy">
              Used as the first-choice Dungeon Master model before any fallback provider is tried.
            </p>
          </article>

          <article className="ai-provider-card">
            <p className="choice-label">Fallback</p>
            <h4>Groq</h4>
            <p className="ai-provider-model">Primary Groq model: `llama-3.3-70b-versatile`</p>
            <p className="ai-provider-copy">
              Can also rotate through backup Groq models like `openai/gpt-oss-20b`,
              `llama-3.1-8b-instant`, and `openai/gpt-oss-120b`.
            </p>
          </article>
        </div>
      </section>
    </div>
  )
}

export function InventoryModal({
  open,
  campaign,
  inventorySaving,
  onAddItem,
  onClose,
  onEditItem,
  onDeleteItem,
}) {
  if (!open) {
    return null
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-panel inventory-modal" onClick={(event) => event.stopPropagation()}>
        <div className="inventory-header">
          <div>
            <p className="choice-label">Inventory</p>
            <h3>Current carried gear</h3>
          </div>
          <div className="inventory-toolbar">
            <button
              type="button"
              className="primary"
              onClick={onAddItem}
              disabled={inventorySaving}
            >
              Add new item
            </button>
            <button type="button" className="ghost inventory-close" onClick={onClose}>
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
                    onClick={() => onEditItem(item)}
                    disabled={inventorySaving}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="ghost inventory-action danger"
                    onClick={() => void onDeleteItem(item._id)}
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
  )
}

export function InventoryEditorModal({
  open,
  inventoryForm,
  setInventoryForm,
  editingInventoryId,
  inventorySaving,
  onClose,
  onSubmit,
}) {
  if (!open) {
    return null
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal-panel inventory-editor-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="inventory-header">
          <div>
            <p className="choice-label">Inventory editor</p>
            <h3>{editingInventoryId ? 'Edit item' : 'Add item'}</h3>
          </div>
          <button type="button" className="ghost inventory-close" onClick={onClose}>
            Close
          </button>
        </div>

        <form className="inventory-form" onSubmit={onSubmit}>
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
                  setInventoryForm((current) => ({
                    ...current,
                    quantity: event.target.value,
                  }))
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
              {inventorySaving ? 'Saving...' : editingInventoryId ? 'Update item' : 'Add item'}
            </button>
            <button type="button" className="ghost" onClick={onClose} disabled={inventorySaving}>
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
