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
  apiKey: string;
  apiEndpoint: string; // Keeping this for future use
}

const CallfluentTester = ({ apiKey }: CallfluentTesterProps) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const testConnection = async () => {
    if (!apiKey) {
      setResult({
        success: false,
        message: 'API key is required to test the connection'
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await axios.post('/api/callfluent/test');
      
      setResult({
        success: response.data.success,
        message: response.data.message || 'Connection successful'
      });
    } catch (error) {
      console.error('Error testing CallFluent connection:', error);
      
      setResult({
        success: false,
        message: 'Failed to connect to CallFluent API. Please check your API key and endpoint.'
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
        disabled={loading || !apiKey}
        startIcon={loading ? <CircularProgress size={20} /> : null}
      >
        {loading ? 'Testing Connection...' : 'Test CallFluent Connection'}
      </Button>
      
      {result && (
        <Paper sx={{ mt: 2, p: 2 }}>
          <Alert severity={result.success ? 'success' : 'error'}>
            {result.message}
          </Alert>
          {result.success && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Your CallFluent API integration is working correctly. The system will now be able to make automated calls for reservation confirmations and reminders.
            </Typography>
          )}
          {!result.success && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Please check your API key and endpoint URL. Make sure your CallFluent account is active and has sufficient credits for making calls.
            </Typography>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default CallfluentTester;
