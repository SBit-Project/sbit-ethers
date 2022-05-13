import { HDNode } from '@ethersproject/hdnode';
import { configureSbitAddressGeneration } from './helpers/utils';
import { SbitWallet } from './SbitWallet';

export class SbitHDKey {
    private readonly _hdkey: HDNode;

    static fromMasterSeed(seedBuffer: Buffer): SbitHDKey {
        const hdnode = configureSbitAddressGeneration(HDNode.fromSeed("0x" + seedBuffer.toString('hex')));
        return new SbitHDKey(hdnode);
    }

    static fromExtendedKey(base58Key: string): SbitHDKey {
        const hdnode = configureSbitAddressGeneration(HDNode.fromExtendedKey("0x" + base58Key));
        return new SbitHDKey(hdnode);
    }

    constructor(hdkey: HDNode) {
        this._hdkey = hdkey;
        configureSbitAddressGeneration(hdkey);
    }

    privateExtendedKey(): Buffer {
        if (!this._hdkey.privateKey) {
            throw new Error('This is a public key only wallet');
        }
        return Buffer.from(this._hdkey.extendedKey);
    }

    publicExtendedKey(): Buffer {
        return Buffer.from(this._hdkey.neuter().extendedKey);
    }

    derivePath(path: string): SbitHDKey {
        return new SbitHDKey(
            configureSbitAddressGeneration(HDNode.fromExtendedKey(this._hdkey.extendedKey).derivePath(path))
        );
    }

    deriveChild(index: number): SbitHDKey {
        return new SbitHDKey(
            // @ts-ignore
            configureSbitAddressGeneration(HDNode.fromExtendedKey(this._hdkey.extendedKey)._derive(index))
        );
    }

    getWallet(): SbitWallet {
        return new SbitWallet(configureSbitAddressGeneration(HDNode.fromExtendedKey(this._hdkey.extendedKey)));
    }
} 