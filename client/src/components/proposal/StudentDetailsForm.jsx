import React from 'react';
import { Grid, TextField } from '@mui/material';
import { SectionCard } from './ui';

const StudentDetailsForm = ({ formData, formErrors, handleChange, handlePhoneChange, readOnlyMode, primaryStudent }) => {
    return (
        <SectionCard title="Student Details" step={2}>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Student Name" value={primaryStudent.fullName} InputProps={{ readOnly: true }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="ID Number" value={primaryStudent.idNumber} InputProps={{ readOnly: true }} />
                </Grid>
                <Grid item xs={12}>
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
                <Grid item xs={12} sm={6}>
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
                <Grid item xs={12} sm={6}>
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
    );
};

export default StudentDetailsForm;
