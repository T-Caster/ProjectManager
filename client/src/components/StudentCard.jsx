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
  Box,
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import LaunchIcon from '@mui/icons-material/Launch';
import { useNavigate } from 'react-router-dom';

const PROFILE_ROUTE = (id) => `/profile/${id}`;

const initials = (name = '') =>
  name
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

function InfoRow({ label, children, icon }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 112 }}>
        {icon}
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>{label}</Typography>
      </Stack>
      <Box sx={{ flex: 1, minWidth: 120 }}>{children}</Box>
    </Stack>
  );
}

const StatusChip = ({ inProject }) => (
  <Chip
    size="small"
    label={inProject ? 'In Project' : 'Unassigned'}
    color={inProject ? 'success' : 'default'}
    variant={inProject ? 'filled' : 'outlined'}
    sx={{ px: 0.75, '& .MuiChip-label': { fontWeight: 600 } }}
  />
);

const StudentCard = ({ student }) => {
  const navigate = useNavigate();

  const inProject = !!student?.isInProject && !!student?.project;

  const mentor = useMemo(() => {
    return student?.project?.mentor || student?.mentor || null;
  }, [student]);

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
        <Box sx={(theme) => ({
          position: 'absolute',
          insetInlineStart: 0,
          top: 0,
          bottom: 0,
          width: 4,
          bgcolor: inProject ? theme.palette.success.main : theme.palette.grey[400],
          borderTopLeftRadius: 12,
          borderBottomLeftRadius: 12,
        })} />

        <CardHeader
          avatar={
            <Avatar src={student?.profilePic} sx={(theme) => ({ bgcolor: inProject ? 'success.main' : 'primary.main', color: theme.palette.getContrastText(theme.palette.primary.main), fontWeight: 700 })}>
              {initials(student?.fullName)}
            </Avatar>
          }
          title={
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
                {student?.fullName}
              </Typography>
              <StatusChip inProject={inProject} />
            </Stack>
          }
          subheader={
            <Typography variant="body2" color="text.secondary">
              ID: {student?.idNumber || '—'}
            </Typography>
          }
          sx={{ pb: 1.25 }}
        />

        <Divider />

        <CardContent sx={{ flexGrow: 1, pt: 1.5, pb: 0 }}>
          {inProject ? (
            <Stack spacing={1.25}>
              <InfoRow label="Mentor" icon={<PersonOutlineIcon fontSize="small" color="action" />}>
                {mentor ? (
                  <Chip
                    clickable
                    color="primary"
                    variant="outlined"
                    label={mentor.fullName}
                    onClick={() => navigate(PROFILE_ROUTE(mentor._id))}
                    sx={{ borderRadius: 2 }}
                  />
                ) : (
                  <Typography variant="body2">—</Typography>
                )}
              </InfoRow>

              <InfoRow label="Co-student" icon={<GroupOutlinedIcon fontSize="small" color="action" />}>
                {coStudent ? (
                  <Chip
                    clickable
                    color="secondary"
                    variant="outlined"
                    label={coStudent.fullName}
                    onClick={() => navigate(PROFILE_ROUTE(coStudent._id))}
                    sx={{ borderRadius: 2 }}
                  />
                ) : (
                  <Typography variant="body2">None</Typography>
                )}
              </InfoRow>

              {student?.project?.name && (
                <InfoRow label="Project" icon={<LaunchIcon fontSize="small" color="action" />}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {student.project.name}
                  </Typography>
                </InfoRow>
              )}
            </Stack>
          ) : (
            <Box sx={{ py: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                This student is not assigned to any project yet.
              </Typography>
            </Box>
          )}
        </CardContent>

        <CardActions sx={{ px: 2, py: 2, pt: 2.25, gap: 1, flexWrap: 'wrap' }}>
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
