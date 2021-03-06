"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SbitContractFactory = void 0;
const ethers_1 = require("ethers");
const utils_1 = require("ethers/lib/utils");
const address_1 = require("@ethersproject/address");
const logger_1 = require("@ethersproject/logger");
const utils_2 = require("./helpers/utils");
const version = "contracts/5.1.1";
const logger = new logger_1.Logger(version);
async function resolveName(resolver, nameOrPromise) {
    const name = await nameOrPromise;
    // If it is already an address, just use it (after adding checksum)
    try {
        return (0, address_1.getAddress)(name);
    }
    catch (error) { }
    if (!resolver) {
        logger.throwError("a provider or signer is needed to resolve ENS names", logger_1.Logger.errors.UNSUPPORTED_OPERATION, {
            operation: "resolveName"
        });
    }
    const address = await resolver.resolveName(name);
    if (address == null) {
        logger.throwArgumentError("resolver or addr is not configured for ENS name", "name", name);
    }
    return address;
}
// Recursively replaces ENS names with promises to resolve the name and resolves all properties
async function resolveAddresses(resolver, value, paramType) {
    if (Array.isArray(paramType)) {
        return await Promise.all(paramType.map((paramType, index) => {
            return resolveAddresses(resolver, ((Array.isArray(value)) ? value[index] : value[paramType.name]), paramType);
        }));
    }
    if (paramType.type === "address") {
        return await resolveName(resolver, value);
    }
    if (paramType.type === "tuple") {
        return await resolveAddresses(resolver, value, paramType.components);
    }
    if (paramType.baseType === "array") {
        if (!Array.isArray(value)) {
            return Promise.reject(new Error("invalid value for array"));
        }
        return await Promise.all(value.map((v) => resolveAddresses(resolver, v, paramType.arrayChildren)));
    }
    return value;
}
class SbitContractFactory extends ethers_1.ContractFactory {
    constructor(contractInterface, bytecode, signer) {
        super(contractInterface, bytecode, signer);
    }
    async deploy(...args) {
        let overrides = {};
        // If 1 extra parameter was passed in, it contains overrides
        if (args.length === this.interface.deploy.inputs.length + 1) {
            overrides = args.pop();
        }
        // Make sure the call matches the constructor signature
        logger.checkArgumentCount(args.length, this.interface.deploy.inputs.length, " in Contract constructor");
        // Resolve ENS names and promises in the arguments
        const params = await resolveAddresses(this.signer, args, this.interface.deploy.inputs);
        params.push(overrides);
        // Get the deployment transaction (with optional overrides)
        const unsignedTx = this.getDeployTransaction(...params);
        // Send the deployment transaction
        const tx = await this.signer.sendTransaction(unsignedTx);
        // @ts-ignore
        const address = `0x${(0, utils_2.generateContractAddress)(tx.hash.split("0x")[1])}`;
        // const address = getStatic<(tx: TransactionResponse) => string>(this.constructor, "getContractAddress")(tx);
        const contract = (0, utils_1.getStatic)(this.constructor, "getContract")(address, this.interface, this.signer);
        (0, utils_1.defineReadOnly)(contract, "deployTransaction", tx);
        return contract;
    }
}
exports.SbitContractFactory = SbitContractFactory;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2JpdENvbnRyYWN0RmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9saWIvU2JpdENvbnRyYWN0RmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBd0Y7QUFDeEYsNENBQTREO0FBRTVELG9EQUFvRDtBQUNwRCxrREFBK0M7QUFFL0MsMkNBQTBEO0FBRTFELE1BQU0sT0FBTyxHQUFHLGlCQUFpQixDQUFDO0FBRWxDLE1BQU0sTUFBTSxHQUFHLElBQUksZUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBRW5DLEtBQUssVUFBVSxXQUFXLENBQUMsUUFBMkIsRUFBRSxhQUF1QztJQUMzRixNQUFNLElBQUksR0FBRyxNQUFNLGFBQWEsQ0FBQztJQUVqQyxtRUFBbUU7SUFDbkUsSUFBSTtRQUNBLE9BQU8sSUFBQSxvQkFBVSxFQUFDLElBQUksQ0FBQyxDQUFDO0tBQzNCO0lBQUMsT0FBTyxLQUFLLEVBQUUsR0FBRztJQUVuQixJQUFJLENBQUMsUUFBUSxFQUFFO1FBQ1gsTUFBTSxDQUFDLFVBQVUsQ0FBQyxxREFBcUQsRUFBRSxlQUFNLENBQUMsTUFBTSxDQUFDLHFCQUFxQixFQUFFO1lBQzFHLFNBQVMsRUFBRSxhQUFhO1NBQzNCLENBQUMsQ0FBQztLQUNOO0lBRUQsTUFBTSxPQUFPLEdBQUcsTUFBTSxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRWpELElBQUksT0FBTyxJQUFJLElBQUksRUFBRTtRQUNqQixNQUFNLENBQUMsa0JBQWtCLENBQUMsaURBQWlELEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQzlGO0lBRUQsT0FBTyxPQUFPLENBQUM7QUFDbkIsQ0FBQztBQUVELCtGQUErRjtBQUMvRixLQUFLLFVBQVUsZ0JBQWdCLENBQUMsUUFBMkIsRUFBRSxLQUFVLEVBQUUsU0FBdUM7SUFDNUcsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FB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