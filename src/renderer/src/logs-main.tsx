import React from 'react'
import ReactDOM from 'react-dom/client'
import { LogViewer } from './components/logs/LogViewer'
import './styles/logs.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LogViewer />
  </React.StrictMode>
)
