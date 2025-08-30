import React, { useState, useEffect } from 'react';
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
} from '@mui/material';

const EditUserDialog = ({ open, onClose, user, onSave }) => {
  const [editedUser, setEditedUser] = useState(user);

  useEffect(() => {
    setEditedUser(user);
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(editedUser);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Edit User</DialogTitle>
      <DialogContent>
        <TextField
          margin="dense"
          label="Email"
          type="email"
          fullWidth
          name="email"
          value={editedUser.email}
          onChange={handleChange}
        />
        <TextField
          margin="dense"
          label="ID Number"
          type="text"
          fullWidth
          name="idNumber"
          value={editedUser.idNumber}
          onChange={handleChange}
        />
        <FormControl fullWidth margin="dense">
          <InputLabel>Role</InputLabel>
          <Select
            name="role"
            value={editedUser.role}
            onChange={handleChange}
            label="Role"
          >
            <MenuItem value="student">Student</MenuItem>
            <MenuItem value="mentor">Mentor</MenuItem>
            <MenuItem value="hod">HOD</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave}>Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditUserDialog;
