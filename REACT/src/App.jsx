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
    scrollChatToBottom,
  } = useCampaignSession()

  if (!campaign) {
    return (
      <div className="intro-shell">
        <IntroScreen
          aiInfoOpen={aiInfoOpen}
          campaign={campaign}
          campaigns={campaigns}
          campaignsLoading={campaignsLoading}
          campaignForm={campaignForm}
          editingCampaignId={editingCampaignId}
          campaignSaving={campaignSaving}
          campaignDeletingId={campaignDeletingId}
          onSaveCampaign={saveCampaign}
          onCampaignFormChange={setCampaignForm}
          onOpenAiInfo={() => setAiInfoOpen(true)}
          onOpenCampaign={openCampaign}
          onBeginCampaignCreate={beginCampaignCreate}
          onBeginCampaignEdit={beginCampaignEdit}
          onDeleteCampaign={deleteCampaign}
          onCancelCampaignForm={cancelCampaignForm}
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
        campaigns={campaigns}
        campaignsLoading={campaignsLoading}
        campaignManagerOpen={campaignManagerOpen}
        campaignDeletingId={campaignDeletingId}
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
        onOpenCampaignManager={openCampaignManager}
        onCloseCampaignManager={closeCampaignManager}
        onOpenCampaign={openCampaign}
        onBeginCampaignCreate={beginCampaignCreate}
        onBeginCampaignEdit={beginCampaignEdit}
        onDeleteCampaign={deleteCampaign}
        onScrollChatToBottom={scrollChatToBottom}
      />

      <Toast toast={toast} onClose={dismissToast} onViewError={openErrorViewer} />
      <ErrorViewer open={errorViewerOpen} detail={errorDetail} onClose={closeErrorViewer} />
    </div>
  )
}

export default App
