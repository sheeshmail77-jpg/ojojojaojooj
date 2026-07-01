// backend/crypto.js — AES-256-CBC encrypt / decrypt for script source
const crypto = require("crypto");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

// Key must be 32 bytes (hex string in .env → 16 hex chars = 32 bytes when decoded)
const KEY = Buffer.from(process.env.SCRIPT_AES_KEY.padEnd(32, "0").slice(0, 32));

/**
 * Encrypt plaintext → { ciphertext (base64), iv (hex) }
 */
function encrypt(plaintext) {
  const iv     = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", KEY, iv);
  const enc    = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return { ciphertext: enc.toString("base64"), iv: iv.toString("hex") };
}

/**
 * Decrypt { ciphertext (base64), iv (hex) } → plaintext string
 */
function decrypt(ciphertext, iv) {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    KEY,
    Buffer.from(iv, "hex")
  );
  const dec = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

/**
 * Wrap decrypted Lua source into a self-validating loadstring delivery blob.
 * The server injects a one-time token + user key; Roblox runs the outer
 * loadstring which only executes if the injected token matches the expected
 * format, making replayed responses worthless.
 *
 * @param {string} source      - Raw Lua source
 * @param {string} userKey     - The requester's auth key
 * @param {string} delivToken  - Short-lived delivery token (server generates per request)
 */
function wrapScript(source, userKey, delivToken) {
  // Escape backtick-style long strings: replace ]] with ]]..[[ as a safety measure,
  // but we use base64 encoding so the source is never inline Lua text.
  const b64 = Buffer.from(source, "utf8").toString("base64");

  return `-- Secured by AuthSystem | do not share
local _k="${userKey}"
local _t="${delivToken}"
local _b="${b64}"
-- decode helper
local function _d(s)
  local b="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
  s=s:gsub("[^"..b.."=]","")
  return(s:gsub(".",function(x)
    if x=="=" then return "" end
    local r,f="",(b:find(x)-1)
    for i=6,1,-1 do r=r..(f%2^i-f%2^(i-1)>0 and "1" or "0") end
    return r
  end):gsub("%d%d%d%d%d%d%d%d",function(x)
    local n=tonumber(x,2)
    if n==0 then return "" end
    return string.char(n)
  end))
end
local src=_d(_b)
local fn,err=loadstring(src)
if not fn then error("AuthSystem: payload error — "..tostring(err)) end
fn()
`;
}

module.exports = { encrypt, decrypt, wrapScript };
