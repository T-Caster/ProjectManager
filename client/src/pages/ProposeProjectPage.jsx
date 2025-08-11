import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  Box,
  MenuItem,
  CircularProgress,
  Alert,
  Divider,
  Stack,
  Chip,
  Tooltip,
  IconButton,
  Snackbar,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuthUser } from '../contexts/AuthUserContext';
import { useProposals } from '../contexts/useProposals';
import {
  saveDraft,
  submitProposal,
  getEligibleCoStudents,
  getMyProposals,
  uploadProposalPdf,
} from '../services/proposalService';
import axios from '../utils/axios';
import { getAllMentors } from '../services/mentorService';
import { useNavigate, useParams } from 'react-router-dom';

const MAX_LEN = {
  projectName: 120,
  background: 1500,
  objectives: 1500,
  marketReview: 1500,
  newOrImproved: 1000,
};

const statusColor = (status) => {
  switch (status) {
    case 'Pending': return 'warning';
    case 'Approved': return 'success';
    case 'Rejected': return 'error';
    case 'Draft': default: return 'info';
  }
};

const safeDateTime = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleString();
};

const SectionCard = ({ title, step, children }) => (
  <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
      {typeof step === 'number' && <Chip size="small" color="primary" label={step} />}
      <Typography variant="h6">{title}</Typography>
    </Stack>
    <Divider sx={{ mb: 2 }} />
    {children}
  </Paper>
);

const CounterTextField = ({ value, max, helperText, ...props }) => {
  const left = Math.max(0, max - (value?.length || 0));
  const over = (value?.length || 0) > max;
  return (
    <TextField
      {...props}
      value={value}
      helperText={
        over
          ? `Too long by ${(value?.length || 0) - max} characters`
          : helperText ?? `${left} characters remaining`
      }
      error={over || props.error}
      inputProps={{ maxLength: max * 2, ...(props.inputProps || {}) }}
    />
  );
};

const toYMD = (d) => {
  try {
    return new Date(d).toISOString().substring(0, 10);
  } catch {
    return '';
  }
};
const getId = (maybeObj) =>
  typeof maybeObj === 'object' && maybeObj !== null ? maybeObj._id || '' : (maybeObj || '');

const ProposeProjectPage = () => {
  const { user } = useAuthUser();
  const navigate = useNavigate();
  const { proposalId } = useParams();
  const { myProposals, refreshProposals } = useProposals();

  const [proposal, setProposal] = useState(null);
  const [eligibleCoStudents, setEligibleCoStudents] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    projectName: '',
    background: '',
    objectives: '',
    marketReview: '',
    newOrImproved: '',
    address: '',
    mobilePhone: '',
    endOfStudies: '',
    coStudent: '',
    suggestedMentor: '',
    attachmentName: '',
    attachmentId: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [dirty, setDirty] = useState(false);

  // Read-only when Pending or Approved
  const readOnlyMode = ['Pending', 'Approved'].includes(proposal?.status);

  // Load data (no file fetching)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [coStudentsRes, mentorsRes, myProposalsRes] = await Promise.all([
          getEligibleCoStudents(),
          getAllMentors(),
          getMyProposals(),
        ]);
        if (!mounted) return;

        setEligibleCoStudents(coStudentsRes.data || []);
        setMentors(mentorsRes.data || []);

        const proposals = myProposalsRes.data || [];

        // Prefer :proposalId if present; otherwise the most recent proposal
        let target = proposalId
          ? proposals.find(p => p._id === proposalId)
          : [...proposals].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

        if (target) {
          setProposal(target);

          const firstAttachment = target.attachments?.[0] || null;

          setFormData({
            projectName: target.projectName || '',
            background: target.background || '',
            objectives: target.objectives || '',
            marketReview: target.marketReview || '',
            newOrImproved: target.newOrImproved || '',

            // Top-level contact fields on Proposal
            address: target.address || '',
            mobilePhone: target.mobilePhone || '',
            endOfStudies: target.endOfStudies ? toYMD(target.endOfStudies) : '',

            // Either populated object or raw ObjectId
            coStudent: getId(target.coStudent),
            suggestedMentor: getId(target.suggestedMentor),

            // Attachment
            attachmentName: firstAttachment?.filename || '',
            attachmentId: firstAttachment?.fileId || '',
          });
        } else {
          // New proposal (no previous)
          setProposal(null);
          setFormData(prev => ({
            ...prev,
            address: user?.address || '',
            mobilePhone: user?.mobilePhone || '',
            endOfStudies: user?.endOfStudies ? toYMD(user.endOfStudies) : '',
          }));
        }
      } catch (e) {
        console.error(e);
        setError('Failed to load initial data.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user, navigate, proposalId, myProposals]);

  // Validation
  const validate = () => {
    const errors = {};
    if (!formData.projectName) errors.projectName = 'Project name is required';
    if (!formData.background) errors.background = 'General background is required';
    if (!formData.objectives) errors.objectives = 'System objectives are required';
    if (!formData.marketReview) errors.marketReview = 'Market review is required';
    if (!formData.newOrImproved) errors.newOrImproved = 'This field is required';
    if (!formData.address) errors.address = 'Address is required';
    if (!formData.mobilePhone) {
      errors.mobilePhone = 'Mobile phone is required';
    } else if (!/^\d{3}-\d{7}$/.test(formData.mobilePhone)) {
      errors.mobilePhone = 'Phone number must be in the format xxx-xxxxxxx';
    }
    if (!formData.endOfStudies) errors.endOfStudies = 'End of studies date is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handlers
  const setField = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setDirty(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setField(name, value);
  };

  // Phone formatter ###-#######
  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    const formatted = digits.length <= 3 ? digits : `${digits.slice(0, 3)}-${digits.slice(3, 10)}`;
    setField('mobilePhone', formatted);
  };

  const handleFilePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('proposalPdf', file);

    try {
      const { data } = await uploadProposalPdf(fd);
      setField('attachmentName', data.file.originalName);
      setField('attachmentId', data.file._id);
      setToast('Attachment uploaded successfully.');
      // Persist the attachment onto the draft immediately:
      await saveDraft({ proposalId: proposal?._id, attachmentId: data.file._id });
      setToast('Attachment linked to draft.');
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.msg || 'Failed to upload file.');
    }
  };

  // Build payload (preserve unset flags when empty)
  const payload = useMemo(() => {
    const p = { ...formData };

    if (proposal?._id) p.proposalId = proposal._id;

    if (p.coStudent === '') {
      p.removeCoStudent = true;
      delete p.coStudent;
    }
    if (p.suggestedMentor === '') {
      p.removeSuggestedMentor = true;
      delete p.suggestedMentor;
    }

    return p;
  }, [formData, proposal]);

  // who to show as the "Student": prefer proposal author (snapshot) then author, else current user
  const primaryStudent = useMemo(() => {
    if (proposal?.authorSnapshot) return proposal.authorSnapshot;
    if (proposal?.author) return proposal.author; // in case it's populated
    return { fullName: user?.fullName || '', idNumber: user?.idNumber || '' };
  }, [proposal, user]);

  const displayCoStudentName = useMemo(() => {
    const id = formData.coStudent;
    if (!id) return '';
    const fromEligible = eligibleCoStudents.find(s => s._id === id)?.fullName;
    const fromSnapshot = proposal?.coStudentSnapshot?.fullName;
    return fromEligible || fromSnapshot || '(Selected student)';
  }, [formData.coStudent, eligibleCoStudents, proposal]);

  const assignedMentorName = useMemo(() => {
    // user.mentor can be an id or populated {_id}
    let id = user?.mentor?._id || user?.mentor || '';

    // If user context hasn't updated yet, but proposal is Approved,
    // fall back to the proposal's suggestedMentor id
    if (!id && proposal?.status === 'Approved') {
      id = proposal?.suggestedMentor?._id || proposal?.suggestedMentor || '';
    }

    if (!id) return '';
    return mentors.find(m => m._id === id)?.fullName || '';
  }, [user?.mentor, proposal, mentors]);

  const doAction = async (submit) => {
    setError('');
    if (submit && !validate()) {
      setError('Please fill in all required fields correctly.');
      return;
    }
    setIsSaving(true);
    try {
      const { data: savedProposal } = await saveDraft(payload);
      if (submit) {
        await submitProposal(savedProposal._id);
        await refreshProposals(); // 🔧 REFRESH
      }
      setProposal(savedProposal);
      setDirty(false);
      setToast(submit ? 'Proposal submitted.' : 'Draft saved.');
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.msg || 'An error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  // Download on click (axios -> blob -> trigger save). Axios includes Authorization header.
  const handleDownload = async () => {
    if (!formData.attachmentId) return;
    try {
      const res = await axios.get(`/proposals/file/${formData.attachmentId}`, {
        responseType: 'blob',
      });
      const contentType = res.headers['content-type'] || 'application/pdf';
      let filename = formData.attachmentName || 'attachment.pdf';
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
      setError(err?.response?.data?.msg || 'Failed to download attachment.');
    }
  };

  // Warn on refresh/close if dirty
  useEffect(() => {
    const handler = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header + status */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Back">
            <IconButton onClick={() => navigate(-1)} aria-label="Back">
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Stack>
            <Typography variant="h4">
              {proposal?._id ? 'Edit Project Proposal' : 'Propose a New Project'}
            </Typography>
            {proposal?.status && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <Chip size="small" color={statusColor(proposal.status)} label={proposal.status} />
                {!!proposal?.submittedAt && (
                  <Typography variant="body2" color="text.secondary">
                    • Submitted {safeDateTime(proposal.submittedAt)}
                  </Typography>
                )}
                {!!proposal?.reviewedAt && (
                  <Typography variant="body2" color="text.secondary">
                    • Reviewed {safeDateTime(proposal.reviewedAt)}
                  </Typography>
                )}
              </Stack>
            )}
          </Stack>
        </Stack>
        {isSaving && (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">Saving…</Typography>
          </Stack>
        )}
      </Stack>

      {/* Rejection banner (shown if reason exists, unless it has been resubmitten or approved) */}
      {(proposal?.approval?.reason && (proposal?.status !== "Pending" && proposal.status !== "Approved")) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Rejection reason</Typography>
          <Typography variant="body2">{proposal.approval.reason}</Typography>
        </Alert>
      )}

      {/* Read-only banner */}
      {readOnlyMode && (
        <Alert severity="info" sx={{ mb: 2 }}>
          This proposal is <strong>{proposal.status}</strong>. All fields are read-only.
        </Alert>
      )}

      <Stack spacing={3}>
        {/* 1. Project Basic Info */}
        <SectionCard title="Project Basics" step={1}>
          <Grid container spacing={2}>
            <Grid item size={{ xs: 12 }}>
              <CounterTextField
                fullWidth
                name="projectName"
                label="Project Name"
                value={formData.projectName}
                max={MAX_LEN.projectName}
                onChange={handleChange}
                error={!!formErrors.projectName}
                helperText={formErrors.projectName}
                disabled={readOnlyMode}
              />
            </Grid>

            <Grid item size={{ xs: 12 }}>
              <CounterTextField
                fullWidth
                multiline
                rows={4}
                name="background"
                label="General Background"
                value={formData.background}
                max={MAX_LEN.background}
                onChange={handleChange}
                error={!!formErrors.background}
                helperText={formErrors.background}
                disabled={readOnlyMode}
              />
            </Grid>

            <Grid item size={{ xs: 12 }}>
              <CounterTextField
                fullWidth
                multiline
                rows={4}
                name="objectives"
                label="System Objectives"
                value={formData.objectives}
                max={MAX_LEN.objectives}
                onChange={handleChange}
                error={!!formErrors.objectives}
                helperText={formErrors.objectives}
                disabled={readOnlyMode}
              />
            </Grid>

            <Grid item size={{ xs: 12 }}>
              <CounterTextField
                fullWidth
                multiline
                rows={4}
                name="marketReview"
                label="Current Market Review and Issues"
                value={formData.marketReview}
                max={MAX_LEN.marketReview}
                onChange={handleChange}
                error={!!formErrors.marketReview}
                helperText={formErrors.marketReview}
                disabled={readOnlyMode}
              />
            </Grid>

            <Grid item size={{ xs: 12 }}>
              <CounterTextField
                fullWidth
                multiline
                rows={4}
                name="newOrImproved"
                label="What's New or Improved"
                value={formData.newOrImproved}
                max={MAX_LEN.newOrImproved}
                onChange={handleChange}
                error={!!formErrors.newOrImproved}
                helperText={formErrors.newOrImproved}
                disabled={readOnlyMode}
              />
            </Grid>
          </Grid>
        </SectionCard>

        {/* 2. Student Details */}
        <SectionCard title="Student Details" step={2}>
          <Grid container spacing={2}>
            <Grid item size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Student Name" value={primaryStudent.fullName} InputProps={{ readOnly: true }} />
            </Grid>
            <Grid item size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="ID Number" value={primaryStudent.idNumber} InputProps={{ readOnly: true }} />
            </Grid>
            <Grid item size={{ xs: 12 }}>
              <TextField
                fullWidth
                name="address"
                label="Address"
                value={formData.address}
                onChange={handleChange}
                error={!!formErrors.address}
                helperText={formErrors.address}
                disabled={readOnlyMode}
              />
            </Grid>
            <Grid item size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                name="mobilePhone"
                label="Mobile Phone (xxx-xxxxxxx)"
                value={formData.mobilePhone}
                onChange={handlePhoneChange}
                error={!!formErrors.mobilePhone}
                helperText={formErrors.mobilePhone}
                inputProps={{ inputMode: 'numeric', pattern: '\\d{3}-\\d{7}' }}
                disabled={readOnlyMode}
              />
            </Grid>
            <Grid item size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                name="endOfStudies"
                label="End of Studies"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.endOfStudies}
                onChange={handleChange}
                error={!!formErrors.endOfStudies}
                helperText={formErrors.endOfStudies}
                inputProps={{ min: '2000-01-01', max: '2100-12-31' }}
                disabled={readOnlyMode}
              />
            </Grid>
          </Grid>
        </SectionCard>

        {/* 3. Optional Co-Student */}
        <SectionCard title="Co-Student (Optional)" step={3}>
          {readOnlyMode ? (
            <TextField
              fullWidth
              label="Co-Student"
              value={displayCoStudentName || 'None'}
              InputProps={{ readOnly: true }}
            />
          ) : (
            <Grid container spacing={2}>
              <Grid item size={{ xs: 12 }}>
                <TextField
                  select
                  fullWidth
                  name="coStudent"
                  label="Select a Co-Student"
                  value={formData.coStudent}
                  onChange={handleChange}
                >
                  <MenuItem value=""><em>None</em></MenuItem>
                  {eligibleCoStudents.filter(s => s._id !== user._id).map((s) => (
                    <MenuItem key={s._id} value={s._id}>
                      {s.fullName} ({s.idNumber})
                    </MenuItem>
                  ))}
                  {/* If current selection isn't in the eligible list, add a one-off item so it still renders */}
                  {formData.coStudent &&
                    !eligibleCoStudents.some(s => s._id === formData.coStudent) && (
                      <MenuItem value={formData.coStudent}>
                        {displayCoStudentName} (no longer eligible)
                      </MenuItem>
                    )}
                </TextField>
              </Grid>
            </Grid>
          )}
        </SectionCard>

        {/* 4. Mentor Suggestion */}
        <SectionCard title="Mentor Suggestion (Optional)" step={4}>
          <Grid container spacing={2}>
            <Grid item size={{ xs: 12 }}>
              <TextField
                select
                fullWidth
                name="suggestedMentor"
                label="Suggest a Mentor"
                value={formData.suggestedMentor}
                onChange={handleChange}
                disabled={readOnlyMode}
              >
                <MenuItem value=""><em>Let HOD Assign</em></MenuItem>
                {mentors.map((m) => (
                  <MenuItem key={m._id} value={m._id}>
                    {m.fullName}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            {readOnlyMode && (
              <Grid item size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Assigned Mentor"
                  value={
                    assignedMentorName ||
                    (proposal?.status === 'Pending' ? 'Not assigned yet' : '—')
                  }
                  InputProps={{ readOnly: true }}
                />
              </Grid>
            )}
          </Grid>
        </SectionCard>

        {/* 5. Attachments */}
        <SectionCard title="Attachments" step={5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <Button
              variant="contained"
              startIcon={<UploadFileIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={readOnlyMode}
            >
              Upload Proposal PDF
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept=".pdf"
              onChange={handleFilePick}
              disabled={readOnlyMode}
            />
            {formData.attachmentName ? (
              <Chip
                label={formData.attachmentName}
                variant="outlined"
                onDelete={
                  !readOnlyMode && formData.attachmentId
                    ? async () => {
                      try {
                        await saveDraft({ proposalId: proposal?._id, removeAttachment: true });
                        setFormData(prev => ({ ...prev, attachmentId: '', attachmentName: '' }));
                        setToast('Attachment removed.');
                      } catch (e) {
                        console.error(e);
                        setError(e?.response?.data?.msg || 'Failed to remove attachment.');
                      }
                    }
                    : undefined
                }
                onClick={handleDownload} // download still allowed in read-only
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                PDF only, up to ~10MB.
              </Typography>
            )}
          </Stack>
        </SectionCard>

        {error && <Alert severity="error">{error}</Alert>}

        <Paper
          elevation={2}
          sx={{
            position: { xs: 'static' },
            bottom: 0,
            p: 2,
            mt: 1,
            borderRadius: 2,
            bgcolor: 'background.paper',
          }}
        >
          <Box display="flex" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <Typography variant="body2" color={dirty ? 'warning.main' : 'text.secondary'}>
              {readOnlyMode ? 'Read-only (Pending/Approved)' : dirty ? 'Unsaved changes' : 'All changes saved'}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={() => navigate('/dashboard')}>
                Close
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => doAction(false)}
                disabled={isSaving || readOnlyMode}
                startIcon={!isSaving ? <SaveOutlinedIcon /> : undefined}
              >
                {isSaving ? <CircularProgress size={18} /> : 'Save Draft'}
              </Button>
              <Button
                variant="contained"
                onClick={() => doAction(true)}
                disabled={isSaving || readOnlyMode}
                endIcon={!isSaving ? <SendIcon /> : undefined}
              >
                {isSaving ? <CircularProgress size={18} /> : 'Submit Proposal'}
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Stack>

      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        message={toast || ''}
      />
    </Container>
  );
};

export default ProposeProjectPage;
