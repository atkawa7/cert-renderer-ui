import { StrictMode, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { CssBaseline, ThemeProvider, type PaletteMode } from '@mui/material'
import './index.css'
import App from './App.tsx'
import { ConfirmDialogProvider } from './components/ConfirmDialogProvider'
import { NotificationsProvider } from './components/NotificationsProvider'
import { getAppTheme } from './theme'

const THEME_STORAGE_KEY = 'renderer.ui.themeMode'

function AppRoot() {
  const [themeMode, setThemeMode] = useState<PaletteMode>(() => {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
    return saved === 'dark' ? 'dark' : 'light'
  })

  const theme = useMemo(() => getAppTheme(themeMode), [themeMode])

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode)
  }, [themeMode])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NotificationsProvider>
        <ConfirmDialogProvider>
          <BrowserRouter>
            <App
              themeMode={themeMode}
              onToggleTheme={() => setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'))}
            />
          </BrowserRouter>
        </ConfirmDialogProvider>
      </NotificationsProvider>
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRoot />
  </StrictMode>,
)
