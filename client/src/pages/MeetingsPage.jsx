import React, { useState, useContext, useMemo } from 'react';
import { Container, Snackbar, Alert } from '@mui/material';
import MeetingsSection from '../components/MeetingsSection';
import { useMeetings } from '../contexts/MeetingContext';
import { AuthUserContext } from '../contexts/AuthUserContext';

const MeetingsPage = () => {
  const { user } = useContext(AuthUserContext);
  const {
    meetings,
    loading,
    error,
    refetchMeetings,
    approveMeeting,
    declineMeeting,
    postponeMeeting,
  } = useMeetings();

  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const emptyMessage = useMemo(() => user.role === "mentor" ? "New meeting requests from your students will appear here." : "Meetings will appear here")

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchMeetings();
    } finally {
      setRefreshing(false);
    }
  };

  // Handlers now show a toast message on completion
  const handleApprove = async (id) => {
    try {
      await approveMeeting(id);
      setToast('Meeting approved successfully');
    } catch (err) {
      setToast(err?.response?.data?.message || 'Failed to approve meeting');
    }
  };

  const handleDecline = async (id) => {
    try {
      await declineMeeting(id);
      setToast('Meeting declined');
    } catch (err) {
      setToast(err?.response?.data?.message || 'Failed to decline meeting');
    }
  };

  const handlePostpone = async (id, payload) => {
    try {
      await postponeMeeting(id, payload);
      setToast('Meeting reschedule proposed');
    } catch (err) {
      setToast(err?.response?.data?.message || 'Failed to reschedule meeting');
    }
  };

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">Failed to load meetings. Please try again later.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <MeetingsSection
        title="Incoming Meetings"
        meetings={meetings}
        loading={loading}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        filter={filter}
        onFilterChange={setFilter}
        role={user.role}
        currentUserId={user?._id}
        onApprove={handleApprove}
        onDecline={handleDecline}
        onReschedule={handlePostpone}
        emptyStateMessage={emptyMessage}
      />
      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast('')}
        message={toast}
      />
    </Container>
  );
};

export default MeetingsPage;
