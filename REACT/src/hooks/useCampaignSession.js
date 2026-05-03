import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createCampaign as createCampaignRequest,
  deleteCampaign as deleteCampaignRequest,
  deleteInventoryItem as deleteInventoryItemRequest,
  fetchCampaign,
  fetchCampaigns,
  saveInventoryItem as saveInventoryItemRequest,
  sendCampaignMessage,
  updateCampaign as updateCampaignRequest,
} from '../services/campaignApi'
import {
  createEmptyInventoryForm,
  defaultCampaignForm,
  extractChoices,
} from '../utils/campaign'

const STORAGE_KEY = 'dnd-dm-active-campaign'

export function useCampaignSession() {
  const [campaignForm, setCampaignForm] = useState(defaultCampaignForm)
  const [campaigns, setCampaigns] = useState([])
  const [campaign, setCampaign] = useState(null)
  const [editingCampaignId, setEditingCampaignId] = useState(null)
  const [campaignManagerOpen, setCampaignManagerOpen] = useState(false)
  const [aiInfoOpen, setAiInfoOpen] = useState(false)
  const [topbarVisible, setTopbarVisible] = useState(true)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [inventoryEditorOpen, setInventoryEditorOpen] = useState(false)
  const [inventoryForm, setInventoryForm] = useState(createEmptyInventoryForm())
  const [editingInventoryId, setEditingInventoryId] = useState(null)
  const [inventorySaving, setInventorySaving] = useState(false)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [campaignsLoading, setCampaignsLoading] = useState(false)
  const [campaignSaving, setCampaignSaving] = useState(false)
  const [campaignDeletingId, setCampaignDeletingId] = useState(null)
  const [toast, setToast] = useState(null)
  const [errorDetail, setErrorDetail] = useState('')
  const [errorViewerOpen, setErrorViewerOpen] = useState(false)
  const chatViewportRef = useRef(null)

  useEffect(() => {
    void refreshCampaigns()
    const campaignId = window.localStorage.getItem(STORAGE_KEY)

    if (campaignId) {
      void loadCampaign(campaignId)
    }
  }, [])

  useEffect(() => {
    if (!chatViewportRef.current || !campaign?.messages?.length) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      scrollChatToBottom('auto')
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

  async function refreshCampaigns() {
    setCampaignsLoading(true)

    try {
      const data = await fetchCampaigns()
      setCampaigns(data.campaigns)
    } catch (err) {
      showError(err)
    } finally {
      setCampaignsLoading(false)
    }
  }

  async function loadCampaign(campaignId) {
    setLoading(true)

    try {
      const data = await fetchCampaign(campaignId)
      setCampaign(data.campaign)
      window.localStorage.setItem(STORAGE_KEY, data.campaign._id)
      setTopbarVisible(true)
      setDraft('')
    } catch (err) {
      window.localStorage.removeItem(STORAGE_KEY)
      setCampaign(null)
      showError(err)
    } finally {
      setLoading(false)
    }
  }

  async function saveCampaign(event) {
    event.preventDefault()
    setCampaignSaving(true)

    try {
      const data = editingCampaignId
        ? await updateCampaignRequest(editingCampaignId, campaignForm)
        : await createCampaignRequest(campaignForm)

      setCampaign(data.campaign)
      setEditingCampaignId(null)
      setCampaignManagerOpen(false)
      window.localStorage.setItem(STORAGE_KEY, data.campaign._id)
      setDraft('')
      await refreshCampaigns()
    } catch (err) {
      showError(err)
    } finally {
      setCampaignSaving(false)
    }
  }

  async function openCampaign(campaignId) {
    setCampaignManagerOpen(false)
    await loadCampaign(campaignId)
  }

  function beginCampaignCreate() {
    setEditingCampaignId(null)
    setCampaignForm(defaultCampaignForm)
    setCampaignManagerOpen(false)
    setCampaign(null)
    setDraft('')
    setInventoryOpen(false)
    closeInventoryEditor()
    window.localStorage.removeItem(STORAGE_KEY)
  }

  function beginCampaignEdit(campaignSummary) {
    setEditingCampaignId(campaignSummary._id)
    setCampaignForm({
      title: campaignSummary.title || '',
      playerName: campaignSummary.playerName || '',
      characterName: campaignSummary.characterName || '',
      campaignIdea: campaignSummary.campaignIdea || '',
      tone: campaignSummary.tone || '',
      playStyle: campaignSummary.playStyle || '',
    })
    setCampaignManagerOpen(false)
    setCampaign(null)
  }

  async function deleteCampaign(campaignId) {
    setCampaignDeletingId(campaignId)

    try {
      await deleteCampaignRequest(campaignId)
      const updatedCampaigns = campaigns.filter((entry) => entry._id !== campaignId)
      setCampaigns(updatedCampaigns)

      if (campaign?._id === campaignId) {
        const nextCampaignId = updatedCampaigns[0]?._id || null

        if (nextCampaignId) {
          await loadCampaign(nextCampaignId)
        } else {
          window.localStorage.removeItem(STORAGE_KEY)
          setCampaign(null)
          setDraft('')
        }
      }

      if (editingCampaignId === campaignId) {
        setEditingCampaignId(null)
        setCampaignForm(defaultCampaignForm)
      }
    } catch (err) {
      showError(err)
    } finally {
      setCampaignDeletingId(null)
    }
  }

  async function sendMessage(event) {
    event.preventDefault()
    await submitCampaignMessage(draft)
  }

  async function chooseOption(choice) {
    setDraft(choice)
    await submitCampaignMessage(choice)
  }

  async function submitCampaignMessage(message) {
    if (!campaign?._id || !message.trim()) {
      return
    }

    setLoading(true)

    try {
      const data = await sendCampaignMessage(campaign._id, message)
      setCampaign(data.campaign)
      setDraft('')
      await refreshCampaigns()
    } catch (err) {
      if (err.campaign) {
        setCampaign(err.campaign)
        await refreshCampaigns()
      }

      showError(err)
    } finally {
      setLoading(false)
    }
  }

  async function saveInventoryItem(event) {
    event.preventDefault()

    if (!campaign?._id || !inventoryForm.name.trim()) {
      return
    }

    setInventorySaving(true)

    try {
      const data = await saveInventoryItemRequest(campaign._id, inventoryForm, editingInventoryId)
      setCampaign(data.campaign)
      closeInventoryEditor()
      await refreshCampaigns()
    } catch (err) {
      showError(err)
    } finally {
      setInventorySaving(false)
    }
  }

  async function deleteInventoryItem(itemId) {
    if (!campaign?._id) {
      return
    }

    setInventorySaving(true)

    try {
      const data = await deleteInventoryItemRequest(campaign._id, itemId)
      setCampaign(data.campaign)

      if (editingInventoryId === itemId) {
        closeInventoryEditor()
      }

      await refreshCampaigns()
    } catch (err) {
      showError(err)
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

  function scrollChatToBottom(behavior = 'smooth') {
    if (chatViewportRef.current) {
      chatViewportRef.current.scrollTo({
        top: chatViewportRef.current.scrollHeight,
        behavior,
      })
    }

    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior,
    })
  }

  function showError(errorLike) {
    const detail =
      errorLike instanceof Error ? errorLike.message : String(errorLike || 'Unknown error')
    const summary = detail.split('\n')[0].trim() || 'Something went wrong.'

    setErrorDetail(detail)
    setToast({
      summary,
      detail,
    })
  }

  function dismissToast() {
    setToast(null)
  }

  function openErrorViewer() {
    setErrorViewerOpen(true)
  }

  function closeErrorViewer() {
    setErrorViewerOpen(false)
  }

  function openCampaignManager() {
    setCampaignManagerOpen(true)
  }

  function closeCampaignManager() {
    setCampaignManagerOpen(false)
  }

  function cancelCampaignForm() {
    setEditingCampaignId(null)
    setCampaignForm(defaultCampaignForm)

    const activeCampaignId = window.localStorage.getItem(STORAGE_KEY)

    if (activeCampaignId) {
      void loadCampaign(activeCampaignId)
    }
  }

  return {
    campaign,
    campaigns,
    campaignsLoading,
    campaignForm,
    setCampaignForm,
    editingCampaignId,
    campaignManagerOpen,
    campaignSaving,
    campaignDeletingId,
    aiInfoOpen,
    setAiInfoOpen,
    topbarVisible,
    setTopbarVisible,
    inventoryOpen,
    inventoryEditorOpen,
    inventoryForm,
    setInventoryForm,
    editingInventoryId,
    inventorySaving,
    draft,
    setDraft,
    loading,
    toast,
    errorDetail,
    errorViewerOpen,
    chatViewportRef,
    quickChoices,
    saveCampaign,
    openCampaign,
    beginCampaignCreate,
    beginCampaignEdit,
    deleteCampaign,
    sendMessage,
    chooseOption,
    saveInventoryItem,
    deleteInventoryItem,
    openInventoryModal,
    closeInventoryModal,
    beginInventoryCreate,
    beginInventoryEdit,
    closeInventoryEditor,
    dismissToast,
    openErrorViewer,
    closeErrorViewer,
    openCampaignManager,
    closeCampaignManager,
    cancelCampaignForm,
    refreshCampaigns,
    scrollChatToBottom,
  }
}
