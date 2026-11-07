import { describe, expect, it } from "vitest";
import { fromBase64Url, toBase64Url } from "../src/worker/lib/crypto";
import { encrypt, isPushEndpoint, publicKeyFromJwk, vapidHeader } from "../src/worker/lib/webpush";

// https://www.rfc-editor.org/rfc/rfc8291#appendix-A
const asPublic = "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8";
const uaPublic = "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4";
const asPrivate = "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw";
const auth = "BTBZMqHH6r4Tts7J_aSIgg";
function serverJwk(): JsonWebKey {
  const raw = fromBase64Url(asPublic);
  return { kty: "EC", crv: "P-256", x: toBase64Url(raw.slice(1, 33)), y: toBase64Url(raw.slice(33)), d: asPrivate };
}

describe("Web Push cryptography", () => {
  it("R8, R29: matches RFC 8291 Appendix A and section 5 byte for byte", async () => {
    const privateKey = await crypto.subtle.importKey("jwk", serverJwk(), { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
    const publicKey = await crypto.subtle.importKey("raw", fromBase64Url(asPublic), { name: "ECDH", namedCurve: "P-256" }, true, []);
    const encrypted = await encrypt(fromBase64Url("V2hlbiBJIGdyb3cgdXAsIEkgd2FudCB0byBiZSBhIHdhdGVybWVsb24"), uaPublic, auth, {
      salt: fromBase64Url("DGv6ra1nlYgDCS1FRnbzlw"), serverKeys: { publicKey, privateKey },
    });
    expect(toBase64Url(encrypted)).toBe("DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN");
  });

  it("R29: signs a verifiable ES256 VAPID JWT bound to the push origin", async () => {
    const now = Date.parse("2026-11-07T08:00:00Z");
    const header = await vapidHeader("https://fcm.googleapis.com/fcm/send/device", serverJwk(), now);
    const match = /^vapid t=([^,]+), k=(.+)$/.exec(header)!;
    const [head, body, signature] = match[1]!.split(".");
    expect(JSON.parse(new TextDecoder().decode(fromBase64Url(head!)))).toEqual({ typ: "JWT", alg: "ES256" });
    expect(JSON.parse(new TextDecoder().decode(fromBase64Url(body!)))).toEqual({
      aud: "https://fcm.googleapis.com", exp: now / 1000 + 12 * 3600, sub: "mailto:no-reply@mail.yuchi-education.com",
    });
    expect(match[2]).toBe(publicKeyFromJwk(serverJwk()));
    const key = await crypto.subtle.importKey("raw", fromBase64Url(match[2]!), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    expect(await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, fromBase64Url(signature!), new TextEncoder().encode(`${head}.${body}`))).toBe(true);
  });

  it.each(["fcm.googleapis.com", "web.push.apple.com", "updates.push.services.mozilla.com", "wns2.notify.windows.com"])("R29: allows %s", (host) => {
    expect(isPushEndpoint(`https://${host}/device`)).toBe(true);
  });
  it.each([
    "http://fcm.googleapis.com/device", "https://fcm.googleapis.com:8443/device", "https://fcm.googleapis.com:443/device",
    "https://user@fcm.googleapis.com/device", "https://127.0.0.1/device", "https://localhost/device",
    "https://fcm.googleapis.com.evil.test/device", "https://evilpush.services.mozilla.com/device",
    `https://fcm.googleapis.com/${"a".repeat(2024)}`, "https://fcm.googleapis.com/device#fragment",
  ])("R29: rejects unsafe endpoint %s", (endpoint) => {
    expect(isPushEndpoint(endpoint)).toBe(false);
  });
});
