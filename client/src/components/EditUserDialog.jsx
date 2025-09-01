import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
} from '@mui/material';

const EditUserDialog = ({ open, onClose, user, onSave, currentUserId }) => {
  const [editedUser, setEditedUser] = useState(user);

  useEffect(() => {
    setEditedUser(user);
  }, [user]);

  const isSelfHod = useMemo(() => {
    if (!editedUser) return false;
    return String(editedUser._id) === String(currentUserId) && editedUser.role === 'hod';
  }, [editedUser, currentUserId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(editedUser);
  };

  if (!editedUser) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit User</DialogTitle>
      <DialogContent>
        <TextField
          margin="dense"
          label="Email"
          type="email"
          fullWidth
          name="email"
          value={editedUser.email || ''}
          onChange={handleChange}
        />
        <TextField
          margin="dense"
          label="ID Number"
          type="text"
          fullWidth
          name="idNumber"
          value={editedUser.idNumber || ''}
          onChange={handleChange}
        />
        <FormControl fullWidth margin="dense" disabled={isSelfHod}>
          <InputLabel>Role</InputLabel>
          <Select
            name="role"
            value={editedUser.role || ''}
            label="Role"
            onChange={handleChange}
          >
            <MenuItem value="student">Student</MenuItem>
            <MenuItem value="mentor">Mentor</MenuItem>
            <MenuItem value="hod">HOD</MenuItem>
          </Select>
          {isSelfHod && (
            <FormHelperText error>
              HODs cannot change their own role.
            </FormHelperText>
          )}
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button onClick={handleSave} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditUserDialog;
