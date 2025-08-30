import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Grid,
  Paper,
  Button
} from '@mui/material';
import { getUsers, updateUser } from '../services/hodService';
import EditUserDialog from '../components/EditUserDialog';
import { socket } from '../services/socketService';

const ViewUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await getUsers();
        setUsers(data);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const handleUserUpdate = (updatedUser) => {
      setUsers((prevUsers) =>
        prevUsers.map((user) => (user._id === updatedUser._id ? updatedUser : user))
      );
    };

    socket.on('userUpdated', handleUserUpdate);

    return () => {
      socket.off('userUpdated', handleUserUpdate);
    };
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const roleMatch = roleFilter ? user.role === roleFilter : true;
      const searchMatch = searchQuery
        ? user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.idNumber.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      return roleMatch && searchMatch;
    });
  }, [users, roleFilter, searchQuery]);

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsEditDialogOpen(false);
    setSelectedUser(null);
  };

  const handleSaveChanges = async (updatedUser) => {
    try {
      await updateUser(updatedUser._id, updatedUser);
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Manage Users
      </Typography>
      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Role</InputLabel>
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            label="Role"
          >
            <MenuItem value="">
              <em>All</em>
            </MenuItem>
            <MenuItem value="student">Student</MenuItem>
            <MenuItem value="mentor">Mentor</MenuItem>
            <MenuItem value="hod">HOD</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Search"
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ flexGrow: 1 }}
        />
      </Box>
      <Grid container spacing={3}>
        {filteredUsers.map((user) => (
          <Grid item xs={12} sm={6} md={4} key={user._id}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">{user.fullName}</Typography>
              <Typography>Email: {user.email}</Typography>
              <Typography>ID: {user.idNumber}</Typography>
              <Typography>Role: {user.role}</Typography>
              <Button
                variant="contained"
                onClick={() => handleEditClick(user)}
                sx={{ mt: 1 }}
              >
                Edit
              </Button>
            </Paper>
          </Grid>
        ))}
      </Grid>
      {selectedUser && (
        <EditUserDialog
          open={isEditDialogOpen}
          onClose={handleCloseDialog}
          user={selectedUser}
          onSave={handleSaveChanges}
        />
      )}
    </Box>
  );
};

export default ViewUsersPage;
