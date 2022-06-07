export class SbitTransaction {
    // private readonly _type;
    tx;
    nonce;
    gasLimit;
    gasPrice;
    to;
    value;
    data;
    v;
    r;
    s;
    constructor(txData) {
        const { nonce, gasLimit, gasPrice, to, value, data } = txData;
        // this._type = type;
        this.nonce = nonce;
        this.gasLimit = gasLimit;
        this.gasPrice = gasPrice;
        this.to = to;
        this.value = value;
        this.data = data;
    }
    static fromTxData(txData) {
        return new SbitTransaction(txData);
    }
    async sign(privateKey) {
        const sbitTransaction = {
            to: this.to?.toString(),
            from: privateKey.getAddressString(),
            nonce: 0,
            gasLimit: this.gasLimit.toString(),
            gasPrice: this.gasPrice.toString(),
            data: this.data,
            // chainId: 
        };
        if (this.value) {
            sbitTransaction.value = this.value.toString();
        }
        this.tx = await privateKey.signTransaction(sbitTransaction);
        return this;
    }
    serialize() {
        if (!this.tx) {
            throw new Error("Require signing first");
        }
        return Buffer.from(this.tx, "hex");
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2JpdFRyYW5zYWN0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9TYml0VHJhbnNhY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBeUJBLE1BQU0sT0FBTyxlQUFlO0lBQ3hCLDBCQUEwQjtJQUNsQixFQUFFLENBQVU7SUFDWCxLQUFLLENBQVk7SUFDakIsUUFBUSxDQUFZO0lBQ3BCLFFBQVEsQ0FBWTtJQUNwQixFQUFFLENBQVc7SUFDYixLQUFLLENBQVk7SUFDakIsSUFBSSxDQUFTO0lBQ2IsQ0FBQyxDQUFhO0lBQ2QsQ0FBQyxDQUFhO0lBQ2QsQ0FBQyxDQUFhO0lBRXZCLFlBQVksTUFBYztRQUN0QixNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsR0FBRyxNQUFNLENBQUM7UUFDOUQscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ25CLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBQ2IsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbkIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDckIsQ0FBQztJQUVELE1BQU0sQ0FBQyxVQUFVLENBQUMsTUFBYztRQUM1QixPQUFPLElBQUksZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQXNCO1FBQzdCLE1BQU0sZUFBZSxHQUFHO1lBQ3BCLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRTtZQUN2QixJQUFJLEVBQUUsVUFBVSxDQUFDLGdCQUFnQixFQUFFO1lBQ25DLEtBQUssRUFBRSxDQUFDO1lBQ1IsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFO1lBQ2xDLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRTtZQUNsQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixZQUFZO1NBQ08sQ0FBQTtRQUN2QixJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUU7WUFDWixlQUFlLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7U0FDakQ7UUFDRCxJQUFJLENBQUMsRUFBRSxHQUFHLE1BQU0sVUFBVSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUMzRCxPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDO0lBRUQsU0FBUztRQUNMLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFO1lBQ1YsTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1NBQzVDO1FBQ0QsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDdkMsQ0FBQztDQUNKIn0=