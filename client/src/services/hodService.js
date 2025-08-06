import axios from '../utils/axios';

export const getHodRequests = () => axios.get('/hod/requests');
export const approveRequest = (requestId) => axios.put(`/hod/approve/${requestId}`);
export const rejectRequest = (requestId) => axios.put(`/hod/reject/${requestId}`);