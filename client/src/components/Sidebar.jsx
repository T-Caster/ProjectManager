import React from 'react';
import { Drawer, List, ListItem, ListItemIcon, ListItemText, Toolbar } from '@mui/material';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  ExitToApp as ExitToAppIcon,
  Assignment as AssignmentIcon,
  Event as EventIcon,
  Group as GroupIcon,
  NoteAdd as NoteAddIcon,
} from '@mui/icons-material';

const drawerWidth = 240;

const Sidebar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <Drawer
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: 'primary.main',
          color: 'white',
        },
      }}
      variant="permanent"
      anchor="left"
    >
      <Toolbar />
      <List>
        <ListItem
          button
          component={NavLink}
          to="/dashboard"
          style={({ isActive }) => ({
            backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
          })}
        >
          <ListItemIcon>
            <DashboardIcon sx={{ color: 'white' }} />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItem>
        <ListItem
          button
          component={NavLink}
          to="/profile"
          style={({ isActive }) => ({
            backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
          })}
        >
          <ListItemIcon>
            <PersonIcon sx={{ color: 'white' }} />
          </ListItemIcon>
          <ListItemText primary="Profile" />
        </ListItem>
        <ListItem button>
          <ListItemIcon>
            <GroupIcon sx={{ color: '#91C8E4' }} />
          </ListItemIcon>
          <ListItemText primary="Choose Mentor" />
        </ListItem>
        <ListItem button>
          <ListItemIcon>
            <NoteAddIcon sx={{ color: '#91C8E4' }} />
          </ListItemIcon>
          <ListItemText primary="Propose Project" />
        </ListItem>
        <ListItem button>
          <ListItemIcon>
            <EventIcon sx={{ color: '#91C8E4' }} />
          </ListItemIcon>
          <ListItemText primary="Schedule Meeting" />
        </ListItem>
        <ListItem button>
          <ListItemIcon>
            <AssignmentIcon sx={{ color: '#91C8E4' }} />
          </ListItemIcon>
          <ListItemText primary="Tasks" />
        </ListItem>
        <ListItem button onClick={handleLogout}>
          <ListItemIcon>
            <ExitToAppIcon sx={{ color: '#91C8E4' }} />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </List>
    </Drawer>
  );
};

export default Sidebar;