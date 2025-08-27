import React from 'react';
import { Card, CardContent, Typography, Button, CardActions } from '@mui/material';
import { Link } from 'react-router-dom';

const ProjectCard = ({ project }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="div">
          {project.name}
        </Typography>
        <Typography sx={{ mb: 1.5 }} color="text.secondary">
          Status: {project.status}
        </Typography>
        <Typography variant="body2">
          {project.background.substring(0, 100)}...
        </Typography>
      </CardContent>
      <CardActions>
        <Button size="small" component={Link} to={`/projects/${project._id}`}>
          View Details
        </Button>
      </CardActions>
    </Card>
  );
};

export default ProjectCard;
