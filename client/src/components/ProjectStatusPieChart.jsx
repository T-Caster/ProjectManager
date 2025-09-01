import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Typography, Paper, useTheme } from '@mui/material';

const STATUS_LABELS = {
  proposal: 'Proposal',
  specification: 'Specification',
  code: 'Code',
  presentation: 'Presentation',
  done: 'Done',
};

const ProjectStatusPieChart = ({ projects }) => {
  const theme = useTheme();

  const COLORS = {
    proposal: theme.palette.warning.main,
    specification: theme.palette.info.main,
    code: theme.palette.primary.main,
    presentation: theme.palette.secondary.main,
    done: theme.palette.success.main,
  };

  const data = useMemo(() => {
    const statusCounts = projects.reduce((acc, project) => {
      const status = project.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return Object.keys(statusCounts).map((status) => ({
      name: STATUS_LABELS[status] || 'Unknown',
      value: statusCounts[status],
      color: COLORS[status] || theme.palette.grey[500],
    }));
  }, [projects, COLORS]);

  if (projects.length === 0) {
    return (
      <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
        <Typography>No project data to display.</Typography>
      </Paper>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          nameKey="name"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default ProjectStatusPieChart;
