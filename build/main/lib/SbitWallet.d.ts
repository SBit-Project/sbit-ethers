/// <reference types="node" />
import { /*Provider,*/ TransactionRequest } from "@ethersproject/abstract-provider";
import { IntermediateWallet } from './helpers/IntermediateWallet';
import { ProgressCallback } from "@ethersproject/json-wallets";
import { Bytes } from "@ethersproject/bytes";
import { Wordlist } from "@ethersproject/wordlists";
export declare const SBIT_BIP44_PATH = "m/44'/88'/0'/0/0";
export declare const SLIP_BIP44_PATH = "m/44'/2301'/0'/0/0";
export declare const defaultPath = "m/44'/2301'/0'/0/0";
export declare class SbitWallet extends IntermediateWallet {
    private opts;
    private readonly sbitProvider?;
    constructor(privateKey: any, provider?: any, opts?: any);
    protected serializeTransaction(utxos: Array<any>, neededAmount: string, tx: TransactionRequest, transactionType: number): Promise<string>;
    /**
     * Override to build a raw SBIT transaction signing UTXO's
     */
    signTransaction(transaction: TransactionRequest): Promise<string>;
    getUtxos(from?: string, neededAmount?: number, types?: string[]): Promise<any[]>;
    private do;
    getPrivateKey(): Buffer;
    getPrivateKeyString(): string;
    getPublicKey(): Buffer;
    getPublicKeyString(): string;
    getAddressBuffer(): Buffer;
    getAddressString(): string;
    getChecksumAddressString(): string;
    static fromPrivateKey(privateKey: string): SbitWallet;
    /**
     *  Static methods to create Wallet instances.
     */
    static createRandom(options?: any): IntermediateWallet;
    static fromEncryptedJson(json: string, password: Bytes | string, progressCallback?: ProgressCallback): Promise<IntermediateWallet>;
    static fromEncryptedJsonSync(json: string, password: Bytes | string): IntermediateWallet;
    /**
     * Create a SbitWallet from a BIP44 mnemonic
     * @param mnemonic
     * @param path SBIT uses two different derivation paths and recommends SLIP_BIP44_PATH for external wallets, core wallets use SBIT_BIP44_PATH
     * @param wordlist
     * @returns
     */
    static fromMnemonic(mnemonic: string, path?: string, wordlist?: Wordlist): IntermediateWallet;
}
