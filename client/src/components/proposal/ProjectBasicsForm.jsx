import React from 'react';
import { Grid } from '@mui/material';
import { SectionCard, CounterTextField } from './ui';

const MAX_LEN = {
    projectName: 120,
    background: 1500,
    objectives: 1500,
    marketReview: 1500,
    newOrImproved: 1000,
};

const ProjectBasicsForm = ({ formData, formErrors, handleChange, readOnlyMode }) => {
    return (
        <SectionCard title="Project Basics" step={1}>
            <Grid container spacing={2}>
                <Grid item xs={12}>
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

                <Grid item xs={12}>
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

                <Grid item xs={12}>
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

                <Grid item xs={12}>
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

                <Grid item xs={12}>
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
    );
};

export default ProjectBasicsForm;
