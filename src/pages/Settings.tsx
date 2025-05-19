import { useState, useContext, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  TextField, 
  Button, 
  Grid, 
  Divider,
  Alert,
  Snackbar,
  Switch,
  FormControlLabel,
  InputAdornment,
  IconButton
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { RestaurantContext } from '../contexts/RestaurantContext';
import { ThemeContext } from '../contexts/ThemeContext';
import CallfluentTester from '../components/CallfluentTester';

const Settings = () => {
  const { restaurant, setRestaurant } = useContext(RestaurantContext);
  const { mode, toggleColorMode } = useContext(ThemeContext);
  
  const [formData, setFormData] = useState({
    name: restaurant.name,
    logo: restaurant.logo,
    phone: restaurant.phone,
    address: restaurant.address,
    openingHours: restaurant.openingHours,
  });
  
  const webhookUrl = window.location.origin + '/api/webhook/callfluent';
  const [callfluentSettings, setCallfluentSettings] = useState({
    webhookEndpoint: '',
    callbackNumber: '',
    autoCallEnabled: false
  });
  
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [twilioSettings, setTwilioSettings] = useState({
    accountSid: '',
    authToken: '',
    phoneNumber: '',
  });
  
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  // Load CallFluent settings from localStorage on component mount
  useEffect(() => {
    const savedCallfluentSettings = localStorage.getItem('callfluentSettings');
    if (savedCallfluentSettings) {
      setCallfluentSettings(JSON.parse(savedCallfluentSettings));
    }
  }, []);

  const handleRestaurantChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleCallfluentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCallfluentSettings({
      ...callfluentSettings,
      [name]: value,
    });
  };

  const handleCallfluentToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCallfluentSettings({
      ...callfluentSettings,
      autoCallEnabled: e.target.checked,
    });
  };

  const handleTwilioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTwilioSettings({
      ...twilioSettings,
      [name]: value,
    });
  };

  const handleSaveRestaurant = () => {
    setRestaurant(formData);
    showSnackbar('Restaurant information saved successfully', 'success');
  };

  const handleSaveCallfluentSettings = () => {
    // Save to localStorage for persistence
    localStorage.setItem('callfluentSettings', JSON.stringify(callfluentSettings));
    
    // In a real app, you might also want to save to a backend
    showSnackbar('CallFluent AI settings saved successfully', 'success');
  };

  const handleSaveTwilio = () => {
    // In a real app, this would save to backend/env variables
    showSnackbar('Twilio settings saved successfully', 'success');
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    showSnackbar('Webhook URL copied to clipboard', 'success');
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false,
    });
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        Settings
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Restaurant Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    name="name"
                    label="Restaurant Name"
                    fullWidth
                    value={formData.name}
                    onChange={handleRestaurantChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    name="logo"
                    label="Logo URL"
                    fullWidth
                    value={formData.logo}
                    onChange={handleRestaurantChange}
                    helperText="Enter a URL to your restaurant logo"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    name="phone"
                    label="Phone Number"
                    fullWidth
                    value={formData.phone}
                    onChange={handleRestaurantChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    name="address"
                    label="Address"
                    fullWidth
                    value={formData.address}
                    onChange={handleRestaurantChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    name="openingHours"
                    label="Opening Hours"
                    fullWidth
                    value={formData.openingHours}
                    onChange={handleRestaurantChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button 
                    variant="contained" 
                    color="primary"
                    onClick={handleSaveRestaurant}
                  >
                    Save Restaurant Info
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                CallFluent AI Integration
              </Typography>
              
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Incoming Webhook
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Use this webhook URL in your CallFluent AI dashboard to receive reservation data from phone calls.
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                value={webhookUrl}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleCopyWebhook} edge="end">
                        <ContentCopyIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3, backgroundColor: 'action.hover' }}
              />
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Outgoing API Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Configure CallFluent AI webhook to automatically make calls when new reservations are added.
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    name="webhookEndpoint"
                    label="CallFluent Webhook URL"
                    fullWidth
                    value={callfluentSettings.webhookEndpoint}
                    onChange={handleCallfluentChange}
                    helperText="Enter the webhook URL provided by CallFluent AI"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    name="callbackNumber"
                    label="Callback Phone Number"
                    fullWidth
                    value={callfluentSettings.callbackNumber}
                    onChange={handleCallfluentChange}
                    helperText="Phone number to call back customers from"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={callfluentSettings.autoCallEnabled}
                        onChange={handleCallfluentToggle}
                        color="primary"
                      />
                    }
                    label="Enable automatic calls for reservation confirmations"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button 
                    variant="contained" 
                    color="primary"
                    onClick={handleSaveCallfluentSettings}
                  >
                    Save CallFluent Settings
                  </Button>
                </Grid>
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <CallfluentTester 
                    webhookEndpoint={callfluentSettings.webhookEndpoint}
                  />
                </Grid>
              </Grid>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                When enabled, the system will automatically trigger calls to confirm reservations and send reminders.
              </Alert>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                SMS Notifications
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={smsEnabled}
                    onChange={(e) => setSmsEnabled(e.target.checked)}
                    color="primary"
                  />
                }
                label="Enable SMS notifications for new reservations"
              />
              
              {smsEnabled && (
                <Box sx={{ mt: 2 }}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>
                    Twilio Configuration
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        name="accountSid"
                        label="Account SID"
                        fullWidth
                        value={twilioSettings.accountSid}
                        onChange={handleTwilioChange}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        name="authToken"
                        label="Auth Token"
                        fullWidth
                        type="password"
                        value={twilioSettings.authToken}
                        onChange={handleTwilioChange}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        name="phoneNumber"
                        label="Twilio Phone Number"
                        fullWidth
                        value={twilioSettings.phoneNumber}
                        onChange={handleTwilioChange}
                        helperText="Format: +1XXXXXXXXXX"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button 
                        variant="contained" 
                        color="primary"
                        onClick={handleSaveTwilio}
                      >
                        Save Twilio Settings
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Appearance
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={mode === 'dark'}
                    onChange={toggleColorMode}
                    color="primary"
                  />
                }
                label={`${mode === 'dark' ? 'Dark' : 'Light'} Mode`}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Choose between light and dark mode for the application interface.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Settings;
