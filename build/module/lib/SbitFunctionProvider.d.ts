import { SbitProvider } from "./SbitProvider";
export declare class SbitFunctionProvider extends SbitProvider {
    readonly fn: Function;
    constructor(fn: Function);
    send(method: string, params: Array<any>): Promise<any>;
}
