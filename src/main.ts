import {MESSAGE_TYPES} from './const';
import {TAddress, TMessage, TSocket} from './types';
import {message} from './helpers';

import WebSocket, {WebSocketServer as WSWebSocketServer} from 'ws';

const ADDRESS = process.env.ADDRESS || 'ws://localhost:3000';
const PEERS = process.env.PEERS ? process.env.PEERS.split(',') : [];
const PORT: number = Number(process.env.PORT) || 3000;

const openedSockets: TSocket[] = [];
const connectedPeers: TAddress[] = [];

const server = new WSWebSocketServer({
  port: PORT,
});

// console.log('Listening on PORT', PORT);

server.on('connection', async (socket: WebSocket) => {
  socket.on('message', (message: string) => {
    const parsedMessage: TMessage = JSON.parse(message);

    switch (parsedMessage.type) {
      case 'HANDSHAKE':
        const nodes = parsedMessage.data;

        nodes.forEach((node) => {
          connect(node);
        });
    }
  });
});

const connect = async (address: string) => {
  const socket = new WebSocket(address);
  const isItMyAddress = address === ADDRESS;
  const needsOpening = !(checkIfOpened(address) || isItMyAddress);
  const needsConnection = !(checkIfConnected(address) || isItMyAddress);

  if (needsConnection) {
    socket.on('open', () => {
      if (needsOpening) {
        openedSockets.push({
          socket,
          address,
        });
      }
      if (needsConnection) {
        connectedPeers.push(address);
      }

      socket.send(
          JSON.stringify(message({
            type: MESSAGE_TYPES.HANDSHAKE,
            data: [ADDRESS, ...connectedPeers],
          })),
      );

      connectOtherPeers(address);
    });
  }

  socket.on('close', () => {
    disconnect(address);
  });
};

const disconnect = (address: TAddress) => {
  const addressIdx = connectedPeers.indexOf(address);

  openedSockets.splice(addressIdx, 1);
  connectedPeers.splice(addressIdx, 1);
};

const connectOtherPeers = (address: string) => {
  openedSockets.forEach((node) => {
    const messageAsString = JSON.stringify(message({
      type: MESSAGE_TYPES.HANDSHAKE,
      data: [address],
    }));

    node.socket.send(messageAsString);
  });
};

const checkIfOpened = (address: TAddress) => {
  return openedSockets.find((socket) =>
    socket.address === address,
  );
};

const checkIfConnected = (address: TAddress) => {
  return connectedPeers.find((peerAddress) =>
    peerAddress === address,
  );
};

// Error handling
process.on('ERROR', (err) => console.log('ERROR', err));

// Debug
setInterval(() => {
  console.log(`CONNECTED SOCKETS' ADDRESSES: ${JSON.stringify(connectedPeers)},
      ADDRESS: ${ADDRESS},
      PEERS: ${PEERS},
      PORT: ${PORT}
  `);
}, 1000);

PEERS.forEach((peer) => connect(peer));
