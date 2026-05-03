function IntroScreen({
  aiInfoOpen,
  campaignForm,
  bootingCampaign,
  onCreateCampaign,
  onCampaignFormChange,
  onOpenAiInfo,
}) {
  return (
    <div className="intro-layout">
      <div className="intro-actions">
        <button type="button" className="ghost" onClick={onOpenAiInfo} aria-pressed={aiInfoOpen}>
          View AIs
        </button>
      </div>

      <section className="intro-panel">
        <p className="eyebrow">AI Dungeon Master</p>
        <h1>Start a campaign worth remembering.</h1>
        <p className="lede">
          Spin up a solo D&amp;D adventure with a persistent AI Dungeon Master
          and a cleaner tabletop-style interface.
        </p>

        <form className="campaign-form" onSubmit={onCreateCampaign}>
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

          <button type="submit" className="primary" disabled={bootingCampaign}>
            {bootingCampaign ? 'Summoning the campaign...' : 'Start campaign'}
          </button>
        </form>
      </section>

      <p className="intro-credit">Sigrae Derf Gabriel</p>
    </div>
  )
}

export default IntroScreen
