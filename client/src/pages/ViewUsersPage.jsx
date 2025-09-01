// pages/ViewUsersPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  TextField,
  Typography,
  Grid,
  Paper,
  Button,
  Stack,
  Chip,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { getUsers, updateUser } from '../services/hodService';
import EditUserDialog from '../components/EditUserDialog';
import { socket } from '../services/socketService';
import { useAuthUser } from '../contexts/AuthUserContext';

const ViewUsersPage = () => {
  const theme = useTheme();
  const { user: currentUser } = useAuthUser();

  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('all'); // all | student | mentor | hod
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Real-time updates from server
  useEffect(() => {
    if (!socket) return;

    const handleUserUpdate = (updatedUser) => {
      setUsers((prev) => {
        const exists = prev.some((u) => u._id === updatedUser._id);
        if (!exists) return [updatedUser, ...prev];
        return prev.map((u) => (u._id === updatedUser._id ? updatedUser : u));
      });
    };

    socket.on('userUpdated', handleUserUpdate);
    return () => socket.off('userUpdated', handleUserUpdate);
  }, []);

  // Header counts (like Tasks/Meetings chips)
  const counts = useMemo(() => {
    const all = users.length;
    const student = users.filter((u) => u.role === 'student').length;
    const mentor = users.filter((u) => u.role === 'mentor').length;
    const hod = users.filter((u) => u.role === 'hod').length;
    return { all, student, mentor, hod };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = (searchQuery || '').toLowerCase().trim();
    return users.filter((u) => {
      const roleMatch = roleFilter === 'all' ? true : u.role === roleFilter;
      if (!q) return roleMatch;
      const hay = [u.fullName || '', u.email || '', u.idNumber || '']
        .map((s) => String(s).toLowerCase())
        .join(' ');
      return roleMatch && hay.includes(q);
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

  // onSave should return a promise (awaited in the dialog)
  const handleSaveChanges = async (updatedUser) => {
    const payload = {
      email: updatedUser.email,
      idNumber: updatedUser.idNumber,
      fullName: updatedUser.fullName,
      role: updatedUser.role,
    };
    return updateUser(updatedUser._id, payload);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          background: theme.palette.background.paper,
          mb: 3,
        }}
      >
        {/* Header row (title + chips + actions) */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          flexWrap="wrap"
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="h5">Users</Typography>
            <Chip size="small" label={`All: ${counts.all}`} />
            <Chip size="small" color="primary" variant="outlined" label={`Students: ${counts.student}`} />
            <Chip size="small" color="info" label={`Mentors: ${counts.mentor}`} />
            <Chip size="small" color="success" label={`HODs: ${counts.hod}`} />
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <ToggleButtonGroup
              value={roleFilter}
              exclusive
              onChange={(_, v) => v && setRoleFilter(v)}
              size="small"
              color="primary"
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="student">Students</ToggleButton>
              <ToggleButton value="mentor">Mentors</ToggleButton>
              <ToggleButton value="hod">HODs</ToggleButton>
            </ToggleButtonGroup>

            <Button
              onClick={fetchUsers}
              startIcon={<RefreshIcon />}
              size="small"
              disabled={loading}
              variant="outlined"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </Button>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Filters row (compact like Tasks/Meetings) */}
        <Grid container spacing={1.5} alignItems="flex-end">
          <Grid item size={{xs:12, md:10}}>
            <TextField
              size="small"
              fullWidth
              label="Search by name / email / ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              helperText={'\u00A0'}
              FormHelperTextProps={{ sx: { minHeight: 20 } }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Cards grid */}
      <Grid container spacing={3}>
        {filteredUsers.map((u) => (
          <Grid item size={{xs: 12, sm: 6, md: 4}} key={u._id}>
            <Paper
              elevation={2}
              sx={{
                p: 2,
                height: '100%',
                borderRadius: theme.shape.borderRadius * 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {u.fullName || '—'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Email: {u.email || '—'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ID: {u.idNumber || '—'}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  mt: 0.5,
                  px: 1,
                  py: 0.25,
                  width: 'fit-content',
                  borderRadius: theme.shape.borderRadius,
                  bgcolor:
                    u.role === 'hod'
                      ? theme.palette.success.light
                      : u.role === 'mentor'
                      ? theme.palette.info.light
                      : theme.palette.grey[200],
                }}
              >
                Role: {u.role}
              </Typography>

              <Box sx={{ mt: 'auto' }}>
                <Button
                  variant="contained"
                  onClick={() => handleEditClick(u)}
                  sx={{ mt: 1 }}
                >
                  Edit
                </Button>
              </Box>
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
          currentUserId={currentUser?._id}
        />
      )}
    </Box>
  );
};

export default ViewUsersPage;
