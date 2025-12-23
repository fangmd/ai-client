import { Routes, Route } from 'react-router-dom'
import { ChatWindow } from './components/ChatWindow'
import { Home } from './page/home'
import { ThemeProvider } from './components/theme-provider'

function App(): React.JSX.Element {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/2" element={<ChatWindow />} />
      </Routes>
    </ThemeProvider>
  )
}

export default App
