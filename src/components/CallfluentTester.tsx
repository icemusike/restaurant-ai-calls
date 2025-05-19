import { useState } from 'react';
import { 
  Box, 
  Button, 
  CircularProgress, 
  Typography, 
  Alert,
  Paper
} from '@mui/material';
import axios from 'axios';

interface CallfluentTesterProps {
  webhookEndpoint: string;
}

const CallfluentTester = ({ webhookEndpoint }: CallfluentTesterProps) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const testConnection = async () => {
    if (!webhookEndpoint) {
      setResult({
        success: false,
        message: 'Webhook URL is required to test the connection'
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Send a test payload to the webhook
      const response = await axios.post(webhookEndpoint, {
        test: true,
        message: 'This is a test from the Restaurant Reservation System'
      });
      
      setResult({
        success: true,
        message: 'Successfully connected to CallFluent AI webhook'
      });
    } catch (error) {
      console.error('Error testing CallFluent webhook:', error);
      
      setResult({
        success: false,
        message: 'Failed to connect to CallFluent AI webhook. Please check your webhook URL.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Button
        variant="outlined"
        color="primary"
        onClick={testConnection}
        disabled={loading || !webhookEndpoint}
        startIcon={loading ? <CircularProgress size={20} /> : null}
      >
        {loading ? 'Testing Connection...' : 'Test CallFluent Webhook'}
      </Button>
      
      {result && (
        <Paper sx={{ mt: 2, p: 2 }}>
          <Alert severity={result.success ? 'success' : 'error'}>
            {result.message}
          </Alert>
          {result.success && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Your CallFluent AI webhook integration is working correctly. The system will now be able to make automated calls for reservation confirmations and reminders.
            </Typography>
          )}
          {!result.success && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Please check your webhook URL. Make sure your CallFluent account is active and the webhook URL is correctly configured.
            </Typography>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default CallfluentTester;
