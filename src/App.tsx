import { useState, useEffect, useMemo } from 'react'
import { Routes, Route } from 'react-router-dom'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { Box, useMediaQuery, ThemeProvider, createTheme, PaletteMode } from '@mui/material'
import CssBaseline from '@mui/material/CssBaseline'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import Layout from './components/Layout'
import { ThemeContext } from './contexts/ThemeContext'
import { RestaurantContext } from './contexts/RestaurantContext'
import { Restaurant } from './types'

// Define theme colors
const getDesignTokens = (mode: PaletteMode) => ({
  palette: {
    mode,
    primary: {
      main: mode === 'light' ? '#4f46e5' : '#6366f1',
      light: mode === 'light' ? '#6366f1' : '#818cf8',
      dark: mode === 'light' ? '#4338ca' : '#4f46e5',
      contrastText: '#ffffff',
    },
    secondary: {
      main: mode === 'light' ? '#10b981' : '#34d399',
      light: mode === 'light' ? '#34d399' : '#6ee7b7',
      dark: mode === 'light' ? '#059669' : '#10b981',
      contrastText: '#ffffff',
    },
    background: {
      default: mode === 'light' ? '#f9fafb' : '#121212',
      paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
    },
    text: {
      primary: mode === 'light' ? '#111827' : '#f3f4f6',
      secondary: mode === 'light' ? '#4b5563' : '#9ca3af',
    },
    error: {
      main: mode === 'light' ? '#ef4444' : '#f87171',
    },
    warning: {
      main: mode === 'light' ? '#f59e0b' : '#fbbf24',
    },
    info: {
      main: mode === 'light' ? '#3b82f6' : '#60a5fa',
    },
    success: {
      main: mode === 'light' ? '#10b981' : '#34d399',
    },
    divider: mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)',
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: mode === 'light' 
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            : '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.12)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          width: 42,
          height: 26,
          padding: 0,
          '& .MuiSwitch-switchBase': {
            padding: 0,
            margin: 2,
            transitionDuration: '300ms',
            '&.Mui-checked': {
              transform: 'translateX(16px)',
              color: '#fff',
              '& + .MuiSwitch-track': {
                backgroundColor: mode === 'dark' ? '#6366f1' : '#4f46e5',
                opacity: 1,
                border: 0,
              },
              '&.Mui-disabled + .MuiSwitch-track': {
                opacity: 0.5,
              },
            },
            '&.Mui-focusVisible .MuiSwitch-thumb': {
              color: '#6366f1',
              border: '6px solid #fff',
            },
            '&.Mui-disabled .MuiSwitch-thumb': {
              color: mode === 'light' ? '#f3f4f6' : '#303030',
            },
            '&.Mui-disabled + .MuiSwitch-track': {
              opacity: mode === 'light' ? 0.7 : 0.3,
            },
          },
          '& .MuiSwitch-thumb': {
            boxSizing: 'border-box',
            width: 22,
            height: 22,
          },
          '& .MuiSwitch-track': {
            borderRadius: 26 / 2,
            backgroundColor: mode === 'light' ? '#e9e9ea' : '#39393D',
            opacity: 1,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: mode === 'light' 
            ? '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
            : '0 1px 3px 0 rgba(0, 0, 0, 0.2), 0 1px 2px 0 rgba(0, 0, 0, 0.12)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: mode === 'light' ? '#ffffff' : '#1e1e1e',
          borderRight: `1px solid ${mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)'}`,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
  },
});

function App() {
  // Check if user prefers dark mode
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  
  // Try to load mode from localStorage, or use system preference
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    const savedMode = localStorage.getItem('themeMode');
    return (savedMode === 'light' || savedMode === 'dark') 
      ? savedMode 
      : prefersDarkMode ? 'dark' : 'light';
  });
  
  const [restaurant, setRestaurant] = useState<Restaurant>({
    name: 'Bella Cucina',
    logo: '/restaurant-logo.png',
    phone: '+1 (555) 123-4567',
    address: '123 Main St, Anytown, USA',
    openingHours: '11:00 AM - 10:00 PM',
  });
  
  // Create theme based on current mode
  const theme = useMemo(() => createTheme(getDesignTokens(mode)), [mode]);

  // Toggle between light and dark mode
  const toggleColorMode = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem('themeMode', newMode);
  };

  // Update mode if system preference changes
  useEffect(() => {
    const savedMode = localStorage.getItem('themeMode');
    if (!savedMode) {
      setMode(prefersDarkMode ? 'dark' : 'light');
    }
  }, [prefersDarkMode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleColorMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <RestaurantContext.Provider value={{ restaurant, setRestaurant }}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ display: 'flex', minHeight: '100vh' }}>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
              </Routes>
            </Box>
          </LocalizationProvider>
        </RestaurantContext.Provider>
      </ThemeProvider>
    </ThemeContext.Provider>
  )
}

export default App
