import React, { useMemo, useState, useContext } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Chip,
  Stack,
  Typography,
  Divider,
  Box,
  Avatar,
  AvatarGroup,
  Button,
  MenuItem,
  TextField,
  Tooltip,
  IconButton,
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import LaunchIcon from '@mui/icons-material/Launch';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
import { useProjects } from '../contexts/ProjectContext';
import { AuthUserContext } from '../contexts/AuthUserContext';

const STATUS_ORDER = ['proposal', 'specification', 'code', 'presentation', 'done'];
const STATUS_LABELS = {
  proposal: 'Proposal',
  specification: 'Specification',
  code: 'Code',
  presentation: 'Presentation',
  done: 'Done',
};
const STATUS_COLORS = {
  proposal: 'warning',
  specification: 'info',
  code: 'secondary',
  presentation: 'primary',
  done: 'success',
};

const ProjectCard = ({ project, currentUserRole }) => {
  const { updateProjectStatus } = useProjects();
  const { user } = useContext(AuthUserContext);
  const isMentor = (currentUserRole || user?.role) === 'mentor';

  const {
    _id,
    name,
    status,
    background,
    objectives,
    students = [],
    mentor,
    snapshots,
    createdAt,
    updatedAt,
  } = project || {};

  const [updating, setUpdating] = useState(false);
  const statusColor = STATUS_COLORS[status] || 'default';
  const statusLabel = STATUS_LABELS[status] || status;

  const nextStatuses = useMemo(() => {
    // Allow mentor to move forward, or back one step, or mark done if already presentation/code
    const idx = STATUS_ORDER.indexOf(status);
    const opts = new Set();
    if (idx > 0) opts.add(STATUS_ORDER[idx - 1]);     // step back
    opts.add(STATUS_ORDER[idx]);                       // current (disabled in UI)
    if (idx < STATUS_ORDER.length - 1) opts.add(STATUS_ORDER[idx + 1]); // step forward
    if (status !== 'done') opts.add('done');           // quick-complete
    return STATUS_ORDER.filter((s) => opts.has(s));
  }, [status]);

  const handleStatusChange = async (newStatus) => {
    if (!newStatus || newStatus === status) return;
    try {
      setUpdating(true);
      await updateProjectStatus(_id, newStatus);
    } finally {
      setUpdating(false);
    }
  };

  const leftRailColor = (theme) => theme.palette[statusColor]?.main || theme.palette.divider;

  return (
    <Card
      elevation={0}
      sx={(theme) => ({
        position: 'relative',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        background: theme.palette.background.paper,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      })}
    >
      {/* Left color rail keyed to status */}
      <Box
        sx={(theme) => ({
          position: 'absolute',
          insetInlineStart: 0,
          top: 0,
          bottom: 0,
          width: 4,
          bgcolor: leftRailColor(theme),
          borderTopLeftRadius: 12,
          borderBottomLeftRadius: 12,
        })}
      />

      <CardHeader
        avatar={<FolderOpenIcon color={statusColor} />}
        title={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>{name}</Typography>
            <Chip size="small" label={statusLabel} color={statusColor} variant="outlined" />
          </Stack>
        }
        subheader={
          <Typography variant="body2" color="text.secondary">
            Updated {updatedAt ? dayjs(updatedAt).fromNow() : dayjs(createdAt).fromNow()}
          </Typography>
        }
        sx={{ pb: 1 }}
      />

      <Divider />

      <CardContent sx={{ flexGrow: 1, pt: 1.5, pb: 0, display: 'grid', gap: 1 }}>
        {/* Mentor */}
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 90 }}>
            Mentor:
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar src={mentor?.avatarUrl} alt={mentor?.fullName} sx={{ width: 24, height: 24 }}>
              {mentor?.fullName?.[0]}
            </Avatar>
            <Typography variant="body2">{mentor?.fullName || snapshots?.mentorName || '—'}</Typography>
          </Stack>
        </Stack>

        {/* Students */}
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 90 }}>
            Students:
          </Typography>
          <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 28, height: 28 } }}>
            {students.map((s) => (
              <Avatar key={s._id} src={s.avatarUrl} alt={s.fullName}>
                {s.fullName?.[0]}
              </Avatar>
            ))}
          </AvatarGroup>
          <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
            {students.map((s, i) => (
              <React.Fragment key={s._id || i}>
                {i > 0 ? ', ' : ''}
                {s.fullName}
              </React.Fragment>
            ))}
          </Typography>
        </Stack>

        {/* Quick glance text */}
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 90 }}>
            Summary:
          </Typography>
          <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.4 }}>
            {(background || '').slice(0, 140) || '—'}
            {(background || '').length > 140 ? '…' : ''}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 90 }}>
            Objectives:
          </Typography>
          <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.4 }}>
            {(objectives || '').slice(0, 140) || '—'}
            {(objectives || '').length > 140 ? '…' : ''}
          </Typography>
        </Stack>
      </CardContent>

      <CardActions sx={{ px: 2, py: 1.25, justifyContent: 'space-between', gap: 1 }}>
        <Button
          size="small"
          variant="text"
          endIcon={<LaunchIcon />}
          component={Link}
          to={`/projects/${_id}`}
        >
          View Details
        </Button>

        {/* Mentor quick status control */}
        {isMentor ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Change status">
              <TextField
                size="small"
                select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={updating}
                sx={{ minWidth: 160 }}
              >
                {STATUS_ORDER.map((s) => (
                  <MenuItem key={s} value={s} disabled={s === status}>
                    {STATUS_LABELS[s]}
                  </MenuItem>
                ))}
              </TextField>
            </Tooltip>
            {status !== 'done' && (
              <Tooltip title="Advance to next stage">
                <span>
                  <IconButton
                    size="small"
                    color="primary"
                    disabled={updating || status === 'done'}
                    onClick={() => {
                      const idx = STATUS_ORDER.indexOf(status);
                      const next = STATUS_ORDER[Math.min(idx + 1, STATUS_ORDER.length - 1)];
                      if (next !== status) handleStatusChange(next);
                    }}
                  >
                    <ArrowForwardIcon />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Stack>
        ) : null}
      </CardActions>
    </Card>
  );
};

export default ProjectCard;
