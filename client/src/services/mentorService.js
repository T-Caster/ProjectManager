import axios from '../utils/axios';

export const getAllMentors = () => axios.get('/mentors');
export const getMyStudents = () => axios.get('/mentors/my-students');