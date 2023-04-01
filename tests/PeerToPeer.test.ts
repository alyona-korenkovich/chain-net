import {ChildProcessWithoutNullStreams, spawn} from 'child_process';
import {TAddress} from '../src/types';

import {expect} from '@jest/globals';
import DoneCallback = jest.DoneCallback;

const nodePath = 'src/main.ts';
const nodeJSFlags = ['--loader', 'ts-node/esm', '--es-module-specifier-resolution=node'];

type TCommand = {
  address?: TAddress,
  port?: number,
  peers?: string,
}

const getEnvVars = ({
  address,
  port,
  peers,
}: TCommand) => {
  const envVars = {
    ADDRESS: 'ws://localhost:3000',
    PEERS: '',
    PORT: '3000',
    PATH: process.env.PATH,
  };

  if (address) {
    envVars.ADDRESS = address;
  }
  if (port) {
    envVars.PORT = port.toString();
  }
  if (peers) {
    envVars.PEERS = peers;
  }

  return envVars;
};

const spawnProcess = (node: TCommand) => {
  const envVars = getEnvVars(node);
  return spawn('node', [...nodeJSFlags, nodePath], {
    env: envVars,
  });
};

const killProcesses = (processes: ChildProcessWithoutNullStreams[]) => {
  processes.forEach((process) => process.kill());
};

const checkCorrectInitialization = (node: TCommand, done: DoneCallback) => {
  const process = spawnProcess(node);
  let processData: string;

  process.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'ENOENT') {
      console.error('Invalid command');
    } else {
      console.error(err);
    }
  });

  process.stdout.on('data', (data) => {
    processData = data.toString();
  });

  setTimeout(() => {
    expect(processData).not.toBeFalsy();

    // when only been initialized, there are no opened sockets yet
    expect(processData).toContain('CONNECTED SOCKETS\' ADDRESSES: [],');

    if (node.address) {
      expect(processData).toContain(`ADDRESS: ${node.address}`);
    } else {
      expect(processData).toContain('ADDRESS: ws://localhost:3000');
    }

    if (node.peers) {
      expect(processData).toContain(`PEERS: ${node.peers}`);
    } else {
      expect(processData).toContain('PEERS: ');
    }

    if (node.port) {
      expect(processData).toContain(`PORT: ${node.port}`);
    } else {
      expect(processData).toContain('PORT: 3000');
    }
  }, 15000);

  setTimeout(() => {
    process.kill();
    done();
  }, 15500);
};

describe('Peer-to-peer network', () => {
  const nodeWOVars: TCommand = {};
  const node3000: TCommand = {
    address: 'ws://localhost:3000',
    port: 3000,
  };
  const node3001WOPeers: TCommand = {
    address: 'ws://localhost:3001',
    port: 3001,
  };
  const node3001: TCommand = {
    address: 'ws://localhost:3001',
    port: 3001,
    peers: 'ws://localhost:3000',
  };
  const node3002: TCommand = {
    address: 'ws://localhost:3002',
    port: 3002,
    peers: 'ws://localhost:3000,ws://localhost:3001',
  };

  it('should correctly create a node *without* specified env vars', (done) => {
    checkCorrectInitialization(nodeWOVars, done);
  }, 20000);

  it('should correctly create a node *with* specified env vars (as default)', (done) => {
    checkCorrectInitialization(node3000, done);
  }, 20000);

  it('should correctly create a node *with* specified env vars (non-default)', (done) => {
    checkCorrectInitialization(node3001WOPeers, done);
  }, 20000);

  it('should throw an error if node attempts to connect to not opened socket', (done) => {
    const node3001Process = spawnProcess(node3001);

    node3001Process.stderr.on('data', (data) => {
      const dataAsString = data.toString();
      if (dataAsString.startsWith('Error: ')) {
        expect(dataAsString).toContain(`code: 'ECONNREFUSED'`);
        node3001Process.kill();
        done();
      }
    });

    node3001Process.on('close', (code) => {
      console.log(`child process exited with code ${code}`);
    });
  }, 10000);

  test('two nodes get connected to each other', (done) => {
    const processNode3000 = spawnProcess(node3000);
    const processNode3001 = spawnProcess(node3001);

    let data3000: string;
    let data3001: string;

    processNode3000.stdout.on('data', (data) => {
      data3000 = data.toString();
    });

    processNode3001.stdout.on('data', (data) => {
      data3001 = data.toString();
    });

    const interval = setInterval(() => {
      if (data3000 && data3001) {
        if (data3001) {
          expect(data3001).toContain('PEERS: ws://localhost:3000,');
          expect(data3001).toContain('CONNECTED SOCKETS\' ADDRESSES: ["ws://localhost:3000"]');

          expect(data3000).toContain('PEERS: ,');
          expect(data3000).toContain('CONNECTED SOCKETS\' ADDRESSES: ["ws://localhost:3001"]');

          clearInterval(interval);
          processNode3000.kill();
          processNode3001.kill();
          done();
        }
      }
    }, 1000);
  }, 30000);

  test('three nodes get synchronized', (done) => {
    let processNode3000: ChildProcessWithoutNullStreams;
    let processNode3001: ChildProcessWithoutNullStreams;
    let processNode3002: ChildProcessWithoutNullStreams;

    let data3000Chain: string;
    let data3001Chain: string;
    let data3002Chain: string;

    let synchronized: boolean | undefined;

    const spawnProcesses = (done: DoneCallback) => {
      setTimeout( () => {
        processNode3000 = spawnProcess(node3000);
        if (processNode3000) {
          processNode3000.stdout.on('data', (data) => {
            const data3000AsString = data.toString();
            const lines = data3000AsString.split('\n');
            data3000Chain = lines[lines.length - 3];
          });
        }
        setTimeout( () => {
          processNode3001 = spawnProcess(node3001);
          if (processNode3001) {
            processNode3001.stdout.on('data', (data) => {
              const data3001AsString = data.toString();
              const lines = data3001AsString.split('\n');
              data3001Chain = lines[lines.length - 3];
            });
          }
          setTimeout( () => {
            processNode3002 = spawnProcess(node3002);
            if (processNode3002) {
              processNode3002.stdout.on('data', (data) => {
                const data3002AsString = data.toString();
                const lines = data3002AsString.split('\n');
                data3002Chain = lines[lines.length - 3];
              });
            }
            callback(done);
          }, 1000);
        }, 1000);
      });
    };

    const callback = (done: DoneCallback) => {
      if (processNode3000 && processNode3001 && processNode3002) {
        const interval = setInterval(() => {
          if (synchronized) {
            setTimeout(() => {
              expect(data3000Chain).toEqual(data3001Chain);
              expect(data3000Chain).toEqual(data3002Chain);
              expect(data3001Chain).toEqual(data3002Chain);

              processNode3000.kill();
              processNode3001.kill();
              processNode3002.kill();

              done();
            }, 100000);
            clearInterval(interval);
          } else {
            synchronized = waitForSynchronization(0, done);
          }
        }, 1500);
      }
    };

    const waitForSynchronization = (timesCalled: number, done: DoneCallback) => {
      if (timesCalled == 3) {
        killProcesses([processNode3000, processNode3001, processNode3002]);
        spawnProcesses(done);
      }

      if (data3000Chain === data3001Chain &&
          data3000Chain === data3002Chain &&
          data3001Chain === data3002Chain &&
          data3000Chain
      ) {
        return true;
      } else {
        setTimeout(() => waitForSynchronization(timesCalled + 1, done), 10000);
      }
    };

    try {
      spawnProcesses(done);
    } catch (error) {
      throw error;
    }
  }, 120000);
});
