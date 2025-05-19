import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Grid,
  Box,
  SelectChangeEvent
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { format, parse } from 'date-fns';
import { Reservation } from '../types';

interface ReservationFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (reservation: Omit<Reservation, 'id' | 'createdAt' | 'updatedAt'>) => void;
  reservation?: Reservation;
}

const ReservationForm = ({ open, onClose, onSave, reservation }: ReservationFormProps) => {
  const [formData, setFormData] = useState({
    customerName: '',
    phoneNumber: '',
    date: new Date(),
    time: new Date(),
    partySize: 2,
    source: 'Manual' as 'AI Call' | 'Manual',
    status: 'Pending' as 'Pending' | 'Confirmed' | 'Cancelled',
    notes: '',
  });
  
  const [errors, setErrors] = useState({
    customerName: '',
    phoneNumber: '',
    date: '',
    time: '',
    partySize: '',
  });

  useEffect(() => {
    if (reservation) {
      // Convert string date and time to Date objects for the pickers
      const dateObj = new Date(reservation.date);
      const timeObj = parse(reservation.time, 'HH:mm:ss', new Date());
      
      setFormData({
        customerName: reservation.customerName,
        phoneNumber: reservation.phoneNumber,
        date: dateObj,
        time: timeObj,
        partySize: reservation.partySize,
        source: reservation.source,
        status: reservation.status,
        notes: reservation.notes || '',
      });
    } else {
      // Reset form for new reservation
      setFormData({
        customerName: '',
        phoneNumber: '',
        date: new Date(),
        time: new Date(),
        partySize: 2,
        source: 'Manual',
        status: 'Pending',
        notes: '',
      });
    }
    
    // Reset errors
    setErrors({
      customerName: '',
      phoneNumber: '',
      date: '',
      time: '',
      partySize: '',
    });
  }, [reservation, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setFormData({
        ...formData,
        [name]: value,
      });
      
      // Clear error when field is edited
      if (name in errors) {
        setErrors({
          ...errors,
          [name]: '',
        });
      }
    }
  };

  const handleSelectChange = (e: SelectChangeEvent<any>) => {
    const { name, value } = e.target;
    if (name) {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setFormData({
        ...formData,
        date,
      });
      setErrors({
        ...errors,
        date: '',
      });
    }
  };

  const handleTimeChange = (time: Date | null) => {
    if (time) {
      setFormData({
        ...formData,
        time,
      });
      setErrors({
        ...errors,
        time: '',
      });
    }
  };

  const validateForm = () => {
    const newErrors = {
      customerName: '',
      phoneNumber: '',
      date: '',
      time: '',
      partySize: '',
    };
    
    let isValid = true;
    
    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
      isValid = false;
    }
    
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
      isValid = false;
    } else if (!/^\+?[0-9\s\-()]+$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Invalid phone number format';
      isValid = false;
    }
    
    if (!formData.date) {
      newErrors.date = 'Date is required';
      isValid = false;
    }
    
    if (!formData.time) {
      newErrors.time = 'Time is required';
      isValid = false;
    }
    
    if (formData.partySize < 1) {
      newErrors.partySize = 'Party size must be at least 1';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSave({
        customerName: formData.customerName,
        phoneNumber: formData.phoneNumber,
        date: format(formData.date, 'yyyy-MM-dd'),
        time: format(formData.time, 'HH:mm:ss'),
        partySize: formData.partySize,
        source: formData.source,
        status: formData.status,
        notes: formData.notes,
      });
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {reservation ? 'Edit Reservation' : 'New Reservation'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="customerName"
                label="Customer Name"
                fullWidth
                value={formData.customerName}
                onChange={handleChange}
                error={!!errors.customerName}
                helperText={errors.customerName}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="phoneNumber"
                label="Phone Number"
                fullWidth
                value={formData.phoneNumber}
                onChange={handleChange}
                error={!!errors.phoneNumber}
                helperText={errors.phoneNumber}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Date"
                value={formData.date}
                onChange={handleDateChange}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    error: !!errors.date,
                    helperText: errors.date
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TimePicker
                label="Time"
                value={formData.time}
                onChange={handleTimeChange}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    error: !!errors.time,
                    helperText: errors.time
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="partySize"
                label="Party Size"
                type="number"
                fullWidth
                value={formData.partySize}
                onChange={handleChange}
                error={!!errors.partySize}
                helperText={errors.partySize}
                InputProps={{ inputProps: { min: 1 } }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Source</InputLabel>
                <Select
                  name="source"
                  value={formData.source}
                  onChange={handleSelectChange}
                  label="Source"
                >
                  <MenuItem value="Manual">Manual</MenuItem>
                  <MenuItem value="AI Call">AI Call</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleSelectChange}
                  label="Status"
                >
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Confirmed">Confirmed</MenuItem>
                  <MenuItem value="Cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="notes"
                label="Notes"
                multiline
                rows={3}
                fullWidth
                value={formData.notes}
                onChange={handleChange}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReservationForm;
