import {MESSAGE_TYPES} from './const';
import WebSocket from 'ws';

export type TBlock = {
    index: number,
    data: string,
    previousHash: string,
}

export type TMessage = {
    type: keyof typeof MESSAGE_TYPES;
    data: string[];
}

export type TAddress = string;

export type TSocket = {
    socket: WebSocket;
    address: TAddress;
};
