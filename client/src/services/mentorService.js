import axios from '../utils/axios';

export const getMentors = () => axios.get('/mentors');
export const getMyMentorRequest = () => axios.get('/mentors/my-request');
export const requestMentor = (mentorId) => axios.post(`/mentors/request/${mentorId}`);
export const getMyStudents = () => axios.get('/mentors/my-students');