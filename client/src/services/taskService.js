import axios from '../utils/axios';

const listMyTasks = async () => {
  const { data } = await axios.get('/tasks/mine');
  return data;
};

const listByProject = async (projectId) => {
  const { data } = await axios.get(`/tasks/project/${projectId}`);
  return data;
};

const listByMeeting = async (meetingId) => {
  const { data } = await axios.get(`/tasks/meeting/${meetingId}`);
  return data;
};

const createTask = async ({ meetingId, title, description, dueDate }) => {
  const { data } = await axios.post('/tasks', { meetingId, title, description, dueDate });
  return data;
};

const updateTask = async (taskId, payload) => {
  const { data } = await axios.put(`/tasks/${taskId}`, payload);
  return data;
};

const completeTask = async (taskId) => {
  const { data } = await axios.put(`/tasks/${taskId}/complete`);
  return data;
};

const reopenTask = async (taskId) => {
  const { data } = await axios.put(`/tasks/${taskId}/reopen`);
  return data;
};

const deleteTask = async (taskId) => {
  const { data } = await axios.delete(`/tasks/${taskId}`);
  return data;
};

export default {
  listMyTasks,
  listByProject,
  listByMeeting,
  createTask,
  updateTask,
  completeTask,
  reopenTask,
  deleteTask,
};
