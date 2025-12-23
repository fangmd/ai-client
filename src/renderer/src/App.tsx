import { Routes, Route } from 'react-router-dom'
import { Home } from './page/home'
import { useConfigStore } from './stores/configStore'
import { useEffect } from 'react'

function App(): React.JSX.Element {
  const loadConfig = useConfigStore((state) => state.loadConfig)

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  return (
    <Routes>
      <Route path="/*" element={<Home />} />
    </Routes>
  )
}

export default App
