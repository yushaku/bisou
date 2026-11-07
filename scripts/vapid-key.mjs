import { webcrypto } from "node:crypto";
import assert from "node:assert/strict";

const { privateKey } = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const { kty, crv, x, y, d } = await webcrypto.subtle.exportKey("jwk", privateKey);
assert.equal(Buffer.from(x, "base64url").length, 32);
assert.equal(Buffer.from(y, "base64url").length, 32);
assert.equal(Buffer.from(d, "base64url").length, 32);
console.log(JSON.stringify({ kty, crv, x, y, d }));
