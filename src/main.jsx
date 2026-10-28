import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Automatically check for new updates every 60 minutes or whenever the window is refocused
const updateSW = registerSW({
  onNeedRefresh() {
    // When a new build is deployed on Vercel, automatically refresh to load the latest timetable
    updateSW(true)
  },
  onOfflineReady() {
    console.log('App ready to work offline.')
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
