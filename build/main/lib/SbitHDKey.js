"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SbitHDKey = void 0;
const hdnode_1 = require("@ethersproject/hdnode");
const utils_1 = require("./helpers/utils");
const SbitWallet_1 = require("./SbitWallet");
class SbitHDKey {
    constructor(hdkey) {
        this._hdkey = hdkey;
        (0, utils_1.configureSbitAddressGeneration)(hdkey);
    }
    static fromMasterSeed(seedBuffer) {
        const hdnode = (0, utils_1.configureSbitAddressGeneration)(hdnode_1.HDNode.fromSeed("0x" + seedBuffer.toString('hex')));
        return new SbitHDKey(hdnode);
    }
    static fromExtendedKey(base58Key) {
        const hdnode = (0, utils_1.configureSbitAddressGeneration)(hdnode_1.HDNode.fromExtendedKey("0x" + base58Key));
        return new SbitHDKey(hdnode);
    }
    privateExtendedKey() {
        if (!this._hdkey.privateKey) {
            throw new Error('This is a public key only wallet');
        }
        return Buffer.from(this._hdkey.extendedKey);
    }
    publicExtendedKey() {
        return Buffer.from(this._hdkey.neuter().extendedKey);
    }
    derivePath(path) {
        return new SbitHDKey((0, utils_1.configureSbitAddressGeneration)(hdnode_1.HDNode.fromExtendedKey(this._hdkey.extendedKey).derivePath(path)));
    }
    deriveChild(index) {
        return new SbitHDKey(
        // @ts-ignore
        (0, utils_1.configureSbitAddressGeneration)(hdnode_1.HDNode.fromExtendedKey(this._hdkey.extendedKey)._derive(index)));
    }
    getWallet() {
        return new SbitWallet_1.SbitWallet((0, utils_1.configureSbitAddressGeneration)(hdnode_1.HDNode.fromExtendedKey(this._hdkey.extendedKey)));
    }
}
exports.SbitHDKey = SbitHDKey;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2JpdEhES2V5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9TYml0SERLZXkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsa0RBQStDO0FBQy9DLDJDQUFpRTtBQUNqRSw2Q0FBMEM7QUFFMUMsTUFBYSxTQUFTO0lBYWxCLFlBQVksS0FBYTtRQUNyQixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztRQUNwQixJQUFBLHNDQUE4QixFQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFiRCxNQUFNLENBQUMsY0FBYyxDQUFDLFVBQWtCO1FBQ3BDLE1BQU0sTUFBTSxHQUFHLElBQUEsc0NBQThCLEVBQUMsZUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEcsT0FBTyxJQUFJLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBRUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxTQUFpQjtRQUNwQyxNQUFNLE1BQU0sR0FBRyxJQUFBLHNDQUE4QixFQUFDLGVBQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDeEYsT0FBTyxJQUFJLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBT0Qsa0JBQWtCO1FBQ2QsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFO1lBQ3pCLE1BQU0sSUFBSSxLQUFLLENBQUMsa0NBQWtDLENBQUMsQ0FBQztTQUN2RDtRQUNELE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFFRCxpQkFBaUI7UUFDYixPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUN6RCxDQUFDO0lBRUQsVUFBVSxDQUFDLElBQVk7UUFDbkIsT0FBTyxJQUFJLFNBQVMsQ0FDaEIsSUFBQSxzQ0FBOEIsRUFBQyxlQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQ25HLENBQUM7SUFDTixDQUFDO0lBRUQsV0FBVyxDQUFDLEtBQWE7UUFDckIsT0FBTyxJQUFJLFNBQVM7UUFDaEIsYUFBYTtRQUNiLElBQUEsc0NBQThCLEVBQUMsZUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUNqRyxDQUFDO0lBQ04sQ0FBQztJQUVELFNBQVM7UUFDTCxPQUFPLElBQUksdUJBQVUsQ0FBQyxJQUFBLHNDQUE4QixFQUFDLGVBQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDM0csQ0FBQztDQUNKO0FBN0NELDhCQTZDQyJ9