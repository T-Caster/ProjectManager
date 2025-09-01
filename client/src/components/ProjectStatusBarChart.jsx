import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Paper, Typography, useTheme } from '@mui/material';

const ProjectStatusBarChart = ({ projects, students }) => {
  const theme = useTheme();

  const data = useMemo(() => {
    const studentProjectMap = new Map();
    projects.forEach(project => {
      (project.students || []).forEach(student => {
        studentProjectMap.set(student._id, project);
      });
    });

    let notStarted = 0;
    let inProgress = 0;
    let completed = 0;

    students.forEach(student => {
      const project = studentProjectMap.get(student._id);
      if (!project) {
        notStarted++;
      } else {
        if (project.status === 'done') {
          completed++;
        } else {
          inProgress++;
        }
      }
    });

    return [
      { name: 'Not Started', students: notStarted, fill: theme.palette.error.main },
      { name: 'In Progress', students: inProgress, fill: theme.palette.warning.main },
      { name: 'Completed', students: completed, fill: theme.palette.success.main },
    ];
  }, [projects, students, theme]);

  if (students.length === 0) {
    return (
      <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
        <Typography>No student data to display.</Typography>
      </Paper>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Bar dataKey="students" name="Number of Students">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ProjectStatusBarChart;
