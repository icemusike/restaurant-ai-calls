import { useState } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Chip, 
  Grid, 
  IconButton, 
  Menu, 
  MenuItem,
  Badge,
  Divider,
  useTheme,
  Tooltip,
  CircularProgress,
  Button
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GroupIcon from '@mui/icons-material/Group';
import PhoneIcon from '@mui/icons-material/Phone';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { format } from 'date-fns';
import { Reservation } from '../types';

interface ReservationListProps {
  reservations: Reservation[];
  onEditReservation: (reservation: Reservation) => void;
  onUpdateStatus: (id: string, status: 'Confirmed' | 'Cancelled') => void;
  onTriggerReminderCall?: (id: string) => void;
}

const ReservationList = ({ 
  reservations, 
  onEditReservation, 
  onUpdateStatus,
  onTriggerReminderCall
}: ReservationListProps) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedReservation, setSelectedReservation] = useState<string | null>(null);
  const [callLoading, setCallLoading] = useState<string | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, id: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedReservation(id);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedReservation(null);
  };

  const handleConfirm = () => {
    if (selectedReservation) {
      onUpdateStatus(selectedReservation, 'Confirmed');
    }
    handleMenuClose();
  };

  const handleCancel = () => {
    if (selectedReservation) {
      onUpdateStatus(selectedReservation, 'Cancelled');
    }
    handleMenuClose();
  };

  const handleEdit = () => {
    if (selectedReservation) {
      const reservation = reservations.find(r => r.id === selectedReservation);
      if (reservation) {
        onEditReservation(reservation);
      }
    }
    handleMenuClose();
  };

  const handleTriggerCall = async (id: string) => {
    if (onTriggerReminderCall) {
      setCallLoading(id);
      await onTriggerReminderCall(id);
      setCallLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return theme.palette.success.main;
      case 'Cancelled':
        return theme.palette.error.main;
      default:
        return theme.palette.warning.main;
    }
  };

  const isNewReservation = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    // Consider a reservation "new" if it was created in the last 30 minutes
    return (now.getTime() - created.getTime()) < 30 * 60 * 1000;
  };

  if (reservations.length === 0) {
    return (
      <Card sx={{ mb: 2, p: 2 }}>
        <CardContent sx={{ textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No reservations found for the selected filters.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {reservations.map((reservation) => (
        <Card key={reservation.id} sx={{ 
          mb: 2, 
          position: 'relative',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.palette.mode === 'light'
              ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
              : '0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1)'
          }
        }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {isNewReservation(reservation.createdAt) && (
                    <Box
                      sx={{ 
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: 'error.main',
                        mr: 1,
                        animation: 'pulse 1.5s infinite',
                      }}
                    />
                  )}
                  <Typography variant="h6" component="div">
                    {reservation.customerName}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {reservation.phoneNumber}
                  </Typography>
                  
                  {reservation.status === 'Confirmed' && onTriggerReminderCall && (
                    <Tooltip title="Send reminder call">
                      <IconButton 
                        size="small" 
                        color="primary" 
                        sx={{ ml: 1 }}
                        onClick={() => handleTriggerCall(reservation.id)}
                        disabled={callLoading === reservation.id}
                      >
                        {callLoading === reservation.id ? (
                          <CircularProgress size={20} />
                        ) : (
                          <NotificationsIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
                  <Chip 
                    label={reservation.status} 
                    size="small"
                    sx={{ 
                      backgroundColor: getStatusColor(reservation.status),
                      color: '#fff',
                      fontWeight: 'bold'
                    }} 
                  />
                  <Chip 
                    label={reservation.source} 
                    size="small"
                    variant="outlined"
                    sx={{ ml: 1 }} 
                  />
                </Box>
              </Grid>
            </Grid>
            
            <Divider sx={{ my: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AccessTimeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2">
                    {format(new Date(`${reservation.date}T${reservation.time}`), 'MMM d, yyyy')}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AccessTimeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2">
                    {format(new Date(`2023-01-01T${reservation.time}`), 'h:mm a')}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <GroupIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2">
                    {reservation.partySize} {reservation.partySize === 1 ? 'person' : 'people'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Box>
                  <Button 
                    size="small" 
                    startIcon={<EditIcon />}
                    onClick={() => onEditReservation(reservation)}
                    sx={{ mr: 1 }}
                  >
                    Edit
                  </Button>
                  <IconButton 
                    aria-label="more" 
                    onClick={(e) => handleMenuOpen(e, reservation.id)}
                    size="small"
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>
              </Grid>
            </Grid>
            
            {reservation.notes && (
              <Box sx={{ 
                mt: 2, 
                p: 1.5, 
                borderRadius: 1, 
                backgroundColor: theme.palette.mode === 'light' 
                  ? 'rgba(0, 0, 0, 0.03)' 
                  : 'rgba(255, 255, 255, 0.05)'
              }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Notes:</strong> {reservation.notes}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      ))}
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 3,
          sx: {
            borderRadius: 2,
            minWidth: 180,
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
            mt: 1.5,
          }
        }}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit Reservation
        </MenuItem>
        <MenuItem onClick={handleConfirm}>
          <CheckCircleIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} />
          Confirm Reservation
        </MenuItem>
        <MenuItem onClick={handleCancel}>
          <CancelIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} />
          Cancel Reservation
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ReservationList;
