import React from 'react';
import { Typography, Stack, Chip, Tooltip, IconButton, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';

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

const ProposalHeader = ({ proposal, isSaving }) => {
    const navigate = useNavigate();

    return (
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
    );
};

export default ProposalHeader;
