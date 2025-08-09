import React from 'react';
import { Paper, Typography, Chip, Box, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const StudentCard = ({ student, userRole }) => {
  const navigate = useNavigate();

  const handleStudentClick = () => {
    navigate(`/profile/${student._id}`);
  };

  const getProjectStatus = () => {
    if (!student.project) {
      return { label: 'Not Started', color: 'default' };
    }
    if (student.project.status === 'completed') {
      return { label: 'Completed', color: 'success' };
    }
    return { label: 'In Progress', color: 'primary' };
  };

  const status = getProjectStatus();

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        backgroundColor: 'background.paper',
        transition: '0.2s',
        '&:hover': { boxShadow: 4, cursor: 'pointer' },
      }}
      onClick={handleStudentClick}
    >
      <Typography variant="subtitle1" fontWeight={600}>
        {student.fullName}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {student.email}
      </Typography>
      {(userRole === 'hod' || userRole === 'mentor') && (
        <Typography variant="body2" color="text.secondary">
          ID: {student.idNumber}
        </Typography>
      )}
      {userRole === 'hod' && student.mentor && (
        <Typography variant="body2" color="text.secondary">
          Mentor:{" "}
          <Link
            component="button"
            variant="body2"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/profile/${student.mentor._id}`);
            }}
          >
            {student.mentor.fullName}
          </Link>
        </Typography>
      )}
      <Box mt={2}>
        <Chip
          label={`Project Status: ${status.label}`}
          color={status.color}
          variant="outlined"
          sx={{
            textTransform: 'capitalize',
            minWidth: 90,
            textAlign: 'center',
            fontWeight: 500,
          }}
        />
      </Box>
      {userRole === 'hod' && student.hasPendingRequest && (
        <Link
          component="button"
          variant="body2"
          onClick={(e) => {
            e.stopPropagation();
            navigate('/requests');
          }}
          sx={{ mt: 1 }}
        >
          View Pending Request
        </Link>
      )}
    </Paper>
  );
};

export default StudentCard;