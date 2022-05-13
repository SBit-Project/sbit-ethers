"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SbitTestProvider = void 0;
const ethers_1 = require("ethers");
const SbitProvider_1 = require("./SbitProvider");
const SbitWallet_1 = require("./SbitWallet");
const utils_1 = require("./helpers/utils");
class SbitTestProvider extends SbitProvider_1.SbitProvider {
    constructor(options) {
        super(options ?
            ((options.url || "http://localhost:") + (options.port || 22402))
            : "http://localhost:22402");
        this.wallets = [];
        this._callHistory = [];
        options = options || {};
        if (!options.accounts || options.accounts.length === 0) {
            if (options.mnemonic) {
                this.wallets.push(SbitWallet_1.SbitWallet.fromMnemonic(options.mnemonic, options.hd_path || SbitWallet_1.SBIT_BIP44_PATH).connect(this));
                for (let j = 1; j < 5; j++) {
                    this.wallets.push(SbitWallet_1.SbitWallet.fromMnemonic(options.mnemonic, (options.hd_path || SbitWallet_1.SBIT_BIP44_PATH) + "/" + j).connect(this));
                }
            }
            else {
                options.accounts = [
                    "cMbgxCJrTYUqgcmiC1berh5DFrtY1KeU4PXZ6NZxgenniF1mXCRk",
                    "cRcG1jizfBzHxfwu68aMjhy78CpnzD9gJYZ5ggDbzfYD3EQfGUDZ",
                    "cV79qBoCSA2NDrJz8S3T7J8f3zgkGfg4ua4hRRXfhbnq5VhXkukT",
                    "cV93kaaV8hvNqZ711s2z9jVWLYEtwwsVpyFeEZCP6otiZgrCTiEW",
                    "cVPHpTvmv3UjQsZfsMRrW5RrGCyTSAZ3MWs1f8R1VeKJSYxy5uac",
                    "cTs5NqY4Ko9o6FESHGBDEG77qqz9me7cyYCoinHcWEiqMZgLC6XY"
                ].map(privateKey => ({ privateKey }));
            }
        }
        if (options.accounts && options.accounts.length !== 0) {
            for (let i = 0; i < options.accounts.length; i++) {
                // @ts-ignore
                this.wallets.push(new SbitWallet_1.SbitWallet(options.accounts[i].privateKey).connect(this));
            }
        }
    }
    prepareRequest(method, params) {
        switch (method) {
            case "sendTransaction":
                if (this._callHistory) {
                    if (params.hasOwnProperty("signedTransaction")) {
                        try {
                            const tx = (0, utils_1.parseSignedTransaction)(params.signedTransaction);
                            if (tx.to) {
                                // OP_CALL
                                this._callHistory.push(toRecordedCall(tx.to, '0x' + tx.data));
                            }
                        }
                        catch (e) {
                            // ignore
                            console.error("Failed to parse", params.signedTransaction, e);
                        }
                    }
                }
                break;
            case "call":
                if (this._callHistory) {
                    if (params.hasOwnProperty("transaction")) {
                        this._callHistory.push(toRecordedCall(params.transaction.to, params.transaction.data));
                    }
                }
                break;
        }
        if (method === "sbit_qetUTXOs") {
            return ["sbit_getUTXOs", params];
        }
        return super.prepareRequest(method, params);
    }
    getWallets() {
        return this.wallets;
    }
    createEmptyWallet() {
        return SbitWallet_1.SbitWallet.createRandom().connect(this);
    }
    clearCallHistory() {
        this._callHistory = [];
    }
    get callHistory() {
        return this._callHistory;
    }
}
exports.SbitTestProvider = SbitTestProvider;
function toRecordedCall(to, data) {
    return {
        address: to ? ethers_1.utils.getAddress(ethers_1.utils.hexlify(to)) : undefined,
        data: data ? ethers_1.utils.hexlify(data) : '0x'
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2JpdFRlc3RQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9saWIvU2JpdFRlc3RQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBdUM7QUFFdkMsaURBQThDO0FBQzlDLDZDQUEyRDtBQUMzRCwyQ0FBeUQ7QUF3Q3pELE1BQWEsZ0JBQWlCLFNBQVEsMkJBQVk7SUFLOUMsWUFDSSxPQUFzQztRQUV0QyxLQUFLLENBQ0QsT0FBTyxDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxLQUFLLENBQUMsQ0FBQztZQUM1RCxDQUFDLENBQUMsd0JBQXdCLENBQ3JDLENBQUM7UUFFRixJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUNsQixJQUFJLENBQUMsWUFBWSxHQUFHLEVBQUUsQ0FBQztRQUV2QixPQUFPLEdBQUcsT0FBTyxJQUFJLEVBQUUsQ0FBQztRQUN4QixJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDcEQsSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFO2dCQUNsQixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FDYix1QkFBVSxDQUFDLFlBQVksQ0FDbkIsT0FBTyxDQUFDLFFBQVEsRUFDaEIsT0FBTyxDQUFDLE9BQU8sSUFBSSw0QkFBZSxDQUNyQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FDbEIsQ0FBQztnQkFDRixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO29CQUN4QixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FDYix1QkFBVSxDQUFDLFlBQVksQ0FDbkIsT0FBTyxDQUFDLFFBQVEsRUFD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