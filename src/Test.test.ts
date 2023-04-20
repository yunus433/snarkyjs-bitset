import {
  AccountUpdate,
  Bool,
  Circuit,
  Field,
  isReady,
  Mina,
  PrivateKey,
  PublicKey,
  shutdown,
  UInt32,
  UInt64,
} from 'snarkyjs';

import {
  BitSet
} from './snarkyjs-bitset.js';

import {
  Test
} from './Test.js';

function createLocalBlockchain() {
  const Local = Mina.LocalBlockchain({ proofsEnabled: false });
  Mina.setActiveInstance(Local);
  return Local.testAccounts[0].privateKey;
};

describe('Test', () => {
  let deployerAccount: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkAppInstance: Test;

  beforeAll(async () => {
    await isReady;
    deployerAccount = createLocalBlockchain();
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkAppInstance = new Test(zkAppAddress);
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkAppInstance.deploy({ zkappKey: zkAppPrivateKey });
    });
    await txn.send();
  });

  afterAll(async () => {
    setTimeout(shutdown, 0);
  });

  it('Deploy `BitSet` Smart Contract with Initial Bool Array', async () => {
    const mask = BitSet.fromBoolArray([Bool(true), Bool(false), Bool(true)]);

    const txn = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.initialize(mask);
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn.send();

    expect(zkAppInstance.get(Field(0))).toEqual(Bool(true));
    expect(zkAppInstance.get(Field(1))).toEqual(Bool(false));
    expect(zkAppInstance.get(Field(2))).toEqual(Bool(true));
  });

  it('Set Second Index of the `BitSet` to True', async () => {
    expect(zkAppInstance.get(Field(1))).toEqual(Bool(false));

    const txn = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.set(Field(1), Bool(true));
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn.send();

    expect(zkAppInstance.get(Field(1))).toEqual(Bool(true));
  });
});