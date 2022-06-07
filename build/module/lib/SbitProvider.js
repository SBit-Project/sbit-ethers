import { providers } from "ethers";
import { parseSignedTransaction } from "./helpers/utils";
import { Logger } from "@ethersproject/logger";
const logger = new Logger("sbit-ethers");
import { getStatic } from "@ethersproject/properties";
export class SbitProvider extends SbitProviderMixin(providers.JsonRpcProvider) {
}
;
export class SbitJsonRpcProvider extends SbitProviderMixin(providers.JsonRpcProvider) {
}
;
export class SbitWebSocketProvider extends SbitProviderMixin(providers.WebSocketProvider) {
}
;
function timer(timeout) {
    return new Promise(function (resolve) {
        setTimeout(resolve, timeout);
    });
}
class ProviderSubprovider extends providers.BaseProvider {
    providerSubprovider;
    _eventLoopCache;
    get _cache() {
        if (this._eventLoopCache == null) {
            this._eventLoopCache = {};
        }
        return this._eventLoopCache;
    }
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
            const getNetwork = getStatic(this.constructor, "getNetwork");
            try {
                return getNetwork(BigNumber.from(chainId).toNumber());
            }
            catch (error) {
                return logger.throwError("could not detect network", Logger.errors.NETWORK_ERROR, {
                    chainId: chainId,
                    event: "invalidNetwork",
                    serverError: error
                });
            }
        }
        return logger.throwError("could not detect network", Logger.errors.NETWORK_ERROR, {
            event: "noNetwork"
        });
    }
}
export class SbitProviderSubprovider extends SbitProviderMixin(ProviderSubprovider) {
}
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
            const tx = parseSignedTransaction(signedTx);
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
            const params = !!neededAmount ? [from, neededAmount, "p2pk", "p2pkh"] : [from, "p2pk", "p2pkh"];
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
export function compareVersion(version, major, minor, patch) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2JpdFByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9TYml0UHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUNuQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUV6RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDL0MsTUFBTSxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDekMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBc0J0RCxNQUFNLE9BQU8sWUFBYSxTQUFRLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUM7Q0FBRztBQUFBLENBQUM7QUFDbEYsTUFBTSxPQUFPLG1CQUFvQixTQUFRLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUM7Q0FBRztBQUFBLENBQUM7QUFDekYsTUFBTSxPQUFPLHFCQUFzQixTQUFRLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQztDQUFHO0FBQUEsQ0FBQztBQUU3RixTQUFTLEtBQUssQ0FBQyxPQUFlO0lBQzFCLE9BQU8sSUFBSSxPQUFPLENBQUMsVUFBUyxPQUFPO1FBQy9CLFVBQVUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDakMsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDO0FBTUQsTUFBTSxtQkFBb0IsU0FBUSxTQUFTLENBQUMsWUFBWTtJQUNwRCxtQkFBbUIsQ0FBZ0I7SUFDbkMsZUFBZSxDQUErQjtJQUM5QyxJQUFJLE1BQU07UUFDTixJQUFJLElBQUksQ0FBQyxlQUFlLElBQUksSUFBSSxFQUFFO1lBQzlCLElBQUksQ0FBQyxlQUFlLEdBQUcsRUFBRyxDQUFDO1NBQzlCO1FBQ0QsT0FBTyxJQUFJLENBQUMsZUFB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