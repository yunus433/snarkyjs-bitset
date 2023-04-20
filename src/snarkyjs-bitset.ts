import {
  Bool,
  Circuit,
  Field,
  Poseidon,
  Struct,
  isReady
} from 'snarkyjs';

await isReady;

const MAX_LENGTH = 70;

/*
  IMPORTANT NOTES:
  This library uses decimal presentation as binary to improve time complexity. Thus, this is not the most memory optimized version.
  Currently, binary operations are too slow on Mina to allow a standard bitset implementation on snarkyJS.
  // TODO: memory optimization with binary representation, revertAll() with O(1) time complexity, segmentSet() / segmentRevert() to update a segment in O(1) (segment tree ?)
*/

export class BitSet extends Struct({
  _mask: Field
}) {
  static MAX_LENGTH = MAX_LENGTH;

  private constructor(_mask: Field) {
    super({ _mask });
    this._mask = _mask;
  };

  private static mod(_x: Field, _y: Field): Field {
    const x = _x.seal();
    const y = _y.seal();

    const answer = Circuit.witness(
      Field,
      () => Field(x.toBigInt() / y.toBigInt())
    );
    const integerPart = answer.mul(y);
    integerPart.assertLte(x);
    integerPart.add(y).assertGt(x);

    const reminder = x.sub(integerPart);

    integerPart.add(reminder).assertEquals(x);

    return reminder;
  };

  static fromBoolArray(array: Bool[]): BitSet {
    Field(array.length).assertLte(Field(MAX_LENGTH), `Your bitset must have at most ${MAX_LENGTH} elements.`);

    let mask = Field(0);
    let power = Field(1);
    let reachedEnd = Bool(false);

    for (let i = 0; i < MAX_LENGTH; i++) {
      reachedEnd = Circuit.if(Field(i).equals(Field(array.length)), Bool(true), reachedEnd);
      mask = mask.add(Circuit.if(reachedEnd, Field(0), Circuit.if(array[i < array.length ? i : 0], power, Field(0))));
      power = power.mul(Field(10));
    }

    return new BitSet(mask);
  }

  get(index: Field): Bool {
    const mask = this._mask;

    index.assertGte(Field(0), `Index must be a number between 0 - ${MAX_LENGTH - 1}, inclusive.`);
    index.assertLte(Field(MAX_LENGTH), `Index must be a number between 0 - ${MAX_LENGTH - 1}, inclusive.`);

    let power = Field(1);
    let reachedEnd = Bool(false);

    for (let i = 0; i < MAX_LENGTH; i++) {
      reachedEnd = Circuit.if(Field(i).equals(index), Bool(true), reachedEnd);
      power = power.mul(Circuit.if(reachedEnd, Field(1), Field(10)));
    }

    const reminder = BitSet.mod(mask, power);
    const lastSignificantBit = mask.sub(reminder);
    const bit = BitSet.mod(lastSignificantBit, power.mul(Field(10)));
    
    return Circuit.if(bit.equals(Field(0)), Bool(false), Bool(true));
  }

  set(index: Field, value: Bool): BitSet {
    let mask = this._mask;

    let power = Field(1);
    let reachedEnd = Bool(false);

    for (let i = 0; i < MAX_LENGTH; i++) {
      reachedEnd = Circuit.if(Field(i).equals(index), Bool(true), reachedEnd);
      power = power.mul(Circuit.if(reachedEnd, Field(1), Field(10)));
    }

    const bit: Bool = this.get(index);

    mask = Circuit.if(bit.equals(value), mask, mask.add(Circuit.if(value, Field(1), Field(-1)).mul(power)));

    return new BitSet(mask);
  }

  revert(index: Field): BitSet {
    let mask = this._mask;

    let power = Field(1);
    let reachedEnd = Bool(false);

    for (let i = 0; i < MAX_LENGTH; i++) {
      reachedEnd = Circuit.if(Field(i).equals(index), Bool(true), reachedEnd);
      power = power.mul(Circuit.if(reachedEnd, Field(1), Field(10)));
    }

    const bit: Bool = this.get(index);

    mask = mask.add(Circuit.if(bit.not(), Field(1), Field(-1)).mul(power))

    return new BitSet(mask);
  }
}