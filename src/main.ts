import sha256 from 'crypto-js/sha256';

import {MESSAGE_TYPES} from './const';
import {TAddress, TChainBit, TMessage, TSocket} from './types';
import {makeMessage, randomString} from './helpers';

import WebSocket, {WebSocketServer as WSWebSocketServer} from 'ws';
import Blockchain from './Blockchain';
import Block from './Block';

const ADDRESS = process.env.ADDRESS || 'ws://localhost:3000';
const PEERS = process.env.PEERS ? process.env.PEERS.split(',') : [];
const PORT: number = Number(process.env.PORT) || 3000;

const openedSockets: TSocket[] = [];
const connectedPeers: TAddress[] = [];

const server = new WSWebSocketServer({
  port: PORT,
});

// Work-around to support majority
let check: Array<string[]> = [];
const checked: string[] = [];
let checking = false;

const Chain = new Blockchain(4);
let tmp: Blockchain;
let lastBlockMinedAt: string;

server.on('connection', async (socket: WebSocket) => {
  socket.on('message', (message: string) => {
    const parsedMessage: TMessage = JSON.parse(message);

    let socketToSendTo;

    switch (parsedMessage.type) {
      case MESSAGE_TYPES.HANDSHAKE:
        const nodes = parsedMessage.data;

        tmp = {...Chain};
        tmp.chain = [];

        nodes.forEach((node) => {
          connect(node);
        });

        break;
      case MESSAGE_TYPES.REQUEST_CHAIN:
        // Find the socket that requested the chain from us
        const parsedURL = parsedMessage.data[0];
        const myAddress = parsedMessage.data[1] === ADDRESS;

        if (myAddress) {
          waitForSocketToOpenAndSend(parsedURL);
        }
        break;
      case MESSAGE_TYPES.SEND_CHAIN:
        const {block, isLatest} = JSON.parse(parsedMessage.data[0]);
        const blockInst = new Block({
          index: block.index,
          data: block.data,
          previousHash: block.previousHash,
        });
        blockInst.hash = block.hash;
        blockInst.nonce = block.nonce;

        if (!isLatest) {
          tmp!.chain.push(blockInst);
        } else {
          tmp!.chain.push(blockInst);
          if (tmp!.validate()) {
            Chain.chain = tmp!.chain;
          }
          tmp = new Blockchain(4);
          tmp.chain = [];
        }
        break;
      case MESSAGE_TYPES.UPDATE_CHAIN:
        if (checking) {
          return;
        }

        const newBlock = <Block>JSON.parse(parsedMessage.data[0]);
        const newBlockTimestamp = parsedMessage.data[1];
        const chainLatestBlock = Chain.getLatestBlock();
        const isNew = newBlock.index === chainLatestBlock.index + 1;
        const hasBeenChecked = checked.includes(
            JSON.stringify([chainLatestBlock.index, newBlock.previousHash]),
        );

        const getLastSymbols = (hash: string) => {
          const hashLength = hash.length;
          return hash.substring(hashLength - Chain.difficulty, hashLength);
        };

        const recalculateHash = (block: Block) => {
          return sha256(
              block.index +
              block.previousHash +
              block.data +
              block.nonce,
          ).toString();
        };

        // Majority support
        if (isNew) {
          const hashesMatch = recalculateHash(newBlock) === newBlock.hash;
          const indexIsValid = newBlock.index === chainLatestBlock.index + 1;
          const hashLastFourSymbols = getLastSymbols(newBlock.hash);
          const zerosString = Array(Chain.difficulty + 1).join('0');
          const validZerosNum = hashLastFourSymbols === zerosString;
          const hasValidHash = validZerosNum && hashesMatch;

          const prevHashMatch = chainLatestBlock.hash === newBlock.previousHash;

          if (isNew && indexIsValid && hasValidHash && prevHashMatch) {
            Chain.chain.push(newBlock);
            lastBlockMinedAt = newBlockTimestamp;
          }
        } else {
          if (!hasBeenChecked) {
            checked.push(
                JSON.stringify([
                  Chain.getLatestBlock().index,
                  Chain.getLatestBlock().previousHash,
                ]),
            );

            const lastIdx = Chain.chain.length - 1;

            checking = true;

            sendMessage(JSON.stringify(makeMessage({
              type: MESSAGE_TYPES.REQUEST_CHECK,
              data: [ADDRESS, (newBlock.index).toString()],
            })));

            setTimeout(() => {
              if (Chain.getBlock(newBlock.index)) {
                check.push([
                  JSON.stringify(Chain.getBlock(newBlock.index)),
                  lastBlockMinedAt,
                  ADDRESS,
                ]);
              }

              checking = false;

              const countAppearances = () => {
                return check.filter((group) =>
                  group[0] === mostAppearedGroup[0],
                ).length;
              };

              let mostAppearedGroup = check[0][0];
              let timesAppeared = countAppearances();
              let timestampOfMAG = JSON.parse(check[0][1]);

              // Remove duplicates
              const checkSet = new Set(check);
              check = Array.from(checkSet);

              check.forEach((group) => {
                const appearCnt = check.filter((gr) => gr === group).length;
                const timestamp = JSON.parse(group[1]);

                if (appearCnt > timesAppeared) {
                  mostAppearedGroup = group[0];
                  timesAppeared = appearCnt;
                  timestampOfMAG = timestamp;
                } else {
                  if (appearCnt === timesAppeared && (timestamp < timestampOfMAG)) {
                    mostAppearedGroup = group[0];
                    timesAppeared = appearCnt;
                    timestampOfMAG = timestamp;
                  }
                }
              });

              const group = JSON.parse(mostAppearedGroup);
              const blockFromGroup = new Block({
                index: group.index,
                data: group.data,
                previousHash: group.previousHash,
              });
              blockFromGroup.hash = group.hash;
              blockFromGroup.nonce = group.nonce;

              if (blockFromGroup.index < lastIdx) {
                Chain.chain = Chain.chain.slice(0, blockFromGroup.index);
                Chain.chain[blockFromGroup.index] = blockFromGroup;
              } else {
                Chain.chain[lastIdx] = blockFromGroup;
              }

              check.splice(0, check.length);
            }, 2500);
          } else {
            socket.send(JSON.stringify(makeMessage({
              type: MESSAGE_TYPES.UPDATE_CHAIN,
              data: [JSON.stringify(Chain.getLatestBlock()),
                lastBlockMinedAt,
              ],
            })));
          }
        }

        break;
      case MESSAGE_TYPES.REQUEST_CHECK:
        socketToSendTo = openedSockets.filter(
            (node) => node.address === parsedMessage.data[0],
        )[0].socket;
        const dataIdx = Number(parsedMessage.data[1]);

        if (Chain.getBlock(dataIdx)) {
          const msg = makeMessage({
            type: MESSAGE_TYPES.SEND_CHECK,
            data: [JSON.stringify(Chain.getBlock(dataIdx)), lastBlockMinedAt, ADDRESS],
          });

          socketToSendTo.send(
              JSON.stringify(msg),
          );
        }

        break;
      case MESSAGE_TYPES.SEND_CHECK:
        if (checking) {
          check.push([
            parsedMessage.data[0], // block
            parsedMessage.data[1], // timestamp
            parsedMessage.data[2], // address
          ]);
        }
        break;
    }
  });
});

const waitForSocketToOpenAndSend = (url: string) => {
  const filteredByAddress = openedSockets.filter(
      (node) => node.address === url,
  );

  if (filteredByAddress.length !== 0) {
    const socketToSendTo = filteredByAddress[0].socket;
    sendChainPartly(socketToSendTo, Chain.chain);
  } else {
    setTimeout(() => {
      waitForSocketToOpenAndSend(url);
    }, 500);
  }
};

const sendChainPartly = (dest: WebSocket, chain: Array<Block>) => {
  for (let i = 0; i < chain.length; i++) {
    const block: TChainBit = {
      block: chain[i],
      isLatest: i === chain.length - 1,
    };

    const msg = makeMessage({
      type: MESSAGE_TYPES.SEND_CHAIN,
      data: [JSON.stringify(block)],
    });

    dest.send(JSON.stringify(msg));
  }
};

const connect = async (address: TAddress) => {
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
          JSON.stringify(makeMessage({
            type: MESSAGE_TYPES.HANDSHAKE,
            data: [ADDRESS,
              ...connectedPeers,
            ],
          })),
      );

      connectOtherPeers(address);

      if (!tmp) {
        if (openedSockets.length !== 0) {
          socket.send(
              JSON.stringify(makeMessage({
                type: MESSAGE_TYPES.REQUEST_CHAIN,
                data: [ADDRESS, address],
              })),
          );
        } else {
          tmp = new Blockchain(4);
        }
      }
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

const connectOtherPeers = (address: TAddress) => {
  openedSockets.forEach((node) => {
    const messageAsString = JSON.stringify(makeMessage({
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

const sendMessage = (message: string) => {
  openedSockets.forEach((node) => {
    node.socket.send(message);
  });
};
// Error handling
process.on('ERROR', (err) => console.log('ERROR', err));

// Mining...
setTimeout(() => {
  setInterval(() => {
    if (Chain.chain.length < 4) {
      const newBlock = new Block({
        index: Chain.getLatestBlock().index + 1,
        data: randomString(),
        previousHash: Chain.getLatestBlock().hash,
      });

      if (!checking && newBlock.mineBlock(Chain.difficulty)) {
        Chain.addBlock(newBlock);
        lastBlockMinedAt = JSON.stringify(Date.now());
        sendMessage(JSON.stringify(makeMessage({
          type: MESSAGE_TYPES.UPDATE_CHAIN,
          data: [JSON.stringify(Chain.getLatestBlock()),
            lastBlockMinedAt,
          ],
        })));
      }
    }
  }, 5000);
}, 6500);

// Debug
setInterval(() => {
  console.log(`
      OPENED SOCKETS: ${openedSockets.toString()},
      CONNECTED SOCKETS' ADDRESSES: ${JSON.stringify(connectedPeers)},
      ADDRESS: ${ADDRESS},
      PEERS: ${PEERS},
      PORT: ${PORT}
      CHAIN: ${JSON.stringify(Chain.chain)}
  `);
}, 3000);

PEERS.forEach((peer) => connect(peer));
