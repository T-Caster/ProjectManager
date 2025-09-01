import React, { useContext } from 'react';
import { Container, Alert } from '@mui/material';
import MeetingsSection from '../components/MeetingsSection';
import { AuthUserContext } from '../contexts/AuthUserContext';
import { useMeetings } from '../contexts/MeetingContext';

const MeetingsPage = () => {
  const { user } = useContext(AuthUserContext);
  const { error } = useMeetings();
  const emptyMessage = user.role === "mentor" ? "New meeting requests from your students will appear here." : "Meetings will appear here."

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">Failed to load meetings. Please try again later.</Alert>
      </Container>
    );
  }

  return (
    <Container sx={{ py: 4 }}>
      <MeetingsSection
        title="Incoming Meetings"
        emptyStateMessage={emptyMessage}
      />
    </Container>
  );
};

export default MeetingsPage;
