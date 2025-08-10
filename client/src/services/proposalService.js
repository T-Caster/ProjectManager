import axios from '../utils/axios';

// Files
export const uploadProposalPdf = (formData) => axios.post('/proposals/upload', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// Drafts
export const saveDraft = (proposalData) => axios.post('/proposals/draft', proposalData);

// Submission
export const submitProposal = (proposalId) => axios.put(`/proposals/${proposalId}/submit`);

// Getters
export const getMyProposals = () => axios.get('/proposals/my');
export const getProposalQueue = () => axios.get('/proposals/queue'); // HOD
export const getProposalById = (proposalId) => axios.get(`/proposals/${proposalId}`);
export const getEligibleCoStudents = () => axios.get('/proposals/eligible-co-students');
export const getProposalFile = (fileId) => axios.get(`/proposals/file/${fileId}`, { responseType: 'blob' });  

// HOD Actions
export const approveProposal = (proposalId, mentorId) => axios.put(`/proposals/${proposalId}/approve`, { mentorId });
export const rejectProposal = (proposalId, reason) => axios.put(`/proposals/${proposalId}/reject`, { reason });
