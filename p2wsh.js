let {
  address: baddress,
  crypto: bcrypto,
  networks: bnetworks,
  script: bscript
} = require('bitcoinjs-lib')
let typef = require('typeforce')
let OPS = require('bitcoin-ops')
let { lazyprop } = require('./lazy')
let EMPTY_BUFFER = Buffer.alloc(0)

function stacksEqual (a, b) {
  if (a.length !== b.length) return false

  return a.every(function (x, i) {
    return x.equals(b[i])
  })
}

// input: <>
// witness: [redeemScriptSig ...] {redeemScript}
// output: OP_0 {sha256(redeemScript)}
function p2wsh (a, opts) {
  if (
    !a.address &&
    !a.hash &&
    !a.output &&
    !a.redeem &&
    !a.witness
  ) throw new TypeError('Not enough data')
  opts = opts || { validate: true }

  typef({
    network: typef.maybe(typef.Object),

    address: typef.maybe(typef.String),
    hash: typef.maybe(typef.BufferN(32)),
    output: typef.maybe(typef.BufferN(34)),

    redeem: typef.maybe({
      input: typef.maybe(typef.Buffer),
      network: typef.Object,
      output: typef.Buffer,
      witness: typef.maybe(typef.arrayOf(typef.Buffer))
    }),
    input: typef.maybe(typef.BufferN(0)),
    witness: typef.maybe(typef.arrayOf(typef.Buffer))
  }, a)

  let network = a.network || bnetworks.bitcoin
  let validate = a.validate === undefined ? true : a.validate
  let o = { network }

  lazyprop(o, 'address', function () {
    if (!o.hash) return
    return baddress.toBech32(o.hash, 0x00, network.bech32)
  })
  lazyprop(o, 'hash', function () {
    if (a.output) return a.output.slice(2)
    if (a.address) return baddress.fromBech32(a.address).data
    if (!o.redeem) return
    if (o.redeem.output) return bcrypto.sha256(o.redeem.output)
  })
  lazyprop(o, 'output', function () {
    if (!o.hash) return
    return bscript.compile([
      OPS.OP_0,
      o.hash
    ])
  })
  lazyprop(o, 'redeem', function () {
    if (!a.witness) return
    return {
      output: a.witness[a.witness.length - 1],
      input: EMPTY_BUFFER,
      witness: a.witness.slice(0, -1)
    }
  })
  lazyprop(o, 'input', function () {
    if (!o.witness) return
    return EMPTY_BUFFER
  })
  lazyprop(o, 'witness', function () {
    if (!o.redeem) return
    if (!o.redeem.witness) return
    return [].concat(o.redeem.witness, o.redeem.output)
  })

  // extended validation
  if (opts.validate) {
    if (a.address) {
      let decode = baddress.fromBech32(a.address)
      if (network.bech32 !== decode.prefix) throw new TypeError('Network mismatch')
      if (decode.version !== 0x00) throw new TypeError('Invalid version')
      if (decode.data.length !== 32) throw new TypeError('Invalid data')
    }

    if (a.hash) {
      if (o.hash && !a.hash.equals(o.hash)) throw new TypeError('Hash mismatch')
    }

    if (a.output) {
      if (
        a.output.length !== 34 ||
        a.output[0] !== OPS.OP_0 ||
        a.output[1] !== 0x20) throw new TypeError('Output is invalid')
    }

    if (a.redeem) {
      if (network !== a.redeem.network) throw new TypeError('Network mismatch')

      // is there two redeem sources?
      if (
        a.redeem.input &&
        a.redeem.input.length > 0 &&
        a.redeem.witness) throw new TypeError('Ambiguous witness source')

      // is the redeem output non-empty?
      if (bscript.decompile(a.redeem.output).length === 0) throw new TypeError('Redeem.output is invalid')

      // match hash against other sources
      if (a.output || a.address || a.hash) {
        let redeemOutputHash = bcrypto.hash160(a.redeem.output)
        if (o.hash.equals(redeemOutputHash)) throw new TypeError('Hash mismatch')
      }

      // attempt to transform redeem input to witness stack
      if (a.redeem.input && a.redeem.input.length > 0) {
        let redeemInputChunks = bscript.decompile(a.redeem.input)
        if (!bscript.isPushOnly(redeemInputChunks)) throw new TypeError('Non push-only scriptSig')

        let stack = bscript.toStack(redeemInputChunks)

        // assign, and blank the existing input
        a.redeem = Object.assign({ witness: stack }, a.redeem)
        a.redeem.input = EMPTY_BUFFER
      }
    }

    if (a.witness) {
      if (o.witness && !stacksEqual(a.witness, o.witness)) throw new TypeError('Witness mismatch')
      if (a.redeem && a.redeem.witness && !stacksEqual(a.redeem.witness, o.redeem.witness)) throw new TypeError('Witness and redeem.witness mismatch')
      if (a.redeem && !a.redeem.output.equals(o.redeem.output)) throw new TypeError('Witness and redeem.output mismatch')
    }
  }

  return Object.assign(o, a)
}

module.exports = p2wsh
