import React from 'react';
import { Grid, TextField, MenuItem } from '@mui/material';
import { SectionCard } from './ui';

const CoStudentForm = ({ formData, handleChange, readOnlyMode, displayCoStudentName, eligibleCoStudents, user }) => {
    return (
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
                    <Grid item xs={12}>
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
    );
};

export default CoStudentForm;
