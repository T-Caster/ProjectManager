import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuthUser } from './AuthUserContext';
import { getMyProposals, getProposalQueue } from '../services/proposalService';
import { socket } from '../services/socketService';

export const ProposalContext = createContext();

export const ProposalProvider = ({ children }) => {
  const { user } = useAuthUser();
  const [myProposals, setMyProposals] = useState([]);
  const [pendingProposals, setPendingProposals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProposals = useCallback(async () => {
    if (!user) return;
    const enableLoading = (user?.role === "student" && myProposals?.length == 0) || ((user?.role === "hod" && pendingProposals?.length == 0))
    if (enableLoading){
      setIsLoading(true);
    }
    try {
      if (user.role === 'student') {
        console.log("approved!")
        const { data } = await getMyProposals();
        setMyProposals(data);
      } else if (user.role === 'hod') {
        const { data } = await getProposalQueue();
        setPendingProposals(data);
      }
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
    } finally {
      if (enableLoading){
        setIsLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  // De-dup helper by _id
  const addOrMoveTop = useCallback((list, item) => {
    const seen = new Set();
    const out = [item, ...list.filter(p => {
      if (!p || !p._id) return false;
      if (p._id === item._id) return false;
      if (seen.has(p._id)) return false;
      seen.add(p._id);
      return true;
    })];
    return out;
  }, []);

  useEffect(() => {
    if (!user || !socket) return;

    const refetchOnFocus = () => {
      if (document.visibilityState === 'visible') fetchProposals();
    };
    document.addEventListener('visibilitychange', refetchOnFocus);

    const onConnect = () => {
      // re-sync on (re)connect
      fetchProposals();
    };

    const handleUpdateProposals = () => {
      fetchProposals();
    };

    socket.on('connect', onConnect);
    socket.on('updateProposals', handleUpdateProposals);


    return () => {
      document.removeEventListener('visibilitychange', refetchOnFocus);
      if (socket){
        socket.off('connect', onConnect);
        socket.off('updateProposals', handleUpdateProposals);
      }
    };
  }, [user, fetchProposals, addOrMoveTop]);

  const value = {
    myProposals,
    pendingProposals,
    isLoading,
    refreshProposals: fetchProposals,
  };

  return (
    <ProposalContext.Provider value={value}>
      {children}
    </ProposalContext.Provider>
  );
};