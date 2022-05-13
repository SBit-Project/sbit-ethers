"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareVersion = exports.SbitProviderSubprovider = exports.SbitWebSocketProvider = exports.SbitJsonRpcProvider = exports.SbitProvider = void 0;
const ethers_1 = require("ethers");
const utils_1 = require("./helpers/utils");
const logger_1 = require("@ethersproject/logger");
const logger = new logger_1.Logger("sbit-ethers");
const properties_1 = require("@ethersproject/properties");
class SbitProvider extends SbitProviderMixin(ethers_1.providers.JsonRpcProvider) {
}
exports.SbitProvider = SbitProvider;
;
class SbitJsonRpcProvider extends SbitProviderMixin(ethers_1.providers.JsonRpcProvider) {
}
exports.SbitJsonRpcProvider = SbitJsonRpcProvider;
;
class SbitWebSocketProvider extends SbitProviderMixin(ethers_1.providers.WebSocketProvider) {
}
exports.SbitWebSocketProvider = SbitWebSocketProvider;
;
function timer(timeout) {
    return new Promise(function (resolve) {
        setTimeout(resolve, timeout);
    });
}
class ProviderSubprovider extends ethers_1.providers.BaseProvider {
    constructor(providerSubprovider, network) {
        if (!providerSubprovider) {
            throw new Error("Provider cannot be empty");
        }
        let networkOrReady = network;
        // The network is unknown, query the JSON-RPC for it
        if (networkOrReady == null) {
            networkOrReady = new Promise((resolve, reject) => {
                setTimeout(() => {
                    this.detectNetwork().then((network) => {
                        resolve(network);
                    }, (error) => {
                        reject(error);
                    });
                }, 0);
            });
        }
        super(networkOrReady);
        this._eventLoopCache = {};
        this.providerSubprovider = providerSubprovider;
    }
    get _cache() {
        if (this._eventLoopCache == null) {
            this._eventLoopCache = {};
        }
        return this._eventLoopCache;
    }
    send(method, params) {
        return new Promise((resolve, reject) => {
            this.providerSubprovider.handleRequest({
                method,
                params,
            }, undefined, (err, response) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(response);
                }
            });
        });
    }
    detectNetwork() {
        if (!this._cache["detectNetwork"]) {
            this._cache["detectNetwork"] = this._uncachedDetectNetwork();
            // Clear this cache at the beginning of the next event loop
            setTimeout(() => {
                this._cache["detectNetwork"] = null;
            }, 0);
        }
        return this._cache["detectNetwork"];
    }
    async _uncachedDetectNetwork() {
        await timer(0);
        let chainId = null;
        try {
            chainId = await this.send("eth_chainId", []);
        }
        catch (error) {
            try {
                chainId = await this.send("net_version", []);
            }
            catch (error) { }
        }
        if (chainId != null) {
            const getNetwork = (0, properties_1.getStatic)(this.constructor, "getNetwork");
            try {
                return getNetwork(BigNumber.from(chainId).toNumber());
            }
            catch (error) {
                return logger.throwError("could not detect network", logger_1.Logger.errors.NETWORK_ERROR, {
                    chainId: chainId,
                    event: "invalidNetwork",
                    serverError: error
                });
            }
        }
        return logger.throwError("could not detect network", logger_1.Logger.errors.NETWORK_ERROR, {
            event: "noNetwork"
        });
    }
}
class SbitProviderSubprovider extends SbitProviderMixin(ProviderSubprovider) {
}
exports.SbitProviderSubprovider = SbitProviderSubprovider;
;
function SbitProviderMixin(Base) {
    return class SbitProviderMixin extends Base {
        // EIP-1193 deprecated api support
        sendAsync(payload, cb) {
            // @ts-ignore
            this.send(payload.method, payload.params || []).then((result) => {
                cb(null, result);
            }).catch((err) => {
                cb(err);
            });
        }
        handleRequest(payload, _, end) {
            this.sendAsync(payload, end);
        }
        // EIP-1193
        request(payload) {
            // @ts-ignore
            return this.send(payload.method, payload.params || []);
        }
        /**
         * Override for SBIT parsing of transaction
         * https://github.com/ethers-io/ethers.js/blob/master/packages/providers/src.ts/base-provider.ts
         */
        async sendTransaction(signedTransaction) {
            // @ts-ignore
            await this.getNetwork();
            const signedTx = await Promise.resolve(signedTransaction);
            const hexTx = `0x${signedTx}`;
            // Parse the signed transaction here
            const tx = (0, utils_1.parseSignedTransaction)(signedTx);
            try {
                // @ts-ignore
                const hash = await this.perform("sendTransaction", {
                    signedTransaction: hexTx,
                });
                // Note: need to destructure return result here.
                // @ts-ignore
                return this._wrapTransaction(tx, hash);
            }
            catch (error) {
                error.transaction = tx;
                error.transactionHash = tx.hash;
                throw error;
            }
        }
        async isClientVersionGreaterThanEqualTo(major, minor, patch) {
            const ver = await this.getClientVersion();
            return compareVersion(ver, major, minor, patch) >= 0;
        }
        async getClientVersion() {
            // @ts-ignore
            await this.getNetwork();
            // @ts-ignore
            const version = await this.perform("web3_clientVersion", []);
            if (version === "SBIT ETHTestRPC/ethereum-js") {
                // 0.1.4, versions after this with a proper version string is 0.2.0
                // this version contains a bug we have to work around
                return {
                    name: "Janus",
                    version: "0.1.4",
                    major: 0,
                    minor: 1,
                    patch: 4,
                    system: "linux-amd64",
                };
            }
            else {
                const versionInfo = version.split("/");
                if (versionInfo.length >= 4) {
                    const semver = parseVersion(versionInfo[1]);
                    return {
                        name: versionInfo[0],
                        version: versionInfo[1],
                        major: semver[0] || 0,
                        minor: semver[1] || 0,
                        patch: semver[2] || 0,
                        system: versionInfo[2],
                    };
                }
            }
            return {
                name: version,
            };
        }
        /**
         * Function to handle grabbing UTXO's from janus
         * prepareRequest in https://github.com/ethers-io/ethers.js/blob/master/packages/providers/src.ts/json-rpc-provider.ts
         */
        async getUtxos(from, neededAmount) {
            // @ts-ignore
            await this.getNetwork();
            const params = !!!neededAmount ? [from, neededAmount, "p2pk", "p2pkh"] : [from, "p2pk", "p2pkh"];
            // @ts-ignore
            return await this.perform("sbit_qetUTXOs", params);
        }
        /**
         * Override to handle grabbing UTXO's from janus
         * prepareRequest in https://github.com/ethers-io/ethers.js/blob/master/packages/providers/src.ts/json-rpc-provider.ts
         */
        prepareRequest(method, params) {
            if (method === "sbit_qetUTXOs") {
                return ["sbit_getUTXOs", params];
            }
            else if (method === "web3_clientVersion") {
                return ["web3_clientVersion", params];
            }
            // @ts-ignore
            return super.prepareRequest(method, params);
        }
    };
}
function parseVersion(version) {
    const semver = version.split("-")[0];
    return semver.replace(/a-zA-Z\./g, "").split(".").map(i => parseInt(i) || 0);
}
function compareVersion(version, major, minor, patch) {
    return recursivelyCompareVersion([
        version.major || 0,
        version.minor || 0,
        version.patch || 0
    ], [
        major,
        minor,
        patch
    ]);
}
exports.compareVersion = compareVersion;
function recursivelyCompareVersion(version, compareTo) {
    if (version.length === 0) {
        return 0;
    }
    if (version[0] === compareTo[0]) {
        return recursivelyCompareVersion(version.slice(1), compareTo.slice(1));
    }
    else if (version[0] < compareTo[0]) {
        return -1;
    }
    else {
        return 1;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2JpdFByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9TYml0UHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLDJDQUF5RDtBQUV6RCxrREFBK0M7QUFDL0MsTUFBTSxNQUFNLEdBQUcsSUFBSSxlQUFNLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDekMsMERBQXNEO0FBc0J0RCxNQUFhLFlBQWEsU0FBUSxpQkFBaUIsQ0FBQyxrQkFBUyxDQUFDLGVBQWUsQ0FBQztDQUFHO0FBQWpGLG9DQUFpRjtBQUFBLENBQUM7QUFDbEYsTUFBYSxtQkFBb0IsU0FBUSxpQkFBaUIsQ0FBQyxrQkFBUyxDQUFDLGVBQWUsQ0FBQztDQUFHO0FBQXhGLGtEQUF3RjtBQUFBLENBQUM7QUFDekYsTUFBYSxxQkFBc0IsU0FBUSxpQkFBaUIsQ0FBQyxrQkFBUyxDQUFDLGlCQUFpQixDQUFDO0NBQUc7QUFBNUYsc0RBQTRGO0FBQUEsQ0FBQztBQUU3RixTQUFTLEtBQUssQ0FBQyxPQUFlO0lBQzFCLE9BQU8sSUFBSSxPQUFPLENBQUMsVUFBUyxPQUFPO1FBQy9CLFVBQVUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDakMsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDO0FBTUQsTUFBTSxtQkFBb0IsU0FBUSxrQkFBUyxDQUFDLFlBQVk7SUFVcEQsWUFBWSxtQkFBa0MsRUFBRSxPQUFvQjtRQUNoRSxJQUFJLENBQUMsbUJBQW1CLEVBQUU7WUFDdEIsTUFBTSxJQUFJLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1NBQy9DO1FBRUQsSUFBSSxjQUFjLEdBQThDLE9BQU8sQ0FBQztRQUV4RSxvREFBb0Q7UUFDcEQsSUFBSSxjQUFjLElBQUksSUFBSSxFQUFFO1lBQ3hCLGNBQWMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtnQkFD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