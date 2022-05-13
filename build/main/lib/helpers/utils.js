"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeTransactionWith = exports.serializeTransaction = exports.checkTransactionType = exports.configureSbitAddressGeneration = exports.computeAddressFromPublicKey = exports.computeAddress = exports.parseSignedTransaction = exports.getMinNonDustValue = exports.addVins = exports.generateContractAddress = exports.contractTxScript = exports.p2pkhScript = exports.p2pkhScriptSig = exports.p2pkScript = exports.p2pkScriptSig = exports.signp2pkhWith = exports.signp2pkh = exports.txToBuffer = exports.calcTxBytes = void 0;
const varuint_bitcoin_1 = require("varuint-bitcoin");
const properties_1 = require("@ethersproject/properties");
const bip66_1 = require("bip66");
const opcodes_1 = require("./opcodes");
const global_vars_1 = require("./global-vars");
const buffer_cursor_1 = require("./buffer-cursor");
const address_1 = require("@ethersproject/address");
//@ts-ignore
const secp256k1_1 = require("secp256k1");
let secp256k1Sign = secp256k1_1.ecdsaSign;
if (!secp256k1_1.ecdsaSign && secp256k1_1.sign) {
    // support version 3 secp256k1 library (used by metamask)
    //@ts-ignore
    secp256k1Sign = function (buffer, privateKey) {
        // v3 uses different version of Buffer, fake that these are compatabile
        //@ts-ignore
        buffer._isBuffer = true;
        //@ts-ignore
        privateKey._isBuffer = true;
        return (0, secp256k1_1.sign)(buffer, privateKey);
    };
}
const script_number_1 = require("bitcoinjs-lib/src/script_number");
const hash_js_1 = require("hash.js");
const bignumber_js_1 = require("bignumber.js");
// 1 satoshi is e-8 so we need bignumber to not set an exponent for numbers greater than that
// since we use exponents to do multiplication
// BigNumber.config({ EXPONENTIAL_AT: 10 })
const utils_1 = require("ethers/lib/utils");
const ethers_1 = require("ethers");
const hex_decoder_1 = require("./hex-decoder");
const signing_key_1 = require("@ethersproject/signing-key");
// const toBuffer = require('typedarray-to-buffer')
const bitcoinjs = require("bitcoinjs-lib");
// metamask BigNumber uses a different version so the API doesn't match up
[
    "lessThanOrEqualTo",
    "greaterThan",
    "lessThan",
].forEach((methodName) => {
    // adds is ____ to prototype to reference existing method for api compat
    const is = "is" + methodName.charAt(0).toUpperCase() + methodName.slice(1);
    // @ts-ignore
    if (!bignumber_js_1.BigNumber.prototype[is] && bignumber_js_1.BigNumber.prototype[methodName]) {
        // @ts-ignore
        bignumber_js_1.BigNumber.prototype[is] = bignumber_js_1.BigNumber.prototype[methodName];
    }
});
function cloneBuffer(buffer) {
    let result = Buffer.alloc(buffer.length);
    buffer.copy(result);
    return result;
}
function cloneTx(tx) {
    let result = { version: tx.version, locktime: tx.locktime, vins: [], vouts: [] };
    for (let vin of tx.vins) {
        result.vins.push({
            txid: cloneBuffer(vin.txid),
            vout: vin.vout,
            hash: cloneBuffer(vin.hash),
            sequence: vin.sequence,
            script: cloneBuffer(vin.script),
            scriptSig: null
        });
    }
    for (let vout of tx.vouts) {
        result.vouts.push({
            script: cloneBuffer(vout.script),
            value: vout.value,
        });
    }
    return result;
}
// refer to https://en.bitcoin.it/wiki/Transaction#General_format_of_a_Bitcoin_transaction_.28inside_a_block.29
function calcTxBytes(vins, vouts) {
    return global_vars_1.GLOBAL_VARS.TX_OVERHEAD_NVERSION +
        (0, varuint_bitcoin_1.encodingLength)(vins.length) +
        vins
            .map(vin => (vin.scriptSig ? vin.scriptSig.byteLength : vin.script.byteLength))
            .reduce((sum, len) => sum + global_vars_1.GLOBAL_VARS.TX_INPUT_OUTPOINT + (0, varuint_bitcoin_1.encodingLength)(len) + len + global_vars_1.GLOBAL_VARS.TX_INPUT_NSEQUENCE, 0) +
        (0, varuint_bitcoin_1.encodingLength)(vouts.length) +
        vouts
            .map(vout => vout.script.byteLength)
            .reduce((sum, len) => sum + global_vars_1.GLOBAL_VARS.TX_OUTPUT_NVALUE + (0, varuint_bitcoin_1.encodingLength)(len) + len, 0) +
        global_vars_1.GLOBAL_VARS.TX_OVERHEAD_NLOCKTIME;
}
exports.calcTxBytes = calcTxBytes;
function txToBuffer(tx) {
    let neededBytes = calcTxBytes(tx.vins, tx.vouts);
    let buffer = Buffer.alloc(neededBytes);
    let cursor = new buffer_cursor_1.BufferCursor(buffer);
    // version
    cursor.writeUInt32LE(tx.version);
    // vin length
    cursor.writeBytes((0, varuint_bitcoin_1.encode)(tx.vins.length));
    // vin
    for (let vin of tx.vins) {
        cursor.writeBytes(vin.hash);
        cursor.writeUInt32LE(vin.vout);
        if (vin.scriptSig !== null) {
            cursor.writeBytes((0, varuint_bitcoin_1.encode)(vin.scriptSig.length));
            cursor.writeBytes(vin.scriptSig);
        }
        else {
            cursor.writeBytes((0, varuint_bitcoin_1.encode)(vin.script.length));
            cursor.writeBytes(vin.script);
        }
        cursor.writeUInt32LE(vin.sequence);
    }
    // vout length
    cursor.writeBytes((0, varuint_bitcoin_1.encode)(tx.vouts.length));
    // vouts
    for (let vout of tx.vouts) {
        cursor.writeUInt64LE(vout.value);
        cursor.writeBytes((0, varuint_bitcoin_1.encode)(vout.script.length));
        cursor.writeBytes(vout.script);
    }
    // locktime
    cursor.writeUInt32LE(tx.locktime);
    return buffer;
}
exports.txToBuffer = txToBuffer;
// refer to: https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/src/script_signature.js
function toDER(x) {
    let i = 0;
    while (x[i] === 0)
        ++i;
    if (i === x.length)
        return Buffer.alloc(1);
    x = x.slice(i);
    if (x[0] & 0x80)
        return Buffer.concat([Buffer.alloc(1), x], 1 + x.length);
    return x;
}
// refer to: https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/src/script_signature.js
function encodeSig(signature, hashType) {
    const hashTypeMod = hashType & ~0x80;
    if (hashTypeMod <= 0 || hashTypeMod >= 4)
        throw new Error('Invalid hashType ' + hashType);
    const hashTypeBuffer = Buffer.from([hashType]);
    const bufferSignature = Buffer.from(signature);
    const r = toDER(bufferSignature.slice(0, 32));
    const s = toDER(bufferSignature.slice(32, 64));
    return Buffer.concat([(0, bip66_1.encode)(r, s), hashTypeBuffer]);
}
/////////////////////////////////////////
async function signp2pkh(tx, vindex, privKey) {
    return await signp2pkhWith(tx, vindex, (hash) => {
        return secp256k1Sign(hash, (0, utils_1.arrayify)(privKey));
    });
}
exports.signp2pkh = signp2pkh;
async function signp2pkhWith(tx, vindex, signer) {
    let clone = cloneTx(tx);
    // clean up relevant script
    // TODO: Implement proper handling of OP_CODESEPARATOR, this was filtering 'ab' from the script entirely preventing pubkeyhash with ab addresses from generating proper tx
    // Since all scripts are generated locally in this library, temporarily not having this implemented is OK as no scripts will have this opcode
    // let filteredPrevOutScript = clone.vins[vindex].script.filter((op: any) => op !== OPS.OP_CODESEPARATOR);
    // Uint8Array issue here
    // clone.vins[vindex].script = toBuffer(filteredPrevOutScript);
    // zero out scripts of other inputs
    for (let i = 0; i < clone.vins.length; i++) {
        if (i === vindex)
            continue;
        clone.vins[i].script = Buffer.alloc(0);
    }
    // write to the buffer
    let buffer = txToBuffer(clone);
    // extend and append hash type
    buffer = Buffer.alloc(buffer.byteLength + 4, buffer);
    // append the hash type
    buffer.writeUInt32LE(global_vars_1.GLOBAL_VARS.HASH_TYPE, buffer.byteLength - 4);
    // double-sha256
    let firstHash = (0, hash_js_1.sha256)().update(buffer).digest();
    let secondHash = (0, hash_js_1.sha256)().update(firstHash).digest();
    // sign on next tick so we don't block UI
    await new Promise((resolve) => setImmediate(resolve));
    // sign hash
    let sig = await signer(new Uint8Array(secondHash));
    // encode sig
    return encodeSig(sig.signature, global_vars_1.GLOBAL_VARS.HASH_TYPE);
}
exports.signp2pkhWith = signp2pkhWith;
function p2pkScriptSig(sig) {
    return bitcoinjs.script.compile([sig]);
}
exports.p2pkScriptSig = p2pkScriptSig;
function p2pkScript(pubKey) {
    return bitcoinjs.script.compile([
        pubKey,
        opcodes_1.OPS.OP_CHECKSIG
    ]);
}
exports.p2pkScript = p2pkScript;
function p2pkhScriptSig(sig, pubkey) {
    return bitcoinjs.script.compile([sig, Buffer.from(pubkey, 'hex')]);
}
exports.p2pkhScriptSig = p2pkhScriptSig;
// Refer to:
// https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/src/payments/p2pkh.js#L58
function p2pkhScript(hash160PubKey) {
    return bitcoinjs.script.compile([
        opcodes_1.OPS.OP_DUP,
        opcodes_1.OPS.OP_HASH160,
        hash160PubKey,
        opcodes_1.OPS.OP_EQUALVERIFY,
        opcodes_1.OPS.OP_CHECKSIG
    ]);
}
exports.p2pkhScript = p2pkhScript;
const scriptMap = {
    p2pkh: p2pkhScript,
};
function contractTxScript(contractAddress, gasLimit, gasPrice, encodedData) {
    // If contractAddress is missing, assume it's a create script, else assume its a call contract interaction
    if (contractAddress === "") {
        return bitcoinjs.script.compile([
            opcodes_1.OPS.OP_4,
            (0, script_number_1.encode)(gasLimit),
            (0, script_number_1.encode)(gasPrice),
            Buffer.from(encodedData, "hex"),
            opcodes_1.OPS.OP_CREATE,
        ]);
    }
    else {
        return bitcoinjs.script.compile([
            opcodes_1.OPS.OP_4,
            (0, script_number_1.encode)(gasLimit),
            (0, script_number_1.encode)(gasPrice),
            Buffer.from(encodedData, "hex"),
            Buffer.from(contractAddress, "hex"),
            opcodes_1.OPS.OP_CALL,
        ]);
    }
}
exports.contractTxScript = contractTxScript;
function reverse(src) {
    let buffer = Buffer.alloc(src.length);
    for (var i = 0, j = src.length - 1; i <= j; ++i, --j) {
        buffer[i] = src[j];
        buffer[j] = src[i];
    }
    return buffer;
}
function generateContractAddress(txid) {
    let buffer = Buffer.alloc(32 + 4);
    let cursor = new buffer_cursor_1.BufferCursor(buffer);
    cursor.writeBytes(reverse(Buffer.from(txid, "hex")));
    // Assuming vout index is 0 as the transaction is serialized with that assumption.
    cursor.writeUInt32LE(0);
    let firstHash = (0, hash_js_1.sha256)().update(buffer.toString("hex"), "hex").digest("hex");
    let secondHash = (0, hash_js_1.ripemd160)().update(firstHash, "hex").digest("hex");
    return (0, address_1.getAddress)(secondHash).substring(2);
}
exports.generateContractAddress = generateContractAddress;
async function addVins(outputs, spendableUtxos, neededAmount, needChange, gasPriceString, hash160PubKey, publicKey) {
    // minimum gas price is 40 satoshi
    // minimum sat/kb is 4000
    const gasPrice = ethers_1.BigNumber.from(gasPriceString);
    const minimumSatoshiPerByte = 400;
    if (gasPrice.lt(ethers_1.BigNumber.from(minimumSatoshiPerByte))) {
        throw new Error("Gas price lower than minimum relay fee: " + gasPriceString + " => " + gasPrice.toString() + " < " + minimumSatoshiPerByte);
    }
    let inputs = [];
    let amounts = [];
    let vinTypes = [];
    let change;
    let inputsAmount = ethers_1.BigNumber.from(0);
    const neededAmountBN = ethers_1.BigNumber.from(new bignumber_js_1.BigNumber(sbitToSatoshi(neededAmount)).toString());
    let vbytes = ethers_1.BigNumber.from(global_vars_1.GLOBAL_VARS.TX_OVERHEAD_BASE);
    const spendVSizeLookupMap = {
        p2pk: ethers_1.BigNumber.from(global_vars_1.GLOBAL_VARS.TX_INPUT_BASE + global_vars_1.GLOBAL_VARS.TX_INPUT_SCRIPTSIG_P2PK).toNumber(),
        p2pkh: ethers_1.BigNumber.from(global_vars_1.GLOBAL_VARS.TX_INPUT_BASE + global_vars_1.GLOBAL_VARS.TX_INPUT_SCRIPTSIG_P2PKH).toNumber(),
    };
    const changeType = 'p2pkh';
    const outputVSizeLookupMap = {
        p2pkh: ethers_1.BigNumber.from(global_vars_1.GLOBAL_VARS.TX_OUTPUT_BASE + global_vars_1.GLOBAL_VARS.TX_OUTPUT_SCRIPTPUBKEY_P2PKH).toNumber(),
        p2wpkh: ethers_1.BigNumber.from(global_vars_1.GLOBAL_VARS.TX_OUTPUT_BASE + global_vars_1.GLOBAL_VARS.TX_OUTPUT_SCRIPTPUBKEY_P2WPKH).toNumber(),
        p2sh2of3: ethers_1.BigNumber.from(global_vars_1.GLOBAL_VARS.TX_OUTPUT_BASE + global_vars_1.GLOBAL_VARS.TX_OUTPUT_SCRIPTPUBKEY_P2SH2OF3).toNumber(),
        p2wsh2of3: ethers_1.BigNumber.from(global_vars_1.GLOBAL_VARS.TX_OUTPUT_BASE + global_vars_1.GLOBAL_VARS.TX_OUTPUT_SCRIPTPUBKEY_P2WSH2OF3).toNumber(),
        p2tr: ethers_1.BigNumber.from(global_vars_1.GLOBAL_VARS.TX_OUTPUT_BASE + global_vars_1.GLOBAL_VARS.TX_OUTPUT_SCRIPTPUBKEY_P2TR).toNumber(),
    };
    for (let i = 0; i < outputs.length; i++) {
        const output = outputs[i];
        let outputVSize = output;
        if (typeof output === "string") {
            if (!outputVSizeLookupMap.hasOwnProperty(output.toLowerCase())) {
                throw new Error("Unsupported output script type: " + output.toLowerCase());
            }
            else {
                // @ts-ignore
                outputVSize = outputVSizeLookupMap[output.toLowerCase()];
            }
        }
        else if (output.hasOwnProperty('script') && output.hasOwnProperty('value')) {
            // longer script sizes require up to 3 vbytes to encode
            const scriptEncodingLength = (0, varuint_bitcoin_1.encodingLength)(output.script.byteLength) - 1;
            outputVSize = ethers_1.BigNumber.from(global_vars_1.GLOBAL_VARS.TX_OUTPUT_BASE + scriptEncodingLength + output.script.byteLength).toNumber();
        }
        else {
            outputVSize = ethers_1.BigNumber.from(outputVSize).toNumber();
        }
        vbytes = vbytes.add(outputVSize);
    }
    let needMoreInputs = true;
    let i = 0;
    for (i = 0; i < spendableUtxos.length; i++) {
        const spendableUtxo = spendableUtxos[i];
        // investigate issue where amount has no decimal point as calculation panics
        // @ts-ignore
        const amount = spendableUtxo.amountNumber;
        const utxoValue = parseFloat(shiftBy(amount, 8));
        // balance += utxoValue;
        let script = Buffer.from(spendableUtxo.scriptPubKey);
        // all scripts will be p2pkh for now
        const typ = spendableUtxo.type || '';
        if (typ.toLowerCase() === "p2pk") {
            script = p2pkScript(Buffer.from(publicKey.split("0x")[1], "hex"));
        }
        else if (typ.toLowerCase() === "p2pkh") {
            script = p2pkhScript(Buffer.from(hash160PubKey, "hex"));
        }
        if (!spendVSizeLookupMap.hasOwnProperty(typ.toLowerCase())) {
            throw new Error("Unsupported spendable script type: " + typ.toLowerCase());
        }
        inputs.push({
            txid: Buffer.from(spendableUtxo.txid, 'hex'),
            vout: spendableUtxo.vout,
            hash: reverse(Buffer.from(spendableUtxo.txid, 'hex')),
            sequence: 0xffffffff,
            script: script,
            scriptSig: null
        });
        vinTypes.push(typ);
        // @ts-ignore
        const outputVSize = spendVSizeLookupMap[typ.toLowerCase()];
        vbytes = vbytes.add(outputVSize);
        const fee = ethers_1.BigNumber.from(vbytes).mul(gasPrice);
        inputsAmount = inputsAmount.add(utxoValue);
        amounts.push(utxoValue);
        if (neededAmountBN.eq(inputsAmount)) {
            if (i === spendableUtxos.length - 1) {
                // reached end
                // have exactly the needed amount
                // spending all utxo values
                // when caller computes change, it won't generate a change address
                needMoreInputs = false;
            }
            else {
                // not sending all
                // confirm that there is enough in inputs to cover network fees
                const neededAmountPlusFees = neededAmountBN.add(fee);
                const changeVBytes = outputVSizeLookupMap[changeType];
                const changeFee = ethers_1.BigNumber.from(changeVBytes).mul(gasPrice).toNumber();
                const neededAmountPlusFeesAndChange = needChange ? neededAmountPlusFees.add(changeFee) : neededAmountPlusFees;
                if (inputsAmount.eq(neededAmountPlusFees)) {
                    // no change output required, matches exactly
                    needMoreInputs = false;
                }
                else if (inputsAmount.lt(neededAmountPlusFees)) {
                    // not enough to cover total to send + fees, we need another input
                }
                else if (inputsAmount.gte(neededAmountPlusFeesAndChange)) {
                    // has enough to cover with a change output
                    needMoreInputs = false;
                    vbytes = vbytes.add(changeVBytes);
                    change = inputsAmount.sub(neededAmountPlusFeesAndChange);
                }
                else {
                    // not enough to cover with a change output, we need another input
                }
            }
        }
        else if (neededAmountBN.lt(inputsAmount)) {
            // have enough, check that there is enough change to cover fees
            const totalNeededPlusFees = neededAmountBN.add(fee);
            const changeVBytes = outputVSizeLookupMap[changeType];
            const changeFee = ethers_1.BigNumber.from(changeVBytes).mul(gasPrice).toNumber();
            const totalNeededPlusFeesAndChange = needChange ? totalNeededPlusFees.add(changeFee) : totalNeededPlusFees;
            if (inputsAmount.eq(totalNeededPlusFees)) {
                // no change output required, matches exactly
                needMoreInputs = false;
            }
            else if (inputsAmount.lt(totalNeededPlusFees)) {
                // not enough to cover total to send + fees, we need another input
            }
            else if (inputsAmount.gte(totalNeededPlusFeesAndChange)) {
                if (needChange) {
                    // has enough to cover with a change output
                    needMoreInputs = false;
                    vbytes = vbytes.add(changeVBytes);
                    change = inputsAmount.sub(totalNeededPlusFeesAndChange);
                    // throw new Error("Change output...2");
                }
                else {
                    // no change output requested
                    // bump the output by the change
                }
            }
            else {
                // not enough to cover with a change output, we need another input
            }
        }
        else {
            // neededAmountBN.gt(inputsAmount)
        }
        if (!needMoreInputs) {
            break;
        }
        if (i % 100 === 0) {
            // lots of UTXOs, don't block UI
            await new Promise((resolve) => setImmediate(resolve));
        }
    }
    if (needMoreInputs) {
        const missing = neededAmountBN.sub(inputsAmount).toNumber();
        throw new Error("Need " + missing + " more satoshi, we have " + inputsAmount.toString());
    }
    const fee = ethers_1.BigNumber.from(vbytes).mul(gasPrice);
    const availableAmount = inputsAmount.sub(fee).toNumber();
    return [inputs, amounts, availableAmount, fee, change, changeType, vinTypes];
}
exports.addVins = addVins;
function getMinNonDustValue(input, feePerByte) {
    // "Dust" is defined in terms of dustRelayFee,
    // which has units satoshis-per-kilobyte.
    // If you'd pay more in fees than the value of the output
    // to spend something, then we consider it dust.
    // A typical spendable non-segwit txout is 34 bytes big, and will
    // need a CTxIn of at least 148 bytes to spend:
    // so dust is a spendable txout less than
    // 182*dustRelayFee/1000 (in satoshis).
    // 546 satoshis at the default rate of 3000 sat/kB.
    // A typical spendable segwit txout is 31 bytes big, and will
    // need a CTxIn of at least 67 bytes to spend:
    // so dust is a spendable txout less than
    // 98*dustRelayFee/1000 (in satoshis).
    // 294 satoshis at the default rate of 3000 sat/kB.
    let size = 0;
    switch (input.type) {
        case "P2PKH":
            // size = 8 + encodingLength(input.scriptPubKey.length) + input.scriptPubKey.length
            size = global_vars_1.GLOBAL_VARS.TX_OUTPUT_SCRIPTPUBKEY_P2PKH;
            size += 32 + 4 + 1 + 107 + 4; // 148
            break;
        // @ts-ignore
        case "P2PK":
            // TODO: Implement support
            // size = 8 + encodingLength(input.scriptPubKey.length) + input.scriptPubKey.length
            size += 32 + 4 + 1 + 107 + 4; // 148
        // fallthrough, unsupported script type
        // @ts-ignore
        case "P2SH":
            // TODO: Implement support
            // size = 8 + encodingLength(input.scriptPubKey.length) + input.scriptPubKey.length
            size += 32 + 4 + 1 + 107 + 4; // 148
        // fallthrough, unsupported script type
        // @ts-ignore
        case "P2WH":
            // TODO: Implement support
            // size = 8 + encodingLength(input.scriptPubKey.length) + input.scriptPubKey.length
            size += 32 + 4 + 1 + (107 / global_vars_1.GLOBAL_VARS.WITNESS_SCALE_FACTOR) + 4; // 68
        // fallthrough, unsupported script type
        default:
            throw new Error("Unsupported output script type: " + input.type);
    }
    return ethers_1.BigNumber.from(feePerByte).mul(size).toNumber();
}
exports.getMinNonDustValue = getMinNonDustValue;
function shiftBy(amount, byPowerOfTen) {
    let amountString;
    if (typeof amount === "number") {
        amountString = `${amount}`;
    }
    else if (typeof amount === 'string') {
        amountString = amount;
    }
    else {
        amountString = ethers_1.BigNumber.from(amount).toString();
    }
    const indexOfExponent = amountString.indexOf('e');
    if (indexOfExponent !== -1) {
        // very small or large number with lots of decimals with an exponent
        // we want to adjust the exponent
        const exponentString = amountString.substring(indexOfExponent + 1, amountString.length);
        // exponentString = '-10', '+10' etc
        const exponent = parseInt(exponentString);
        const shiftedExponent = exponent + byPowerOfTen;
        amountString = amountString.substring(0, indexOfExponent);
        byPowerOfTen = shiftedExponent;
    }
    return byPowerOfTen === 0 ? amountString : `${amountString}e${byPowerOfTen < 0 ? '' : '+'}${byPowerOfTen}`;
}
function satoshiToSbit(inSatoshi) {
    return shiftBy(inSatoshi || 0, -8);
}
function sbitToSatoshi(inSbit) {
    return shiftBy(inSbit || 0, 8);
}
function checkLostPrecisionInGasPrice(gasPrice) {
    const roundedGasPrice = new bignumber_js_1.BigNumber(new bignumber_js_1.BigNumber(satoshiToSbit(gasPrice)).toFixed(8)).toNumber();
    const originalGasPrice = new bignumber_js_1.BigNumber(new bignumber_js_1.BigNumber(satoshiToSbit(gasPrice)).toFixed()).toNumber();
    if (roundedGasPrice != originalGasPrice) {
        throw new Error("Precision lost in gasPrice: " + (originalGasPrice - roundedGasPrice));
    }
}
function getContractVout(gasPrice, gasLimit, data, address, value) {
    return {
        script: contractTxScript(address === "" ? "" : address.split("0x")[1], gasLimit, gasPrice, data.split("0x")[1]),
        value: new bignumber_js_1.BigNumber(value).times(1e8).toNumber(),
    };
}
function parseSignedTransaction(transaction) {
    if (transaction.startsWith("0x")) {
        transaction = transaction.substring(2);
    }
    let tx = {
        hash: "",
        to: "",
        from: "",
        nonce: 1,
        gasLimit: ethers_1.BigNumber.from("0x3d090"),
        gasPrice: ethers_1.BigNumber.from("0x28"),
        data: "",
        value: ethers_1.BigNumber.from("0x0"),
        chainId: 81,
    };
    // Set hash (double sha256 of raw TX string)
    const sha256HashFirst = (0, hash_js_1.sha256)().update(transaction, "hex").digest("hex");
    const sha256HashSecond = reverse(Buffer.from((0, hash_js_1.sha256)().update(sha256HashFirst, "hex").digest("hex"), "hex")).toString("hex");
    tx['hash'] = `0x${sha256HashSecond}`;
    const btcDecodedRawTx = (0, hex_decoder_1.decode)(transaction);
    // Check if first OP code is OP_DUP -> assume p2pkh script
    if (bitcoinjs.script.decompile(btcDecodedRawTx.outs[global_vars_1.GLOBAL_VARS.UTXO_VINDEX].script)[0] === opcodes_1.OPS.OP_DUP) {
        tx['to'] = `0x${bitcoinjs.script.decompile(btcDecodedRawTx.outs[global_vars_1.GLOBAL_VARS.UTXO_VINDEX].script)[2].toString("hex")}`;
        // If there is no change output, which is currently being used to identify the sender, how else can we find out the from address?
        tx['from'] = btcDecodedRawTx.outs.length > 1 ? `0x${bitcoinjs.script.decompile(btcDecodedRawTx.outs[1].script)[2].toString("hex")}` : "";
        tx['value'] = ethers_1.BigNumber.from((0, utils_1.hexlify)(btcDecodedRawTx.outs[global_vars_1.GLOBAL_VARS.UTXO_VINDEX].value));
    }
    // Check if first OP code is OP_4 and length is > 5 -> assume contract call
    else if (bitcoinjs.script.decompile(btcDecodedRawTx.outs[global_vars_1.GLOBAL_VARS.UTXO_VINDEX].script)[0] === opcodes_1.OPS.OP_4 && bitcoinjs.script.decompile(btcDecodedRawTx.outs[global_vars_1.GLOBAL_VARS.UTXO_VINDEX].script).length > 5) {
        tx['to'] = `0x${bitcoinjs.script.decompile(btcDecodedRawTx.outs[global_vars_1.GLOBAL_VARS.UTXO_VINDEX].script)[4].toString("hex")}`;
        // If there is no change output, which is currently being used to identify the sender, how else can we find out the from address?
        tx['from'] = btcDecodedRawTx.outs.length > 1 ? `0x${bitcoinjs.script.decompile(btcDecodedRawTx.outs[1].script)[2].toString("hex")}` : "";
        tx['value'] = btcDecodedRawTx.outs[global_vars_1.GLOBAL_VARS.UTXO_VINDEX].value > 0 ? ethers_1.BigNumber.from((0, utils_1.hexlify)(btcDecodedRawTx.outs[global_vars_1.GLOBAL_VARS.UTXO_VINDEX].value)) : ethers_1.BigNumber.from("0x0");
        tx['data'] = bitcoinjs.script.decompile(btcDecodedRawTx.outs[global_vars_1.GLOBAL_VARS.UTXO_VINDEX].script)[3].toString("hex");
        tx['value'] = ethers_1.BigNumber.from((0, utils_1.hexlify)(btcDecodedRawTx.outs[global_vars_1.GLOBAL_VARS.UTXO_VINDEX].value)).toNumber() === 0 ? ethers_1.BigNumber.from("0x0") : ethers_1.BigNumber.from((0, utils_1.hexlify)(btcDecodedRawTx.outs[global_vars_1.GLOBAL_VARS.UTXO_VINDEX].value));
    }
    // assume contract creation
    else {
        tx['to'] = "";
        // If there is no change output, which is currently being used to identify the sender, how else can we find out the from address?
        tx['from'] = btcDecodedRawTx.outs.length > 1 ? `0x${bitcoinjs.script.decompile(btcDecodedRawTx.outs[1].script)[2].toString("hex")}` : "";
        tx['gasLimit'] = ethers_1.BigNumber.from((0, utils_1.hexlify)((0, script_number_1.decode)(bitcoinjs.script.decompile(btcDecodedRawTx.outs[0].script)[1])));
        tx['gasPrice'] = ethers_1.BigNumber.from((0, utils_1.hexlify)((0, script_number_1.decode)(bitcoinjs.script.decompile(btcDecodedRawTx.outs[0].script)[2])));
        tx['data'] = bitcoinjs.script.decompile(btcDecodedRawTx.outs[0].script)[3].toString("hex");
    }
    return tx;
}
exports.parseSignedTransaction = parseSignedTransaction;
function computeAddress(key, compressed) {
    const publicKey = (0, signing_key_1.computePublicKey)(key, compressed);
    return computeAddressFromPublicKey(publicKey);
}
exports.computeAddress = computeAddress;
function computeAddressFromPublicKey(publicKey) {
    if (!publicKey.startsWith("0x")) {
        publicKey = "0x" + publicKey;
    }
    const sha256Hash = (0, hash_js_1.sha256)().update(publicKey.split("0x")[1], "hex").digest("hex");
    const prefixlessAddress = (0, hash_js_1.ripemd160)().update(sha256Hash, "hex").digest("hex");
    return (0, address_1.getAddress)(`0x${prefixlessAddress}`);
}
exports.computeAddressFromPublicKey = computeAddressFromPublicKey;
function configureSbitAddressGeneration(hdnode) {
    // SBIT computes address from the public key differently than ethereum, ethereum uses keccak256 while SBIT uses ripemd160(sha256(compressedPublicKey))
    // @ts-ignore
    (0, properties_1.defineReadOnly)(hdnode, "sbitAddress", computeAddress(hdnode.publicKey, true));
    return hdnode;
}
exports.configureSbitAddressGeneration = configureSbitAddressGeneration;
function checkTransactionType(tx) {
    if (!!tx.to === false && (!!tx.value === false || ethers_1.BigNumber.from(tx.value).toNumber() === 0) && !!tx.data === true) {
        const needed = new bignumber_js_1.BigNumber(satoshiToSbit(tx.gasPrice)).times(ethers_1.BigNumber.from(tx.gasLimit).toNumber()).toFixed(8).toString();
        return { transactionType: global_vars_1.GLOBAL_VARS.CONTRACT_CREATION, neededAmount: needed };
    }
    else if (!!tx.to === false && ethers_1.BigNumber.from(tx.value).toNumber() > 0 && !!tx.data === true) {
        return { transactionType: global_vars_1.GLOBAL_VARS.DEPLOY_ERROR, neededAmount: "0" };
    }
    else if (!!tx.to === true && !!tx.data === true) {
        const needed = !!tx.value === true ?
            new bignumber_js_1.BigNumber(new bignumber_js_1.BigNumber(satoshiToSbit(tx.gasPrice)).toFixed(8))
                .times(ethers_1.BigNumber.from(tx.gasLimit).toNumber())
                .plus(satoshiToSbit(tx.value)).toFixed(8) :
            new bignumber_js_1.BigNumber(new bignumber_js_1.BigNumber(satoshiToSbit(tx.gasPrice)).toFixed(8))
                .times(ethers_1.BigNumber.from(tx.gasLimit).toNumber()).toFixed(8);
        return { transactionType: global_vars_1.GLOBAL_VARS.CONTRACT_CALL, neededAmount: needed };
    }
    else {
        const gas = new bignumber_js_1.BigNumber(satoshiToSbit(tx.gasPrice)).times(ethers_1.BigNumber.from(tx.gasLimit).toNumber());
        const needed = new bignumber_js_1.BigNumber(satoshiToSbit(tx.value)).plus(gas).toFixed(8);
        return { transactionType: global_vars_1.GLOBAL_VARS.P2PKH, neededAmount: needed };
    }
}
exports.checkTransactionType = checkTransactionType;
async function serializeTransaction(utxos, fetchUtxos, neededAmount, tx, transactionType, privateKey, publicKey, filterDust) {
    const signer = (hash) => {
        return secp256k1Sign(hash, (0, utils_1.arrayify)(privateKey));
    };
    return await serializeTransactionWith(utxos, fetchUtxos, neededAmount, tx, transactionType, signer, publicKey, filterDust);
}
exports.serializeTransaction = serializeTransaction;
async function serializeTransactionWith(utxos, fetchUtxos, neededAmount, tx, transactionType, signer, publicKey, filterDust) {
    // Building the SBIT tx that will eventually be serialized.
    let sbitTx = { version: 2, locktime: 0, vins: [], vouts: [] };
    // reduce precision in gasPrice to 1 satoshi
    tx.gasPrice = tx.gasPrice;
    // tx.gasPrice = dropPrecisionLessThanOneSatoshi(BigNumberEthers.from(tx.gasPrice).toString());
    // in ethereum, the way to send your entire balance is to solve a simple equation:
    // amount to send in wei = entire balance in wei - (gas limit * gas price)
    // in order to properly be able to spend all UTXOs we need compute
    // we need to filter outputs that are dust
    // something is considered dust
    checkLostPrecisionInGasPrice(ethers_1.BigNumber.from(tx.gasPrice).toNumber());
    // 40 satoshi gasPrice => 400 satoshi/byte which is the minimum relay fee
    const satoshiPerByte = ethers_1.BigNumber.from(tx.gasPrice).mul(10);
    const gas = ethers_1.BigNumber.from(ethers_1.BigNumber.from(tx.gasPrice).mul(ethers_1.BigNumber.from(tx.gasLimit).toNumber()).toString());
    const nonContractTx = transactionType === global_vars_1.GLOBAL_VARS.P2PKH;
    let neededAmountBN = ethers_1.BigNumber.from(parseFloat(neededAmount + `e+8`));
    const neededAmountMinusGasBN = nonContractTx ? neededAmountBN.sub(gas) : neededAmountBN;
    const spendableUtxos = filterUtxos(utxos, satoshiPerByte, filterDust);
    const vouts = [];
    let needChange = true;
    if (transactionType === global_vars_1.GLOBAL_VARS.CONTRACT_CREATION) {
        const contractCreateVout = getContractVout(ethers_1.BigNumber.from(tx.gasPrice).toNumber(), ethers_1.BigNumber.from(tx.gasLimit).toNumber(), 
        // @ts-ignore
        tx.data, "", 
        // OP_CREATE cannot send SBIT when deploying contract
        new bignumber_js_1.BigNumber(ethers_1.BigNumber.from("0x0").toNumber() + `e-8`).toFixed(8));
        vouts.push(contractCreateVout);
        sbitTx.vouts.push(contractCreateVout);
    }
    else if (transactionType === global_vars_1.GLOBAL_VARS.CONTRACT_CALL) {
        const contractVoutValue = !!tx.value === true ?
            new bignumber_js_1.BigNumber(satoshiToSbit(tx.value)).toNumber() :
            new bignumber_js_1.BigNumber(ethers_1.BigNumber.from("0x0").toNumber() + `e-8`).toFixed(8);
        const contractCallVout = getContractVout(ethers_1.BigNumber.from(tx.gasPrice).toNumber(), ethers_1.BigNumber.from(tx.gasLimit).toNumber(), 
        // @ts-ignore
        tx.data, tx.to, contractVoutValue);
        vouts.push(contractCallVout);
        sbitTx.vouts.push(contractCallVout);
    }
    else if (transactionType === global_vars_1.GLOBAL_VARS.P2PKH) {
        // need to correct neededAmount
        // check if sending all
        let inputsAmount = ethers_1.BigNumber.from(0);
        let i = 0;
        for (i = 0; i < spendableUtxos.length; i++) {
            const spendableUtxo = spendableUtxos[i];
            // investigate issue where amount has no decimal point as calculation panics
            // @ts-ignore
            const amount = spendableUtxo.amountNumber;
            const utxoValue = parseFloat(shiftBy(amount, 8));
            inputsAmount = inputsAmount.add(utxoValue);
        }
        needChange = !inputsAmount.eq(neededAmountBN);
        if (needChange) {
            neededAmountBN = neededAmountMinusGasBN;
            neededAmount = satoshiToSbit(neededAmountBN);
        }
        if (!neededAmountBN.eq(ethers_1.BigNumber.from(0))) {
            // no need to generate an empty UTXO and clog the blockchain
            vouts.push('p2pkh');
        }
    }
    else if (transactionType === global_vars_1.GLOBAL_VARS.DEPLOY_ERROR) {
        // user requested sending SBIT with OP_CREATE which will result in the SBIT being lost
        throw new Error("Cannot send SBIT to contract when deploying a contract");
    }
    else {
        throw new Error("Internal error: unknown transaction type: " + transactionType);
    }
    // @ts-ignore
    const hash160PubKey = tx.from.split("0x")[1];
    // @ts-ignore
    let vins, amounts, availableAmount, fee, changeAmount, changeType, vinTypes;
    try {
        // @ts-ignore
        [vins, amounts, availableAmount, fee, changeAmount, changeType, vinTypes] = await addVins(vouts, spendableUtxos, neededAmount, needChange, satoshiPerByte.toString(), hash160PubKey, publicKey);
    }
    catch (e) {
        if (!neededAmountBN.eq(neededAmountMinusGasBN) || ((typeof e.message) === 'string' && e.message.indexOf('more satoshi') === -1)) {
            throw e;
        }
        // needs more satoshi, provide more inputs
        // we probably need to filter dust here since the above non-filtered dust failed, there should be more inputs here
        const allSpendableUtxos = filterUtxos(await fetchUtxos(), satoshiPerByte, filterDust);
        const neededAmountMinusGas = satoshiToSbit(neededAmountMinusGasBN);
        // @ts-ignore
        [vins, amounts, availableAmount, fee, changeAmount, changeType, vinTypes] = await addVins(vouts, allSpendableUtxos, neededAmountMinusGas, needChange, satoshiPerByte.toString(), hash160PubKey, publicKey);
    }
    if (vins.length === 0) {
        throw new Error("Couldn't find any vins");
    }
    sbitTx.vins = vins;
    if (transactionType === global_vars_1.GLOBAL_VARS.P2PKH) {
        // @ts-ignore
        const hash160Address = tx.to.split("0x")[1];
        let value;
        if (changeAmount) {
            // not using all
            value = new bignumber_js_1.BigNumber(ethers_1.BigNumber.from(tx.value).toNumber()).toNumber();
        }
        else {
            value = new bignumber_js_1.BigNumber(availableAmount).toNumber();
        }
        if (value != 0) {
            const p2pkhVout = {
                script: p2pkhScript(Buffer.from(hash160Address, "hex")),
                value: value
            };
            sbitTx.vouts.push(p2pkhVout);
        }
    }
    // add change if needed
    if (changeAmount) {
        sbitTx.vouts.push({
            // @ts-ignore
            script: scriptMap[changeType](Buffer.from(hash160PubKey, "hex")),
            value: changeAmount.toNumber()
        });
    }
    // Sign necessary vins
    const updatedVins = [];
    for (let i = 0; i < sbitTx.vins.length; i++) {
        if (vinTypes[i].toLowerCase() === "p2pk") {
            updatedVins.push(Object.assign(Object.assign({}, sbitTx.vins[i]), { ['scriptSig']: p2pkScriptSig(await signp2pkhWith(sbitTx, i, signer)) }));
        }
        else {
            updatedVins.push(Object.assign(Object.assign({}, sbitTx.vins[i]), { ['scriptSig']: p2pkhScriptSig(await signp2pkhWith(sbitTx, i, signer), publicKey.split("0x")[1]) }));
        }
    }
    sbitTx.vins = updatedVins;
    // Build the serialized transaction string.
    return txToBuffer(sbitTx).toString('hex');
}
exports.serializeTransactionWith = serializeTransactionWith;
function filterUtxos(utxos, satoshiPerByte, filterDust) {
    for (let i = 0; i < utxos.length; i++) {
        // @ts-ignore
        utxos[i].amountNumber = parseFloat(parseFloat(utxos[i].amount).toFixed(8));
    }
    return utxos.filter((utxo) => {
        if (utxo.safe === undefined || !utxo.safe) {
            // unsafe to spend utxo
            return false;
        }
        if (filterDust) {
            // @ts-ignore
            const utxoValue = parseFloat(utxo.amountNumber + `e+8`);
            const minimumValueToNotBeDust = getMinNonDustValue(utxo, satoshiPerByte);
            return utxoValue >= minimumValueToNotBeDust;
        }
        return true;
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvbGliL2hlbHBlcnMvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEscURBQTBFO0FBRTFFLDBEQUEyRDtBQUMzRCxpQ0FBK0I7QUFDL0IsdUNBQWdDO0FBQ2hDLCtDQUE0QztBQUM1QyxtREFBK0M7QUFDL0Msb0RBQW9EO0FBRXBELFlBQVk7QUFDWix5Q0FBNEM7QUFDNUMsSUFBSSxhQUFhLEdBQUcscUJBQVMsQ0FBQTtBQUM3QixJQUFJLENBQUMscUJBQVMsSUFBSSxnQkFBSSxFQUFFO0lBQ3BCLHlEQUF5RDtJQUN6RCxZQUFZO0lBQ1osYUFBYSxHQUFHLFVBQVMsTUFBTSxFQUFFLFVBQVU7UUFDdkMsdUVBQXVFO1FBQ3ZFLFlBQVk7UUFDWixNQUFNLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztRQUN4QixZQUFZO1FBQ1osVUFBVSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7UUFDNUIsT0FBTyxJQUFBLGdCQUFJLEVBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3BDLENBQUMsQ0FBQTtDQUNKO0FBQ0QsbUVBQTRGO0FBQzVGLHFDQUEyQztBQUMzQywrQ0FBd0M7QUFDeEMsNkZBQTZGO0FBQzdGLDhDQUE4QztBQUM5QywyQ0FBMkM7QUFDM0MsNENBSTBCO0FBRTFCLG1DQUFvRTtBQUNwRSwrQ0FBdUM7QUFDdkMsNERBQThEO0FBRzlELG1EQUFtRDtBQUNuRCxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFFM0MsMEVBQTBFO0FBQzFFO0lBQ0ksbUJBQW1CO0lBQ25CLGFBQWE7SUFDYixVQUFVO0NBQ2IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRTtJQUNyQix3RUFBd0U7SUFDeEUsTUFBTSxFQUFFLEdBQUcsSUFBSSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENB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