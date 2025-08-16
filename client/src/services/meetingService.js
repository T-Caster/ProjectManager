// services/meetingService.js
import axios from '../utils/axios';

const proposeMeeting = async (meetingData) => {
  const { data } = await axios.post('/meetings/propose', meetingData);
  return data;
};

const getMeetingsByProject = async (projectId) => {
  const { data } = await axios.get(`/meetings/${projectId}`);
  return data;
};

const getMeetingsForMentor = async () => {
  const { data } = await axios.get(`/meetings/for-mentor/me`);
  return data;
};

const approveMeeting = async (meetingId) => {
  const { data } = await axios.put(`/meetings/${meetingId}/approve`);
  return data;
};

const declineMeeting = async (meetingId) => {
  const { data } = await axios.put(`/meetings/${meetingId}/decline`);
  return data;
};

export default {
  proposeMeeting,
  getMeetingsByProject,
  getMeetingsForMentor,
  approveMeeting,
  declineMeeting,
};
