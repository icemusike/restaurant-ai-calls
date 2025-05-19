import { useState, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Avatar, 
  useMediaQuery, 
  useTheme,
  Divider,
  Switch,
  FormControlLabel,
  Tooltip,
  ListItemButton
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { Link, useLocation } from 'react-router-dom';
import { ThemeContext } from '../contexts/ThemeContext';
import { RestaurantContext } from '../contexts/RestaurantContext';

const drawerWidth = 280;

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { mode, toggleColorMode } = useContext(ThemeContext);
  const { restaurant } = useContext(RestaurantContext);
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box sx={{ 
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: theme.palette.background.paper
    }}>
      <Box sx={{ 
        p: 3, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        flexDirection: 'column',
        backgroundColor: theme.palette.mode === 'light' 
          ? 'rgba(79, 70, 229, 0.03)' 
          : 'rgba(99, 102, 241, 0.08)',
        borderBottom: `1px solid ${theme.palette.divider}`
      }}>
        <Avatar 
          src={restaurant.logo} 
          alt={restaurant.name}
          sx={{ 
            width: 80, 
            height: 80, 
            mb: 2,
            boxShadow: theme.palette.mode === 'light'
              ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              : '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.12)'
          }}
        />
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold', textAlign: 'center' }}>
          {restaurant.name}
        </Typography>
      </Box>
      
      <List sx={{ flexGrow: 0, pt: 2 }}>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/"
            selected={location.pathname === '/'}
            onClick={() => isMobile && setMobileOpen(false)}
            sx={{
              py: 1.5,
              mx: 1,
              borderRadius: 1,
              '&.Mui-selected': {
                backgroundColor: theme.palette.mode === 'light' 
                  ? 'rgba(79, 70, 229, 0.08)' 
                  : 'rgba(99, 102, 241, 0.16)',
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'light' 
                    ? 'rgba(79, 70, 229, 0.12)' 
                    : 'rgba(99, 102, 241, 0.24)',
                },
              },
              '&:hover': {
                backgroundColor: theme.palette.mode === 'light' 
                  ? 'rgba(0, 0, 0, 0.04)' 
                  : 'rgba(255, 255, 255, 0.08)',
              }
            }}
          >
            <ListItemIcon>
              <DashboardIcon color={location.pathname === '/' ? 'primary' : 'inherit'} />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>
        </ListItem>
        
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/settings"
            selected={location.pathname === '/settings'}
            onClick={() => isMobile && setMobileOpen(false)}
            sx={{
              py: 1.5,
              mx: 1,
              borderRadius: 1,
              '&.Mui-selected': {
                backgroundColor: theme.palette.mode === 'light' 
                  ? 'rgba(79, 70, 229, 0.08)' 
                  : 'rgba(99, 102, 241, 0.16)',
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'light' 
                    ? 'rgba(79, 70, 229, 0.12)' 
                    : 'rgba(99, 102, 241, 0.24)',
                },
              },
              '&:hover': {
                backgroundColor: theme.palette.mode === 'light' 
                  ? 'rgba(0, 0, 0, 0.04)' 
                  : 'rgba(255, 255, 255, 0.08)',
              }
            }}
          >
            <ListItemIcon>
              <SettingsIcon color={location.pathname === '/settings' ? 'primary' : 'inherit'} />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItemButton>
        </ListItem>
      </List>
      
      <Divider sx={{ my: 2 }} />
      
      <Box sx={{ px: 3, py: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={mode === 'dark'}
              onChange={toggleColorMode}
              icon={<LightModeIcon sx={{ color: theme.palette.mode === 'light' ? '#f59e0b' : undefined }} />}
              checkedIcon={<DarkModeIcon sx={{ color: theme.palette.mode === 'dark' ? '#fbbf24' : undefined }} />}
            />
          }
          label={mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
        />
      </Box>
      
      <Box sx={{ flexGrow: 1 }} />
      
      <Divider />
      
      <Box sx={{ p: 3, backgroundColor: theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.02)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
          <PhoneIcon fontSize="small" sx={{ color: theme.palette.text.secondary, mr: 1.5 }} />
          <Typography variant="body2" color="text.secondary">
            {restaurant.phone}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
          <LocationOnIcon fontSize="small" sx={{ color: theme.palette.text.secondary, mr: 1.5 }} />
          <Typography variant="body2" color="text.secondary">
            {restaurant.address}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <AccessTimeIcon fontSize="small" sx={{ color: theme.palette.text.secondary, mr: 1.5 }} />
          <Typography variant="body2" color="text.secondary">
            {restaurant.openingHours}
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: theme.palette.mode === 'light' ? theme.palette.primary.main : theme.palette.background.paper,
          color: theme.palette.mode === 'light' ? theme.palette.primary.contrastText : theme.palette.text.primary,
          boxShadow: theme.palette.mode === 'light' 
            ? '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
            : '0 1px 3px 0 rgba(0, 0, 0, 0.2), 0 1px 2px 0 rgba(0, 0, 0, 0.12)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Restaurant Reservation System
          </Typography>
          
          {/* Show theme toggle in app bar on mobile */}
          {isMobile && (
            <Box sx={{ ml: 'auto' }}>
              <Tooltip title={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
                <IconButton color="inherit" onClick={toggleColorMode} edge="end">
                  {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: `1px solid ${theme.palette.divider}`,
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
          backgroundColor: theme.palette.background.default,
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
