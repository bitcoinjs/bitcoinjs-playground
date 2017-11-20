let {
  crypto: bcrypto,
  networks: bnetworks,
  script: bscript
} = require('bitcoinjs-lib')
let bs58check = require('bs58check')
let typef = require('typeforce')
let OPS = require('bitcoin-ops')

function toBase58Check (hash, version) {
  typef(typef.tuple(typef.BufferN(20), typef.UInt8), arguments)

  let payload = Buffer.allocUnsafe(21)
  payload.writeUInt8(version, 0)
  hash.copy(payload, 1)

  return bs58check.encode(payload)
}

function fromBase58Check (address) {
  let payload = bs58check.decode(address)
  if (payload.length < 21) throw new TypeError(address + ' is too short')
  if (payload.length > 21) throw new TypeError(address + ' is too long')

  let version = payload.readUInt8(0)
  let hash = payload.slice(1)

  return { version: version, hash: hash }
}

function p2pk () {

}

// {signature} {pubkey}
// OP_DUP OP_HASH160 {pubKeyHash} OP_EQUALVERIFY OP_CHECKSIG
function p2pkh (a) {
  typef({
    address: typef.maybe(typef.String),
    hash: typef.maybe(typef.BufferN(20)),
    input: typef.maybe(typef.Buffer),
    network: typef.maybe(typef.Object),
    output: typef.maybe(typef.BufferN(25)),
    pubkey: typef.maybe(bscript.isCanonicalPubKey),
    signature: typef.maybe(bscript.isCanonicalSignature)
  }, a)

  let input = a.input
  let pubkey = a.pubkey
  let signature = a.signature

  if (pubkey && signature) {
    let script = bscript.compile([signature, pubkey])
    if (input && !input.equals(script)) throw new TypeError('Input mismatch')
    if (!input) input = script

  // decompile input for data
  } else if (input) {
    let chunks = bscript.decompile(input)
    if (chunks.length !== 2 ||
      !bscript.isCanonicalSignature(chunks[0]) ||
      !bscript.isCanonicalPubKey(chunks[1])) throw new TypeError('Input is invalid')

    if (signature && !signature.equals(chunks[0])) throw new TypeError('Signature mismatch')
    if (!signature) signature = chunks[0]

    if (pubkey && !pubkey.equals(chunks[1])) throw new TypeError('Pubkey mismatch')
    if (!pubkey) pubkey = chunks[1]
  }

  let hash = a.hash
  if (pubkey) {
    let pubKeyHash = bcrypto.hash160(pubkey)

    if (hash && !hash.equals(pubKeyHash)) throw new TypeError('Hash mismatch')
    if (!hash) hash = pubKeyHash
  }

  let network = a.network || bnetworks.bitcoin
  let address = a.address
  if (address) {
    let decode = fromBase58Check(address)
    if (network && network.pubKeyHash !== decode.version) throw new TypeError('Network mismatch')

    if (hash && !hash.equals(decode.hash)) throw new TypeError('Hash mismatch')
    if (!hash) hash = decode.hash
  }

  let output = a.output
  if (output) {
    if (
      output.length !== 25 ||
      output[0] !== OPS.OP_DUP ||
      output[1] !== OPS.OP_HASH160 ||
      output[2] !== 0x14 ||
      output[23] !== OPS.OP_EQUALVERIFY ||
      output[24] !== OPS.OP_CHECKSIG) throw new TypeError('Output is invalid')

    let pubKeyHash = output.slice(3, 23)
    if (hash && !hash.equals(pubKeyHash)) throw new TypeError('Hash mismatch')
    if (!hash) hash = pubKeyHash
  }

  if (!hash) throw new TypeError('Not enough data')
  if (!address) {
    address = toBase58Check(hash, network.pubKeyHash)
  }

  if (!output) {
    output = bscript.compile([
      OPS.OP_DUP,
      OPS.OP_HASH160,
      hash,
      OPS.OP_EQUALVERIFY,
      OPS.OP_CHECKSIG
    ])
  }

  let result = { address, hash, network, output }
  if (input) result.input = input
  if (pubkey) result.pubkey = pubkey
  if (signature) result.signature = signature
  return result
}

function p2wpkh () {

}

// <redeemScriptSig> {redeemScript}
// OP_HASH160 {hash160 redeemScript} OP_EQUAL
function p2sh (a) {
  typef({
    address: typef.maybe(typef.String),
    hash: typef.maybe(typef.BufferN(20)),
    redeem: typef.maybe(typef.Object),
    input: typef.maybe(typef.Buffer),
    network: typef.maybe(typef.Object),
    output: typef.maybe(typef.BufferN(25))
  }, a)

  let hash = a.hash
  let network = a.network || bnetworks.bitcoin
  let address = a.address
  if (address) {
    let decode = fromBase58Check(address)
    if (network && network.scriptHash !== decode.version) throw new TypeError('Network mismatch')

    if (hash && !hash.equals(decode.hash)) throw new TypeError('Hash mismatch')
    if (!hash) hash = decode.hash
  }

  let output = a.output
  if (output) {
    if (
      output.length !== 23 ||
      output[0] !== OPS.OP_HASH160 ||
      output[1] !== 0x14 ||
      output[22] !== OPS.OP_EQUAL) throw new TypeError('Output is invalid')

    let scriptHash = output.slice(1, 22)
    if (hash && !hash.equals(scriptHash)) throw new TypeError('Hash mismatch')
    if (!hash) hash = scriptHash
  }

  if (!hash) throw new TypeError('Not enough data')
  if (!address) {
    address = toBase58Check(hash, network.scriptHash)
  }

  if (!output) {
    output = bscript.compile([
      OPS.OP_HASH160,
      hash,
      OPS.OP_EQUAL
    ])
  }

  let result = { address, hash, network, output }
  return result
}

function p2wsh () {

}

function p2ms () {

}

module.exports = {
  p2pk, p2pkh, p2wpkh, p2sh, p2wsh, p2ms
}
