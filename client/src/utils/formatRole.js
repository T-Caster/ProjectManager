const formatRole = (role) => {
  const roleMap = {
    student: 'Student',
    mentor: 'Mentor',
    hod: 'Head of Department',
  };
  return roleMap[role] || role;
};

export default formatRole;