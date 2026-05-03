import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createCampaign as createCampaignRequest,
  deleteInventoryItem as deleteInventoryItemRequest,
  fetchCampaign,
  saveInventoryItem as saveInventoryItemRequest,
  sendCampaignMessage,
} from '../services/campaignApi'
import {
  createEmptyInventoryForm,
  defaultCampaignForm,
  extractChoices,
} from '../utils/campaign'

const STORAGE_KEY = 'dnd-dm-active-campaign'

export function useCampaignSession() {
  const [campaignForm, setCampaignForm] = useState(defaultCampaignForm)
  const [campaign, setCampaign] = useState(null)
  const [aiInfoOpen, setAiInfoOpen] = useState(false)
  const [topbarVisible, setTopbarVisible] = useState(true)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [inventoryEditorOpen, setInventoryEditorOpen] = useState(false)
  const [inventoryForm, setInventoryForm] = useState(createEmptyInventoryForm())
  const [editingInventoryId, setEditingInventoryId] = useState(null)
  const [inventorySaving, setInventorySaving] = useState(false)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [bootingCampaign, setBootingCampaign] = useState(false)
  const [toast, setToast] = useState(null)
  const [errorDetail, setErrorDetail] = useState('')
  const [errorViewerOpen, setErrorViewerOpen] = useState(false)
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

  async function loadCampaign(campaignId) {
    setLoading(true)

    try {
      const data = await fetchCampaign(campaignId)
      setCampaign(data.campaign)
    } catch (err) {
      window.localStorage.removeItem(STORAGE_KEY)
      showError(err)
    } finally {
      setLoading(false)
    }
  }

  async function createCampaign(event) {
    event.preventDefault()
    setBootingCampaign(true)

    try {
      const data = await createCampaignRequest(campaignForm)
      setCampaign(data.campaign)
      window.localStorage.setItem(STORAGE_KEY, data.campaign._id)
      setDraft('')
    } catch (err) {
      showError(err)
    } finally {
      setBootingCampaign(false)
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
    } catch (err) {
      if (err.campaign) {
        setCampaign(err.campaign)
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

  function startFreshCampaign() {
    window.localStorage.removeItem(STORAGE_KEY)
    setCampaign(null)
    setTopbarVisible(true)
    setInventoryOpen(false)
    closeInventoryEditor()
    setDraft('')
    dismissToast()
  }

  return {
    campaign,
    campaignForm,
    setCampaignForm,
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
    bootingCampaign,
    toast,
    errorDetail,
    errorViewerOpen,
    chatViewportRef,
    quickChoices,
    createCampaign,
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
    scrollChatToBottom,
    startFreshCampaign,
  }
}
