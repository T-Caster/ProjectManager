import React, { useMemo, useState, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Stack,
  Typography,
  Divider,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  InputAdornment,
  IconButton,
  CircularProgress,
  Button,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { useProjects } from '../contexts/ProjectContext';
import { AuthUserContext } from '../contexts/AuthUserContext';
import ProjectsGrid from '../components/ProjectsGrid';

const STATUS_KEYS = ['proposal', 'specification', 'code', 'presentation', 'done'];
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

const ProjectsPage = () => {
  const { user } = useContext(AuthUserContext);
  const { projects, loading, error, refetchProjects } = useProjects();

  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');

  const safeProjects = Array.isArray(projects) ? projects : [];

  const counts = useMemo(() => {
    const base = { all: safeProjects.length };
    STATUS_KEYS.forEach((k) => (base[k] = 0));
    safeProjects.forEach((p) => {
      if (STATUS_KEYS.includes(p.status)) base[p.status] += 1;
    });
    return base;
  }, [safeProjects]);

  const filtered = useMemo(() => {
    let list = safeProjects;

    if (statusFilter !== 'all') list = list.filter((p) => p.status === statusFilter);

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const name = p.name?.toLowerCase() || '';
        const mentor =
          p.mentor?.fullName?.toLowerCase() || p.snapshots?.mentorName?.toLowerCase() || '';
        const studentNames = (p.students || [])
          .map((s) => s?.fullName?.toLowerCase())
          .filter(Boolean)
          .join(' ');
        return name.includes(q) || mentor.includes(q) || studentNames.includes(q);
      });
    }
    return list;
  }, [safeProjects, statusFilter, query]);

  if (user?.role === 'student') {
    const pid = user?.project?._id;
    if (pid) return <Navigate to={`/projects/${pid}`} replace />;

    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper
          elevation={0}
          sx={(theme) => ({
            p: 3,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            background: theme.palette.background.paper,
            textAlign: 'center',
          })}
        >
          <EventAvailableIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>
            No project yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Your proposal hasn’t been approved yet, so your project page isn’t available.
            Once it’s approved, it will appear automatically.
          </Typography>
          <Stack direction="row" spacing={1.5} justifyContent="center">
            <Button href="/propose-project" variant="contained">
              Go to Proposal
            </Button>
            <Button href="/dashboard" variant="text">
              Back to Dashboard
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

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
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          flexWrap="wrap"
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="h5">Projects</Typography>
            <Chip size="small" label={`All: ${counts.all}`} />
            {STATUS_KEYS.map((k) => (
              <Chip
                key={k}
                size="small"
                color={STATUS_COLORS[k]}
                variant={k === 'done' ? 'filled' : 'outlined'}
                label={`${STATUS_LABELS[k]}: ${counts[k] || 0}`}
              />
            ))}
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
              {STATUS_KEYS.map((k) => (
                <ToggleButton key={k} value={k}>
                  {STATUS_LABELS[k]}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <TextField
              size="small"
              placeholder="Search by project, mentor, student…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            <IconButton onClick={refetchProjects} title="Refresh" size="small" disabled={loading}>
              {loading ? <CircularProgress size={18} /> : <RefreshIcon />}
            </IconButton>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <ProjectsGrid
          projects={filtered}
          loading={loading}
          error={error}
          onRefresh={refetchProjects}
        />
      </Paper>
    </Container>
  );
};

export default ProjectsPage;
