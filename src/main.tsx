import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
      <Toaster 
        position="top-right"
        toastOptions={{
          success: {
            style: {
              background: '#EFFDF5',
              color: '#0F766E',
              border: '1px solid #D1FAE5',
            },
            iconTheme: {
              primary: '#10B981',
              secondary: 'white',
            },
          },
          error: {
            style: {
              background: '#FEF2F2',
              color: '#B91C1C',
              border: '1px solid #FEE2E2',
            },
            iconTheme: {
              primary: '#EF4444',
              secondary: 'white',
            },
          },
          duration: 3000,
          style: {
            background: '#fff',
            color: '#374151',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
            borderRadius: '0.375rem',
            padding: '1rem',
          },
        }}
      />
    </AuthProvider>
  </React.StrictMode>,
)