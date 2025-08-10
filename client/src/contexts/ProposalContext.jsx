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
    setIsLoading(true);
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
      setIsLoading(false);
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

    const handleNewPendingProposal = (newProposal) => {
      if (user?.role === 'hod') {
        setPendingProposals(prev => addOrMoveTop(prev, newProposal));
      }
    };

    const handleProposalProcessed = ({ proposalId }) => {
      if (user?.role === 'hod') {
        setPendingProposals(prev => prev.filter(p => p._id !== proposalId));
      }
    };

    const handleMyProposalUpdate = () => {
      if (user?.role === 'student') {
        fetchProposals();
      }
    };

    socket.on('connect', onConnect);
    socket.on('new_pending_proposal', handleNewPendingProposal);
    socket.on('proposal_processed', handleProposalProcessed);
    socket.on('my_proposal_approved', handleMyProposalUpdate);
    socket.on('my_proposal_rejected', handleMyProposalUpdate);

    socket.emit('proposal:subscribe');

    return () => {
      document.removeEventListener('visibilitychange', refetchOnFocus);
      if (socket){
        socket.off('connect', onConnect);
        socket.off('new_pending_proposal', handleNewPendingProposal);
        socket.off('proposal_processed', handleProposalProcessed);
        socket.off('my_proposal_approved', handleMyProposalUpdate);
        socket.off('my_proposal_rejected', handleMyProposalUpdate);
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