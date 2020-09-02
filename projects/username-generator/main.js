const download = typeof fetch !== "undefined" ? async (url) => {
  const response = await fetch(url);
  const data = await response.text();
  return data;
} : (url) => new Promise((resolve, reject) => {
  const https = require('https');
  https.get(`https://tscholl2.github.io/website/projects/username-generator/${url}`, res => {
    if (res.statusCode !== 200) {
      reject(new Error(`Request Failed. Status Code: ${res.statusCode}`));
    }
    res.setEncoding('utf8');
    let rawData = '';
    res
      .on('data', (chunk) => { rawData += chunk; })
      .on('end', () => {
        try {
          resolve(rawData);
        } catch (e) {
          reject(e.message);
        }
      })
      .on('error', (e) => {
        reject(`Got error: ${e.message}`);
      });
  });
});

let LOADED = false;
const words = {
  adjectives: [], animals: [], colors: [], plants: [], vegetables: [],
};
async function load() {
  for (let k in words) {
    const data = await download(`${k}.txt`);
    words[k] = data.split("\n").filter(x => x);
  }
  LOADED = true;
}
function randomChoice(arr) {
  return arr[Math.floor(arr.length * Math.random())];
}
async function generate(options = {}) {
  if (!LOADED)
    await load();
  const l1 = options["list-1"] || randomChoice(["colors", "adjectives"]);
  const l2 = options["list-2"] || randomChoice(["animals", "plants", "vegetables"]);
  const w1 = randomChoice(words[l1]).replace(" ", "-");
  const w2 = randomChoice(words[l2]).replace(" ", "-");
  return `${w1}-${w2}`;
}
if (typeof module !== "undefined") {
  module.exports.generate = generate;
}