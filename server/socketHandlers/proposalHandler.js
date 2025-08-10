// Simplified: we don't use intermediate "broadcast:*" relays.
// Router emits directly to the intended recipients.
// Keep the subscribe channel in case you want presence or room logic later.

const proposalHandler = (io, socket) => {
  socket.on('proposal:subscribe', () => {
    // no-op for now; kept for future room/presence logic
  });
};

module.exports = proposalHandler;
