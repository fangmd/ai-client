import { Routes, Route } from 'react-router-dom'
import { Home } from './page/home'
import { ThemeProvider } from './components/theme-provider'

function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/*" element={<Home />} />
      </Routes>
    </ThemeProvider>
  )
}

export default App
