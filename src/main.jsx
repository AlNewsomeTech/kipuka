import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import '@/components/theme/readabilitySurfaces.css'
import '@/components/theme/readabilityStatus.css'
import '@/components/theme/readabilityText.css'

// App entry point.

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)