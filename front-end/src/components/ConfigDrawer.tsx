interface Props {
  open: boolean
  apiBase: string
  apiKey: string
  onApiBaseChange: (v: string) => void
  onApiKeyChange: (v: string) => void
}

export function ConfigDrawer({
  open,
  apiBase,
  apiKey,
  onApiBaseChange,
  onApiKeyChange,
}: Props) {
  return (
    <div className={`config-drawer ${open ? 'open' : ''}`}>
      <div className="config-inner">
        <div className="config-field">
          <label htmlFor="cfg-base">API Base URL</label>
          <input
            id="cfg-base"
            className="config-input"
            type="url"
            value={apiBase}
            onChange={(e) => onApiBaseChange(e.target.value)}
            placeholder="http://localhost:8000"
            spellCheck={false}
          />
        </div>
        <div className="config-field">
          <label htmlFor="cfg-key">API Key</label>
          <input
            id="cfg-key"
            className="config-input"
            type="password"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder="X-API-Key value"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  )
}
