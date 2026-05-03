import './App.css'
import IntroScreen from './components/IntroScreen'
import SessionScreen from './components/SessionScreen'
import {
  AiInfoModal,
  ErrorViewer,
  Toast,
} from './components/feedback'
import { useCampaignSession } from './hooks/useCampaignSession'

function App() {
  const {
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
  } = useCampaignSession()

  if (!campaign) {
    return (
      <div className="intro-shell">
        <IntroScreen
          aiInfoOpen={aiInfoOpen}
          campaignForm={campaignForm}
          bootingCampaign={bootingCampaign}
          onCreateCampaign={createCampaign}
          onCampaignFormChange={setCampaignForm}
          onOpenAiInfo={() => setAiInfoOpen(true)}
        />

        <AiInfoModal open={aiInfoOpen} onClose={() => setAiInfoOpen(false)} />
        <Toast toast={toast} onClose={dismissToast} onViewError={openErrorViewer} />
        <ErrorViewer
          open={errorViewerOpen}
          detail={errorDetail}
          onClose={closeErrorViewer}
        />
      </div>
    )
  }

  return (
    <div className="session-shell">
      <SessionScreen
        campaign={campaign}
        topbarVisible={topbarVisible}
        setTopbarVisible={setTopbarVisible}
        chatViewportRef={chatViewportRef}
        quickChoices={quickChoices}
        loading={loading}
        draft={draft}
        setDraft={setDraft}
        inventoryOpen={inventoryOpen}
        inventoryEditorOpen={inventoryEditorOpen}
        inventoryForm={inventoryForm}
        setInventoryForm={setInventoryForm}
        editingInventoryId={editingInventoryId}
        inventorySaving={inventorySaving}
        onChooseOption={chooseOption}
        onSendMessage={sendMessage}
        onOpenInventory={openInventoryModal}
        onCloseInventory={closeInventoryModal}
        onBeginInventoryCreate={beginInventoryCreate}
        onBeginInventoryEdit={beginInventoryEdit}
        onCloseInventoryEditor={closeInventoryEditor}
        onSaveInventoryItem={saveInventoryItem}
        onDeleteInventoryItem={deleteInventoryItem}
        onScrollChatToBottom={scrollChatToBottom}
        onStartFreshCampaign={startFreshCampaign}
      />

      <Toast toast={toast} onClose={dismissToast} onViewError={openErrorViewer} />
      <ErrorViewer open={errorViewerOpen} detail={errorDetail} onClose={closeErrorViewer} />
    </div>
  )
}

export default App
