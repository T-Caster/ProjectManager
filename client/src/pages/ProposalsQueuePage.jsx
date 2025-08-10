import React from 'react';
import { Container, Typography, Paper, List, ListItem, ListItemText, CircularProgress, Alert } from '@mui/material';
import { useProposals } from '../contexts/ProposalContext';
import { useNavigate } from 'react-router-dom';

const ProposalsQueuePage = () => {
  const { pendingProposals, isLoading } = useProposals();
  const navigate = useNavigate();

  if (isLoading) {
    return <CircularProgress />;
  }

  return (
    <Container component={Paper} sx={{ p: 4, mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Pending Proposals
      </Typography>
      {pendingProposals.length === 0 ? (
        <Alert severity="info">There are no pending proposals at the moment.</Alert>
      ) : (
        <List>
          {pendingProposals.map((proposal) => (
            <ListItem 
              key={proposal._id} 
              divider 
              button 
              onClick={() => navigate(`/proposal-review/${proposal._id}`)}
            >
              <ListItemText
                primary={proposal.projectName}
                secondary={`By: ${proposal.author.fullName}${proposal.coStudent ? ` & ${proposal.coStudent.fullName}` : ''}`}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Container>
  );
};

export default ProposalsQueuePage;