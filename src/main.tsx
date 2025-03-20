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
          duration: 4000,
          className: '',
          style: {
            background: '#fff',
            color: '#333',
            boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem',
            fontWeight: '500',
            maxWidth: '380px',
          },
          success: {
            duration: 5000,
            style: {
              border: '1px solid rgba(34, 197, 94, 0.2)',
              backgroundColor: 'rgba(240, 253, 244, 1)',
              color: '#166534',
            },
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            style: {
              border: '1px solid rgba(239, 68, 68, 0.2)',
              backgroundColor: 'rgba(254, 242, 242, 1)',
              color: '#b91c1c',
            },
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
          loading: {
            style: {
              border: '1px solid rgba(59, 130, 246, 0.2)',
              backgroundColor: 'rgba(239, 246, 255, 1)',
              color: '#1e40af',
            },
            iconTheme: {
              primary: '#3b82f6',
              secondary: '#fff',
            },
          },
        }}
      />
    </AuthProvider>
  </React.StrictMode>,
)