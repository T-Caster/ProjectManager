// client/src/contexts/TaskContext.jsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import taskService from '../services/taskService';
import { AuthUserContext } from './AuthUserContext';
import { useMeetings } from './MeetingContext';

export const TaskContext = createContext(null);

export const useTasks = () => useContext(TaskContext);

export const TaskProvider = ({ children }) => {
  const { user } = useContext(AuthUserContext);
  const { meetings } = useMeetings();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  // lightweight cache for counts by meetingId to avoid refetching
  const countCacheRef = useRef(new Map()); // meetingId -> number
  const inflightRef = useRef(new Map());   // meetingId -> Promise<number>

  // server fetchers (populate main list)
  const fetchByProject = useCallback(async (projectId) => {
    setLoading(true);
    try {
      const data = await taskService.listByProject(projectId);
      setTasks(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchByMeeting = useCallback(async (meetingId) => {
    setLoading(true);
    try {
      const data = await taskService.listByMeeting(meetingId);
      setTasks(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  // mutations
  const completeTask = useCallback(async (taskId) => {
    const updated = await taskService.completeTask(taskId);
    setTasks((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
    // invalidate count cache for that task's meeting if present
    const mId = updated.meeting?._id || updated.meeting;
    if (mId && countCacheRef.current.has(String(mId))) {
      countCacheRef.current.delete(String(mId));
    }
    return updated;
  }, []);

  const reopenTask = useCallback(async (taskId) => {
    const updated = await taskService.reopenTask(taskId);
    setTasks((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
    const mId = updated.meeting?._id || updated.meeting;
    if (mId && countCacheRef.current.has(String(mId))) {
      countCacheRef.current.delete(String(mId));
    }
    return updated;
  }, []);

  const updateTask = useCallback(async (taskId, payload) => {
    const updated = await taskService.updateTask(taskId, payload);
    setTasks((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
    return updated;
  }, []);

  const deleteTask = useCallback(async (taskId) => {
    // grab meeting id before deletion so we can invalidate cache
    const current = tasks.find((t) => t._id === taskId);
    await taskService.deleteTask(taskId);
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
    const mId = current?.meeting?._id || current?.meeting;
    if (mId && countCacheRef.current.has(String(mId))) {
      countCacheRef.current.delete(String(mId));
    }
  }, [tasks]);

  const createTask = useCallback(async (payload) => {
    const created = await taskService.createTask(payload);
    setTasks((prev) => [created, ...prev]);
    const mId = created.meeting?._id || created.meeting;
    if (mId && countCacheRef.current.has(String(mId))) {
      countCacheRef.current.delete(String(mId));
    }
    return created;
  }, []);

  /**
   * NEW: get a count of tasks for a meeting without mutating the main list.
   * Uses a small cache + inflight de-dup.
   */
  const countTasksForMeeting = useCallback(async (meetingId) => {
    const key = String(meetingId);
    if (countCacheRef.current.has(key)) return countCacheRef.current.get(key);

    if (inflightRef.current.has(key)) return inflightRef.current.get(key);

    const p = taskService.listByMeeting(meetingId)
      .then((data) => {
        const n = Array.isArray(data) ? data.length : 0;
        countCacheRef.current.set(key, n);
        inflightRef.current.delete(key);
        return n;
      })
      .catch((err) => {
        inflightRef.current.delete(key);
        throw err;
      });

    inflightRef.current.set(key, p);
    return p;
  }, []);

  // TODO: sockets could update counts and list together
  useEffect(() => {
    // placeholder for socket wiring
  }, []);

  const value = useMemo(
    () => ({
      tasks,
      loading,
      meetings,
      // fetchers
      fetchByProject,
      fetchByMeeting,
      // mutations
      completeTask,
      reopenTask,
      updateTask,
      deleteTask,
      createTask,
      // counts
      countTasksForMeeting,
    }),
    [
      tasks,
      loading,
      meetings,
      fetchByProject,
      fetchByMeeting,
      completeTask,
      reopenTask,
      updateTask,
      deleteTask,
      createTask,
      countTasksForMeeting,
    ]
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};
