import { HDNode } from '@ethersproject/hdnode';
import { configureSbitAddressGeneration } from './helpers/utils';
import { SbitWallet } from './SbitWallet';
export class SbitHDKey {
    _hdkey;
    static fromMasterSeed(seedBuffer) {
        const hdnode = configureSbitAddressGeneration(HDNode.fromSeed("0x" + seedBuffer.toString('hex')));
        return new SbitHDKey(hdnode);
    }
    static fromExtendedKey(base58Key) {
        const hdnode = configureSbitAddressGeneration(HDNode.fromExtendedKey("0x" + base58Key));
        return new SbitHDKey(hdnode);
    }
    constructor(hdkey) {
        this._hdkey = hdkey;
        configureSbitAddressGeneration(hdkey);
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
        return new SbitHDKey(configureSbitAddressGeneration(HDNode.fromExtendedKey(this._hdkey.extendedKey).derivePath(path)));
    }
    deriveChild(index) {
        return new SbitHDKey(
        // @ts-ignore
        configureSbitAddressGeneration(HDNode.fromExtendedKey(this._hdkey.extendedKey)._derive(index)));
    }
    getWallet() {
        return new SbitWallet(configureSbitAddressGeneration(HDNode.fromExtendedKey(this._hdkey.extendedKey)));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2JpdEhES2V5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9TYml0SERLZXkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQy9DLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFFMUMsTUFBTSxPQUFPLFNBQVM7SUFDRCxNQUFNLENBQVM7SUFFaEMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxVQUFrQjtRQUNwQyxNQUFNLE1BQU0sR0FBRyw4QkFBOEIsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsRyxPQUFPLElBQUksU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFFRCxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQWlCO1FBQ3BDLE1BQU0sTUFBTSxHQUFHLDhCQUE4QixDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDeEYsT0FBTyxJQUFJLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBRUQsWUFBWSxLQUFhO1FBQ3JCLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1FBQ3BCLDhCQUE4QixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFRCxrQkFBa0I7UUFDZCxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUU7WUFDekIsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO1NBQ3ZEO1FBQ0QsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDaEQsQ0FBQztJQUVELGlCQUFpQjtRQUNiLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3pELENBQUM7SUFFRCxVQUFVLENBQUMsSUFBWTtRQUNuQixPQUFPLElBQUksU0FBUyxDQUNoQiw4QkFBOEIsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQ25HLENBQUM7SUFDTixDQUFDO0lBRUQsV0FBVyxDQUFDLEtBQWE7UUFDckIsT0FBTyxJQUFJLFNBQVM7UUFDaEIsYUFBYTtRQUNiLDhCQUE4QixDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FDakcsQ0FBQztJQUNOLENBQUM7SUFFRCxTQUFTO1FBQ0wsT0FBTyxJQUFJLFVBQVUsQ0FBQyw4QkFBOEIsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzNHLENBQUM7Q0FDSiJ9