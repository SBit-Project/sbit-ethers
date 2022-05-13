"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SbitWallet = exports.defaultPath = exports.SLIP_BIP44_PATH = exports.SBIT_BIP44_PATH = void 0;
const utils_1 = require("ethers/lib/utils");
const bignumber_js_1 = require("bignumber.js");
const ethers_1 = require("ethers");
const utils_2 = require("./helpers/utils");
const global_vars_1 = require("./helpers/global-vars");
const IntermediateWallet_1 = require("./helpers/IntermediateWallet");
const json_wallets_1 = require("@ethersproject/json-wallets");
const hdnode_1 = require("@ethersproject/hdnode");
const bytes_1 = require("@ethersproject/bytes");
const random_1 = require("@ethersproject/random");
const keccak256_1 = require("@ethersproject/keccak256");
const logger = new utils_1.Logger("SbitWallet");
const forwardErrors = [
    utils_1.Logger.errors.INSUFFICIENT_FUNDS
];
const minimumGasPriceInGwei = "0x9502f9000";
const minimumGasPriceInWei = "0x5d21dba000";
// Sbit core wallet and electrum use coin 88
exports.SBIT_BIP44_PATH = "m/44'/88'/0'/0/0";
// Other wallets use coin 2301
// for more details, see: https://github.com/satoshilabs/slips/pull/196
exports.SLIP_BIP44_PATH = "m/44'/2301'/0'/0/0";
exports.defaultPath = exports.SLIP_BIP44_PATH;
const minimumGasPrice = "0x9502f9000";
class SbitWallet extends IntermediateWallet_1.IntermediateWallet {
    constructor(privateKey, provider, opts) {
        if (provider && provider.filterDust) {
            opts = provider;
            provider = undefined;
        }
        if (provider && !provider.getUtxos) {
            // throw new Error("SbitWallet provider requires getUtxos method: see SbitProvider")
        }
        super(privateKey, provider);
        this.sbitProvider = provider;
        this.opts = opts || {};
    }
    async serializeTransaction(utxos, neededAmount, tx, transactionType) {
        return await (0, utils_2.serializeTransaction)(utxos, 
        // @ts-ignore
        (amount) => this.provider.getUtxos(tx.from, amount), neededAmount, tx, transactionType, this.privateKey, this.compressedPublicKey, this.opts.filterDust || false);
    }
    /**
     * Override to build a raw SBIT transaction signing UTXO's
     */
    async signTransaction(transaction) {
        let gasBugFixed = true;
        if (!this.provider) {
            throw new Error("No provider set, cannot sign transaction");
        }
        // @ts-ignore
        if (this.provider.isClientVersionGreaterThanEqualTo) {
            // @ts-ignore
            gasBugFixed = await this.provider.isClientVersionGreaterThanEqualTo(0, 2, 0);
        }
        else {
            throw new Error("Must use SbitProvider");
        }
        const augustFirst2022 = 1659330000000;
        const mayThirtith2022 = 1653886800000;
        const now = new Date().getTime();
        const requireFixedJanus = now > augustFirst2022;
        const message = "You are using an outdated version of Janus that has a bug that sbit-ethers-wrapper works around, " +
            "please upgrade your Janus instance and if you have hardcoded gas price in your dapp to update it to " +
            minimumGasPriceInWei + " - if you use eth_gasPrice then nothing else should be required other than updating Janus. " +
            "this message will become an error August 1st 2022 when using Janus instances lower than version 0.2.0";
        if (!gasBugFixed) {
            if (requireFixedJanus) {
                throw new Error(message);
            }
            else if (now > mayThirtith2022) {
                logger.warn(message);
            }
        }
        if (!transaction.gasPrice) {
            let gasPrice = minimumGasPriceInWei;
            if (!gasBugFixed) {
                gasPrice = minimumGasPriceInGwei;
            }
            // 40 satoshi in WEI
            // 40 => 40000000000
            // transaction.gasPrice = "0x9502f9000";
            // 40 => 400000000000
            // transaction.gasPrice = "0x5d21dba000";
            transaction.gasPrice = gasPrice;
        }
        else if (gasBugFixed) {
            if (requireFixedJanus) {
                // no work arounds after aug 1st 2022, worst case: this just means increased gas prices (10x) and shouldn't cause any other issues
                if (transaction.gasPrice === minimumGasPriceInGwei) {
                    // hardcoded 400 gwei gas price
                    // adjust it to be the proper amount and log an error
                    transaction.gasPrice = minimumGasPriceInWei;
                }
            }
        }
        if (ethers_1.BigNumber.from(transaction.gasPrice).lt(ethers_1.BigNumber.from(minimumGasPrice))) {
            throw new Error("Gas price is too low (" + transaction.gasPrice + " - " + ethers_1.BigNumber.from(transaction.gasPrice).toString() +
                "), it needs to be greater than " + minimumGasPrice +
                " (" + ethers_1.BigNumber.from(minimumGasPrice).toString() + ") wei");
        }
        const gasPriceExponent = gasBugFixed ? 'e-10' : 'e-9';
        // convert gasPrice into satoshi
        let gasPrice = new bignumber_js_1.BigNumber(ethers_1.BigNumber.from(transaction.gasPrice).toString() + gasPriceExponent);
        transaction.gasPrice = gasPrice.toNumber();
        const tx = await (0, utils_1.resolveProperties)(transaction);
        // Refactored to check TX type (call, create, p2pkh, deploy error) and calculate needed amount
        const { transactionType, neededAmount } = (0, utils_2.checkTransactionType)(tx);
        // Check if the transactionType matches the DEPLOY_ERROR, throw error else continue
        if (transactionType === global_vars_1.GLOBAL_VARS.DEPLOY_ERROR) {
            return logger.throwError("You cannot send SBIT while deploying a contract. Try deploying again without a value.", utils_1.Logger.errors.NOT_IMPLEMENTED, {
                error: "You cannot send SBIT while deploying a contract. Try deploying again without a value.",
            });
        }
        let utxos = [];
        try {
            utxos = await this.getUtxos(tx.from, neededAmount, ["p2pk", "p2pkh"]);
        }
        catch (error) {
            if (forwardErrors.indexOf(error.code) >= 0) {
                throw error;
            }
            return logger.throwError("Needed amount of UTXO's exceed the total you own.", utils_1.Logger.errors.INSUFFICIENT_FUNDS, {
                error: error,
            });
        }
        return await this.serializeTransaction(utxos, neededAmount, tx, transactionType);
    }
    async getUtxos(from, neededAmount, types = ["p2pk", "p2pkh"]) {
        const params = [from, neededAmount, ...types];
        if (!this.sbitProvider) {
            throw new Error("No provider defined");
        }
        const result = await this.do("sbit_qetUTXOs", params);
        if (result) {
            if (result instanceof Array) {
                return result;
            }
            else {
                return [result];
            }
        }
        return [];
    }
    do(payload, params) {
        var _a, _b, _c;
        // @ts-ignore
        if (this.provider.prepareRequest) {
            // @ts-ignore
            const args = this.provider.prepareRequest(payload, params);
            if (args) {
                payload = {
                    method: args[0],
                    params: args[1],
                };
                params = args[1];
            }
        }
        // @ts-ignore
        if ((_a = this.provider) === null || _a === void 0 ? void 0 : _a.request) {
            // @ts-ignore
            return this.provider.request(payload, { params });
        }
        const next = (method) => {
            return new Promise((resolve, reject) => {
                // @ts-ignore
                this.provider[method]({
                    method: payload.method,
                    params: payload.params,
                }, undefined, (err, result) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(result);
                    }
                });
            });
        };
        // @ts-ignore
        if ((_b = this.provider) === null || _b === void 0 ? void 0 : _b.handleRequest) {
            return next('handleRequest');
            // @ts-ignore
        }
        else if ((_c = this.provider) === null || _c === void 0 ? void 0 : _c.sendAsync) {
            return next('sendAsync');
        }
        return Promise.reject(new Error("Unsupported provider"));
    }
    getPrivateKey() {
        return Buffer.from(this.privateKey);
    }
    getPrivateKeyString() {
        return this.privateKey;
    }
    getPublicKey() {
        return Buffer.from(this.publicKey);
    }
    getPublicKeyString() {
        return this.publicKey;
    }
    getAddressBuffer() {
        return Buffer.from(this.getAddressString());
    }
    getAddressString() {
        return (this.address || '').toLowerCase();
    }
    getChecksumAddressString() {
        return this.address;
    }
    static fromPrivateKey(privateKey) {
        return new SbitWallet(privateKey);
    }
    /**
     *  Static methods to create Wallet instances.
     */
    static createRandom(options) {
        let entropy = (0, random_1.randomBytes)(16);
        if (!options) {
            options = {};
        }
        if (options.extraEntropy) {
            entropy = (0, bytes_1.arrayify)((0, bytes_1.hexDataSlice)((0, keccak256_1.keccak256)((0, bytes_1.concat)([entropy, options.extraEntropy])), 0, 16));
        }
        const mnemonic = (0, hdnode_1.entropyToMnemonic)(entropy, options.locale);
        return SbitWallet.fromMnemonic(mnemonic, options.path, options.locale);
    }
    static fromEncryptedJson(json, password, progressCallback) {
        return (0, json_wallets_1.decryptJsonWallet)(json, password, progressCallback).then((account) => {
            return new SbitWallet(account);
        });
    }
    static fromEncryptedJsonSync(json, password) {
        return new SbitWallet((0, json_wallets_1.decryptJsonWalletSync)(json, password));
    }
    /**
     * Create a SbitWallet from a BIP44 mnemonic
     * @param mnemonic
     * @param path SBIT uses two different derivation paths and recommends SLIP_BIP44_PATH for external wallets, core wallets use SBIT_BIP44_PATH
     * @param wordlist
     * @returns
     */
    static fromMnemonic(mnemonic, path, wordlist) {
        if (!path) {
            path = exports.defaultPath;
        }
        const hdnode = hdnode_1.HDNode.fromMnemonic(mnemonic, "", wordlist).derivePath(path);
        return new SbitWallet((0, utils_2.configureSbitAddressGeneration)(hdnode));
    }
}
exports.SbitWallet = SbitWallet;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2JpdFdhbGxldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9saWIvU2JpdFdhbGxldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw0Q0FHMEI7QUFFMUIsK0NBQXdDO0FBQ3hDLG1DQUFxRTtBQUNyRSwyQ0FJd0I7QUFDeEIsdURBQW1EO0FBQ25ELHFFQUFpRTtBQUNqRSw4REFBeUc7QUFDekcsa0RBQWtFO0FBQ2xFLGdEQUE2RTtBQUM3RSxrREFBb0Q7QUFDcEQsd0RBQXFEO0FBSXJELE1BQU0sTUFBTSxHQUFHLElBQUksY0FBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ3hDLE1BQU0sYUFBYSxHQUFHO0lBQ2xCLGNBQU0sQ0FBQyxNQUFNLENBQUMsa0JBQWtCO0NBQ25DLENBQUM7QUFFRixNQUFNLHFCQUFxQixHQUFHLGFBQWEsQ0FBQztBQUM1QyxNQUFNLG9CQUFvQixHQUFHLGNBQWMsQ0FBQztBQUU1Qyw0Q0FBNEM7QUFDL0IsUUFBQSxlQUFlLEdBQUcsa0JBQWtCLENBQUM7QUFDbEQsOEJBQThCO0FBQzlCLHVFQUF1RTtBQUMxRCxRQUFBLGVBQWUsR0FBRyxvQkFBb0IsQ0FBQztBQUN2QyxRQUFBLFdBQVcsR0FBRyx1QkFBZSxDQUFDO0FBQzNDLE1BQU0sZUFBZSxHQUFHLGFBQWEsQ0FBQztBQUV0QyxNQUFhLFVBQVcsU0FBUSx1Q0FBa0I7SUFLOUMsWUFBWSxVQUFlLEVBQUUsUUFBYyxFQUFFLElBQVU7UUFDbkQsSUFBSSxRQUFRLElBQUksUUFBUSxDQUFDLFVBQVUsRUFBRTtZQUNqQyxJQUFJLEdBQUcsUUFBUSxDQUFDO1lBQ2hCLFFBQVEsR0FBRyxTQUFTLENBQUM7U0FDeEI7UUFDRCxJQUFJLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUU7WUFDaEMsb0ZBQW9GO1NBQ3ZGO1FBQ0QsS0FBSyxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUM1QixJQUFJLENBQUMsWUFB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