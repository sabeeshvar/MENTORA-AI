import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/common/ProtectedRoute'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { MaterialsPage } from '@/pages/MaterialsPage'
import { StudyPage } from '@/pages/StudyPage'
import { QuizzesPage } from '@/pages/QuizzesPage'
import { MasteryPage } from '@/pages/MasteryPage'
import { SettingsPage } from '@/pages/SettingsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
      {
        path: '/courses',
        element: <MaterialsPage />,
      },
      {
        path: '/materials',
        element: <MaterialsPage />,
      },
      {
        path: '/tutor',
        element: <StudyPage />,
      },
      {
        path: '/study',
        element: <StudyPage />,
      },
      {
        path: '/study/:materialId',
        element: <StudyPage />,
      },
      {
        path: '/quiz',
        element: <QuizzesPage />,
      },
      {
        path: '/quizzes',
        element: <QuizzesPage />,
      },
      {
        path: '/progress',
        element: <MasteryPage />,
      },
      {
        path: '/mastery',
        element: <MasteryPage />,
      },
      {
        path: '/recommendations',
        element: <DashboardPage />,
      },
      {
        path: '/profile',
        element: <SettingsPage />,
      },
      {
        path: '/settings',
        element: <SettingsPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
])
