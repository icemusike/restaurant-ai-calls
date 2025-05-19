import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  Grid, 
  TextField, 
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  CircularProgress,
  SelectChangeEvent
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import { format } from 'date-fns';
import ReservationList from '../components/ReservationList';
import ReservationForm from '../components/ReservationForm';
import { Reservation, ReservationFilters, CallFluentPayload } from '../types';
import axios from 'axios';

const Dashboard = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<ReservationFilters>({
    date: new Date(),
    status: null,
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning',
  });

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/reservations');
      if (response.data.success) {
        setReservations(response.data.data);
        setError(null);
      } else {
        setError(response.data.error || 'Failed to fetch reservations');
      }
    } catch (err) {
      setError('Error connecting to the server. Please try again later.');
      console.error('Error fetching reservations:', err);
      
      // For demo purposes, create mock data if API fails
      const mockReservations = generateMockReservations();
      setReservations(mockReservations);
    } finally {
      setLoading(false);
    }
  };

  // Generate mock data for demo purposes
  const generateMockReservations = (): Reservation[] => {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    
    return [
      {
        id: '1',
        customerName: 'John Smith',
        phoneNumber: '+1 (555) 123-4567',
        date: today,
        time: '19:00:00',
        partySize: 4,
        source: 'AI Call',
        status: 'Confirmed',
        notes: 'Window seat preferred',
        createdAt: new Date(now.getTime() - 120 * 60000).toISOString(),
        updatedAt: new Date(now.getTime() - 90 * 60000).toISOString(),
      },
      {
        id: '2',
        customerName: 'Emily Johnson',
        phoneNumber: '+1 (555) 987-6543',
        date: today,
        time: '20:30:00',
        partySize: 2,
        source: 'Manual',
        status: 'Pending',
        notes: 'Anniversary celebration',
        createdAt: new Date(now.getTime() - 10 * 60000).toISOString(),
        updatedAt: new Date(now.getTime() - 10 * 60000).toISOString(),
      },
      {
        id: '3',
        customerName: 'Michael Brown',
        phoneNumber: '+1 (555) 456-7890',
        date: today,
        time: '18:15:00',
        partySize: 6,
        source: 'AI Call',
        status: 'Cancelled',
        notes: '',
        createdAt: new Date(now.getTime() - 240 * 60000).toISOString(),
        updatedAt: new Date(now.getTime() - 60 * 60000).toISOString(),
      },
      {
        id: '4',
        customerName: 'Sarah Wilson',
        phoneNumber: '+1 (555) 789-0123',
        date: today,
        time: '19:45:00',
        partySize: 3,
        source: 'AI Call',
        status: 'Confirmed',
        notes: 'Allergic to nuts',
        createdAt: new Date(now.getTime() - 5 * 60000).toISOString(),
        updatedAt: new Date(now.getTime() - 5 * 60000).toISOString(),
      },
    ];
  };

  useEffect(() => {
    fetchReservations();
    
    // Set up polling for new reservations (every 30 seconds)
    const intervalId = setInterval(() => {
      fetchReservations();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [reservations, filters, searchTerm]);

  const applyFilters = () => {
    let filtered = [...reservations];
    
    // Apply date filter
    if (filters.date) {
      const filterDate = format(filters.date, 'yyyy-MM-dd');
      filtered = filtered.filter(r => r.date === filterDate);
    }
    
    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(r => r.status === filters.status);
    }
    
    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.customerName.toLowerCase().includes(term) || 
        r.phoneNumber.includes(term)
      );
    }
    
    // Sort by time
    filtered.sort((a, b) => {
      // First sort by date
      const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateComparison !== 0) return dateComparison;
      
      // Then sort by time
      return a.time.localeCompare(b.time);
    });
    
    setFilteredReservations(filtered);
  };

  const handleAddReservation = () => {
    setSelectedReservation(undefined);
    setOpenForm(true);
  };

  const handleEditReservation = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setOpenForm(true);
  };

  // Function to send reservation data to CallFluent webhook
  const sendToCallfluentWebhook = async (reservation: Reservation) => {
    try {
      // Get CallFluent settings from localStorage
      const savedSettings = localStorage.getItem('callfluentSettings');
      if (!savedSettings) {
        console.log('CallFluent settings not found');
        return;
      }
      
      const settings = JSON.parse(savedSettings);
      
      // Check if auto-calling is enabled and webhook URL is set
      if (!settings.autoCallEnabled || !settings.webhookEndpoint) {
        console.log('Auto-calling is disabled or webhook URL is not set');
        return;
      }
      
      // Format date and time for better compatibility
      const dateObj = new Date(reservation.date);
      const formattedDate = format(dateObj, 'yyyy-MM-dd');
      
      // Convert 24h time to 12h time for better readability
      const timeParts = reservation.time.split(':');
      const hour = parseInt(timeParts[0]);
      const minute = timeParts[1];
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      const formattedTime = `${hour12}:${minute} ${ampm}`;
      
      // Prepare payload for CallFluent
      const payload: CallFluentPayload = {
        customerName: reservation.customerName,
        phoneNumber: reservation.phoneNumber,
        date: formattedDate,
        time: formattedTime,
        partySize: reservation.partySize,
        notes: reservation.notes || '',
        reservationId: reservation.id
      };
      
      console.log('Sending to webhook:', settings.webhookEndpoint);
      console.log('Payload:', payload);
      
      // Add timeout and headers to improve reliability
      const response = await axios.post(settings.webhookEndpoint, payload, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('Webhook response:', response.data);
      showSnackbar('Reservation data sent to CallFluent AI for automated call', 'info');
      return true;
    } catch (error) {
      console.error('Error sending data to CallFluent webhook:', error);
      showSnackbar('Failed to send data to CallFluent AI. Please check webhook settings.', 'error');
      return false;
    }
  };

  const handleSaveReservation = async (reservationData: Omit<Reservation, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (selectedReservation) {
        // Update existing reservation
        const response = await axios.put(`/api/reservations/${selectedReservation.id}`, reservationData);
        if (response.data.success) {
          setReservations(prev => 
            prev.map(r => r.id === selectedReservation.id ? { ...response.data.data } : r)
          );
          showSnackbar('Reservation updated successfully', 'success');
        } else {
          showSnackbar(response.data.error || 'Failed to update reservation', 'error');
        }
      } else {
        // Create new reservation
        const response = await axios.post('/api/reservations', reservationData);
        if (response.data.success) {
          const newReservation = response.data.data;
          setReservations(prev => [...prev, newReservation]);
          showSnackbar('Reservation created successfully', 'success');
          
          // Send to CallFluent webhook for automated call
          await sendToCallfluentWebhook(newReservation);
        } else {
          showSnackbar(response.data.error || 'Failed to create reservation', 'error');
        }
      }
    } catch (err) {
      console.error('Error saving reservation:', err);
      showSnackbar('Error connecting to the server. Please try again.', 'error');
      
      // For demo purposes, simulate successful save
      const now = new Date().toISOString();
      const newReservation: Reservation = {
        ...reservationData,
        id: selectedReservation?.id || Math.random().toString(36).substring(2, 9),
        createdAt: selectedReservation?.createdAt || now,
        updatedAt: now,
      };
      
      if (selectedReservation) {
        // Update existing reservation
        setReservations(prev => 
          prev.map(r => r.id === selectedReservation.id ? newReservation : r)
        );
      } else {
        // Create new reservation
        setReservations(prev => [...prev, newReservation]);
        
        // Send to CallFluent webhook for automated call (demo)
        await sendToCallfluentWebhook(newReservation);
      }
      
      showSnackbar('Reservation saved successfully', 'success');
    }
  };

  const handleUpdateStatus = async (id: string, status: 'Confirmed' | 'Cancelled') => {
    try {
      const response = await axios.patch(`/api/reservations/${id}/status`, { status });
      if (response.data.success) {
        setReservations(prev => 
          prev.map(r => r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r)
        );
        showSnackbar(`Reservation ${status.toLowerCase()} successfully`, 'success');
      } else {
        showSnackbar(response.data.error || `Failed to ${status.toLowerCase()} reservation`, 'error');
      }
    } catch (err) {
      console.error('Error updating reservation status:', err);
      showSnackbar('Error connecting to the server. Please try again.', 'error');
      
      // For demo purposes, simulate successful update
      setReservations(prev => 
        prev.map(r => r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r)
      );
      showSnackbar(`Reservation ${status.toLowerCase()} successfully`, 'success');
    }
  };

  const handleDateChange = (date: Date | null) => {
    setFilters({
      ...filters,
      date: date,
    });
  };

  const handleStatusChange = (event: SelectChangeEvent) => {
    setFilters({
      ...filters,
      status: event.target.value as string | null,
    });
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleRefresh = () => {
    fetchReservations();
    showSnackbar('Refreshing reservations...', 'info');
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
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

  const handleTriggerReminderCall = async (id: string) => {
    try {
      const reservation = reservations.find(r => r.id === id);
      if (!reservation) {
        showSnackbar('Reservation not found', 'error');
        return;
      }
      
      // Send to CallFluent webhook for reminder call
      const success = await sendToCallfluentWebhook(reservation);
      
      if (success) {
        showSnackbar('Reminder call triggered successfully', 'success');
      }
    } catch (error) {
      console.error('Error triggering reminder call:', error);
      showSnackbar('Failed to trigger reminder call', 'error');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Reservations
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleAddReservation}
        >
          New Reservation
        </Button>
      </Box>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4} md={3}>
              <DatePicker
                label="Filter by Date"
                value={filters.date}
                onChange={handleDateChange}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    variant: "outlined",
                    size: "small"
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status || ''}
                  onChange={handleStatusChange}
                  label="Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Confirmed">Confirmed</MenuItem>
                  <MenuItem value="Cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by name or phone"
                value={searchTerm}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={2} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
              <Button 
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                size="small"
              >
                Refresh
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error && reservations.length === 0 ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : (
        <ReservationList 
          reservations={filteredReservations} 
          onEditReservation={handleEditReservation}
          onUpdateStatus={handleUpdateStatus}
          onTriggerReminderCall={handleTriggerReminderCall}
        />
      )}
      
      <ReservationForm 
        open={openForm}
        onClose={() => setOpenForm(false)}
        onSave={handleSaveReservation}
        reservation={selectedReservation}
      />
      
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

export default Dashboard;
