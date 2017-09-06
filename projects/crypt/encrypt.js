function encode(str) {
  return new Promise((resolve) => {
    const buffer = new TextEncoder("utf-8").encode(str);
    resolve(buffer);
  })
}

function hexToBuffer(hexStr) {
  return new Promise((resolve) => {
    const arr = new Uint8Array(hexStr.length / 2);
    hexStr.match(/.{2}/g).map(h => parseInt(h, 16))
  })
}

function bufferToHex(buffer) {
  return new Promise((resolve) => {
    const arr = Array.prototype.slice.call(new Uint8Array(buffer));
    resolve(
      arr.map(x => [x >> 4, x & 15])
      .map(ab => ab.map(x => `${x>>2 < 16 ? "0" : ""}${x.toString(16)}`).join(""))
      .join("")
    )
  })
}

function sha256(str) {
  // We transform the string into an arraybuffer.
  // Returns a promise with an ArrayBuffer
  return encode(str)
    .then(buffer => crypto.subtle.digest("SHA-256", buffer));
}

function deriveKey(str) {
  return sha512(str)
    .then(hash => crypto.subtle.importKey("raw", hash, "AES-CBC", false, ["encrypt", "decrypt"]))
}


// Returns a promise with encrypted data as hex
function encrypt(keyStr, dataStr) {
  return Promise.all([deriveKey(keyStr), encode(dataStr)])
    .then(([key, data]) => window.crypto.subtle.encrypt({
          name: "AES-CBC",
          //Don't re-use initialization vectors!
          //Always generate a new iv every time your encrypt!
          iv: window.crypto.getRandomValues(new Uint8Array(16)),
        },
        key, //from generateKey or importKey above
        data //ArrayBuffer of data you want to encrypt
      )
      .then(bufferToHex)
    )
}

function decrypt(keyStr, cipherHex) {
  return Promise.all([deriveKey(keyStr), ])
}


encrypt("key", "data").then(console.log)