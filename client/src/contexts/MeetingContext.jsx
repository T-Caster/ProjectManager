import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import meetingService from '../services/meetingService';
import { onEvent, offEvent } from '../services/socketService';
import { AuthUserContext } from './AuthUserContext';

const MeetingContext = createContext();
export const useMeetings = () => useContext(MeetingContext);

const normalizeMeeting = (m) => {
  const ts = dayjs(m?.proposedDate).valueOf();
  return { ...m, ts: Number.isNaN(ts) ? Infinity : ts };
};

const byTs = (a, b) => a.ts - b.ts;

export const MeetingProvider = ({ children }) => {
  const { user } = useContext(AuthUserContext);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMeetings = useCallback(async () => {
    if (!user?.role) return;

    setLoading(true);
    setError(null);
    try {
      let promise;
      if (user.role === 'student' && user.project?._id) {
        promise = meetingService.getMeetingsByProject(user.project._id);
      } else if (user.role === 'mentor') {
        promise = meetingService.getMeetingsForMentor();
      } else {
        // For other roles like 'hod', or if student has no project, fetch nothing.
        setMeetings([]);
        setLoading(false);
        return;
      }

      const arr = await promise;
      const normalized = (Array.isArray(arr) ? arr : []).map(normalizeMeeting).sort(byTs);
      setMeetings(normalized);
    } catch (err) {
      console.error('Failed to fetch meetings', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  useEffect(() => {
    // Do not set up listeners if there is no user.
    if (!user) {
      return;
    }

    const handleMeetingUpdate = (incoming) => {
      const m = normalizeMeeting(incoming);
      setMeetings((prev) => {
        const next = [...prev];
        const idx = next.findIndex((x) => x._id === m._id);
        if (idx >= 0) {
          next[idx] = m;
        } else {
          next.push(m);
        }
        next.sort(byTs);
        return next;
      });
    };

    onEvent('newMeeting', handleMeetingUpdate);
    onEvent('meetingUpdated', handleMeetingUpdate);

    // This cleanup function will run when the user changes,
    // preventing listeners from stacking up across sessions.
    return () => {
      offEvent('newMeeting', handleMeetingUpdate);
      offEvent('meetingUpdated', handleMeetingUpdate);
    };
  }, [user]);

  // Combine all actions
  const proposeMeeting = (data) => meetingService.proposeMeeting(data);
  const postponeMeeting = (id, payload) => meetingService.postponeMeeting(id, payload);
  const approveMeeting = (id) => meetingService.approveMeeting(id); // Mentor
  const declineMeeting = (id) => meetingService.declineMeeting(id); // Mentor
  const studentApproveMeeting = (id) => meetingService.studentApproveMeeting(id);
  const studentDeclineMeeting = (id) => meetingService.studentDeclineMeeting(id);

  return (
    <MeetingContext.Provider
      value={{
        meetings,
        loading,
        error,
        refetchMeetings: fetchMeetings,
        // All actions available to consumers
        proposeMeeting,
        postponeMeeting,
        approveMeeting,
        declineMeeting,
        studentApproveMeeting,
        studentDeclineMeeting,
      }}
    >
      {children}
    </MeetingContext.Provider>
  );
};
