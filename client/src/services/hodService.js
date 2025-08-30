import axios from '../utils/axios';

export const getUsers = () => {
  return axios.get('/hod/users');
};

export const updateUser = (id, userData) => {
  return axios.put(`/hod/users/${id}`, userData);
};
