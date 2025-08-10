import React, { useState, useEffect } from 'react';
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
import { useParams, useNavigate } from 'react-router-dom';
import { getProposalById, approveProposal, rejectProposal } from '../services/proposalService';
import { getAllMentors } from '../services/mentorService';

const SectionCard = ({ title, step, children }) => (
  <Paper elevation={1} sx={{ p: 3 }}>
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
      {typeof step === 'number' && <Chip size="small" color="primary" label={step} />}
      <Typography variant="h6">{title}</Typography>
    </Stack>
    <Divider sx={{ mb: 2 }} />
    {children}
  </Paper>
);

const InfoRow = ({ label, value }) => (
  <Grid item xs={12} sm={6}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body1">{value}</Typography>
  </Grid>
);

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

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [{ data: proposalData }, { data: mentorsData }] = await Promise.all([
          getProposalById(proposalId),
          getAllMentors(),
        ]);
        setProposal(proposalData);
        setMentors(mentorsData);
        setSelectedMentor(proposalData.suggestedMentor?._id || '');
      } catch (err) {
        setError('Failed to load proposal details.');
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
    try {
      await approveProposal(proposalId, selectedMentor);
      navigate('/proposals-queue');
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to approve proposal.');
      setIsActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason) {
      setError('A reason is required for rejection.');
      return;
    }
    setIsActionLoading(true);
    try {
      await rejectProposal(proposalId, rejectionReason);
      navigate('/proposals-queue');
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to reject proposal.');
      setIsActionLoading(false);
    }
  };

  if (isLoading) return <CircularProgress />;
  if (error && !proposal) return <Alert severity="error">{error}</Alert>;
  if (!proposal) return <Alert severity="info">Proposal not found.</Alert>;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Tooltip title="Back to Queue">
          <IconButton onClick={() => navigate('/proposals-queue')} aria-label="Back">
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Typography variant="h4">Review Proposal</Typography>
      </Stack>

      <Stack spacing={3}>
        <SectionCard title="Project Basics" step={1}>
          <Typography variant="h5" gutterBottom>{proposal.projectName}</Typography>
          <Typography paragraph><strong>Background:</strong> {proposal.background}</Typography>
          <Typography paragraph><strong>Objectives:</strong> {proposal.objectives}</Typography>
          <Typography paragraph><strong>Market Review:</strong> {proposal.marketReview}</Typography>
          <Typography paragraph><strong>New/Improved Aspects:</strong> {proposal.newOrImproved}</Typography>
        </SectionCard>

        <SectionCard title="Student Details" step={2}>
          <Grid container spacing={2}>
            <InfoRow label="Author Name" value={proposal.author.fullName} />
            <InfoRow label="Author ID" value={proposal.author.idNumber} />
            <InfoRow label="Author Email" value={proposal.author.email} />
            <InfoRow label="End of Studies" value={new Date(proposal.authorSnapshot.endOfStudies).toLocaleDateString()} />
          </Grid>
          {proposal.coStudent && (
            <>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <InfoRow label="Co-Student Name" value={proposal.coStudent.fullName} />
                <InfoRow label="Co-Student ID" value={proposal.coStudent.idNumber} />
                <InfoRow label="Co-Student Email" value={proposal.coStudent.email} />
              </Grid>
            </>
          )}
        </SectionCard>

        <SectionCard title="Mentor Suggestion" step={3}>
          <Typography>
            {proposal.suggestedMentor ? `Suggested Mentor: ${proposal.suggestedMentor.fullName}` : 'No mentor was suggested.'}
          </Typography>
        </SectionCard>

        <SectionCard title="HOD Actions" step={4}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={8}>
              <TextField
                select
                fullWidth
                label="Assign/Confirm Mentor"
                value={selectedMentor}
                onChange={(e) => setSelectedMentor(e.target.value)}
              >
                {mentors.map((mentor) => (
                  <MenuItem key={mentor._id} value={mentor._id}>{mentor.fullName}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button variant="contained" color="success" onClick={handleApprove} disabled={isActionLoading} fullWidth>
                Approve
              </Button>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Rejection Reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" color="error" onClick={handleReject} disabled={isActionLoading || !rejectionReason} fullWidth>
                Reject
              </Button>
            </Grid>
          </Grid>
        </SectionCard>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </Stack>
    </Container>
  );
};

export default ProposalReviewPage;