import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import projectService from '../services/projectService';
import { onEvent, offEvent } from '../services/socketService';
import { AuthUserContext } from './AuthUserContext';

const ProjectContext = createContext();
export const useProjects = () => useContext(ProjectContext);

export const ProjectProvider = ({ children }) => {
  const { user } = useContext(AuthUserContext);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProjects = useCallback(async () => {
    if (!user?.role) return;

    setLoading(true);
    setError(null);
    try {
      const arr = await projectService.getProjects();
      setProjects(Array.isArray(arr) ? arr : []);
    } catch (err) {
      console.error('Failed to fetch projects', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    const handleProjectUpdate = (updatedProject) => {
      setProjects((prevProjects) =>
        prevProjects.map((p) => (p._id === updatedProject._id ? updatedProject : p))
      );
    };

    onEvent('project:updated', handleProjectUpdate);

    return () => {
      offEvent('project:updated', handleProjectUpdate);
    };
  }, []);

  const updateProjectStatus = async (projectId, status) => {
    try {
      const updatedProject = await projectService.updateProjectStatus(projectId, status);
      setProjects((prevProjects) =>
        prevProjects.map((p) => (p._id === updatedProject._id ? updatedProject : p))
      );
    } catch (err) {
      console.error('Failed to update project status', err);
      throw err;
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        loading,
        error,
        refetchProjects: fetchProjects,
        updateProjectStatus,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};
