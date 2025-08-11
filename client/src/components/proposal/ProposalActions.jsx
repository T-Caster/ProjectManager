import React from 'react';
import { Paper, Box, Typography, Stack, Button, CircularProgress } from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import SendIcon from '@mui/icons-material/Send';
import { useNavigate } from 'react-router-dom';

const ProposalActions = ({ dirty, isSaving, readOnlyMode, doAction }) => {
    const navigate = useNavigate();

    return (
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
    );
};

export default ProposalActions;
