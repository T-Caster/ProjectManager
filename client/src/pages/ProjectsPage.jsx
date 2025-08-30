import React, { useMemo, useState } from 'react';
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
  Grid,
  Button,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { useProjects } from '../contexts/ProjectContext';
import { AuthUserContext } from '../contexts/AuthUserContext';
import { useContext } from 'react';
import ProjectCard from '../components/ProjectCard';

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

  const [statusFilter, setStatusFilter] = useState('all'); // all | proposal | specification | code | presentation | done
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
        const mentor = p.mentor?.fullName?.toLowerCase() || p.snapshots?.mentorName?.toLowerCase() || '';
        const studentNames = (p.students || [])
          .map((s) => s?.fullName?.toLowerCase())
          .filter(Boolean)
          .join(' ');
        return name.includes(q) || mentor.includes(q) || studentNames.includes(q);
      });
    }
    return list;
  }, [safeProjects, statusFilter, query]);

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
        {/* Header: title, counts, filters, search, refresh */}
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
                <ToggleButton key={k} value={k}>{STATUS_LABELS[k]}</ToggleButton>
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

            <IconButton
              onClick={refetchProjects}
              title="Refresh"
              size="small"
              disabled={loading}
            >
              {loading ? <CircularProgress size={18} /> : <RefreshIcon />}
            </IconButton>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Content */}
        {loading ? (
          <Stack alignItems="center" py={6} spacing={2}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">Loading projects…</Typography>
          </Stack>
        ) : error ? (
          <Stack alignItems="center" py={6} spacing={1.5}>
            <EventAvailableIcon color="error" sx={{ fontSize: 36 }} />
            <Typography color="error">Failed to load projects.</Typography>
            <Button onClick={refetchProjects} variant="outlined" size="small">Try again</Button>
          </Stack>
        ) : filtered.length === 0 ? (
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
            <EventAvailableIcon color="primary" sx={{ fontSize: 36 }} />
            <Typography variant="h6" color="text.secondary" sx={{ mt: 1 }}>
              No projects match your filters.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {filtered.map((p) => (
              <Grid key={p._id} item size={{ xs: 12, sm: 6, md: 4 }}>
                <ProjectCard project={p} currentUserRole={user?.role} />
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>
    </Container>
  );
};

export default ProjectsPage;
