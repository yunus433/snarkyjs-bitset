import {
  Bool,
  DeployArgs,
  method,
  Permissions,
  PublicKey,
  SmartContract,
  state,
  State,
  Field
} from 'snarkyjs';

import {
  BitSet
} from './snarkyjs-bitset.js';

export class Test extends SmartContract {
  @state(BitSet) mask = State<BitSet>();

  constructor(zkAppAddress: PublicKey) {
    super(zkAppAddress);
  };

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
      editSequenceState: Permissions.proofOrSignature(),
    });
  };

  @method initialize(mask: BitSet) {
    this.mask.set(mask);
  };

  @method set(index: Field, value: Bool) {
    const mask = this.mask.get();
    this.mask.assertEquals(mask);

    this.mask.set(mask.set(index, value));
  };

  @method get(index: Field): Bool {
    const mask = this.mask.get();
    this.mask.assertEquals(mask);

    return mask.get(index);
  };
};
