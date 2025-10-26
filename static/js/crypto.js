// Web Crypto API utilities for encryption and digital signatures

class CryptoManager {
    constructor() {
        this.keyPair = null;
    }

    // Generate Ed25519 key pair for digital signatures
    async generateKeyPair() {
        this.keyPair = await window.crypto.subtle.generateKey(
            {
                name: "Ed25519",
            },
            true,
            ["sign", "verify"]
        );
        return this.keyPair;
    }

    // Export public key to base64
    async exportPublicKey() {
        if (!this.keyPair) await this.generateKeyPair();
        const exported = await window.crypto.subtle.exportKey("spki", this.keyPair.publicKey);
        return this.arrayBufferToBase64(exported);
    }

    // Sign a message
    async signMessage(message) {
        if (!this.keyPair) await this.generateKeyPair();
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        const signature = await window.crypto.subtle.sign(
            {
                name: "Ed25519",
            },
            this.keyPair.privateKey,
            data
        );
        return this.arrayBufferToBase64(signature);
    }

    // Verify a signature
    async verifySignature(message, signature, publicKeyBase64) {
        try {
            const publicKey = await this.importPublicKey(publicKeyBase64);
            const encoder = new TextEncoder();
            const data = encoder.encode(message);
            const signatureBuffer = this.base64ToArrayBuffer(signature);
            
            return await window.crypto.subtle.verify(
                {
                    name: "Ed25519",
                },
                publicKey,
                signatureBuffer,
                data
            );
        } catch (e) {
            console.error("Signature verification error:", e);
            return false;
        }
    }

    // Import public key from base64
    async importPublicKey(base64Key) {
        const keyData = this.base64ToArrayBuffer(base64Key);
        return await window.crypto.subtle.importKey(
            "spki",
            keyData,
            {
                name: "Ed25519",
            },
            true,
            ["verify"]
        );
    }

    // Encrypt message with AES-256-GCM
    async encryptMessage(message, passphrase) {
        const key = await this.deriveKey(passphrase);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encoder = new TextEncoder();
        const data = encoder.encode(message);

        const encrypted = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            data
        );

        // Combine IV and encrypted data
        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encrypted), iv.length);

        return this.arrayBufferToBase64(combined);
    }

    // Decrypt message with AES-256-GCM
    async decryptMessage(encryptedBase64, passphrase) {
        try {
            const combined = this.base64ToArrayBuffer(encryptedBase64);
            const iv = combined.slice(0, 12);
            const data = combined.slice(12);

            const key = await this.deriveKey(passphrase);

            const decrypted = await window.crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: iv
                },
                key,
                data
            );

            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (e) {
            console.error("Decryption error:", e);
            return "[Decryption failed]";
        }
    }

    // Derive AES key from passphrase
    async deriveKey(passphrase) {
        const encoder = new TextEncoder();
        const passphraseKey = await window.crypto.subtle.importKey(
            "raw",
            encoder.encode(passphrase),
            { name: "PBKDF2" },
            false,
            ["deriveBits", "deriveKey"]
        );

        return await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: encoder.encode("zerochat-salt-v1"),
                iterations: 100000,
                hash: "SHA-256"
            },
            passphraseKey,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
    }

    // Encrypt file
    async encryptFile(fileData, passphrase) {
        const key = await this.deriveKey(passphrase);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        const encrypted = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            fileData
        );

        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encrypted), iv.length);

        return this.arrayBufferToBase64(combined);
    }

    // Decrypt file
    async decryptFile(encryptedBase64, passphrase) {
        const combined = this.base64ToArrayBuffer(encryptedBase64);
        const iv = combined.slice(0, 12);
        const data = combined.slice(12);

        const key = await this.deriveKey(passphrase);

        return await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            data
        );
    }

    // Helper: ArrayBuffer to Base64
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    // Helper: Base64 to ArrayBuffer
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    // Generate fingerprint from public key
    async generateFingerprint(publicKeyBase64) {
        const keyData = this.base64ToArrayBuffer(publicKeyBase64);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', keyData);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex.substring(0, 16).toUpperCase();
    }
}

// Global instance
const cryptoManager = new CryptoManager();
