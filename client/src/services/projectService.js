import axios from '../utils/axios';

const getProjects = async () => {
  const { data } = await axios.get('/projects');
  return data;
};

const getProject = async (projectId) => {
  const { data } = await axios.get(`/projects/${projectId}`);
  return data;
};

const updateProjectStatus = async (projectId, status) => {
  const { data } = await axios.put(`/projects/${projectId}/status`, { status });
  return data;
};

export default {
  getProjects,
  getProject,
  updateProjectStatus,
};
