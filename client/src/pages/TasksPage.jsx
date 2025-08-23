import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Container, Paper, Stack, Typography, Divider, Chip,
  ToggleButton, ToggleButtonGroup, TextField, MenuItem, IconButton,
  CircularProgress, Button, Alert, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import Grid from '@mui/material/Grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import dayjs from 'dayjs';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthUserContext } from '../contexts/AuthUserContext';
import { useTasks } from '../contexts/TaskContext';
import TaskCard from '../components/TaskCard';

const useQuery = () => new URLSearchParams(useLocation().search);

const TasksPage = () => {
  const { user } = useContext(AuthUserContext);
  const isMentor = user?.role === 'mentor';

  const navigate = useNavigate();
  const query = useQuery();

  const {
    tasks,
    loading,
    fetchByProject, fetchByMeeting,
    completeTask, reopenTask, updateTask, deleteTask, createTask,
    meetings, // from context wiring
  } = useTasks();

  const safeTasks = Array.isArray(tasks) ? tasks : [];

  const initialMeetingId = query.get('meetingId') || '';
  const initialProjectId = isMentor ? (query.get('projectId') || '') : (user?.project?._id || '');

  const [projectId, setProjectId] = useState(initialProjectId);
  const [meetingId, setMeetingId] = useState(initialMeetingId);
  const [statusFilter, setStatusFilter] = useState('all'); // all | open | completed | overdue
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createMeetingId, setCreateMeetingId] = useState(''); // controlled (lightweight)
  const dialogKeyRef = useRef(0); // force remount for fresh defaults each open

  // Uncontrolled refs (no re-render per keystroke)
  const titleRef = useRef(null);
  const descRef = useRef(null);
  const dueRef = useRef(null);

  useEffect(() => {
    if (meetingId) {
      fetchByMeeting(meetingId);
      return;
    }
    if (projectId) fetchByProject(projectId);
  }, [meetingId, projectId, fetchByMeeting, fetchByProject]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (meetingId) params.set('meetingId', meetingId);
    if (isMentor && projectId) params.set('projectId', projectId);
    navigate({ search: params.toString() }, { replace: true });
  }, [meetingId, projectId, navigate, isMentor]);

  const projectOptions = useMemo(() => {
    if (!isMentor) return user?.project ? [user.project] : [];
    const map = new Map();
    (Array.isArray(meetings) ? meetings : []).forEach((m) => {
      if (m?.project?._id && !map.has(m.project._id)) map.set(m.project._id, m.project);
    });
    return Array.from(map.values());
  }, [isMentor, meetings, user]);

  const allMeetingOptions = useMemo(() => {
    const pool = (Array.isArray(meetings) ? meetings : []).filter((m) => {
      return !projectId || (m?.project?._id === projectId);
    });
    return pool.sort((a, b) => new Date(b.proposedDate) - new Date(a.proposedDate));
  }, [meetings, projectId]);

  // Eligible for task creation: 'held' OR (accepted & past) for back-compat
  const creationMeetingOptions = useMemo(() => {
    const now = Date.now();
    return allMeetingOptions.filter((m) => {
      if (!m) return false;
      const when = new Date(m.proposedDate).getTime();
      return m.status === 'held' || (m.status === 'accepted' && when < now);
    });
  }, [allMeetingOptions]);

  const activeMeeting = useMemo(
    () => (meetingId ? allMeetingOptions.find((m) => m._id === meetingId) : null),
    [meetingId, allMeetingOptions]
  );

  const filteredTasks = useMemo(() => {
    let list = safeTasks.slice();

    if (statusFilter === 'open') list = list.filter((t) => t.status === 'open');
    if (statusFilter === 'completed') list = list.filter((t) => t.status === 'completed');
    if (statusFilter === 'overdue') list = list.filter((t) => t.isOverdue);

    if (from) {
      const start = dayjs(from).startOf('day').valueOf();
      list = list.filter((t) => !t.dueDate || dayjs(t.dueDate).valueOf() >= start);
    }
    if (to) {
      const end = dayjs(to).endOf('day').valueOf();
      list = list.filter((t) => !t.dueDate || dayjs(t.dueDate).valueOf() <= end);
    }
    return list;
  }, [safeTasks, statusFilter, from, to]);

  const counts = useMemo(() => {
    const base = { all: safeTasks.length, open: 0, completed: 0, overdue: 0 };
    safeTasks.forEach((t) => {
      if (t.status === 'open') base.open += 1;
      if (t.status === 'completed') base.completed += 1;
      if (t.isOverdue) base.overdue += 1;
    });
    return base;
  }, [safeTasks]);

  const handleRefresh = async () => {
    if (meetingId) await fetchByMeeting(meetingId);
    else if (projectId) await fetchByProject(projectId);
  };

  const openCreate = () => {
    setCreateError('');
    // Prefill with current meeting if it’s eligible; otherwise first eligible
    const preferredId =
      (meetingId && creationMeetingOptions.some((m) => m._id === meetingId)) ? meetingId :
      (creationMeetingOptions[0]?._id || '');
    setCreateMeetingId(preferredId);

    // Reset uncontrolled inputs by bumping dialog key & clearing refs after mount
    dialogKeyRef.current += 1;
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setCreateError('');
  };

  const submitCreate = async () => {
    setCreateError('');
    const title = titleRef.current?.value?.trim() || '';
    const description = descRef.current?.value?.trim() || '';
    const dueDateRaw = dueRef.current?.value || '';
    if (!createMeetingId || !title) {
      setCreateError('Meeting and title are required.');
      return;
    }
    try {
      setCreateSubmitting(true);
      await createTask({
        meetingId: createMeetingId,
        title,
        description,
        dueDate: dueDateRaw ? new Date(dueDateRaw) : undefined,
      });
      setCreateSubmitting(false);
      setCreateOpen(false);
    } catch (e) {
      setCreateSubmitting(false);
      setCreateError(e?.response?.data?.message || 'Failed to create task.');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper
        elevation={0}
        sx={(theme) => ({
          p: 2.5,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          background: theme.palette.background.paper,
        })}
      >
        {/* Header row */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          flexWrap="wrap"
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="h5">Tasks</Typography>
            <Chip size="small" label={`All: ${counts.all}`} />
            <Chip size="small" color="info" variant="outlined" label={`Open: ${counts.open}`} />
            <Chip size="small" color="success" label={`Completed: ${counts.completed}`} />
            <Chip size="small" color="error" label={`Overdue: ${counts.overdue}`} />
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <ToggleButtonGroup
              value={statusFilter}
              exclusive
              onChange={(_, v) => v && setStatusFilter(v)}
              size="small"
              color="primary"
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="open">Open</ToggleButton>
              <ToggleButton value="completed">Completed</ToggleButton>
              <ToggleButton value="overdue">Overdue</ToggleButton>
            </ToggleButtonGroup>

            <IconButton onClick={handleRefresh} title="Refresh" size="small" disabled={loading}>
              {loading ? <CircularProgress size={18} /> : <RefreshIcon />}
            </IconButton>

            {isMentor && (
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={openCreate}
              >
                New Task
              </Button>
            )}
          </Stack>
        </Stack>

        {/* Active meeting pill */}
        {activeMeeting && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
            <Chip
              color="primary"
              variant="outlined"
              label={`Meeting: ${dayjs(activeMeeting.proposedDate).format('DD/MM HH:mm')} — ${activeMeeting.project?.name || 'Project'}`}
            />
            <Button size="small" onClick={() => setMeetingId('')}>Clear</Button>
          </Stack>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Filters row */}
        <Grid container spacing={1.5}>
          {isMentor && (
            <Grid item size={{ xs: 12, md: 3 }}>
              <TextField
                select
                size="small"
                fullWidth
                label="Project"
                value={projectId}
                onChange={(e) => {
                  setMeetingId('');
                  setProjectId(e.target.value);
                }}
              >
                <MenuItem value="">All</MenuItem>
                {(projectOptions || []).map((p) => (
                  <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
          )}

          <Grid item size={{ xs: 12, md: isMentor ? 3 : 4 }}>
            <TextField
              select
              size="small"
              fullWidth
              label="Meeting"
              value={meetingId}
              onChange={(e) => setMeetingId(e.target.value)}
              helperText="Filter tasks tied to a specific meeting"
            >
              <MenuItem value="">All</MenuItem>
              {(allMeetingOptions || []).map((m) => (
                <MenuItem key={m._id} value={m._id}>
                  {dayjs(m.proposedDate).format('DD/MM HH:mm')} — {m.project?.name || 'Project'}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item size={{ xs: 6, md: isMentor ? 3 : 2.5 }}>
            <TextField
              size="small"
              fullWidth
              type="date"
              label="Due from"
              InputLabelProps={{ shrink: true }}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Grid>
          <Grid item size={{ xs: 6, md: isMentor ? 3 : 2.5 }}>
            <TextField
              size="small"
              fullWidth
              type="date"
              label="Due to"
              InputLabelProps={{ shrink: true }}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Content */}
        {loading ? (
          <Stack alignItems="center" py={6} spacing={2}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">Loading tasks…</Typography>
          </Stack>
        ) : filteredTasks.length === 0 ? (
          <Paper
            elevation={0}
            sx={(theme) => ({
              p: 4,
              borderRadius: 2,
              border: '1px dashed',
              borderColor: 'divider',
              textAlign: 'center',
              background: theme.palette.background.default,
            })}
          >
            <Typography variant="h6" color="text.secondary">No tasks match your filters.</Typography>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {filteredTasks.map((t) => (
              <Grid key={t._id} item size={{ xs: 12, sm: 6, md: 4 }}>
                <TaskCard
                  task={t}
                  role={user?.role}
                  onComplete={completeTask}
                  onReopen={reopenTask}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {/* Create Task Modal (mentor only) */}
      {isMentor && (
        <Dialog
          key={dialogKeyRef.current} // force remount for fresh defaults
          open={createOpen}
          onClose={closeCreate}
          fullWidth
          maxWidth="md"
        >
          <DialogTitle>Create Task</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField
                select
                label="Meeting (held)"
                value={createMeetingId}
                onChange={(e) => setCreateMeetingId(e.target.value)}
                helperText={(creationMeetingOptions?.length ?? 0) === 0
                  ? 'No eligible held meetings found. A meeting becomes eligible once it has been held.'
                  : 'Attach this task to a held meeting'}
                fullWidth
              >
                <MenuItem value="">Select meeting…</MenuItem>
                {(creationMeetingOptions || []).map((m) => (
                  <MenuItem key={m._id} value={m._id}>
                    {dayjs(m.proposedDate).format('DD/MM/YYYY HH:mm')} — {m.project?.name || 'Project'}
                  </MenuItem>
                ))}
              </TextField>

              <Grid container spacing={2}>
                <Grid item size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Title"
                    fullWidth
                    defaultValue=""
                    inputRef={titleRef}
                  />
                </Grid>
                <Grid item size={{ xs: 12, md: 6 }}>
                  <TextField
                    type="datetime-local"
                    label="Due date (optional)"
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    defaultValue=""
                    inputRef={dueRef}
                  />
                </Grid>
              </Grid>

              <TextField
                label="Description"
                fullWidth
                multiline
                minRows={3}
                defaultValue=""
                inputRef={descRef}
              />

              {!!createError && (
                <Alert severity="error" onClose={() => setCreateError('')}>
                  {createError}
                </Alert>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeCreate} color="inherit">Cancel</Button>
            <Button
              onClick={submitCreate}
              variant="contained"
              startIcon={<AddIcon />}
              disabled={createSubmitting || (creationMeetingOptions?.length ?? 0) === 0}
            >
              {createSubmitting ? 'Creating…' : 'Create Task'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Container>
  );
};

export default TasksPage;
