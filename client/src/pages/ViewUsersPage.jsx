import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
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
  CardActions,
  FormControl,
  Select,
  MenuItem,
  OutlinedInput,
  Link as MuiLink,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import LaunchIcon from '@mui/icons-material/Launch';
import { Link } from 'react-router-dom';

import { getUsers, updateUser } from '../services/hodService';
import EditUserDialog from '../components/EditUserDialog';
import { socket } from '../services/socketService';
import { useAuthUser } from '../contexts/AuthUserContext';

const CONTROL_HEIGHT = 40;
const NO_MENTOR_VALUE = '__NONE__';

const ViewUsersPage = () => {
  const theme = useTheme();
  const { user: currentUser } = useAuthUser();

  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('all'); // all | student | mentor | hod
  const [mentorFilter, setMentorFilter] = useState(''); // '', NO_MENTOR_VALUE, or mentor _id
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

  // realtime updates
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
    return () => socket?.off('userUpdated', handleUserUpdate);
  }, []);

  // mentors list + map
  const mentorOptions = useMemo(() => users.filter((u) => u.role === 'mentor'), [users]);
  const mentorMap = useMemo(() => {
    const map = new Map();
    mentorOptions.forEach((m) => map.set(String(m._id), m));
    return map;
  }, [mentorOptions]);

  const resolveMentor = (u) => {
    if (!u?.mentor) return null;
    if (typeof u.mentor === 'string') return mentorMap.get(String(u.mentor)) || null;
    return u.mentor;
  };

  // header counts
  const counts = useMemo(() => {
    const all = users.length;
    const student = users.filter((u) => u.role === 'student').length;
    const mentor = users.filter((u) => u.role === 'mentor').length;
    const hod = users.filter((u) => u.role === 'hod').length;
    return { all, student, mentor, hod };
  }, [users]);

  // filtering
  const filteredUsers = useMemo(() => {
    const q = (searchQuery || '').toLowerCase().trim();

    const matchedMentorIds = new Set(
      q
        ? mentorOptions
            .filter((m) => (m.fullName || '').toLowerCase().includes(q))
            .map((m) => String(m._id))
        : []
    );

    return users.filter((u) => {
      const roleMatch = roleFilter === 'all' ? true : u.role === roleFilter;

      const mRef = resolveMentor(u);
      const mId = mRef?._id
        ? String(mRef._id)
        : typeof u.mentor === 'string'
        ? String(u.mentor)
        : '';

      // Mentor filter logic:
      // - "" (All): no mentor constraint
      // - NO_MENTOR_VALUE: only students with no mentor
      // - specific mentor id: the mentor themselves OR anyone mentored by them
      let mentorMatch = true;
      if (mentorFilter === NO_MENTOR_VALUE) {
        mentorMatch = u.role === 'student' && !mId; // unassigned students (no mentor)
      } else if (mentorFilter) {
        mentorMatch = String(u._id) === String(mentorFilter) || (mId && mId === String(mentorFilter));
      }

      if (!roleMatch || !mentorMatch) return false;

      // Text search across user fields + mentor name
      const hay = [u.fullName || '', u.email || '', u.idNumber || '', mRef?.fullName || '']
        .map((s) => String(s).toLowerCase())
        .join(' ');

      if (!q) return true;

      const directMatch = hay.includes(q);
      const isMatchedMentor = u.role === 'mentor' && matchedMentorIds.has(String(u._id));
      const isStudentOfMatchedMentor = mId && matchedMentorIds.has(mId);

      return directMatch || isMatchedMentor || isStudentOfMatchedMentor;
    });
  }, [users, roleFilter, mentorFilter, searchQuery, mentorOptions, mentorMap]);

  // edit dialog plumbing
  const handleEditClick = (user) => { setSelectedUser(user); setIsEditDialogOpen(true); };
  const handleCloseDialog = () => { setIsEditDialogOpen(false); setSelectedUser(null); };
  const { user: authUser } = useAuthUser();
  const handleSaveChanges = async (updatedUser) => {
    const isSelf = String(updatedUser._id) === String(authUser?._id);
    const payload = {
      email: updatedUser.email,
      idNumber: updatedUser.idNumber,
      fullName: updatedUser.fullName,
      role: isSelf && authUser?.role === 'hod' ? 'hod' : updatedUser.role,
    };
    try {
      const { data: savedUser } = await updateUser(updatedUser._id, payload);
      setUsers((prev) => prev.map((u) => (u._id === savedUser._id ? savedUser : u)));
      return savedUser;
    } catch (err) {
      // Optionally handle error (e.g., show notification)
      return null;
    }
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
        {/* Header */}
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

            <Button onClick={fetchUsers} startIcon={<RefreshIcon />} size="small" disabled={loading} variant="outlined">
              {loading ? 'Refreshing…' : 'Refresh'}
            </Button>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Filters row — captions above inputs; no floating labels */}
        <Grid container spacing={1.5} alignItems="flex-end">
          <Grid item size={{ xs: 12, md: 8 }}>
            <FormControl
              size="small"
              fullWidth
              variant="outlined"
              sx={{ '& .MuiOutlinedInput-root': { height: CONTROL_HEIGHT } }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, px: 0.5 }}>
                Search by name / email / ID / mentor
              </Typography>
              <OutlinedInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to filter…"
                inputProps={{ 'aria-label': 'search users' }}
              />
            </FormControl>
          </Grid>

          <Grid item size={{ xs: 12, md: 4 }}>
            <FormControl
              size="small"
              fullWidth
              variant="outlined"
              sx={{ '& .MuiOutlinedInput-root': { height: CONTROL_HEIGHT } }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, px: 0.5 }}>
                Mentor
              </Typography>
              <Select
                value={mentorFilter}
                onChange={(e) => setMentorFilter(e.target.value)}
                displayEmpty
                renderValue={(val) => {
                  if (!val) return 'All';
                  if (val === NO_MENTOR_VALUE) return 'No mentor';
                  return mentorOptions.find((m) => String(m._id) === String(val))?.fullName || 'Mentor';
                }}
              >
                <MenuItem value=""><em>All</em></MenuItem>
                <MenuItem value={NO_MENTOR_VALUE}>No mentor</MenuItem>
                {mentorOptions.map((m) => (
                  <MenuItem key={m._id} value={m._id}>
                    {m.fullName || 'Unnamed Mentor'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Cards */}
      <Grid container spacing={3}>
        {filteredUsers.map((u) => {
          const mRef = resolveMentor(u);
          const mentorIdForLink = mRef?._id
            ? String(mRef._id)
            : typeof u.mentor === 'string'
              ? String(u.mentor)
              : '';

          return (
            <Grid item size={{ xs: 12, sm: 6, md: 4 }} key={u._id}>
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

                {(mRef?.fullName || mentorIdForLink) ? (
                  <Typography variant="body2" color="text.secondary">
                    Mentor:{' '}
                    {mentorIdForLink ? (
                      <MuiLink
                        component={Link}
                        to={mentorIdForLink === String(currentUser?._id) ? '/profile' : `/profile/${mentorIdForLink}`}
                        underline="hover"
                      >
                        {mRef?.fullName || 'View mentor'}
                      </MuiLink>
                    ) : (
                      mRef?.fullName
                    )}
                  </Typography>
                ) : (
                  (u.role === 'student' && (
                    <Typography variant="body2" color="text.secondary">
                      Not Assigned to project
                    </Typography>
                  ))
                )}

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

                <CardActions
                  sx={{
                    mt: 'auto',
                    p: 0,
                    pt: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Button
                    size="small"
                    variant="text"
                    endIcon={<LaunchIcon />}
                    component={Link}
                    to={String(u._id) === String(currentUser?._id) ? '/profile' : `/profile/${u._id}`}
                    sx={{ minWidth: 0, px: 0, whiteSpace: 'nowrap' }}
                  >
                    View Profile
                  </Button>

                  <Button size="small" variant="contained" onClick={() => setIsEditDialogOpen(true) || setSelectedUser(u)}>
                    Edit
                  </Button>
                </CardActions>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {selectedUser && (
        <EditUserDialog
          open={isEditDialogOpen}
          onClose={() => { setIsEditDialogOpen(false); setSelectedUser(null); }}
          user={selectedUser}
          onSave={async (u) => handleSaveChanges(u)}
          currentUserId={currentUser?._id}
        />
      )}
    </Box>
  );
};

export default ViewUsersPage;
