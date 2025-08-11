// Simplified: we don't use intermediate "broadcast:*" relays.
// Router emits directly to the intended recipients.
// Keep the subscribe channel in case you want presence or room logic later.

const proposalHandler = (io, socket) => {
  socket.on('updateProposals', () => {
    // This event is now handled on the client side
  });
};

module.exports = proposalHandler;
