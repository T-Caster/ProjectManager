import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import taskService from '../services/taskService';
import { onEvent, offEvent } from '../services/socketService';
import { AuthUserContext } from './AuthUserContext';
import { useMeetings } from './MeetingContext';

export const TaskContext = createContext(null);
export const useTasks = () => useContext(TaskContext);

// Sort by due date ascending, then creation date descending
const byDueDate = (a, b) => {
  const d1 = dayjs(a.dueDate).valueOf();
  const d2 = dayjs(b.dueDate).valueOf();
  if (d1 !== d2) return d1 - d2;
  return dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf();
};

export const TaskProvider = ({ children }) => {
  const { user } = useContext(AuthUserContext);
  const { meetings } = useMeetings();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // lightweight cache for counts by meetingId to avoid refetching
  const countCacheRef = useRef(new Map()); // meetingId -> number
  const inflightRef = useRef(new Map());   // meetingId -> Promise<number>

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await taskService.listMyTasks();
      const sorted = (Array.isArray(data) ? data : []).sort(byDueDate);
      setTasks(sorted);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (!user) return;

    const handleTaskUpdate = (incoming) => {
      setTasks((prev) => {
        const next = [...prev];
        const idx = next.findIndex((t) => t._id === incoming._id);
        if (idx >= 0) {
          next[idx] = incoming;
        } else {
          next.push(incoming);
        }
        next.sort(byDueDate);
        return next;
      });
      // invalidate count cache
      const mId = incoming.meeting?._id || incoming.meeting;
      if (mId) countCacheRef.current.delete(String(mId));
    };

    const handleTaskDelete = ({ _id }) => {
      // Before deleting, find the task to invalidate cache
      setTasks((prev) => {
        const current = prev.find((t) => t._id === _id);
        if (current) {
          const mId = current.meeting?._id || current.meeting;
          if (mId) countCacheRef.current.delete(String(mId));
        }
        return prev.filter((t) => t._id !== _id);
      });
    };

    onEvent('taskCreated', handleTaskUpdate);
    onEvent('taskUpdated', handleTaskUpdate);
    onEvent('taskDeleted', handleTaskDelete);

    return () => {
      offEvent('taskCreated', handleTaskUpdate);
      offEvent('taskUpdated', handleTaskUpdate);
      offEvent('taskDeleted', handleTaskDelete);
    };
  }, [user]);

  // Mutations call the service, but socket handles state updates.
  // We can return the promise from the service so UI can await it for pending states.
  const createTask = (payload) => taskService.createTask(payload);
  const completeTask = (taskId) => taskService.completeTask(taskId);
  const reopenTask = (taskId) => taskService.reopenTask(taskId);
  const updateTask = (taskId, payload) => taskService.updateTask(taskId, payload);
  const deleteTask = (taskId) => taskService.deleteTask(taskId);

  /**
   * Get a count of tasks for a meeting without mutating the main list.
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

  const value = useMemo(
    () => ({
      tasks,
      loading,
      error,
      meetings, // from useMeetings, passed through
      refetchTasks: fetchTasks,
      // mutations
      createTask,
      completeTask,
      reopenTask,
      updateTask,
      deleteTask,
      // counts
      countTasksForMeeting,
    }),
    [
      tasks,
      loading,
      error,
      meetings,
      fetchTasks,
      createTask,
      completeTask,
      reopenTask,
      updateTask,
      deleteTask,
      countTasksForMeeting,
    ]
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};
