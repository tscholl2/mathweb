const encoder = new TextEncoder("utf-8");
/**
 * Encodes a utf8 string as a byte array.
 * @param {String} str 
 * @returns {Promise<Uint8Array>}
 */
function str2buf(str) {
  return new Promise(resolve => resolve(encoder.encode(str)));
}

const decoder = new TextDecoder("utf-8");
/**
 * Decodes a byte array as a utf8 string.
 * @param {Uint8Array} buffer 
 * @returns {Promise<String>}
 */
function buf2str(buffer) {
  return new Promise(resolve => resolve(decoder.decode(buffer)));
}

/**
 * Decodes a string of hex to a byte array.
 * @param {String} hexStr
 * @returns {Promise<Uint8Array>} 
 */
function hex2buf(hexStr) {
  return new Promise(resolve =>
    resolve(new Uint8Array(hexStr.match(/.{2}/g).map(h => parseInt(h, 16)))),
  );
}

/**
 * Encodes a byte array as a string of hex.
 * @param {Uint8Array} buffer
 * @returns {Promise<String>} 
 */
function buf2hex(buffer) {
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

/**
 * Given a passphrase, this generates a crypto key
 * using `PBKDF2` with SHA256 and 1000 iterations.
 * If no salt is given, a new one is generated.
 * The return value is an array of `[key, salt]`.
 * @param {String} passPhrase 
 * @param {UInt8Array} salt [salt=random bytes]
 * @returns {Promise<[CryptoKey,UInt8Array]>} 
 */
function deriveKey(passPhrase, salt) {
  salt = salt || crypto.getRandomValues(new Uint8Array(16));
  return str2buf(passPhrase)
    .then(buffer => crypto.subtle.importKey("raw", buffer, "PBKDF2", false, ["deriveKey"]))
    .then(key =>
      crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 1000, hash: "SHA-256" },
        key,
        { name: "AES-CBC", length: 256 },
        false,
        ["encrypt", "decrypt"],
      ),
    )
    .then(key => [key, salt]);
}

/**
 * Given a passphrase and some plaintext, this derives a key
 * (generating a new salt), and then encrypts the plaintext with the derived
 * key using AES-CBC. The ciphertext, salt, and iv are hex encoded and joined
 * by a "-". So the result is `"salt-iv-ciphertext"`.
 * @param {String} passPhrase 
 * @param {String} plainText
 * @returns {Promise<String>} 
 */
function encrypt(passPhrase, plainText) {
  const iv = crypto.getRandomValues(new Uint8Array(16));
  return Promise.all([deriveKey(passPhrase), str2buf(plainText)]).then(([[key, salt], data]) =>
    crypto.subtle.encrypt({ name: "AES-CBC", iv }, key, data).then(ciphertext => {
      return Promise.all([buf2hex(salt), buf2hex(iv), buf2hex(ciphertext)]).then(a => a.join("-"));
    }),
  );
}

/**
 * Given a key and ciphertext (in the form of a string) as given by `encrypt`,
 * this decrypts the ciphertext and returns the original plaintext
 * @param {String} passPhrase 
 * @param {String} saltIvCipherHex 
 * @returns {Promise<String>}
 */
function decrypt(passPhrase, saltIvCipherHex) {
  const [saltHex, ivHex, cipherHex] = saltIvCipherHex.split("-");
  return Promise.all([
    hex2buf(saltHex).then(salt => deriveKey(passPhrase, salt).then(([key, salt]) => key)),
    hex2buf(ivHex),
    hex2buf(cipherHex),
  ])
    .then(([key, iv, data]) => crypto.subtle.decrypt({ name: "AES-CBC", iv }, key, data))
    .then(buf2str);
}

/*
// EXAMPLE
const s = "hello world";
const k = "key";
encrypt(k, s)
.then(v => console.log("ENCRYPTED", v) || v)
.then(v => decrypt(k, v))
.then(v => console.log("DECRYPTED ", v) || v);
*/