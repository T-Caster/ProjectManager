import React from 'react';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
} from '@mui/material';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  ExitToApp as ExitToAppIcon,
  Assignment as AssignmentIcon,
  Event as EventIcon,
  Group as GroupIcon,
  NoteAdd as NoteAddIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useAuthUser } from '../contexts/AuthUserContext';

const drawerWidth = 240;

const studentMenuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Profile', icon: <PersonIcon />, path: '/profile' },
  { text: 'Propose Project', icon: <NoteAddIcon />, path: '/propose-project' },
  { text: 'Schedule Meeting', icon: <EventIcon />, path: '/schedule-meeting' },
  { text: 'Tasks', icon: <AssignmentIcon />, path: '/tasks' },
];

const mentorMenuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Profile', icon: <PersonIcon />, path: '/profile' },
    { text: 'My Students', icon: <GroupIcon />, path: '/my-students' },
    { text: 'Meetings', icon: <EventIcon />, path: '/meetings' },
];

const hodMenuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Profile', icon: <PersonIcon />, path: '/profile' },
    { text: 'Mentor Requests', icon: <NoteAddIcon />, path: '/mentor-requests' },
    { text: 'All Projects', icon: <AssignmentIcon />, path: '/all-projects' },
];

const Sidebar = () => {
  const { user, logout } = useAuthUser();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  let menuItems = [];
  if (user) {
    switch (user.role) {
      case 'student':
        if (user.mentor) {
          menuItems = studentMenuItems.filter(item => item.text !== 'Choose Mentor');
        } else {
          menuItems = studentMenuItems;
        }
        break;
      case 'mentor':
        menuItems = mentorMenuItems;
        break;
      case 'hod':
        menuItems = hodMenuItems;
        break;
      default:
        menuItems = [];
    }
  }

  return (
    <Drawer
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: theme.palette.sidebar.background,
          color: theme.palette.sidebar.text,
          borderRight: '1px solid #ddd',
        },
      }}
      variant="permanent"
      anchor="left"
    >
      <Toolbar />
      <List sx={{ mt: 1 }}>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.text}
            component={NavLink}
            to={item.path}
            selected={location.pathname === item.path}
            sx={{
              borderRadius: 1,
              mx: 1,
              mb: 0.5,
              color: theme.palette.sidebar.text,
              '&.Mui-selected': {
                backgroundColor: theme.palette.sidebar.active,
                color: theme.palette.primary.main,
              },
              '&:hover': {
                backgroundColor: theme.palette.sidebar.hover,
              },
              textDecoration: 'none',
            }}
          >
            <ListItemIcon sx={{ color: theme.palette.sidebar.text, minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItemButton>
        ))}

        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 1,
            mx: 1,
            mt: 2,
            color: theme.palette.error.main,
            '&:hover': {
              backgroundColor: 'rgba(211, 47, 47, 0.1)',
            },
          }}
        >
          <ListItemIcon sx={{ color: theme.palette.error.main, minWidth: 40 }}>
            <ExitToAppIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </List>
    </Drawer>
  );
};

export default Sidebar;
