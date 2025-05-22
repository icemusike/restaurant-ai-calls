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
      // Load from localStorage instead of API
      const storedReservations = localStorage.getItem('reservations');
      if (storedReservations) {
        const parsedReservations = JSON.parse(storedReservations) as Reservation[];
        setReservations(parsedReservations);
        setError(null);
      } else {
        // For first-time use, create mock data
        const mockReservations = generateMockReservations();
        setReservations(mockReservations);
        // Save mock data to localStorage
        localStorage.setItem('reservations', JSON.stringify(mockReservations));
      }
    } catch (err) {
      setError('Error loading reservations from browser storage.');
      console.error('Error loading reservations:', err);
      
      // For demo purposes, create mock data if loading fails
      const mockReservations = generateMockReservations();
      setReservations(mockReservations);
      // Try to save to localStorage
      try {
        localStorage.setItem('reservations', JSON.stringify(mockReservations));
      } catch (storageErr) {
        console.error('Error saving to localStorage:', storageErr);
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper function to save reservations to localStorage
  const saveReservationsToStorage = (updatedReservations: Reservation[]) => {
    try {
      localStorage.setItem('reservations', JSON.stringify(updatedReservations));
    } catch (err) {
      console.error('Error saving reservations to localStorage:', err);
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
    // Initial load of reservations
    fetchReservations();
    
    // No need for polling since we're using localStorage
    // But we can add an event listener for storage changes in other tabs
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'reservations' && event.newValue) {
        try {
          const updatedReservations = JSON.parse(event.newValue) as Reservation[];
          setReservations(updatedReservations);
        } catch (err) {
          console.error('Error parsing reservations from storage event:', err);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
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
        name: reservation.customerName,
        phone_number: reservation.phoneNumber,
        date: formattedDate,
        time: formattedTime,
        partySize: reservation.partySize,
        notes: reservation.notes || '',
        reservationId: reservation.id
      };
      
      // Use the specified webhook URL
      const webhookUrl = 'https://api.callfluent.ai/api/call-api/make-call/6033';
      
      console.log('Sending to webhook:', webhookUrl);
      console.log('Payload:', payload);
      
      // Send to the specified webhook URL
      const response = await axios.post(webhookUrl, payload, {
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
      showSnackbar('Failed to send data to CallFluent AI.', 'error');
      return false;
    }
  };

  const handleSaveReservation = async (reservationData: Omit<Reservation, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const now = new Date().toISOString();
      
      if (selectedReservation) {
        // Update existing reservation
        const updatedReservation: Reservation = {
          ...selectedReservation,
          ...reservationData,
          updatedAt: now
        };
        
        const updatedReservations = reservations.map(r => 
          r.id === selectedReservation.id ? updatedReservation : r
        );
        
        setReservations(updatedReservations);
        saveReservationsToStorage(updatedReservations);
        showSnackbar('Reservation updated successfully', 'success');
      } else {
        // Create new reservation
        const newId = `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
        const newReservation: Reservation = {
          ...reservationData,
          id: newId,
          createdAt: now,
          updatedAt: now,
        };
        
        // Add to state and ensure we're creating a new array reference
        const updatedReservations = [...reservations, newReservation];
        setReservations(updatedReservations);
        
        // Save to localStorage
        saveReservationsToStorage(updatedReservations);
        
        // Send to CallFluent webhook for automated call
        await sendToCallfluentWebhook(newReservation);
        
        showSnackbar('Reservation created successfully', 'success');
      }
    } catch (err) {
      console.error('Error saving reservation:', err);
      showSnackbar('Error saving reservation. Please try again.', 'error');
    }
  };

  const handleUpdateStatus = async (id: string, status: 'Confirmed' | 'Cancelled') => {
    try {
      // Update reservation status in local memory
      const updatedReservations = reservations.map(r => 
        r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r
      );
      
      setReservations(updatedReservations);
      saveReservationsToStorage(updatedReservations);
      showSnackbar(`Reservation ${status.toLowerCase()} successfully`, 'success');
    } catch (err) {
      console.error('Error updating reservation status:', err);
      showSnackbar('Error updating status. Please try again.', 'error');
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
    // Simply reload from localStorage
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
