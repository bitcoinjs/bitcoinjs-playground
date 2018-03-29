let {
  ECPair
} = require('bitcoinjs-lib')
let tape = require('tape')
let p2ms = require('../p2ms')
let p2pk = require('../p2pk')
let p2pkh = require('../p2pkh')
let p2sh = require('../p2sh')
let p2wpkh = require('../p2wpkh')

let keyPair = ECPair.fromWIF('KxJknBSZjp9WwnrgkvfG1zpHtuEqRjcnsr9RFpxWnk2GNJbkGe42')
let pubkey = keyPair.getPublicKeyBuffer()
let signature = keyPair.sign(Buffer.alloc(32)).toScriptSignature(0x01)
let hash = Buffer.alloc(20, 0x01)

tape('throws with not enough data', (t) => {
  t.plan(1)
  t.throws(() => {
    p2sh({})
  }, /Not enough data/)
})

tape('derives output', (t) => {
  let result0 = p2sh({ address: '31nKoVLBc2BXUeKQKhnimyrt9DD12VwG6p' })
  t.same(result0.address, '31nKoVLBc2BXUeKQKhnimyrt9DD12VwG6p')
  t.same(result0.output.toString('hex'), 'a914010101010101010101010101010101010101010187')
  t.same(result0.hash.toString('hex'), '0101010101010101010101010101010101010101')

  let result1 = p2sh({ hash })
  t.same(result1.address, '31nKoVLBc2BXUeKQKhnimyrt9DD12VwG6p')
  t.same(result1.output.toString('hex'), 'a914010101010101010101010101010101010101010187')
  t.same(result1.hash.toString('hex'), '0101010101010101010101010101010101010101')

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

  let result4 = p2sh({ redeem: p2pk({ pubkey }) })
  t.same(result4.redeem.output.toString('hex'), '2103e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd283058ac')
  t.same(result4.redeem.pubkey.toString('hex'), '03e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd283058')
  t.same(result4.address, '36TibC8RrPB9WrBdPoGXhHqDHJosyFVtVQ')
  t.end()
})

tape('supports recursion, better or worse', (t) => {
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

  let result3 = p2sh({ redeem: p2pkh({ pubkey, signature }) })
  t.same(result3.address, '3GETYP4cuSesh2zsPEEYVZqnRedwe4FwUT')
  t.same(result3.input.toString('hex'), '47304402203f016fdb065b990a23f6b5735e2ef848e587861f620500ce35a2289da08a8c2802204ab76634cb4ca9646908941690272ce4115d54e78e0584008ec90f624c3cdd23012103e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd2830581976a914c30afa58ae0673b00a45b5c17dff4633780f140088ac')
  t.same(result3.redeem.address, '1JnHvAd2m9YqykjpF11a4y59hpt5KoqRmn')
  t.same(result3.redeem.hash.toString('hex'), 'c30afa58ae0673b00a45b5c17dff4633780f1400')
  t.same(result3.redeem.input.toString('hex'), '47304402203f016fdb065b990a23f6b5735e2ef848e587861f620500ce35a2289da08a8c2802204ab76634cb4ca9646908941690272ce4115d54e78e0584008ec90f624c3cdd23012103e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd283058')
  t.same(result3.redeem.output.toString('hex'), '76a914c30afa58ae0673b00a45b5c17dff4633780f140088ac')
  t.same(result3.redeem.pubkey.toString('hex'), '03e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd283058')
  t.same(result3.redeem.witness, undefined)
  t.same(result3.witness, undefined)

  // derives everything relevant
  let result3b = p2sh({ input: result3.input })
  t.same(result3b.address, result3.address)
  t.same(result3b.input, result3.input)
  t.same(result3b.output, result3.output)
  t.same(result3b.redeem.input, result3.redeem.input)
  t.same(result3b.redeem.witness, undefined)
  t.same(result3b.witness, result3.witness)

  let result4 = p2sh({ redeem: p2wpkh({ pubkey, signature }) })
  t.same(result4.address, '325CuTNSYmvurXaBmhNFer5zDkKnDXZggu')
  t.same(result4.input.toString('hex'), '160014c30afa58ae0673b00a45b5c17dff4633780f1400')
  t.same(result4.redeem.address, 'bc1qcv905k9wqeemqzj9khqhml6xxduq79qqy745vn')
  t.same(result4.redeem.hash.toString('hex'), 'c30afa58ae0673b00a45b5c17dff4633780f1400')
  t.same(result4.redeem.input.toString('hex'), '') // defined! as p2wpkh is a valid witness encoded redeem!
  t.same(result4.redeem.output.toString('hex'), '0014c30afa58ae0673b00a45b5c17dff4633780f1400')
  t.same(result4.redeem.pubkey.toString('hex'), '03e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd283058')
  t.same(result4.witness.length, 2)
  t.same(result4.witness[0].toString('hex'), '304402203f016fdb065b990a23f6b5735e2ef848e587861f620500ce35a2289da08a8c2802204ab76634cb4ca9646908941690272ce4115d54e78e0584008ec90f624c3cdd2301')
  t.same(result4.witness[1].toString('hex'), '03e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd283058')

  let result4b = p2sh({ input: result4.input, witness: result4.witness })
  t.same(result4b.address, '325CuTNSYmvurXaBmhNFer5zDkKnDXZggu')
  t.same(result4b.input.toString('hex'), '160014c30afa58ae0673b00a45b5c17dff4633780f1400')
  t.same(result4b.output.toString('hex'), 'a9140432515d8fe8de31be8207987fc6d67b29d5e7cc87')
  t.same(result4b.redeem.input.toString('hex'), '')
  t.same(result4b.redeem.output.toString('hex'), '0014c30afa58ae0673b00a45b5c17dff4633780f1400')
  t.same(result4b.witness.length, 2)
  t.same(result4b.witness[0].toString('hex'), '304402203f016fdb065b990a23f6b5735e2ef848e587861f620500ce35a2289da08a8c2802204ab76634cb4ca9646908941690272ce4115d54e78e0584008ec90f624c3cdd2301')
  t.same(result4b.witness[1].toString('hex'), '03e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd283058')

  t.same(p2sh({ address: result4b.address }).address, '325CuTNSYmvurXaBmhNFer5zDkKnDXZggu')
  t.same(p2sh({ hash: result4b.hash }).address, '325CuTNSYmvurXaBmhNFer5zDkKnDXZggu')
  t.same(p2sh({ output: result4b.output }).address, '325CuTNSYmvurXaBmhNFer5zDkKnDXZggu')

  let result6 = p2sh({ redeem: p2ms({ m: 2, pubkeys: [pubkey, pubkey, pubkey, pubkey], signatures: [signature, signature] }) })
  t.same(result6.address, '3JqiHmAuzupMWLn73c5BRYM8ATrKgEpkaD')
  t.same(result6.redeem.m, 2)
  t.same(result6.redeem.n, 4)
  t.same(result6.redeem.input.toString('hex'), '0047304402203f016fdb065b990a23f6b5735e2ef848e587861f620500ce35a2289da08a8c2802204ab76634cb4ca9646908941690272ce4115d54e78e0584008ec90f624c3cdd230147304402203f016fdb065b990a23f6b5735e2ef848e587861f620500ce35a2289da08a8c2802204ab76634cb4ca9646908941690272ce4115d54e78e0584008ec90f624c3cdd2301')
  t.same(result6.redeem.output.toString('hex'), '522103e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd2830582103e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd2830582103e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd2830582103e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd28305854ae')
  t.same(result6.input.toString('hex'), '0047304402203f016fdb065b990a23f6b5735e2ef848e587861f620500ce35a2289da08a8c2802204ab76634cb4ca9646908941690272ce4115d54e78e0584008ec90f624c3cdd230147304402203f016fdb065b990a23f6b5735e2ef848e587861f620500ce35a2289da08a8c2802204ab76634cb4ca9646908941690272ce4115d54e78e0584008ec90f624c3cdd23014c8b522103e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd2830582103e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd2830582103e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd2830582103e15819590382a9dd878f01e2f0cbce541564eb415e43b440472d883ecd28305854ae')
  t.same(result6.output.toString('hex'), 'a914bc1f2966b758887e472518e7758d0f1f301747ec87')

  t.end()
})
