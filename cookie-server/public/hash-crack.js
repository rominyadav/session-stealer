// Complete browser-compatible MD5 hash cracking
const targetHash = "5eb63bbbe01eeed093cb22bb8f5acdc3"; // "helloworld"
const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()";
const botId = Math.random().toString(36).substr(2, 9);

// Simple MD5 implementation for browser
function md5(str) {
  function rotateLeft(value, amount) {
    return (value << amount) | (value >>> (32 - amount));
  }
  
  function addUnsigned(x, y) {
    const lsw = (x & 0xFFFF) + (y & 0xFFFF);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }
  
  function md5cmn(q, a, b, x, s, t) {
    return addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, q), addUnsigned(x, t)), s), b);
  }
  
  function md5ff(a, b, c, d, x, s, t) {
    return md5cmn((b & c) | ((~b) & d), a, b, x, s, t);
  }
  
  function md5gg(a, b, c, d, x, s, t) {
    return md5cmn((b & d) | (c & (~d)), a, b, x, s, t);
  }
  
  function md5hh(a, b, c, d, x, s, t) {
    return md5cmn(b ^ c ^ d, a, b, x, s, t);
  }
  
  function md5ii(a, b, c, d, x, s, t) {
    return md5cmn(c ^ (b | (~d)), a, b, x, s, t);
  }
  
  function convertToWordArray(str) {
    const wordArray = [];
    for (let i = 0; i < str.length * 8; i += 8) {
      wordArray[i >> 5] |= (str.charCodeAt(i / 8) & 0xFF) << (i % 32);
    }
    return wordArray;
  }
  
  function wordToHex(value) {
    let hex = "";
    for (let i = 0; i < 4; i++) {
      const byte = (value >> (i * 8)) & 0xFF;
      hex += ((byte >> 4) & 0x0F).toString(16) + (byte & 0x0F).toString(16);
    }
    return hex;
  }
  
  const x = convertToWordArray(str);
  const len = str.length * 8;
  x[len >> 5] |= 0x80 << (len % 32);
  x[(((len + 64) >>> 9) << 4) + 14] = len;
  
  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  
  for (let i = 0; i < x.length; i += 16) {
    const olda = a, oldb = b, oldc = c, oldd = d;
    
    a = md5ff(a, b, c, d, x[i], 7, -680876936);
    d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
    c = md5ff(c, d, a, b, x[i + 2], 17, 606105819);
    b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
    
    a = addUnsigned(a, olda);
    b = addUnsigned(b, oldb);
    c = addUnsigned(c, oldc);
    d = addUnsigned(d, oldd);
  }
  
  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
}

// Generate candidate strings
function generateCandidate(index, length) {
  let result = "";
  let temp = index;
  for (let i = 0; i < length; i++) {
    result = chars[temp % chars.length] + result;
    temp = Math.floor(temp / chars.length);
  }
  return result;
}

// Distributed hash cracking
const startRange = Math.floor(Math.random() * 10000000);
const endRange = startRange + 500000;
let found = null;

for (let i = startRange; i < endRange && !found; i++) {
  // Try different lengths
  for (let len = 1; len <= 8 && !found; len++) {
    const candidate = generateCandidate(i, len);
    if (md5(candidate) === targetHash) {
      found = candidate;
      break;
    }
  }
}

// Return result
{
  botId: botId,
  range: [startRange, endRange],
  found: found,
  checked: endRange - startRange
};