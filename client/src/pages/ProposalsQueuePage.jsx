import React, { useEffect, useMemo, useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Stack,
  Chip,
  Button,
  Box,
  TextField,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import SchoolIcon from '@mui/icons-material/School';
import { useProposals } from '../contexts/useProposals';
import { useNavigate } from 'react-router-dom';

const timeAgo = (d) => {
  if (!d) return '—';
  const now = Date.now();
  const ts = new Date(d).getTime();
  if (Number.isNaN(ts)) return '—';
  const diff = Math.max(0, now - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const CardRow = ({ label, value, icon }) => (
  <Stack direction="row" spacing={1} alignItems="center" minWidth={0}>
    {icon}
    <Typography variant="body2" color="text.secondary">{label}:</Typography>
    <Typography variant="body2" noWrap title={value || '—'}>
      {value || '—'}
    </Typography>
  </Stack>
);

const ProposalsQueuePage = () => {
  const { pendingProposals, isLoading, refreshProposals } = useProposals();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');

  useEffect(() => {
    refreshProposals();
  }, [refreshProposals]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = Array.isArray(pendingProposals) ? pendingProposals : [];
    const sorted = [...list].sort((a, b) => {
      const as = new Date(a.submittedAt || a.createdAt || 0).getTime();
      const bs = new Date(b.submittedAt || b.createdAt || 0).getTime();
      return as - bs; // oldest first
    });
    if (!q) return sorted;
    return sorted.filter((p) => {
      const author = p.authorSnapshot?.fullName || '';
      const co = p.coStudentSnapshot?.fullName || '';
      const mentor = p.suggestedMentor?.fullName || '';
      return (
        (p.projectName || '').toLowerCase().includes(q) ||
        author.toLowerCase().includes(q) ||
        co.toLowerCase().includes(q) ||
        mentor.toLowerCase().includes(q)
      );
    });
  }, [pendingProposals, query]);

  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper
        elevation={0}
        sx={(t) => ({
          p: 3,
          borderRadius: 3,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        })}
      >
        {/* Header */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="h4">Pending Proposals</Typography>
            <Chip label={`${filtered.length}`} size="small" color="primary" sx={{ ml: 0.5, fontWeight: 600 }} />
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" width={{ xs: '100%', sm: 'auto' }}>
            <TextField
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by project, author, co-student, mentor…"
              size="small"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="primary" />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: { sm: 320 } }}
            />
            <Tooltip title="Refresh">
              <span>
                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refreshProposals}>
                  Refresh
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        {filtered.length === 0 ? (
          <Alert severity="info">There are no pending proposals at the moment.</Alert>
        ) : (
          // Responsive grid (no overlap, graceful wrap)
          <Box
            sx={(t) => ({
              display: 'grid',
              gap: 2,
              gridTemplateColumns: '1fr',
              [t.breakpoints.up('sm')]: 'grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))',
              [t.breakpoints.up('md')]: 'grid-template-columns: repeat(auto-fill, minmax(360px, 1fr))',
            })}
          >
            {filtered.map((p) => {
              const author = p.authorSnapshot?.fullName ?? '—';
              const co = p.coStudentSnapshot?.fullName ?? '';
              const mentor = p.suggestedMentor?.fullName ?? '';
              const submitted = p.submittedAt || p.createdAt;
              const hasPdf = (p.attachments?.length || 0) > 0;

              return (
                <Paper
                  key={p._id}
                  onClick={() => navigate(`/proposal-review/${p._id}`)}
                  elevation={0}
                  sx={(t) => ({
                    p: 2.5,
                    borderRadius: 3,
                    cursor: 'pointer',
                    transition: 'all .15s ease',
                    border: '1px solid',
                    borderColor: 'divider',
                    background: t.palette.background.paper,
                    '&:hover': {
                      boxShadow: '0px 10px 25px rgba(0,0,0,0.06)',
                      borderColor: 'primary.light',
                      transform: 'translateY(-1px)',
                    },
                    minWidth: 0, // prevent overflow in grid items
                  })}
                >
                  <Stack spacing={1.25}>
                    {/* Title row */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center" minWidth={0}>
                      <Typography
                        variant="h6"
                        sx={{ lineHeight: 1.2 }}
                        noWrap
                        title={p.projectName}
                      >
                        {p.projectName}
                      </Typography>
                      <Stack direction="row" spacing={0.5} flexShrink={0}>
                        {hasPdf && (
                          <Chip size="small" variant="outlined" icon={<PictureAsPdfIcon />} label="PDF" />
                        )}
                        <Chip size="small" color="warning" label="Pending" />
                      </Stack>
                    </Stack>

                    {/* Meta rows */}
                    <Stack direction="row" spacing={2} flexWrap="wrap">
                      <CardRow label="By" value={author} icon={<PersonIcon fontSize="small" color="primary" />} />
                      <CardRow
                        label="Co-Student"
                        value={co || 'None'}
                        icon={<GroupIcon fontSize="small" color="secondary" />}
                      />
                      <CardRow
                        label="Suggested mentor"
                        value={mentor || '—'}
                        icon={<SchoolIcon fontSize="small" color="primary" />}
                      />
                    </Stack>

                    <Typography variant="caption" color="text.secondary">
                      Submitted {timeAgo(submitted)}
                    </Typography>
                  </Stack>
                </Paper>
              );
            })}
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default ProposalsQueuePage;
