import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthUser } from '../contexts/AuthUserContext';

const RoleBasedGuard = ({ roles }) => {
  const { user, loading } = useAuthUser();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (user && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }

  if (!user) {
    return null;
  }

  return <Outlet />;
};

export default RoleBasedGuard;