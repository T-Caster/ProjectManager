// client/src/components/TaskCard.jsx
import React, { useMemo, useState } from 'react';
import {
  Card, CardHeader, CardContent, CardActions,
  Stack, Typography, Chip, IconButton, Tooltip, Button, TextField
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
  const [localTitle, setLocalTitle] = useState(task.title);
  const [localDesc, setLocalDesc] = useState(task.description || '');
  const [localDue, setLocalDue] = useState(task.dueDate ? dayjs(task.dueDate).format('YYYY-MM-DDTHH:mm') : '');

  const canEdit = role === 'mentor' && task.status === 'open';
  const canDelete = role === 'mentor' && task.status === 'open';
  const canComplete = task.status === 'open';
  const canReopen = role === 'mentor' && task.status === 'completed';

  const dueStr = useMemo(() => (task.dueDate ? dayjs(task.dueDate).format('DD/MM/YYYY HH:mm') : '—'), [task.dueDate]);
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
    <Chip
      size="small"
      icon={<EventIcon />}
      label={task.meeting?.proposedDate ? dayjs(task.meeting.proposedDate).format('DD/MM HH:mm') : 'Meeting'}
      sx={{ ml: 1 }}
    />
  );

  const handleSave = async () => {
    await onUpdate(task._id, {
      title: localTitle,
      description: localDesc,
      dueDate: localDue ? new Date(localDue) : null,
    });
    setEditing(false);
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
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              inputProps={{ maxLength: 200 }}
              fullWidth
            />
            <TextField
              size="small"
              label="Description"
              value={localDesc}
              onChange={(e) => setLocalDesc(e.target.value)}
              inputProps={{ maxLength: 4000 }}
              multiline
              minRows={2}
              fullWidth
            />
            <TextField
              size="small"
              type="datetime-local"
              label="Due date"
              value={localDue}
              onChange={(e) => setLocalDue(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
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
      <CardActions sx={{ justifyContent: 'flex-end', gap: 1 }}>
        {canComplete && (
          <Tooltip title="Mark completed">
            <span>
              <IconButton color="success" onClick={() => onComplete(task._id)}><CheckCircleIcon /></IconButton>
            </span>
          </Tooltip>
        )}
        {canReopen && (
          <Tooltip title="Reopen">
            <IconButton color="warning" onClick={() => onReopen(task._id)}><ReplayIcon /></IconButton>
          </Tooltip>
        )}
        {canEdit && !editing && (
          <Tooltip title="Edit">
            <IconButton onClick={() => setEditing(true)}><EditIcon /></IconButton>
          </Tooltip>
        )}
        {canEdit && editing && (
          <Tooltip title="Save">
            <IconButton color="primary" onClick={handleSave}><SaveIcon /></IconButton>
          </Tooltip>
        )}
        {canDelete && !editing && (
          <Tooltip title="Delete">
            <IconButton color="error" onClick={() => onDelete(task._id)}><DeleteOutlineIcon /></IconButton>
          </Tooltip>
        )}
      </CardActions>
    </Card>
  );
};

export default TaskCard;
