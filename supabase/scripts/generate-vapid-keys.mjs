// Gera as chaves VAPID dos avisos da competição (Web Push), no mesmo formato de
// exportVapidKeys/exportApplicationServerKey do @negrel/webpush, só com o WebCrypto do Node.
// Uso: node supabase/scripts/generate-vapid-keys.mjs
//   stdout → JSON com o par JWK (secret VAPID_KEYS da Edge Function; contém a chave PRIVADA)
//   stderr → chave pública base64url (NEXT_PUBLIC_VAPID_PUBLIC_KEY do app)
const keys = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);

const vapidJwks = {
  publicKey: await crypto.subtle.exportKey("jwk", keys.publicKey),
  privateKey: await crypto.subtle.exportKey("jwk", keys.privateKey),
};
const rawPublicKey = new Uint8Array(await crypto.subtle.exportKey("raw", keys.publicKey));

console.log(JSON.stringify(vapidJwks));
console.error(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${Buffer.from(rawPublicKey).toString("base64url")}`);
