import React, { useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Avatar,
  Chip,
  Stack,
  Typography,
  Divider,
  Button,
  Tooltip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

const PROFILE_ROUTE = (id) => `/profile/${id}`; // ← change if your profile route differs

const initials = (name = '') =>
  name
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const StudentCard = ({ student }) => {
  const navigate = useNavigate();

  const inProject = !!student?.isInProject && !!student?.project;

  // Mentor shown on the card: prefer project.mentor, fallback to user.mentor
  const mentor = useMemo(() => {
    return student?.project?.mentor || student?.mentor || null;
  }, [student]);

  // Co-student: project.students excluding this student
  const coStudent = useMemo(() => {
    const others = (student?.project?.students || []).filter(
      (s) => s && s._id !== student._id
    );
    return others[0] || null;
  }, [student]);

  return (
    <Card
      elevation={0}
      sx={(theme) => ({
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        background: theme.palette.background.paper,
      })}
    >
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            {initials(student?.fullName)}
          </Avatar>
        }
        title={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="h6">{student?.fullName}</Typography>
            <Chip
              size="small"
              label={inProject ? 'In Project' : 'Unassigned'}
              color={inProject ? 'success' : 'default'}
              variant={inProject ? 'filled' : 'outlined'}
            />
          </Stack>
        }
        subheader={
          <Typography variant="body2" color="text.secondary">
            ID: {student?.idNumber || '—'}
          </Typography>
        }
      />

      <Divider />

      <CardContent>
        <Stack spacing={1.25}>
          {inProject ? (
            <>
              {/* Mentor */}
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 88 }}>
                  Mentor
                </Typography>
                {mentor ? (
                  <Tooltip title="Open mentor profile">
                    <Chip
                      clickable
                      color="primary"
                      variant="outlined"
                      label={mentor.fullName}
                      onClick={() => navigate(PROFILE_ROUTE(mentor._id))}
                    />
                  </Tooltip>
                ) : (
                  <Typography variant="body2">—</Typography>
                )}
              </Stack>

              {/* Co-student */}
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 88 }}>
                  Co-student
                </Typography>
                {coStudent ? (
                  <Tooltip title="Open co-student profile">
                    <Chip
                      clickable
                      color="secondary"
                      variant="outlined"
                      label={coStudent.fullName}
                      onClick={() => navigate(PROFILE_ROUTE(coStudent._id))}
                    />
                  </Tooltip>
                ) : (
                  <Typography variant="body2">None</Typography>
                )}
              </Stack>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              This student is not assigned to any project yet.
            </Typography>
          )}
        </Stack>
      </CardContent>

      <Divider />

      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button
          variant="contained"
          onClick={() => navigate(PROFILE_ROUTE(student._id))}
          sx={{ ml: 'auto' }}
        >
          View Profile
        </Button>
      </CardActions>
    </Card>
  );
};

export default StudentCard;