import React from 'react'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { LanguageProvider } from '@/context/LanguageContext'
import { router } from '@/routes'

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <LanguageProvider>
        <RouterProvider router={router} />
      </LanguageProvider>
    </AuthProvider>
  )
}

export default App
