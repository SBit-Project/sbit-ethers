"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployContract = void 0;
const SbitContractFactory_1 = require("./SbitContractFactory");
const ContractJSON_1 = require("./ContractJSON");
// @ts-ignore
async function deployContract(wallet, factoryOrContractJson, args = [], overrideOptions = {}) {
    if ('abi' in factoryOrContractJson) {
        return deployFromJson(wallet, factoryOrContractJson, args, overrideOptions);
    }
    else {
        const Factory = factoryOrContractJson;
        const contractFactory = new Factory(wallet);
        const contract = await contractFactory.deploy(...args, overrideOptions);
        await contract.deployed();
        return contract;
    }
}
exports.deployContract = deployContract;
// @ts-ignore
async function deployFromJson(wallet, contractJson, args, overrideOptions) {
    const bytecode = (0, ContractJSON_1.isStandard)(contractJson) ? contractJson.evm.bytecode : contractJson.bytecode;
    if (!(0, ContractJSON_1.hasByteCode)(bytecode)) {
        throw new Error('Cannot deploy contract with empty bytecode');
    }
    const factory = new SbitContractFactory_1.SbitContractFactory(contractJson.abi, bytecode, wallet);
    const contract = await factory.deploy(...args, Object.assign({}, overrideOptions));
    await contract.deployed();
    return contract;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwbG95Q29udHJhY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL2RlcGxveUNvbnRyYWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLCtEQUErRTtBQUMvRSxpREFBeUQ7QUFDekQsYUFBYTtBQUNOLEtBQUssVUFBVSxjQUFjLENBQUMsTUFBTSxFQUFFLHFCQUFxQixFQUFFLElBQUksR0FBRyxFQUFFLEVBQUUsZUFBZSxHQUFHLEVBQUU7SUFDL0YsSUFBSSxLQUFLLElBQUkscUJBQXFCLEVBQUU7UUFDaEMsT0FBTyxjQUFjLENBQUMsTUFBTSxFQUFFLHFCQUFxQixFQUFFLElBQUksRUFBRSxlQUFlLENBQUMsQ0FBQztLQUMvRTtTQUNJO1FBQ0QsTUFBTSxPQUFPLEdBQUcscUJBQXFCLENBQUM7UUFDdEMsTUFBTSxlQUFlLEdBQUcsSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDNUMsTUFBTSxRQUFRLEdBQUcsTUFBTSxlQUFlLENBQUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ3hFLE1BQU0sUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQzFCLE9BQU8sUUFBUSxDQUFDO0tBQ25CO0FBQ0wsQ0FBQztBQVhELHdDQVdDO0FBQ0QsYUFBYTtBQUNiLEtBQUssVUFBVSxjQUFjLENBQUMsTUFBTSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsZUFBZTtJQUNyRSxNQUFNLFFBQVEsR0FBRyxJQUFBLHlCQUFVLEVBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDO0lBQzlGLElBQUksQ0FBQyxJQUFBLDBCQUFXLEVBQUMsUUFBUSxDQUFDLEVBQUU7UUFDeEIsTUFBTSxJQUFJLEtBQUssQ0FBQyw0Q0FBNEMsQ0FBQyxDQUFDO0tBQ2pFO0lBQ0QsTUFBTSxPQUFPLEdBQUcsSUFBSSx5Q0FBZSxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3hFLE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksb0JBQ3RDLGVBQWUsRUFDcEIsQ0FBQztJQUNILE1BQU0sUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQzFCLE9BQU8sUUFBUSxDQUFDO0FBQ3BCLENBQUMifQ==