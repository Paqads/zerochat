import CryptoJS from "crypto-js";

export function encryptMessage(message: string, passphrase: string): string {
  return CryptoJS.AES.encrypt(message, passphrase).toString();
}

export function decryptMessage(
  encryptedMessage: string,
  passphrase: string,
): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedMessage, passphrase);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return "[DECRYPTION FAILED]";
  }
}

export function generateUserId(): string {
  return CryptoJS.lib.WordArray.random(16).toString();
}
