import React, { createContext, useState, useEffect, useCallback } from 'react';
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

    useEffect(() => {
        if (!user || !socket) return;

        const refetchOnFocus = () => {
            if (document.visibilityState === 'visible') fetchProposals();
        };
        document.addEventListener('visibilitychange', refetchOnFocus);

        const onConnect = () => {
            fetchProposals();
        };

        const handleUpdateProposals = () => {
            fetchProposals();
        };

        socket.on('connect', onConnect);
        socket.on('updateProposals', handleUpdateProposals);

        return () => {
            document.removeEventListener('visibilitychange', refetchOnFocus);
            if (socket) {
                socket.off('connect', onConnect);
                socket.off('updateProposals', handleUpdateProposals);
            }
        };
    }, [user, fetchProposals]);

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