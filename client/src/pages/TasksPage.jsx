import React, { useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Container, Paper, Stack, Typography, Divider, Chip,
  ToggleButton, ToggleButtonGroup, TextField, MenuItem, Button,
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import Grid from '@mui/material/Grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import dayjs from 'dayjs';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthUserContext } from '../contexts/AuthUserContext';
import { useTasks } from '../contexts/TaskContext';
import TaskCard from '../components/TaskCard';

// MUI X date pickers
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DateTimePicker } from '@mui/x-date-pickers';

const useQuery = () => new URLSearchParams(useLocation().search);

/**
 * CreateTaskDialog — isolated, memoized modal so typing doesn't re-render the page.
 * Title/Description are UNCONTROLLED (refs). Due uses local state (picker requirement)
 * and does not affect parent.
 */
const CreateTaskDialog = React.memo(function CreateTaskDialog({
  open,
  onClose,
  creationMeetingOptions,
  defaultMeetingId,
  onCreate,
}) {
  const [meetingId, setMeetingId] = useState(defaultMeetingId || '');
  const [due, setDue] = useState(null); // dayjs|null

  const titleRef = useRef(null);
  const descRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [tried, setTried] = useState(false);

  // HARD CLICK-LOCK to prevent ultra-fast double-submits before state updates
  const submitLockRef = useRef(false);

  // When dialog re-opens with a new defaultMeetingId, reset fields
  useEffect(() => {
    if (open) {
      setMeetingId(defaultMeetingId || '');
      setDue(null);
      setError('');
      setTried(false);
      if (titleRef.current) titleRef.current.value = '';
      if (descRef.current) descRef.current.value = '';
      submitLockRef.current = false;
      setSubmitting(false);
    }
  }, [open, defaultMeetingId]);

  const now = dayjs();

  const missingMeeting = !meetingId;
  const missingTitle = !titleRef.current?.value?.trim();
  const missingDesc  = !descRef.current?.value?.trim();
  const missingDue   = !due || !due.isValid?.();
  const dueInPast    = !missingDue && !due.isAfter(now);

  const submit = async () => {
    if (submitLockRef.current) return;          // guard #1 (instant)
    submitLockRef.current = true;

    setTried(true);
    setError('');

    const title = titleRef.current?.value?.trim() || '';
    const description = descRef.current?.value?.trim() || '';

    const problems = [];
    if (missingMeeting) problems.push('meeting');
    if (!title) problems.push('title');
    if (!description) problems.push('description');
    if (missingDue) problems.push('due date');
    else if (dueInPast) problems.push('a future due date');

    if (problems.length) {
      setError(`Please provide: ${problems.join(', ')}.`);
      submitLockRef.current = false;            // release the lock on validation fail
      return;
    }

    try {
      setSubmitting(true);                      // guard #2 (UI)
      await onCreate({
        meetingId,
        title,
        description,
        dueDate: due.toDate(),
      });
      onClose();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to create task.');
    } finally {
      setSubmitting(false);
      // keep the lock until dialog resets on close/open
    }
  };

  const helperSx = { minHeight: 20 };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Create Task</DialogTitle>
      <DialogContent dividers>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Stack spacing={2}>
            <TextField
              select
              label="Meeting (held)"
              value={meetingId}
              onChange={(e) => setMeetingId(e.target.value)}
              required
              error={tried && !meetingId}
              helperText={(creationMeetingOptions?.length ?? 0) === 0
                ? 'No eligible held meetings found. A meeting becomes eligible once it has been held.'
                : (tried && !meetingId ? 'Meeting is required' : 'Attach this task to a held meeting')}
              fullWidth
            >
              <MenuItem value="">Select meeting…</MenuItem>
              {(creationMeetingOptions || []).map((m) => (
                <MenuItem key={m._id} value={m._id}>
                  {/* Make it obvious this is the meeting date */}
                  Meeting on {dayjs(m.proposedDate).format('DD/MM/YYYY HH:mm')} — {m.project?.name || 'Project'}
                </MenuItem>
              ))}
            </TextField>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Title"
                  fullWidth
                  inputRef={titleRef}
                  required
                  error={tried && !titleRef.current?.value?.trim()}
                  helperText={tried && !titleRef.current?.value?.trim() ? 'Title is required' : '\u00A0'}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <DateTimePicker
                  label="Due date"
                  value={due}
                  onChange={setDue}
                  format="DD/MM/YYYY HH:mm"
                  disablePast
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                      error: tried && (missingDue || dueInPast),
                      helperText:
                        tried && missingDue ? 'Due date is required'
                        : tried && dueInPast ? 'Due date must be in the future'
                        : '\u00A0',
                    },
                  }}
                />
              </Grid>
            </Grid>

            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={3}
              inputRef={descRef}
              required
              error={tried && !descRef.current?.value?.trim()}
              helperText={tried && !descRef.current?.value?.trim() ? 'Description is required' : '\u00A0'}
            />

            {!!error && (
              <Alert severity="error" onClose={() => setError('')}>
                {error}
              </Alert>
            )}
          </Stack>
        </LocalizationProvider>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button
          onClick={submit}
          variant="contained"
          startIcon={<AddIcon />}
          disabled={submitting || (creationMeetingOptions?.length ?? 0) === 0}
        >
          {submitting ? 'Creating…' : 'Create Task'}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

const TasksPage = () => {
  const { user } = useContext(AuthUserContext);
  const isMentor = user?.role === 'mentor';

  const navigate = useNavigate();
  const query = useQuery();

  const {
    tasks,
    loading,
    refetchTasks,
    completeTask, reopenTask, updateTask, deleteTask, createTask,
    meetings,
  } = useTasks();

  const initialMeetingId = query.get('meetingId') || '';
  const initialProjectId = isMentor ? (query.get('projectId') || '') : (user?.project?._id || '');

  const [projectId, setProjectId] = useState(initialProjectId);
  const [meetingId, setMeetingId] = useState(initialMeetingId);
  const [statusFilter, setStatusFilter] = useState('all'); // all | open | completed | overdue

  // Filters: dayjs|null for pickers
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false);

  // Keep URL in sync with selected filters
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

  // Eligible for task creation: (UI shows held & accepted+past for convenience; server enforces 'held')
  const creationMeetingOptions = useMemo(() => {
    const now = Date.now();
    return allMeetingOptions.filter((m) => {
      if (!m) return false;
      const when = new Date(m.proposedDate).getTime();
      return m.status === 'held' || (m.status === 'accepted' && when < now);
    });
  }, [allMeetingOptions]);

  // Apply project/meeting filters first
  const baseTasks = useMemo(() => {
    const all = Array.isArray(tasks) ? tasks : [];
    if (!projectId && !meetingId) return all;

    return all.filter(t => {
      const pId = t.project?._id || t.project;
      const mId = t.meeting?._id || t.meeting;
      if (meetingId) return mId === meetingId;
      if (projectId) return pId === projectId;
      return false; // should not happen if logic is sound
    });
  }, [tasks, projectId, meetingId]);

  // Apply status/date filters to base list
  const filteredTasks = useMemo(() => {
    let list = [...baseTasks];

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
  }, [baseTasks, statusFilter, from, to]);

  // Counts from the base list (pre-status/date filter)
  const counts = useMemo(() => {
    const src = baseTasks;
    const base = { all: src.length, open: 0, completed: 0, overdue: 0 };
    src.forEach((t) => {
      if (t.status === 'open') base.open += 1;
      if (t.status === 'completed') base.completed += 1;
      if (t.isOverdue) base.overdue += 1;
    });
    return base;
  }, [baseTasks]);

  const handleRefresh = () => refetchTasks();

  const openCreate = () => setCreateOpen(true);
  const closeCreate = () => setCreateOpen(false);

  // Pass-throughs (no window.alert here; TaskCard will render inline errors)
  const handleCreate = useCallback((payload) => createTask(payload), [createTask]);
  const handleUpdate = useCallback((...args) => updateTask(...args), [updateTask]);

  // ---- Clear all filters visibility & logic ----
  const hasActiveFilters = useMemo(() => {
    const projectActive = isMentor ? !!projectId : false;
    const meetingActive = !!meetingId;
    const statusActive = statusFilter !== 'all';
    const dateActive = !!from || !!to;
    return projectActive || meetingActive || statusActive || dateActive;
  }, [isMentor, projectId, meetingId, statusFilter, from, to]);

  const clearAllFilters = () => {
    if (isMentor) setProjectId('');
    setMeetingId('');
    setStatusFilter('all');
    setFrom(null);
    setTo(null);
  };

  // ---- Column sizes for the filter row (sum to 12 on md+) ----
  const cols = isMentor
    ? { project: 3, meeting: 4, from: 2, to: 2, clear: 1 }
    : { meeting: 5, from: 3, to: 3, clear: 1 };

  // Common helper-text style to reserve height
  const helperSx = { minHeight: 20 };

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

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
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

            <Button
              onClick={handleRefresh}
              startIcon={<RefreshIcon />}
              size="small"
              disabled={loading}
              variant="outlined"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </Button>

            {isMentor && (
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={openCreate}
                disabled={createOpen}  // prevent spamming while dialog is open
              >
                New Task
              </Button>
            )}
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Filters row (bottom-aligned; Clear button aligned via helper height) */}
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Grid container spacing={1.5} alignItems="flex-end">
            {isMentor && (
              <Grid item xs={12} md={cols.project}>
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
                  helperText="Filter tasks tied to a specific project"
                  FormHelperTextProps={{ sx: helperSx }}
                >
                  <MenuItem value="">All</MenuItem>
                  {(projectOptions || []).map((p) => (
                    <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}

            <Grid item xs={12} md={cols.meeting}>
              <TextField
                select
                size="small"
                fullWidth
                label="Meeting"
                value={meetingId}
                onChange={(e) => setMeetingId(e.target.value)}
                helperText="Filter tasks tied to a specific meeting"
                FormHelperTextProps={{
                  sx: {
                    ...helperSx,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  },
                }}
              >
                <MenuItem value="">All</MenuItem>
                {(allMeetingOptions || []).map((m) => (
                  <MenuItem key={m._id} value={m._id}>
                    {/* Make meeting date explicit here as well */}
                    Meeting on {dayjs(m.proposedDate).format('DD/MM HH:mm')} — {m.project?.name || 'Project'}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={6} md={cols.from}>
              <DatePicker
                label="Due from"
                value={from}
                onChange={setFrom}
                format="DD/MM/YYYY"
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true,
                    helperText: '\u00A0',
                    FormHelperTextProps: { sx: helperSx },
                  },
                }}
              />
            </Grid>

            <Grid item xs={6} md={cols.to}>
              <DatePicker
                label="Due to"
                value={to}
                onChange={setTo}
                format="DD/MM/YYYY"
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true,
                    helperText: '\u00A0',
                    FormHelperTextProps: { sx: helperSx },
                  },
                }}
              />
            </Grid>

            <Grid
              item
              xs={12}
              md={cols.clear}
              sx={{
                display: 'flex',
                justifyContent: { xs: 'flex-start', md: 'flex-end' },
                alignItems: 'flex-end',
                pb: `${helperSx.minHeight}px`,
              }}
            >
              {hasActiveFilters && (
                <Button size="small" variant="text" onClick={clearAllFilters}>
                  Clear filters
                </Button>
              )}
            </Grid>
          </Grid>
        </LocalizationProvider>

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
              <Grid key={t._id} item xs={12} sm={6} md={4}>
                <TaskCard
                  task={t}
                  role={user?.role}
                  onComplete={completeTask}
                  onReopen={reopenTask}
                  onUpdate={handleUpdate}
                  onDelete={deleteTask}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {/* Create Task Modal (mentor only) */}
      {isMentor && (
        <CreateTaskDialog
          open={createOpen}
          onClose={closeCreate}
          creationMeetingOptions={creationMeetingOptions}
          defaultMeetingId={
            (meetingId && creationMeetingOptions.some((m) => m._id === meetingId)) ? meetingId
            : (creationMeetingOptions[0]?._id || '')
          }
          onCreate={handleCreate}
        />
      )}
    </Container>
  );
};

export default TasksPage;
