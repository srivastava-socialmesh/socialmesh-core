
// lib/crypto.ts

// 1. Generate a Ed25519 key pair (for signing transactions)
export async function generateIdentity(): Promise<{ publicKey: string; privateKey: string }> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "Ed25519" },
    true,
    ["sign", "verify"]
  );
  
  const pubKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  
  return {
    publicKey: Buffer.from(pubKey).toString('base64'),
    privateKey: Buffer.from(privKey).toString('base64')
  };
}

// 2. Hash any JSON content to a SHA-256 fingerprint
export async function hashContent(content: any): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(content));
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Buffer.from(hash).toString('hex');
}

// 3. Sign an activity (proves ownership on the server)
export async function signActivity(
  privateKey: string,
  activityId: string,
  contentHash: string
): Promise<string> {
  const keyBuffer = Buffer.from(privateKey, 'base64');
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    { name: "Ed25519" },
    false,
    ["sign"]
  );
  
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    { name: "Ed25519" },
    key,
    encoder.encode(activityId + contentHash)
  );
  return Buffer.from(signature).toString('base64');
}
