import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Force light theme only — clear any leftover dark preference
document.documentElement.classList.remove('dark')
try {
  localStorage.removeItem('dentacademy-theme')
} catch {
  /* ignore */
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
