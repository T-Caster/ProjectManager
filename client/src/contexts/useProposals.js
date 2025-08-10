import { useContext } from 'react';
import { ProposalContext } from './ProposalContext';

export const useProposals = () => useContext(ProposalContext);