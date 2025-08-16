import React, { createContext, useContext, useState, useEffect } from 'react';
import dayjs from 'dayjs';
import meetingService from '../services/meetingService';
import { onEvent, offEvent } from '../services/socketService';
import { AuthUserContext } from './AuthUserContext';

const MeetingContext = createContext();
export const useMeetings = () => useContext(MeetingContext);

// Normalize any meeting object into a consistent shape
const normalizeMeeting = (m) => {
  const ts = dayjs(m?.proposedDate).valueOf();
  return {
    ...m,
    ts: Number.isNaN(ts) ? Infinity : ts, // invalid dates sink to the end but don't break sort
  };
};

// Stable numeric sort by timestamp
const byTs = (a, b) => a.ts - b.ts;

export const MeetingProvider = ({ children }) => {
  const { user } = useContext(AuthUserContext);
  const [meetings, setMeetings] = useState([]);

  const fetchMeetings = () => {
    const projectId = user?.project?._id;
    if (!projectId) return;

    meetingService
      .getMeetingsByProject(projectId)
      .then((arr) => {
        const normalized = (Array.isArray(arr) ? arr : []).map(normalizeMeeting).sort(byTs);
        setMeetings(normalized);
      })
      .catch((err) => console.error('Failed to fetch meetings', err));
  };

  useEffect(() => {
    fetchMeetings();

    const handleNewMeeting = (incoming) => {
      const m = normalizeMeeting(incoming);

      setMeetings((prev) => {
        // De-dup by _id if socket echoes your own create
        const existsIdx = prev.findIndex((x) => x._id === m._id && m._id);
        const next = existsIdx >= 0 ? [...prev.slice(0, existsIdx), m, ...prev.slice(existsIdx + 1)] : [...prev, m];
        next.sort(byTs);
        return next;
      });
    };

    onEvent('newMeeting', handleNewMeeting);
    return () => offEvent('newMeeting', handleNewMeeting);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.project?._id]); // refetch/rebind when project changes

  const proposeMeeting = async (meetingData) => {
    // Rely on socket to add (avoids double-insert).
    // Optionally, do an optimistic insert here with normalizeMeeting(...) if desired.
    return meetingService.proposeMeeting(meetingData);
  };

  return (
    <MeetingContext.Provider
      value={{
        meetings,
        proposeMeeting,
        refetchMeetings: fetchMeetings,
      }}
    >
      {children}
    </MeetingContext.Provider>
  );
};
