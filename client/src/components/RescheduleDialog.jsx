import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  Alert,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs from 'dayjs';

const RescheduleDialog = ({ open, onClose, onSubmit, meeting }) => {
  // Initialize with the current meeting's date or now() + 1 hour if not available
  const initialDate = meeting?.proposedDate ? dayjs(meeting.proposedDate) : dayjs().add(1, 'hour');
  const [proposedDate, setProposedDate] = useState(initialDate);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  // Reset state when dialog opens for a new meeting
  React.useEffect(() => {
    if (open) {
      setProposedDate(meeting?.proposedDate ? dayjs(meeting.proposedDate) : dayjs().add(1, 'hour'));
      setReason('');
      setError('');
    }
  }, [open, meeting]);

  const handleSubmit = () => {
    setError('');
    if (!proposedDate || !proposedDate.isValid()) {
      setError('Please select a valid date and time.');
      return;
    }
    if (proposedDate.isBefore(dayjs())) {
      setError('The new date must be in the future.');
      return;
    }
    // Pass the data up to the parent component
    onSubmit({ proposedDate: proposedDate.toISOString(), reason });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ component: 'form' }}>
      <DialogTitle>Reschedule Meeting</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <DateTimePicker
            label="New Proposed Date & Time"
            value={proposedDate}
            onChange={setProposedDate}
            disablePast
            ampm={false}
            format="DD/MM/YYYY HH:mm"
          />
          <TextField
            label="Reason for rescheduling (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            multiline
            rows={3}
            fullWidth
            placeholder="e.g., A conflict came up, suggesting a new time."
          />
          {error && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained">
          Propose New Time
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RescheduleDialog;
