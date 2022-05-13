/// <reference types="node" />
import { HDNode } from '@ethersproject/hdnode';
import { SbitWallet } from './SbitWallet';
export declare class SbitHDKey {
    private readonly _hdkey;
    static fromMasterSeed(seedBuffer: Buffer): SbitHDKey;
    static fromExtendedKey(base58Key: string): SbitHDKey;
    constructor(hdkey: HDNode);
    privateExtendedKey(): Buffer;
    publicExtendedKey(): Buffer;
    derivePath(path: string): SbitHDKey;
    deriveChild(index: number): SbitHDKey;
    getWallet(): SbitWallet;
}
