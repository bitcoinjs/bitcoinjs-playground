let {
  ECPair
} = require('bitcoinjs-lib')
let tape = require('tape')
let p2pk = require('../p2pk')
let p2pkh = require('../p2pkh')
let p2wpkh = require('../p2wpkh')
let p2sh = require('../p2sh')
let p2wsh = require('../p2wsh')

let EMPTY_BUFFER = Buffer.alloc(0)

tape('throws with not enough data', (t) => {
  t.plan(1)
  t.throws(() => {
    p2sh({})
  }, /Not enough data/)
})

tape('derives output only', (t) => {
  let hash = Buffer.alloc(20, 0x01)
  let result1 = p2sh({ hash })
  t.same(result1.address, '31nKoVLBc2BXUeKQKhnimyrt9DD12VwG6p')
  t.same(result1.output.toString('hex'), 'a914010101010101010101010101010101010101010187')
  t.same(result1.hash.toString('hex'), '0101010101010101010101010101010101010101')

  let keyPair = ECPair.fromWIF('KxJknBSZjp9WwnrgkvfG1zpHtuEqRjcnsr9RFpxWnk2GNJbkGe42')
  let pubkey = keyPair.getPublicKeyBuffer()

  let result2 = p2sh({ redeem: p2pkh({ pubkey }) })
  t.same(result2.address, '3GETYP4cuSesh2zsPEEYVZqnRedwe4FwUT')
  t.same(result2.redeem.address, '1JnHvAd2m9YqykjpF11a4y59hpt5KoqRmn')
  t.same(result2.redeem.hash.toString('hex'), 'c30afa58ae0673b00a45b5c17dff4633780f1400')
  t.same(result2.redeem.output.toString('hex'), '76a914c30afa58ae0673b00a45b5c17dff4633780f140088ac')
  t.same(result2.redeem.pubkey.toString('hex'), '03e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd283058')

  let result3 = p2sh({ redeem: p2wpkh({ pubkey }) })
  t.same(result3.address, '325CuTNSYmvurXaBmhNFer5zDkKnDXZggu')
  t.same(result3.redeem.address, 'bc1qcv905k9wqeemqzj9khqhml6xxduq79qqy745vn')
  t.same(result3.redeem.hash.toString('hex'), 'c30afa58ae0673b00a45b5c17dff4633780f1400')
  t.same(result3.redeem.output.toString('hex'), '0014c30afa58ae0673b00a45b5c17dff4633780f1400')
  t.same(result3.redeem.pubkey.toString('hex'), '03e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd283058')

  let result4 = p2wsh({ redeem: p2pk({ pubkey }) })
  t.same(result4.redeem.output.toString('hex'), '2103e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd283058ac')
  t.same(result4.redeem.pubkey.toString('hex'), '03e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd283058')
  t.same(result4.address, 'bc1q6rgl33d3s9dugudw7n68yrryajkr3ha9q8q24j20zs62se4q9tsqdy0t2q')
  t.end()
})

tape('supports recursion, better or worse', (t) => {
  let keyPair = ECPair.fromWIF('KxJknBSZjp9WwnrgkvfG1zpHtuEqRjcnsr9RFpxWnk2GNJbkGe42')
  let pubkey = keyPair.getPublicKeyBuffer()
  let signature = keyPair.sign(Buffer.alloc(32)).toScriptSignature(0x01)

  let result1 = p2sh({ redeem: p2pkh({ pubkey, signature }) })
  t.same(result1.address, '3GETYP4cuSesh2zsPEEYVZqnRedwe4FwUT')
  t.same(result1.output.toString('hex'), 'a9149f840a5fc02407ef0ad499c2ec0eb0b942fb008687')
  t.same(result1.redeem.address, '1JnHvAd2m9YqykjpF11a4y59hpt5KoqRmn')
  t.same(result1.redeem.hash.toString('hex'), 'c30afa58ae0673b00a45b5c17dff4633780f1400')
  t.same(result1.redeem.output.toString('hex'), '76a914c30afa58ae0673b00a45b5c17dff4633780f140088ac')
  t.same(result1.redeem.pubkey.toString('hex'), '03e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd283058')
  t.same(result1.input.toString('hex'), '47304402203f016fdb065b990a23f6b5735e2ef848e587861f620500ce35a2289da08a8c2802204ab76634cb4ca9646908941690272ce4115d54e78e0584008ec90f624c3cdd23012103e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd2830581976a914c30afa58ae0673b00a45b5c17dff4633780f140088ac')
  t.same(result1.witness, undefined)

  let result2 = p2sh({ redeem: result1 })
  t.same(result2.address, '31vZNjEeCDbwAbgpXX5NV9H3exzKmMakn8')
  t.same(result2.redeem.address, '3GETYP4cuSesh2zsPEEYVZqnRedwe4FwUT')
  t.same(result2.input.toString('hex'), '47304402203f016fdb065b990a23f6b5735e2ef848e587861f620500ce35a2289da08a8c2802204ab76634cb4ca9646908941690272ce4115d54e78e0584008ec90f624c3cdd23012103e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd2830581976a914c30afa58ae0673b00a45b5c17dff4633780f140088ac17a9149f840a5fc02407ef0ad499c2ec0eb0b942fb008687')
  t.same(result2.witness, undefined)

  t.end()
})

tape('derives both', (t) => {
  let keyPair = ECPair.fromWIF('KxJknBSZjp9WwnrgkvfG1zpHtuEqRjcnsr9RFpxWnk2GNJbkGe42')
  let pubkey = keyPair.getPublicKeyBuffer()
  let signature = keyPair.sign(Buffer.alloc(32)).toScriptSignature(0x01)

  let result1 = p2sh({ redeem: p2pkh({ pubkey, signature }) })
  t.same(result1.address, '3GETYP4cuSesh2zsPEEYVZqnRedwe4FwUT')
  t.same(result1.redeem.address, '1JnHvAd2m9YqykjpF11a4y59hpt5KoqRmn')
  t.same(result1.redeem.hash.toString('hex'), 'c30afa58ae0673b00a45b5c17dff4633780f1400')
  t.same(result1.redeem.output.toString('hex'), '76a914c30afa58ae0673b00a45b5c17dff4633780f140088ac')
  t.same(result1.redeem.pubkey.toString('hex'), '03e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd283058')
  t.same(result1.input.toString('hex'), '47304402203f016fdb065b990a23f6b5735e2ef848e587861f620500ce35a2289da08a8c2802204ab76634cb4ca9646908941690272ce4115d54e78e0584008ec90f624c3cdd23012103e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd2830581976a914c30afa58ae0673b00a45b5c17dff4633780f140088ac')
  t.same(result1.witness, undefined)

  // derives everything relevant
  let result1b = p2sh({ input: result1.input })
  t.same(result1b.address, result1.address)
  t.same(result1b.input, result1.input)
  t.same(result1b.output, result1.output)
  t.same(result1b.redeem.input, result1.redeem.input)
  t.same(result1b.redeem.output, result1.redeem.output)
  t.same(result1b.redeem.witness, result1.redeem.witness)
  t.same(result1b.input, result1.input)
  t.same(result1b.witness, result1.witness)

  let result2 = p2sh({ redeem: p2wpkh({ pubkey, signature }) })
  t.same(result2.address, '325CuTNSYmvurXaBmhNFer5zDkKnDXZggu')
  t.same(result2.redeem.address, 'bc1qcv905k9wqeemqzj9khqhml6xxduq79qqy745vn')
  t.same(result2.redeem.hash.toString('hex'), 'c30afa58ae0673b00a45b5c17dff4633780f1400')
  t.same(result2.redeem.input.toString('hex'), '') // defined! as p2wpkh is a valid witness encoded redeem!
  t.same(result2.redeem.output.toString('hex'), '0014c30afa58ae0673b00a45b5c17dff4633780f1400')
  t.same(result2.redeem.pubkey.toString('hex'), '03e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd283058')
  t.same(result2.witness.length, 2)
  t.same(result2.witness[0].toString('hex'), '304402203f016fdb065b990a23f6b5735e2ef848e587861f620500ce35a2289da08a8c2802204ab76634cb4ca9646908941690272ce4115d54e78e0584008ec90f624c3cdd2301')
  t.same(result2.witness[1].toString('hex'), '03e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd283058')

  let result3 = p2wsh({ redeem: p2pkh({ pubkey, signature }) })
  t.same(result3.address, 'bc1qusxlgq9quu27ucxs7a2fg8nv0pycdzvxsjk9npyupupxw3y892ss2cq5ar')
  t.same(result3.input, EMPTY_BUFFER)
  t.same(result3.redeem.address, '1JnHvAd2m9YqykjpF11a4y59hpt5KoqRmn')
  t.same(result3.redeem.hash.toString('hex'), 'c30afa58ae0673b00a45b5c17dff4633780f1400')
  t.same(result3.redeem.input, undefined)
  t.same(result3.redeem.output.toString('hex'), '76a914c30afa58ae0673b00a45b5c17dff4633780f140088ac')
  t.same(result3.redeem.pubkey.toString('hex'), '03e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd283058')
  t.same(result3.redeem.witness.length, 2)
  t.same(result3.redeem.witness[0].toString('hex'), '304402203f016fdb065b990a23f6b5735e2ef848e587861f620500ce35a2289da08a8c2802204ab76634cb4ca9646908941690272ce4115d54e78e0584008ec90f624c3cdd2301')
  t.same(result3.redeem.witness[1].toString('hex'), '03e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd283058')
  t.same(result3.witness.length, 3)
  t.same(result3.witness[0].toString('hex'), '304402203f016fdb065b990a23f6b5735e2ef848e587861f620500ce35a2289da08a8c2802204ab76634cb4ca9646908941690272ce4115d54e78e0584008ec90f624c3cdd2301')
  t.same(result3.witness[1].toString('hex'), '03e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd283058')
  t.same(result3.witness[2].toString('hex'), '76a914c30afa58ae0673b00a45b5c17dff4633780f140088ac')

  // derives everything relevant
  let result3b = p2wsh({ witness: result3.witness })
  t.same(result3b.address, result3.address)
  t.same(result3b.input, result3.input)
  t.same(result3b.output, result3.output)
  t.same(result3b.redeem.input, undefined) // different! we transformed redeem.input to a witness stack
  t.same(result3b.redeem.witness.length, 2)
  t.same(result3b.redeem.witness[0].toString('hex'), '304402203f016fdb065b990a23f6b5735e2ef848e587861f620500ce35a2289da08a8c2802204ab76634cb4ca9646908941690272ce4115d54e78e0584008ec90f624c3cdd2301')
  t.same(result3b.redeem.witness[1].toString('hex'), '03e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd283058')
  t.same(result3b.witness, result3.witness)

  let result4 = p2wsh({ redeem: p2wpkh({ pubkey, signature }) })
  t.same(result4.address, 'bc1qpsl7el8wcx22f3fpdt3lm2wmzug7yyx2q3n8wzgtf37kps9tqy7skc7m3e')
  t.same(result4.input, EMPTY_BUFFER)
  t.same(result4.redeem.address, 'bc1qcv905k9wqeemqzj9khqhml6xxduq79qqy745vn')
  t.same(result4.redeem.hash.toString('hex'), 'c30afa58ae0673b00a45b5c17dff4633780f1400')
  t.same(result4.redeem.input.toString('hex'), '') // defined! as p2wpkh is a valid witness encoded redeem!
  t.same(result4.redeem.output.toString('hex'), '0014c30afa58ae0673b00a45b5c17dff4633780f1400')
  t.same(result4.redeem.pubkey.toString('hex'), '03e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd283058')
  t.same(result4.witness.length, 3)
  t.same(result4.witness[0].toString('hex'), '304402203f016fdb065b990a23f6b5735e2ef848e587861f620500ce35a2289da08a8c2802204ab76634cb4ca9646908941690272ce4115d54e78e0584008ec90f624c3cdd2301')
  t.same(result4.witness[1].toString('hex'), '03e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd283058')
  t.same(result4.witness[2].toString('hex'), '0014c30afa58ae0673b00a45b5c17dff4633780f1400')

  let result4b = p2wsh({ witness: result4.witness })
  t.same(result4b.address, 'bc1qpsl7el8wcx22f3fpdt3lm2wmzug7yyx2q3n8wzgtf37kps9tqy7skc7m3e')
  t.same(result4b.input, result4.input)
  t.same(result4b.redeem.input, undefined)
  t.same(result4b.redeem.output.toString('hex'), '0014c30afa58ae0673b00a45b5c17dff4633780f1400')
  t.same(result4b.redeem.witness.length, 2)
  t.same(result4b.redeem.witness[0].toString('hex'), '304402203f016fdb065b990a23f6b5735e2ef848e587861f620500ce35a2289da08a8c2802204ab76634cb4ca9646908941690272ce4115d54e78e0584008ec90f624c3cdd2301')
  t.same(result4b.redeem.witness[1].toString('hex'), '03e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd283058')
  t.same(result4b.witness, result4.witness)

  let result5 = p2wsh({ output: result4b.output })
  t.same(result5.address, 'bc1qpsl7el8wcx22f3fpdt3lm2wmzug7yyx2q3n8wzgtf37kps9tqy7skc7m3e')

  t.end()
})
