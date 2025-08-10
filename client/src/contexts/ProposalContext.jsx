import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuthUser } from './AuthUserContext';
import { getMyProposals, getProposalQueue } from '../services/proposalService';
import { socket } from '../services/socketService';

const ProposalContext = createContext();

export const useProposals = () => useContext(ProposalContext);

export const ProposalProvider = ({ children }) => {
  const { user } = useAuthUser();
  const [myProposals, setMyProposals] = useState([]);
  const [pendingProposals, setPendingProposals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProposals = async () => {
    setIsLoading(true);
    try {
      if (user.role === 'student') {
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
  };

  useEffect(() => {
    if (user) {
      fetchProposals();

      // Socket listeners
      socket.on('new_pending_proposal', (newProposal) => {
        if (user.role === 'hod') {
          setPendingProposals(prev => [newProposal, ...prev]);
        }
      });

      socket.on('proposal_approved', (approvedProject) => {
        // For student: refetch their proposals to see the status change
        // For HOD: remove from pending list
        fetchProposals(); 
      });

      socket.on('proposal_rejected', (rejectedProposal) => {
        // For student: refetch to see status and reason
        // For HOD: remove from pending list
        fetchProposals();
      });

      return () => {
        socket.off('new_pending_proposal');
        socket.off('proposal_approved');
        socket.off('proposal_rejected');
      };
    }
  }, [user]);

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