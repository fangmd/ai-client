import { Routes, Route } from 'react-router-dom'
import { Home } from './page/home'
import { useConfigStore } from './stores/configStore'
import { useAiProviderStore } from './stores/ai-provider-store'
import { useEffect } from 'react'

function App(): React.JSX.Element {
  const loadConfig = useConfigStore((state) => state.loadConfig)
  const loadProviders = useAiProviderStore((state) => state.loadProviders)

  useEffect(() => {
    loadConfig()
    loadProviders()
  }, [loadConfig, loadProviders])

  return (
    <Routes>
      <Route path="/*" element={<Home />} />
    </Routes>
  )
}

export default App
