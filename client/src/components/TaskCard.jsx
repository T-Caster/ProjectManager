import React, { useMemo, useState, useRef } from 'react';
import {
  Card, CardHeader, CardContent, CardActions,
  Stack, Typography, Chip, TextField, Tooltip, Button, Alert
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReplayIcon from '@mui/icons-material/Replay';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EventIcon from '@mui/icons-material/Event';
import dayjs from 'dayjs';

const TaskCard = ({
  task,
  role, // 'student' | 'mentor'
  onComplete,
  onReopen,
  onUpdate,
  onDelete,
}) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef(null);
  const descRef = useRef(null);
  const dueRef = useRef(null);

  // inline validation errors (no browser alerts)
  const [errTitle, setErrTitle] = useState('');
  const [errDesc, setErrDesc] = useState('');
  const [errDue, setErrDue] = useState('');
  const [serverError, setServerError] = useState('');

  const canEdit = role === 'mentor' && task.status === 'open';
  const canDelete = role === 'mentor' && task.status === 'open';
  const canComplete = task.status === 'open' && !editing; // hide while editing
  const canReopen = role === 'mentor' && task.status === 'completed';

  const dueStr = useMemo(
    () => (task.dueDate ? dayjs(task.dueDate).format('DD/MM/YYYY HH:mm') : '—'),
    [task.dueDate]
  );
  const createdStr = useMemo(() => dayjs(task.createdAt).format('DD/MM/YYYY'), [task.createdAt]);

  const statusChip = useMemo(() => {
    if (task.status === 'completed') {
      return (
        <Chip
          size="small"
          color={task.completedLate ? 'warning' : 'success'}
          label={task.completedLate ? 'Completed (late)' : 'Completed'}
          variant={task.completedLate ? 'filled' : 'outlined'}
        />
      );
    }
    if (task.isOverdue) {
      return <Chip size="small" color="error" label="Overdue" />;
    }
    return <Chip size="small" color="info" variant="outlined" label="Open" />;
  }, [task.status, task.completedLate, task.isOverdue]);

  const meetingChip = (
    <Tooltip
      arrow
      title={
        task.meeting?.proposedDate
          ? `Meeting date: ${dayjs(task.meeting.proposedDate).format('DD/MM/YYYY HH:mm')}`
          : 'Meeting'
      }
    >
      <Chip
        size="small"
        icon={<EventIcon />}
        // Make it explicit this is the meeting date
        label={
          task.meeting?.proposedDate
            ? `Meeting: ${dayjs(task.meeting.proposedDate).format('DD/MM HH:mm')}`
            : 'Meeting'
        }
        sx={{ ml: 1 }}
        color="default"
        variant="outlined"
      />
    </Tooltip>
  );

  const resetErrors = () => {
    setErrTitle('');
    setErrDesc('');
    setErrDue('');
    setServerError('');
  };

  const validateLocal = () => {
    resetErrors();
    const t = titleRef.current?.value?.trim() || '';
    const d = descRef.current?.value?.trim() || '';
    const dueRaw = dueRef.current?.value || '';
    let ok = true;

    if (!t) {
      setErrTitle('Title is required');
      ok = false;
    }
    if (!d) {
      setErrDesc('Description is required');
      ok = false;
    }
    if (!dueRaw) {
      setErrDue('Due date is required');
      ok = false;
    } else {
      const due = dayjs(dueRaw);
      if (!due.isValid()) {
        setErrDue('Invalid due date');
        ok = false;
      } else if (!due.isAfter(dayjs())) {
        setErrDue('Due date must be in the future');
        ok = false;
      }
    }
    return ok;
  };

  const handleSave = async () => {
    if (!validateLocal()) return;
    setSaving(true);
    setServerError('');

    const payload = {
      title: titleRef.current?.value?.trim(),
      description: descRef.current?.value?.trim(),
      dueDate: new Date(dueRef.current?.value),
    };

    try {
      await onUpdate(task._id, payload);
      setEditing(false);
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to update task.';
      // Map known server messages to field errors where possible
      if (/Title cannot be empty/i.test(msg) || /Title is required/i.test(msg)) {
        setErrTitle('Title is required');
      } else if (/Description cannot be empty/i.test(msg) || /Description is required/i.test(msg)) {
        setErrDesc('Description is required');
      } else if (/dueDate/i.test(msg)) {
        setErrDue(msg); // could be "dueDate is required" / "Invalid dueDate" / "Due date must be in the future"
      } else {
        setServerError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardHeader
        title={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>{task.title}</Typography>
            {statusChip}
            {meetingChip}
          </Stack>
        }
        subheader={
          <Typography variant="caption" color="text.secondary">
            Project: {task.project?.name || '—'} • Created {createdStr}
          </Typography>
        }
      />
      <CardContent sx={{ pt: 0.5 }}>
        {editing ? (
          <Stack spacing={1.25}>
            <TextField
              size="small"
              label="Title"
              defaultValue={task.title}
              inputRef={titleRef}
              inputProps={{ maxLength: 200 }}
              fullWidth
              error={!!errTitle}
              helperText={errTitle || '\u00A0'}
            />
            <TextField
              size="small"
              label="Description"
              defaultValue={task.description || ''}
              inputRef={descRef}
              inputProps={{ maxLength: 4000 }}
              multiline
              minRows={2}
              fullWidth
              error={!!errDesc}
              helperText={errDesc || '\u00A0'}
            />
            <TextField
              size="small"
              type="datetime-local"
              label="Due date"
              defaultValue={task.dueDate ? dayjs(task.dueDate).format('YYYY-MM-DDTHH:mm') : ''}
              inputRef={dueRef}
              InputLabelProps={{ shrink: true }}
              error={!!errDue}
              helperText={errDue || '\u00A0'}
            />
            {serverError && <Alert severity="error" onClose={() => setServerError('')}>{serverError}</Alert>}
          </Stack>
        ) : (
          <Stack spacing={0.5}>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {task.description || '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Due:</strong> {dueStr}
            </Typography>
          </Stack>
        )}
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
        {canComplete && (
          <Button
            color="success"
            variant="outlined"
            startIcon={<CheckCircleIcon />}
            onClick={() => onComplete(task._id)}
          >
            Mark completed
          </Button>
        )}
        {canReopen && (
          <Button
            color="warning"
            variant="outlined"
            startIcon={<ReplayIcon />}
            onClick={() => onReopen(task._id)}
          >
            Reopen
          </Button>
        )}
        {canEdit && !editing && (
          <Button
            variant="text"
            startIcon={<EditIcon />}
            onClick={() => {
              resetErrors();
              setEditing(true);
            }}
          >
            Edit
          </Button>
        )}
        {canEdit && editing && (
          <Button
            color="primary"
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        )}
        {canDelete && !editing && (
          <Button
            color="error"
            variant="outlined"
            startIcon={<DeleteOutlineIcon />}
            onClick={() => onDelete(task._id)}
          >
            Delete
          </Button>
        )}
      </CardActions>
    </Card>
  );
};

export default TaskCard;
