import axios from 'axios';
export const SERVER_URL = 'http://localhost:5000/';
const API = axios.create({
  baseURL: `${SERVER_URL}api/`,
  headers: { 'Content-Type': 'application/json' }
});

// Attach token from localStorage to every request if available
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
