import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Box,
  CircularProgress,
  Alert,
  MenuItem,
  Stack,
  Chip,
  Divider,
  Tooltip,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import SchoolIcon from '@mui/icons-material/School';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { useParams, useNavigate } from 'react-router-dom';
import { getProposalById, approveProposal, rejectProposal } from '../services/proposalService';
import { getAllMentors } from '../services/mentorService';
import axios from '../utils/axios';

const safeDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleDateString();
};
const safeDateTime = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleString();
};
const statusColor = (status) => {
  switch (status) {
    case 'Pending': return 'warning';
    case 'Approved': return 'success';
    case 'Rejected': return 'error';
    case 'Draft': default: return 'info';
  }
};

const SectionCard = ({ title, icon, children }) => (
  <Paper
    elevation={0}
    sx={(theme) => ({
      p: 3,
      borderRadius: 3,
      border: '1px solid',
      borderColor: 'divider',
      backgroundColor: theme.palette.background.paper,
    })}
  >
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
      {icon}
      <Typography variant="h6">{title}</Typography>
    </Stack>
    <Divider sx={{ mb: 2 }} />
    {children}
  </Paper>
);

const InfoItem = ({ label, value, fullWidth = false }) => (
  <Grid size={{ xs: 12, sm: fullWidth ? 12 : 6 }}>
    <Typography variant="body2" color="text.secondary" gutterBottom>
      {label}
    </Typography>
    <Typography variant="body1">{value ?? 'N/A'}</Typography>
  </Grid>
);

const FileChip = ({ file, onError }) => {
  if (!file) return null;

  const handleDownload = async () => {
    try {
      const res = await axios.get(`/proposals/file/${file.fileId}`, { responseType: 'blob' });
      const contentType = res.headers['content-type'] || 'application/pdf';
      let filename = file.filename || 'attachment.pdf';
      const cd = res.headers['content-disposition'];
      if (cd) {
        const m = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(cd);
        if (m && m[1]) {
          try { filename = decodeURIComponent(m[1]); } catch { }
        }
      }
      const blob = new Blob([res.data], { type: contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      onError?.(err?.response?.data?.msg || 'Failed to download attachment.');
    }
  };

  return (
    <Chip
      icon={<DownloadIcon />}
      label={file.filename || 'attachment.pdf'}
      variant="outlined"
      onClick={handleDownload}
      sx={{ cursor: 'pointer' }}
    />
  );
};

const ProposalReviewPage = () => {
  const { proposalId } = useParams();
  const navigate = useNavigate();

  const [proposal, setProposal] = useState(null);
  const [mentors, setMentors] = useState([]);
  const [selectedMentor, setSelectedMentor] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Derived labels
  const authorName = useMemo(
    () => proposal?.author?.fullName ?? proposal?.authorSnapshot?.fullName ?? '—',
    [proposal]
  );
  const authorId = useMemo(
    () => proposal?.author?.idNumber ?? proposal?.authorSnapshot?.idNumber ?? '—',
    [proposal]
  );
  const authorEmail = useMemo(
    () => proposal?.author?.email ?? '',
    [proposal]
  );
  const coName = useMemo(
    () => proposal?.coStudentSnapshot?.fullName ?? proposal?.coStudent?.fullName ?? '',
    [proposal]
  );
  const coId = useMemo(
    () => proposal?.coStudentSnapshot?.idNumber ?? proposal?.coStudent?.idNumber ?? '',
    [proposal]
  );
  const coEmail = useMemo(
    () => proposal?.coStudent?.email ?? '',
    [proposal]
  );

  const locked = useMemo(
    () =>  proposal?.status !== 'Pending'
  , [proposal]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [{ data: proposalData }, { data: mentorsData }] = await Promise.all([
          getProposalById(proposalId),
          getAllMentors(),
        ]);
        setProposal(proposalData);
        setMentors(mentorsData);
        setSelectedMentor(proposalData.suggestedMentor?._id || '');
      } catch (err) {
        setError('Failed to load proposal details. It may have been removed or processed.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [proposalId]);

  const handleApprove = async () => {
    if (!selectedMentor) {
      setError('A mentor must be selected for approval.');
      return;
    }
    setIsActionLoading(true);
    setError('');
    try {
      await approveProposal(proposalId, selectedMentor);
      navigate('/proposals-queue');
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to approve proposal.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason) {
      setError('A reason is required for rejection.');
      return;
    }
    setIsActionLoading(true);
    setError('');
    try {
      await rejectProposal(proposalId, rejectionReason);
      navigate('/proposals-queue');
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to reject proposal.');
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error && !proposal) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/proposals-queue')} sx={{ mt: 2 }}>
          Back to Queue
        </Button>
      </Container>
    );
  }

  if (!proposal) return null;

  const attachment = proposal.attachments?.[0] || null;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={(theme) => ({
          p: 3,
          mb: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          background: theme.palette.background.paper,
        })}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Stack spacing={1}>
            <Typography variant="overline" color="text.secondary">Review Proposal</Typography>
            <Typography variant="h4" sx={{ lineHeight: 1.2 }}>{proposal.projectName || 'Untitled Project'}</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip size="small" color={statusColor(proposal.status)} label={proposal.status || 'Draft'} />
              {!!proposal.submittedAt && (
                <Typography variant="body2" color="text.secondary">
                  Submitted / Updated {safeDateTime(proposal.submittedAt)}
                </Typography>
              )}
              {!!proposal.reviewedAt && (
                <Typography variant="body2" color="text.secondary">
                  • Reviewed {safeDateTime(proposal.reviewedAt)}
                </Typography>
              )}
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      {proposal?.approval?.reason && (
        <SectionCard title="Rejection Details">
          <Alert severity="error">
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Reason</Typography>
            <Typography variant="body2">{proposal.approval.reason}</Typography>
            {!!proposal.reviewedAt && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Reviewed {safeDateTime(proposal.reviewedAt)}
              </Typography>
            )}
          </Alert>
        </SectionCard>
      )}

      <Grid container spacing={2}>
        {/* Left column */}
        <Grid size={{ xs: 12, md: 8 }}>
          <SectionCard title="Project Details" icon={<AssignmentIcon color="primary" />}>
            <Stack spacing={2}>
              <Typography><strong>Background:</strong> {proposal.background || '—'}</Typography>
              <Typography><strong>Objectives:</strong> {proposal.objectives || '—'}</Typography>
              <Typography><strong>Market Review:</strong> {proposal.marketReview || '—'}</Typography>
              <Typography><strong>New/Improved Aspects:</strong> {proposal.newOrImproved || '—'}</Typography>
            </Stack>
          </SectionCard>

          <SectionCard title="Status & Timeline">
            <Grid container spacing={2}>
              <InfoItem label="Status" value={proposal.status} />
              <InfoItem label="Created At" value={safeDateTime(proposal.createdAt)} />
              <InfoItem label="Submitted At" value={safeDateTime(proposal.submittedAt)} />
              <InfoItem label="Reviewed At" value={safeDateTime(proposal.reviewedAt)} />
              <InfoItem label="Last Updated" value={safeDateTime(proposal.updatedAt)} />
            </Grid>
          </SectionCard>

          <SectionCard title="Mentor & Attachment" icon={<SchoolIcon color="primary" />}>
            <Grid container spacing={2}>
              <InfoItem
                label="Suggested Mentor"
                value={proposal.suggestedMentor ? proposal.suggestedMentor.fullName : 'No mentor suggested'}
              />
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>Proposal PDF</Typography>
                {attachment
                  ? <FileChip file={attachment} onError={setError} />
                  : <Typography variant="body1">No attachment provided.</Typography>}
              </Grid>
            </Grid>
          </SectionCard>
        </Grid>

        {/* Right column */}
        <Grid size={{ xs: 12, md: 4 }}>
          <SectionCard title="Student Information" icon={<PersonIcon color="primary" />}>
            <Grid container spacing={2}>
              <InfoItem label="Author Name" value={authorName} />
              <InfoItem label="Author ID" value={authorId} />
              <InfoItem label="Author Email" value={authorEmail} />
              <InfoItem label="End of Studies" value={safeDate(proposal.endOfStudies)} />
              <InfoItem label="Address" value={proposal.address} />
              <InfoItem label="Mobile Phone" value={proposal.mobilePhone} />
            </Grid>

            {(proposal.coStudent || proposal.coStudentSnapshot) && (
              <>
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <GroupIcon color="secondary" />
                  <Typography variant="subtitle1">Co-Student</Typography>
                </Stack>
                <Grid container spacing={2}>
                  <InfoItem label="Name" value={coName} />
                  <InfoItem label="ID Number" value={coId} />
                  <InfoItem label="Email" value={coEmail} />
                </Grid>
              </>
            )}
          </SectionCard>

          <SectionCard title="HOD Actions">
            <Grid container spacing={2} alignItems="flex-start">
              <Grid size={{ xs: 12 }}>
                <TextField
                  select
                  fullWidth
                  label="Assign/Confirm Mentor"
                  value={selectedMentor}
                  onChange={(e) => setSelectedMentor(e.target.value)}
                  helperText={locked ? 'Locked (proposal is not Pending)' : (!selectedMentor ? 'A mentor must be assigned for approval' : '')}
                  error={!locked && !selectedMentor}
                  disabled={locked}
                >
                  {mentors.map((mentor) => (
                    <MenuItem key={mentor._id} value={mentor._id}>
                      {mentor.fullName}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleApprove}
                  disabled={locked || isActionLoading || !selectedMentor}
                  fullWidth
                >
                  {isActionLoading ? <CircularProgress size={24} color="inherit" /> : 'Approve'}
                </Button>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 1 }} />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Rejection Reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  helperText={locked ? 'Locked (proposal is not Pending)' : 'A reason is required to reject the proposal'}
                  disabled={locked}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleReject}
                  disabled={locked || isActionLoading || !rejectionReason}
                  fullWidth
                >
                  {isActionLoading ? <CircularProgress size={24} color="inherit" /> : 'Reject'}
                </Button>
              </Grid>

              {error && (
                <Grid size={{ xs: 12 }}>
                  <Alert severity="error">{error}</Alert>
                </Grid>
              )}
            </Grid>
          </SectionCard>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ProposalReviewPage;
