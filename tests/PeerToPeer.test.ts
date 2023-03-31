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

  process.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'ENOENT') {
      console.error('Invalid command');
    } else {
      console.error(err);
    }
  });

  setTimeout(() => {
    const data = process.stdout.read();

    expect(data).not.toBeFalsy();

    // when only been initialized, there are no opened sockets yet
    expect(data.toString()).toContain('CONNECTED SOCKETS\' ADDRESSES: [],');

    if (node.address) {
      expect(data.toString()).toContain(`ADDRESS: ${node.address}`);
    } else {
      expect(data.toString()).toContain('ADDRESS: ws://localhost:3000');
    }

    if (node.peers) {
      expect(data.toString()).toContain(`PEERS: ${node.peers}`);
    } else {
      expect(data.toString()).toContain('PEERS: ');
    }

    if (node.port) {
      expect(data.toString()).toContain(`PORT: ${node.port}`);
    } else {
      expect(data.toString()).toContain('PORT: 3000');
    }
  }, 9000);

  process.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
  });

  setTimeout(() => {
    process.kill();
    done();
  }, 9500);
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
  }, 10000);

  it('should correctly create a node *with* specified env vars (as default)', (done) => {
    checkCorrectInitialization(node3000, done);
  }, 10000);

  it('should correctly create a node *with* specified env vars (non-default)', (done) => {
    checkCorrectInitialization(node3001WOPeers, done);
  }, 10000);

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
  }, 2000);

  test('two nodes get connected to each other', (done) => {
    const processNode3000 = spawnProcess(node3000);
    const processNode3001 = spawnProcess(node3001);

    const interval = setInterval(() => {
      const data3000 = processNode3000.stdout.read();
      const data3001 = processNode3001.stdout.read();

      if (data3000) {
        const data3000AsString = data3000.toString();
        if (data3001) {
          const data3001AsString = data3001.toString();

          expect(data3001AsString).toContain('PEERS: ws://localhost:3000,');
          expect(data3001AsString).toContain('CONNECTED SOCKETS\' ADDRESSES: ["ws://localhost:3000"]');

          expect(data3000AsString).toContain('PEERS: ,');
          expect(data3000AsString).toContain('CONNECTED SOCKETS\' ADDRESSES: ["ws://localhost:3001"]');

          clearInterval(interval);
          processNode3000.kill();
          processNode3001.kill();
          done();
        } else {
          console.log('Node 3001 has no data in stdout');
        }
      } else {
        console.log('Node 3000 has no data in stdout');
      }
    }, 1000);
  }, 8000);

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
          }, 500);
        }, 1000);
      }, 1500);
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
            }, 60000);
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
        setTimeout(() => waitForSynchronization(timesCalled + 1, done), 5000);
      }
    };

    spawnProcesses(done);
  }, 75000);
});
