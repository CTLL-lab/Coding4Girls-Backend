import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
export function checkStringAgainstHash(password: string, hash: string) {
  /*
          Compares a password with a given hash and returns a boolean
          True if password and hash match
          False otherwise 
      */
  const shaHash = Buffer.from(
    crypto
      .createHash('sha256')
      .update(password)
      .digest()
  ).toString('base64');
  const result = bcrypt.compareSync(shaHash, hash);
  return result;
}

export function hashString(password: string) {
  const res = bcrypt.hashSync(
    Buffer.from(
      crypto
        .createHash('sha256')
        .update(password)
        .digest()
    ).toString('base64'),
    bcrypt.genSaltSync(12)
  );
  return res;
}
