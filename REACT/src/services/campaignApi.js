const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export async function fetchCampaign(campaignId) {
  return request(`/api/campaigns/${campaignId}`)
}

export async function createCampaign(campaignForm) {
  return request('/api/campaigns', {
    method: 'POST',
    body: JSON.stringify(campaignForm),
  })
}

export async function sendCampaignMessage(campaignId, message) {
  return request(`/api/campaigns/${campaignId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
}

export async function saveInventoryItem(campaignId, inventoryForm, editingInventoryId) {
  const isEditing = Boolean(editingInventoryId)
  const path = isEditing
    ? `/api/campaigns/${campaignId}/inventory/${editingInventoryId}`
    : `/api/campaigns/${campaignId}/inventory`

  return request(path, {
    method: isEditing ? 'PUT' : 'POST',
    body: JSON.stringify({
      ...inventoryForm,
      quantity: Number(inventoryForm.quantity),
    }),
  })
}

export async function deleteInventoryItem(campaignId, itemId) {
  return request(`/api/campaigns/${campaignId}/inventory/${itemId}`, {
    method: 'DELETE',
  })
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })
  const data = await response.json()

  if (!response.ok) {
    const error = new Error(data.error || 'Request failed.')

    if (data.campaign) {
      error.campaign = data.campaign
    }

    throw error
  }

  return data
}
