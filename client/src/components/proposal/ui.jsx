import React from 'react';
import { Paper, Stack, Chip, Typography, Divider, TextField } from '@mui/material';

export const SectionCard = ({ title, step, children }) => (
    <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            {typeof step === 'number' && <Chip size="small" color="primary" label={step} />}
            <Typography variant="h6">{title}</Typography>
        </Stack>
        <Divider sx={{ mb: 2 }} />
        {children}
    </Paper>
);

export const CounterTextField = ({ value, max, helperText, ...props }) => {
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
