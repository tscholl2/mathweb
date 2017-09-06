function encode(str) {
  return new Promise(resolve => {
    const buffer = new TextEncoder("utf-8").encode(str);
    resolve(buffer);
  });
}

function decode(buffer) {
  return new Promise(resolve => {
    const decoder = new TextDecoder("utf-8");
    resolve(decoder.decode(buffer));
  });
}

function hexToBuffer(hexStr) {
  return new Promise(resolve => {
    resolve(new Uint8Array(hexStr.match(/.{2}/g).map(h => parseInt(h, 16))));
  });
}

function bufferToHex(buffer) {
  return new Promise(resolve => {
    const arr = Array.prototype.slice.call(new Uint8Array(buffer));
    resolve(
      arr
        .map(x => [x >> 4, x & 15])
        .map(ab => ab.map(x => x.toString(16)).join(""))
        .join(""),
    );
  });
}

function sha256(str) {
  // We transform the string into an arraybuffer.
  // Returns a promise with an ArrayBuffer
  return encode(str).then(buffer => crypto.subtle.digest("SHA-256", buffer));
}

function deriveKey(str) {
  return sha256(str).then(hash =>
    crypto.subtle.importKey("raw", hash, "AES-CBC", false, ["encrypt", "decrypt"]),
  );
}

// Returns a promise with encrypted data as hex
function encrypt(keyStr, dataStr) {
  const iv = window.crypto.getRandomValues(new Uint8Array(16));
  return Promise.all([
    deriveKey(keyStr),
    encode(dataStr),
    bufferToHex(iv),
  ]).then(([key, data, ivHex]) => {
    return window.crypto.subtle
      .encrypt(
        {
          name: "AES-CBC",
          // Don't re-use initialization vectors!
          // Always generate a new iv every time your encrypt!
          iv,
        },
        key, // from generateKey or importKey above
        data, // ArrayBuffer of data you want to encrypt
      )
      .then(cypherBuffer => bufferToHex(cypherBuffer))
      .then(cypherHex => `${ivHex}-${cypherHex}`);
  });
}

function decrypt(keyStr, cipherIvHex) {
  const [cipherIv, cipherHex] = cipherIvHex.split("-");
  return Promise.all([
    deriveKey(keyStr),
    hexToBuffer(cipherHex),
    hexToBuffer(cipherIv),
  ]).then(([key, data, iv]) => {
    return window.crypto.subtle
      .decrypt(
        {
          name: "AES-CBC",
          iv, // The initialization vector you used to encrypt
        },
        key, // from generateKey or importKey above
        data, // ArrayBuffer of the data
      )
      .then(decode);
  });
}

const s = "data";
const k = "key";
encrypt(k, s)
  .then(v => console.log("ENCRYPTED", v) || v)
  .then(v => decrypt(k, v))
  .then(v => console.log("DECRYPTED", v));
