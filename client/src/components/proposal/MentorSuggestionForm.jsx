import React from 'react';
import { Grid, TextField, MenuItem } from '@mui/material';
import { SectionCard } from './ui';

const MentorSuggestionForm = ({ formData, handleChange, readOnlyMode, mentors, assignedMentorName, proposal }) => {
    return (
        <SectionCard title="Mentor Suggestion (Optional)" step={4}>
            <Grid container spacing={2}>
                <Grid item xs={12}>
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
                    <Grid item xs={12}>
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
    );
};

export default MentorSuggestionForm;
