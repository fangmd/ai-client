import { Routes, Route } from 'react-router-dom'
import { ChatWindow } from './components/ChatWindow'
import { Home } from './page/home'

function App(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/2" element={<ChatWindow />} />
    </Routes>
  )
}

export default App
