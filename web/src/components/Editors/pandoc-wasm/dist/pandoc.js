var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var __privateMethod = (obj, member, method) => {
  __accessCheck(obj, member, "access private method");
  return method;
};

// node_modules/crc-32/crc32.js
var require_crc32 = __commonJS({
  "node_modules/crc-32/crc32.js"(exports) {
    var CRC32;
    (function(factory) {
      if (typeof DO_NOT_EXPORT_CRC === "undefined") {
        if ("object" === typeof exports) {
          factory(exports);
        } else if ("function" === typeof define && define.amd) {
          define(function() {
            var module2 = {};
            factory(module2);
            return module2;
          });
        } else {
          factory(CRC32 = {});
        }
      } else {
        factory(CRC32 = {});
      }
    })(function(CRC322) {
      CRC322.version = "1.2.2";
      function signed_crc_table() {
        var c = 0, table = new Array(256);
        for (var n = 0; n != 256; ++n) {
          c = n;
          c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
          c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
          c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
          c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
          c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
          c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
          c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
          c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
          table[n] = c;
        }
        return typeof Int32Array !== "undefined" ? new Int32Array(table) : table;
      }
      var T0 = signed_crc_table();
      function slice_by_16_tables(T) {
        var c = 0, v = 0, n = 0, table = typeof Int32Array !== "undefined" ? new Int32Array(4096) : new Array(4096);
        for (n = 0; n != 256; ++n)
          table[n] = T[n];
        for (n = 0; n != 256; ++n) {
          v = T[n];
          for (c = 256 + n; c < 4096; c += 256)
            v = table[c] = v >>> 8 ^ T[v & 255];
        }
        var out = [];
        for (n = 1; n != 16; ++n)
          out[n - 1] = typeof Int32Array !== "undefined" ? table.subarray(n * 256, n * 256 + 256) : table.slice(n * 256, n * 256 + 256);
        return out;
      }
      var TT = slice_by_16_tables(T0);
      var T1 = TT[0], T2 = TT[1], T3 = TT[2], T4 = TT[3], T5 = TT[4];
      var T6 = TT[5], T7 = TT[6], T8 = TT[7], T9 = TT[8], Ta = TT[9];
      var Tb = TT[10], Tc = TT[11], Td = TT[12], Te = TT[13], Tf = TT[14];
      function crc32_bstr(bstr, seed) {
        var C = seed ^ -1;
        for (var i = 0, L = bstr.length; i < L; )
          C = C >>> 8 ^ T0[(C ^ bstr.charCodeAt(i++)) & 255];
        return ~C;
      }
      function crc32_buf(B, seed) {
        var C = seed ^ -1, L = B.length - 15, i = 0;
        for (; i < L; )
          C = Tf[B[i++] ^ C & 255] ^ Te[B[i++] ^ C >> 8 & 255] ^ Td[B[i++] ^ C >> 16 & 255] ^ Tc[B[i++] ^ C >>> 24] ^ Tb[B[i++]] ^ Ta[B[i++]] ^ T9[B[i++]] ^ T8[B[i++]] ^ T7[B[i++]] ^ T6[B[i++]] ^ T5[B[i++]] ^ T4[B[i++]] ^ T3[B[i++]] ^ T2[B[i++]] ^ T1[B[i++]] ^ T0[B[i++]];
        L += 15;
        while (i < L)
          C = C >>> 8 ^ T0[(C ^ B[i++]) & 255];
        return ~C;
      }
      function crc32_str(str2, seed) {
        var C = seed ^ -1;
        for (var i = 0, L = str2.length, c = 0, d = 0; i < L; ) {
          c = str2.charCodeAt(i++);
          if (c < 128) {
            C = C >>> 8 ^ T0[(C ^ c) & 255];
          } else if (c < 2048) {
            C = C >>> 8 ^ T0[(C ^ (192 | c >> 6 & 31)) & 255];
            C = C >>> 8 ^ T0[(C ^ (128 | c & 63)) & 255];
          } else if (c >= 55296 && c < 57344) {
            c = (c & 1023) + 64;
            d = str2.charCodeAt(i++) & 1023;
            C = C >>> 8 ^ T0[(C ^ (240 | c >> 8 & 7)) & 255];
            C = C >>> 8 ^ T0[(C ^ (128 | c >> 2 & 63)) & 255];
            C = C >>> 8 ^ T0[(C ^ (128 | d >> 6 & 15 | (c & 3) << 4)) & 255];
            C = C >>> 8 ^ T0[(C ^ (128 | d & 63)) & 255];
          } else {
            C = C >>> 8 ^ T0[(C ^ (224 | c >> 12 & 15)) & 255];
            C = C >>> 8 ^ T0[(C ^ (128 | c >> 6 & 63)) & 255];
            C = C >>> 8 ^ T0[(C ^ (128 | c & 63)) & 255];
          }
        }
        return ~C;
      }
      CRC322.table = T0;
      CRC322.bstr = crc32_bstr;
      CRC322.buf = crc32_buf;
      CRC322.str = crc32_str;
    });
  }
});

// node_modules/crc-32/crc32c.js
var require_crc32c = __commonJS({
  "node_modules/crc-32/crc32c.js"(exports) {
    var CRC32C;
    (function(factory) {
      if (typeof DO_NOT_EXPORT_CRC === "undefined") {
        if ("object" === typeof exports) {
          factory(exports);
        } else if ("function" === typeof define && define.amd) {
          define(function() {
            var module2 = {};
            factory(module2);
            return module2;
          });
        } else {
          factory(CRC32C = {});
        }
      } else {
        factory(CRC32C = {});
      }
    })(function(CRC32C2) {
      CRC32C2.version = "1.2.2";
      function signed_crc_table() {
        var c = 0, table = new Array(256);
        for (var n = 0; n != 256; ++n) {
          c = n;
          c = c & 1 ? -2097792136 ^ c >>> 1 : c >>> 1;
          c = c & 1 ? -2097792136 ^ c >>> 1 : c >>> 1;
          c = c & 1 ? -2097792136 ^ c >>> 1 : c >>> 1;
          c = c & 1 ? -2097792136 ^ c >>> 1 : c >>> 1;
          c = c & 1 ? -2097792136 ^ c >>> 1 : c >>> 1;
          c = c & 1 ? -2097792136 ^ c >>> 1 : c >>> 1;
          c = c & 1 ? -2097792136 ^ c >>> 1 : c >>> 1;
          c = c & 1 ? -2097792136 ^ c >>> 1 : c >>> 1;
          table[n] = c;
        }
        return typeof Int32Array !== "undefined" ? new Int32Array(table) : table;
      }
      var T0 = signed_crc_table();
      function slice_by_16_tables(T) {
        var c = 0, v = 0, n = 0, table = typeof Int32Array !== "undefined" ? new Int32Array(4096) : new Array(4096);
        for (n = 0; n != 256; ++n)
          table[n] = T[n];
        for (n = 0; n != 256; ++n) {
          v = T[n];
          for (c = 256 + n; c < 4096; c += 256)
            v = table[c] = v >>> 8 ^ T[v & 255];
        }
        var out = [];
        for (n = 1; n != 16; ++n)
          out[n - 1] = typeof Int32Array !== "undefined" ? table.subarray(n * 256, n * 256 + 256) : table.slice(n * 256, n * 256 + 256);
        return out;
      }
      var TT = slice_by_16_tables(T0);
      var T1 = TT[0], T2 = TT[1], T3 = TT[2], T4 = TT[3], T5 = TT[4];
      var T6 = TT[5], T7 = TT[6], T8 = TT[7], T9 = TT[8], Ta = TT[9];
      var Tb = TT[10], Tc = TT[11], Td = TT[12], Te = TT[13], Tf = TT[14];
      function crc32_bstr(bstr, seed) {
        var C = seed ^ -1;
        for (var i = 0, L = bstr.length; i < L; )
          C = C >>> 8 ^ T0[(C ^ bstr.charCodeAt(i++)) & 255];
        return ~C;
      }
      function crc32_buf(B, seed) {
        var C = seed ^ -1, L = B.length - 15, i = 0;
        for (; i < L; )
          C = Tf[B[i++] ^ C & 255] ^ Te[B[i++] ^ C >> 8 & 255] ^ Td[B[i++] ^ C >> 16 & 255] ^ Tc[B[i++] ^ C >>> 24] ^ Tb[B[i++]] ^ Ta[B[i++]] ^ T9[B[i++]] ^ T8[B[i++]] ^ T7[B[i++]] ^ T6[B[i++]] ^ T5[B[i++]] ^ T4[B[i++]] ^ T3[B[i++]] ^ T2[B[i++]] ^ T1[B[i++]] ^ T0[B[i++]];
        L += 15;
        while (i < L)
          C = C >>> 8 ^ T0[(C ^ B[i++]) & 255];
        return ~C;
      }
      function crc32_str(str2, seed) {
        var C = seed ^ -1;
        for (var i = 0, L = str2.length, c = 0, d = 0; i < L; ) {
          c = str2.charCodeAt(i++);
          if (c < 128) {
            C = C >>> 8 ^ T0[(C ^ c) & 255];
          } else if (c < 2048) {
            C = C >>> 8 ^ T0[(C ^ (192 | c >> 6 & 31)) & 255];
            C = C >>> 8 ^ T0[(C ^ (128 | c & 63)) & 255];
          } else if (c >= 55296 && c < 57344) {
            c = (c & 1023) + 64;
            d = str2.charCodeAt(i++) & 1023;
            C = C >>> 8 ^ T0[(C ^ (240 | c >> 8 & 7)) & 255];
            C = C >>> 8 ^ T0[(C ^ (128 | c >> 2 & 63)) & 255];
            C = C >>> 8 ^ T0[(C ^ (128 | d >> 6 & 15 | (c & 3) << 4)) & 255];
            C = C >>> 8 ^ T0[(C ^ (128 | d & 63)) & 255];
          } else {
            C = C >>> 8 ^ T0[(C ^ (224 | c >> 12 & 15)) & 255];
            C = C >>> 8 ^ T0[(C ^ (128 | c >> 6 & 63)) & 255];
            C = C >>> 8 ^ T0[(C ^ (128 | c & 63)) & 255];
          }
        }
        return ~C;
      }
      CRC32C2.table = T0;
      CRC32C2.bstr = crc32_bstr;
      CRC32C2.buf = crc32_buf;
      CRC32C2.str = crc32_str;
    });
  }
});

// node_modules/adler-32/adler32.js
var require_adler32 = __commonJS({
  "node_modules/adler-32/adler32.js"(exports) {
    var ADLER32;
    (function(factory) {
      if (typeof DO_NOT_EXPORT_ADLER === "undefined") {
        if ("object" === typeof exports) {
          factory(exports);
        } else if ("function" === typeof define && define.amd) {
          define(function() {
            var module2 = {};
            factory(module2);
            return module2;
          });
        } else {
          factory(ADLER32 = {});
        }
      } else {
        factory(ADLER32 = {});
      }
    })(function(ADLER322) {
      ADLER322.version = "1.3.1";
      function adler32_bstr(bstr, seed) {
        var a = 1, b = 0, L = bstr.length, M = 0;
        if (typeof seed === "number") {
          a = seed & 65535;
          b = seed >>> 16;
        }
        for (var i = 0; i < L; ) {
          M = Math.min(L - i, 2654) + i;
          for (; i < M; i++) {
            a += bstr.charCodeAt(i) & 255;
            b += a;
          }
          a = 15 * (a >>> 16) + (a & 65535);
          b = 15 * (b >>> 16) + (b & 65535);
        }
        return b % 65521 << 16 | a % 65521;
      }
      function adler32_buf(buf, seed) {
        var a = 1, b = 0, L = buf.length, M = 0;
        if (typeof seed === "number") {
          a = seed & 65535;
          b = seed >>> 16 & 65535;
        }
        for (var i = 0; i < L; ) {
          M = Math.min(L - i, 2654) + i;
          for (; i < M; i++) {
            a += buf[i] & 255;
            b += a;
          }
          a = 15 * (a >>> 16) + (a & 65535);
          b = 15 * (b >>> 16) + (b & 65535);
        }
        return b % 65521 << 16 | a % 65521;
      }
      function adler32_str(str2, seed) {
        var a = 1, b = 0, L = str2.length, M = 0, c = 0, d = 0;
        if (typeof seed === "number") {
          a = seed & 65535;
          b = seed >>> 16;
        }
        for (var i = 0; i < L; ) {
          M = Math.min(L - i, 2918);
          while (M > 0) {
            c = str2.charCodeAt(i++);
            if (c < 128) {
              a += c;
            } else if (c < 2048) {
              a += 192 | c >> 6 & 31;
              b += a;
              --M;
              a += 128 | c & 63;
            } else if (c >= 55296 && c < 57344) {
              c = (c & 1023) + 64;
              d = str2.charCodeAt(i++) & 1023;
              a += 240 | c >> 8 & 7;
              b += a;
              --M;
              a += 128 | c >> 2 & 63;
              b += a;
              --M;
              a += 128 | d >> 6 & 15 | (c & 3) << 4;
              b += a;
              --M;
              a += 128 | d & 63;
            } else {
              a += 224 | c >> 12 & 15;
              b += a;
              --M;
              a += 128 | c >> 6 & 63;
              b += a;
              --M;
              a += 128 | c & 63;
            }
            b += a;
            --M;
          }
          a = 15 * (a >>> 16) + (a & 65535);
          b = 15 * (b >>> 16) + (b & 65535);
        }
        return b % 65521 << 16 | a % 65521;
      }
      ADLER322.bstr = adler32_bstr;
      ADLER322.buf = adler32_buf;
      ADLER322.str = adler32_str;
    });
  }
});

// src/_generated/default.mjs
var Posix = class {
  constructor(memory, rtsConstants) {
    this.memory = memory;
    Object.seal(this);
  }
  getProgArgv(argc, argv_buf) {
    this.memory.i64Store(argc, 1);
  }
  get_errno() {
    throw WebAssembly.RuntimeError("Unsupported rts interface: get_errno");
  }
  set_errno() {
    throw WebAssembly.RuntimeError("Unsupported rts interface: set_errno");
  }
  open() {
    throw WebAssembly.RuntimeError("Unsupported rts interface: open");
  }
  close() {
    throw WebAssembly.RuntimeError("Unsupported rts interface: close");
  }
  ftruncate() {
    throw WebAssembly.RuntimeError("Unsupported rts interface: ftruncate");
  }
  stat() {
    throw WebAssembly.RuntimeError("Unsupported rts interface: stat");
  }
  fstat() {
    throw WebAssembly.RuntimeError("Unsupported rts interface: fstat");
  }
  opendir() {
    throw WebAssembly.RuntimeError("Unsupported rts interface: opendir");
  }
  readdir() {
    throw WebAssembly.RuntimeError("Unsupported rts interface: readdir");
  }
  closedir() {
    throw WebAssembly.RuntimeError("Unsupported rts interface: closedir");
  }
  getenv() {
    throw WebAssembly.RuntimeError("Unsupported rts interface: getenv");
  }
  access() {
    throw WebAssembly.RuntimeError("Unsupported rts interface: access");
  }
  getcwd() {
    throw WebAssembly.RuntimeError("Unsupported rts interface: getcwd");
  }
};
var default_default = {
  /**
   * A custom Time interface, used in {@link TimeCBits}.
   */
  Time: {
    /**
     * Returns the current timestamp, where 0 represents
     * the time origin of the document.
     * @returns A [seconds, nanoseconds] Array.
     */
    getCPUTime: () => {
      const ms = performance.now(), s = Math.floor(ms / 1e3), ns = Math.floor(ms - s * 1e3) * 1e6;
      return [s, ns];
    },
    /**
     * Returns the current timestamp, where 0 represents UNIX Epoch.
     * @returns A [seconds, nanoseconds] Array.
     */
    getUnixEpochTime: () => {
      const ms = Date.now(), s = Math.floor(ms / 1e3), ns = Math.floor(ms - s * 1e3) * 1e6;
      return [s, ns];
    },
    /**
     * The resolution of the timestamps in nanoseconds.
     * Note! Due to the Spectre attack, browsers do not
     * provide high-resolution timestamps anymore.
     * See https://developer.mozilla.org/en-US/docs/Web/API/Performance/now
     * and https://spectreattack.com.
     * We fallback to a resolution of 1ms.
     */
    resolution: 1e6
  },
  posix: Posix
};

// src/_generated/pandoc-wasm.req.mjs
var pandoc_wasm_req_default = { progName: "pandoc-wasm", jsffiFactory: (__asterius_jsffi) => ({ jsffi: { __asterius_jsffi_digestzm0zi0zi2zi0zm8cd2a4597f31da020aa012b053bb09685e9f4b39f516ef69512f01966b55a6d6zuDataziDigestziCRC32_akmM: ($1, $2) => {
  $1 = __asterius_jsffi.getJSValzh($1);
  return Pandoc.digest.crc32.buf($1, $2);
}, __asterius_jsffi_yamlzm0zi11zmd86ab26844b76a7212058be44bc3c4b68c1ae58f9b809141401db3601c4442fazuDataziYaml_anyD: ($1) => {
  $1 = __asterius_jsffi.getJSValzh($1);
  return __asterius_jsffi.newJSValzh(JSON.stringify(Pandoc.yaml.loadAll($1)));
}, __asterius_jsffi_yamlzm0zi11zmd86ab26844b76a7212058be44bc3c4b68c1ae58f9b809141401db3601c4442fazuAsteriusziUTF8_a6qH: ($1, $2, $3) => {
  $1 = __asterius_jsffi.getJSValzh($1);
  return new TextEncoder().encodeInto($1, __asterius_jsffi.exposeMemory($2, $3)).written;
}, __asterius_jsffi_yamlzm0zi11zmd86ab26844b76a7212058be44bc3c4b68c1ae58f9b809141401db3601c4442fazuAsteriusziUTF8_a6qN: ($1) => {
  $1 = __asterius_jsffi.getJSValzh($1);
  return __asterius_jsffi.newJSValzh($1.result);
}, __asterius_jsffi_yamlzm0zi11zmd86ab26844b76a7212058be44bc3c4b68c1ae58f9b809141401db3601c4442fazuAsteriusziUTF8_a6r1: ($1, $2, $3) => {
  $1 = __asterius_jsffi.getJSValzh($1);
  return $1.result += $1.decode(__asterius_jsffi.exposeMemory($2, $3), { stream: true });
}, __asterius_jsffi_yamlzm0zi11zmd86ab26844b76a7212058be44bc3c4b68c1ae58f9b809141401db3601c4442fazuAsteriusziUTF8_a6r5: () => {
  return __asterius_jsffi.newJSValzh((() => {
    const dec = new TextDecoder("utf-8", { fatal: true });
    dec.result = "";
    return dec;
  })());
}, __asterius_jsffi_yamlzm0zi11zmd86ab26844b76a7212058be44bc3c4b68c1ae58f9b809141401db3601c4442fazuAsteriusziUTF8_a6r9: () => {
  return __asterius_jsffi.newJSValzh("");
}, __asterius_jsffi_zzlibzm0zi6zi3zi0zmbb7bd55678a2eb993d17b941369d4cfda25e12bb27a65d02e772b4a24b22625fzuCodecziCompressionziGZZip_ajFq: ($1) => {
  $1 = __asterius_jsffi.getJSValzh($1);
  return __asterius_jsffi.newJSValzh(Pandoc.pako.ungzip($1));
}, __asterius_jsffi_zzlibzm0zi6zi3zi0zmbb7bd55678a2eb993d17b941369d4cfda25e12bb27a65d02e772b4a24b22625fzuCodecziCompressionziZZlibziRaw_ajNT: ($1) => {
  $1 = __asterius_jsffi.getJSValzh($1);
  return __asterius_jsffi.newJSValzh(Pandoc.pako.deflateRaw($1));
}, __asterius_jsffi_zzlibzm0zi6zi3zi0zmbb7bd55678a2eb993d17b941369d4cfda25e12bb27a65d02e772b4a24b22625fzuCodecziCompressionziZZlibziRaw_ajNZ: ($1) => {
  $1 = __asterius_jsffi.getJSValzh($1);
  return __asterius_jsffi.newJSValzh(Pandoc.pako.inflateRaw($1));
}, __asterius_jsffi_basezuAsteriusziTypesziJSException_a8Zfo: ($1) => {
  $1 = __asterius_jsffi.getJSValzh($1);
  return __asterius_jsffi.newJSValzh($1.stack ? $1.stack : `${$1}`);
}, __asterius_jsffi_basezuAsteriusziTypesziJSString_a8VRX: ($1) => {
  $1 = __asterius_jsffi.getJSValzh($1);
  return __asterius_jsffi.newJSValzh($1[0]);
}, __asterius_jsffi_basezuAsteriusziTypesziJSString_a8VS6: ($1, $2) => {
  $1 = __asterius_jsffi.getJSValzh($1);
  return $1[0] += String.fromCodePoint($2);
}, __asterius_jsffi_basezuAsteriusziTypesziJSString_a8VSb: () => {
  return __asterius_jsffi.newJSValzh([""]);
}, __asterius_jsffi_basezuAsteriusziTypesziJSString_a8VSi: ($1) => {
  $1 = __asterius_jsffi.getJSValzh($1);
  return (() => {
    const r = $1.next();
    return r.done ? 0 : 1 + r.value.codePointAt(0);
  })();
}, __asterius_jsffi_basezuAsteriusziTypesziJSString_a8VSq: ($1) => {
  $1 = __asterius_jsffi.getJSValzh($1);
  return __asterius_jsffi.newJSValzh($1[Symbol.iterator]());
}, __asterius_jsffi_basezuAsteriusziTypesziJSString_a8VSD: ($1) => {
  $1 = __asterius_jsffi.getJSValzh($1);
  return $1.length;
}, __asterius_jsffi_basezuAsteriusziTypesziJSUint8Array_a8ZmQ: ($1, $2, $3) => {
  $3 = __asterius_jsffi.getJSValzh($3);
  return __asterius_jsffi.exposeMemory($1, $2).set($3);
}, __asterius_jsffi_basezuAsteriusziTypesziJSUint8Array_a8ZnK: ($1, $2) => {
  return __asterius_jsffi.newJSValzh(new Uint8Array(__asterius_jsffi.exposeMemory($1, $2)));
}, __asterius_jsffi_basezuAsteriusziTypesziJSUint8Array_a8ZoY: ($1) => {
  $1 = __asterius_jsffi.getJSValzh($1);
  return $1.length;
}, __asterius_jsffi_basezuAsteriusziTypesziJSVal_a8U2a: ($1) => {
  return __asterius_jsffi.freeJSValzh($1);
}, __asterius_jsffi_mainzuAsteriusziUTF8_a6qt: ($1, $2, $3) => {
  $1 = __asterius_jsffi.getJSValzh($1);
  return new TextEncoder().encodeInto($1, __asterius_jsffi.exposeMemory($2, $3)).written;
}, __asterius_jsffi_mainzuAsteriusziUTF8_a6qz: ($1) => {
  $1 = __asterius_jsffi.getJSValzh($1);
  return __asterius_jsffi.newJSValzh($1.result);
}, __asterius_jsffi_mainzuAsteriusziUTF8_a6qN: ($1, $2, $3) => {
  $1 = __asterius_jsffi.getJSValzh($1);
  return $1.result += $1.decode(__asterius_jsffi.exposeMemory($2, $3), { stream: true });
}, __asterius_jsffi_mainzuAsteriusziUTF8_a6qR: () => {
  return __asterius_jsffi.newJSValzh((() => {
    const dec = new TextDecoder("utf-8", { fatal: true });
    dec.result = "";
    return dec;
  })());
}, __asterius_jsffi_mainzuAsteriusziUTF8_a6qV: () => {
  return __asterius_jsffi.newJSValzh("");
}, __asterius_jsffi_mainzuAsteriusziAeson_ablL: ($1) => {
  $1 = __asterius_jsffi.getJSValzh($1);
  return __asterius_jsffi.newJSValzh(JSON.parse($1));
}, __asterius_jsffi_mainzuAsteriusziAeson_ablR: ($1) => {
  $1 = __asterius_jsffi.getJSValzh($1);
  return __asterius_jsffi.newJSValzh(JSON.stringify($1));
} } }), exportsStaticOffsets: [["getVersion", 43118192, 0, 1, false], ["runPandoc", 43124648, 1, 1, false], ["main", 43106200, 0, 0, true]], functionsOffsetTable: Object.freeze({}), staticsOffsetTable: Object.freeze({ "MainCapability": 64, "base_AsteriusziTypesziJSException_mkJSException_closure": 43036896, "stg_IND_info": 43073032, "stg_WHITEHOLE_info": 43072776, "stg_raise_ret_info": 43072472, "base_AsteriusziTopHandler_runIO_closure": 43010360, "base_AsteriusziTopHandler_runNonIO_closure": 43010456, "stg_JSVAL_info": 43050528, "stg_raise_info": 43072496, "stg_STABLE_NAME_info": 43075416 }), sptOffsetEntries: /* @__PURE__ */ new Map([]), tableSlots: 642531, staticBytes: 43124744, yolo: true, pic: false, defaultTableBase: 1024, defaultMemoryBase: 1024, consoleHistory: false, gcThreshold: 64, targetSpecificModule: default_default };

// src/_generated/rts.setimmediate.mjs
(function(global2, undefined2) {
  "use strict";
  if (global2.setImmediate) {
    return;
  }
  var nextHandle = 1;
  var tasksByHandle = {};
  var currentlyRunningATask = false;
  var doc = global2.document;
  var registerImmediate;
  function setImmediate2(callback) {
    if (typeof callback !== "function") {
      callback = new Function("" + callback);
    }
    var args = new Array(arguments.length - 1);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i + 1];
    }
    var task = { callback, args };
    tasksByHandle[nextHandle] = task;
    registerImmediate(nextHandle);
    return nextHandle++;
  }
  function clearImmediate(handle) {
    delete tasksByHandle[handle];
  }
  function run(task) {
    var callback = task.callback;
    var args = task.args;
    switch (args.length) {
      case 0:
        callback();
        break;
      case 1:
        callback(args[0]);
        break;
      case 2:
        callback(args[0], args[1]);
        break;
      case 3:
        callback(args[0], args[1], args[2]);
        break;
      default:
        callback.apply(undefined2, args);
        break;
    }
  }
  function runIfPresent(handle) {
    if (currentlyRunningATask) {
      setTimeout(runIfPresent, 0, handle);
    } else {
      var task = tasksByHandle[handle];
      if (task) {
        currentlyRunningATask = true;
        try {
          run(task);
        } finally {
          clearImmediate(handle);
          currentlyRunningATask = false;
        }
      }
    }
  }
  function installNextTickImplementation() {
    registerImmediate = function(handle) {
      process.nextTick(function() {
        runIfPresent(handle);
      });
    };
  }
  function canUsePostMessage() {
    if (global2.postMessage && !global2.importScripts) {
      var postMessageIsAsynchronous = true;
      var oldOnMessage = global2.onmessage;
      global2.onmessage = function() {
        postMessageIsAsynchronous = false;
      };
      global2.postMessage("", "*");
      global2.onmessage = oldOnMessage;
      return postMessageIsAsynchronous;
    }
  }
  function installPostMessageImplementation() {
    var messagePrefix = "setImmediate$" + Math.random() + "$";
    var onGlobalMessage = function(event) {
      if (event.source === global2 && typeof event.data === "string" && event.data.indexOf(messagePrefix) === 0) {
        runIfPresent(+event.data.slice(messagePrefix.length));
      }
    };
    if (global2.addEventListener) {
      global2.addEventListener("message", onGlobalMessage, false);
    } else {
      global2.attachEvent("onmessage", onGlobalMessage);
    }
    registerImmediate = function(handle) {
      global2.postMessage(messagePrefix + handle, "*");
    };
  }
  function installMessageChannelImplementation() {
    var channel = new MessageChannel();
    channel.port1.onmessage = function(event) {
      var handle = event.data;
      runIfPresent(handle);
    };
    registerImmediate = function(handle) {
      channel.port2.postMessage(handle);
    };
  }
  function installReadyStateChangeImplementation() {
    var html = doc.documentElement;
    registerImmediate = function(handle) {
      var script = doc.createElement("script");
      script.onreadystatechange = function() {
        runIfPresent(handle);
        script.onreadystatechange = null;
        html.removeChild(script);
        script = null;
      };
      html.appendChild(script);
    };
  }
  function installSetTimeoutImplementation() {
    registerImmediate = function(handle) {
      setTimeout(runIfPresent, 0, handle);
    };
  }
  var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global2);
  attachTo = attachTo && attachTo.setTimeout ? attachTo : global2;
  if ({}.toString.call(global2.process) === "[object process]") {
    installNextTickImplementation();
  } else if (canUsePostMessage()) {
    installPostMessageImplementation();
  } else if (global2.MessageChannel) {
    installMessageChannelImplementation();
  } else if (doc && "onreadystatechange" in doc.createElement("script")) {
    installReadyStateChangeImplementation();
  } else {
    installSetTimeoutImplementation();
  }
  attachTo.setImmediate = setImmediate2;
  attachTo.clearImmediate = clearImmediate;
})(typeof self === "undefined" ? typeof global === "undefined" ? void 0 : global : self);

// src/_generated/rts.modulify.mjs
function modulify(obj) {
  return Object.entries(
    Object.getOwnPropertyDescriptors(Object.getPrototypeOf(obj))
  ).reduce(
    (acc, [k, descr]) => k === "constructor" || descr.get ? acc : (acc[k] = obj[k].bind(obj), acc),
    {}
  );
}

// src/_generated/rts.reentrancy.mjs
var ReentrancyGuard = class {
  constructor(names) {
    this.names = names;
    this.flags = this.names.map(() => false);
    Object.freeze(this);
  }
  enter(i) {
    if (this.flags[i])
      throw new WebAssembly.RuntimeError(
        `ReentrancyGuard: ${this.names[i]} reentered!`
      );
    this.flags[i] = true;
  }
  exit(i) {
    this.flags[i] = false;
  }
};

// src/_generated/rts.eventlog.mjs
var Event = class {
  constructor(lv, ev) {
    this.time = /* @__PURE__ */ new Date();
    this.level = lv;
    this.event = ev;
    Object.freeze(this);
  }
};
var EventLogManager = class {
  constructor() {
    this.events = [];
    this.enabled = true;
    this.onEvent = () => {
    };
    Object.seal(this);
  }
  isEnabled() {
    return this.enabled;
  }
  setEnabled(f) {
    this.enabled = Boolean(f);
  }
  log(lv, _ev) {
    if (this.enabled) {
      const ev = new Event(lv, _ev);
      this.events.push(ev);
      this.onEvent(ev);
    }
  }
  logInfo(ev) {
    this.log("INFO", ev);
  }
  logError(ev) {
    this.log("ERROR", ev);
  }
  logEvent(ev) {
    this.log("EVENT", ev);
  }
};

// src/_generated/rts.tracing.mjs
var Tracer = class {
  constructor(logger, symbol_table) {
    this.logger = logger;
    this.symbolLookupTable = {};
    for (const [k, v] of symbol_table.allEntries()) {
      this.symbolLookupTable[v] = k;
    }
    Object.freeze(this);
  }
  traceCmm(f) {
    this.logger.logInfo(["call", f, this.symbolLookupTable[f]]);
  }
  traceCmmBlock(f, lbl) {
    this.logger.logInfo(["br", f, this.symbolLookupTable[f], lbl]);
  }
  traceCmmSetLocal(f, i, v) {
    this.logger.logInfo([
      "set_local",
      f,
      this.symbolLookupTable[f],
      i,
      v,
      this.symbolLookupTable[v]
    ]);
  }
};

// src/_generated/rts.constants.mjs
var rts_constants_exports = {};
__export(rts_constants_exports, {
  BF_PINNED: () => BF_PINNED,
  block_size: () => block_size,
  blocks_per_mblock: () => blocks_per_mblock,
  clock_monotonic: () => clock_monotonic,
  clock_realtime: () => clock_realtime,
  hsTyCons: () => hsTyCons,
  mblock_size: () => mblock_size,
  mblock_size_log2: () => mblock_size_log2,
  offset_Capability_r: () => offset_Capability_r,
  offset_StgAP_STACK_fun: () => offset_StgAP_STACK_fun,
  offset_StgAP_STACK_payload: () => offset_StgAP_STACK_payload,
  offset_StgAP_STACK_size: () => offset_StgAP_STACK_size,
  offset_StgAP_arity: () => offset_StgAP_arity,
  offset_StgAP_fun: () => offset_StgAP_fun,
  offset_StgAP_n_args: () => offset_StgAP_n_args,
  offset_StgAP_payload: () => offset_StgAP_payload,
  offset_StgArrBytes_bytes: () => offset_StgArrBytes_bytes,
  offset_StgFunInfoExtraFwd_b: () => offset_StgFunInfoExtraFwd_b,
  offset_StgFunInfoExtraFwd_fun_type: () => offset_StgFunInfoExtraFwd_fun_type,
  offset_StgFunInfoExtraFwd_srt: () => offset_StgFunInfoExtraFwd_srt,
  offset_StgFunInfoTable_f: () => offset_StgFunInfoTable_f,
  offset_StgFunInfoTable_i: () => offset_StgFunInfoTable_i,
  offset_StgIndStatic_indirectee: () => offset_StgIndStatic_indirectee,
  offset_StgInd_indirectee: () => offset_StgInd_indirectee,
  offset_StgInfoTable_layout: () => offset_StgInfoTable_layout,
  offset_StgInfoTable_srt: () => offset_StgInfoTable_srt,
  offset_StgInfoTable_type: () => offset_StgInfoTable_type,
  offset_StgLargeBitmap_bitmap: () => offset_StgLargeBitmap_bitmap,
  offset_StgLargeBitmap_size: () => offset_StgLargeBitmap_size,
  offset_StgMVar_head: () => offset_StgMVar_head,
  offset_StgMVar_tail: () => offset_StgMVar_tail,
  offset_StgMVar_value: () => offset_StgMVar_value,
  offset_StgMutArrPtrs_payload: () => offset_StgMutArrPtrs_payload,
  offset_StgMutArrPtrs_ptrs: () => offset_StgMutArrPtrs_ptrs,
  offset_StgPAP_arity: () => offset_StgPAP_arity,
  offset_StgPAP_fun: () => offset_StgPAP_fun,
  offset_StgPAP_n_args: () => offset_StgPAP_n_args,
  offset_StgPAP_payload: () => offset_StgPAP_payload,
  offset_StgRegTable_rCurrentNursery: () => offset_StgRegTable_rCurrentNursery,
  offset_StgRegTable_rD1: () => offset_StgRegTable_rD1,
  offset_StgRegTable_rF1: () => offset_StgRegTable_rF1,
  offset_StgRegTable_rHpAlloc: () => offset_StgRegTable_rHpAlloc,
  offset_StgRegTable_rR1: () => offset_StgRegTable_rR1,
  offset_StgRegTable_rRet: () => offset_StgRegTable_rRet,
  offset_StgRetFun_fun: () => offset_StgRetFun_fun,
  offset_StgRetFun_payload: () => offset_StgRetFun_payload,
  offset_StgRetFun_size: () => offset_StgRetFun_size,
  offset_StgRetInfoTable_i: () => offset_StgRetInfoTable_i,
  offset_StgRetInfoTable_srt: () => offset_StgRetInfoTable_srt,
  offset_StgSelector_selectee: () => offset_StgSelector_selectee,
  offset_StgSmallMutArrPtrs_payload: () => offset_StgSmallMutArrPtrs_payload,
  offset_StgSmallMutArrPtrs_ptrs: () => offset_StgSmallMutArrPtrs_ptrs,
  offset_StgStableName_header: () => offset_StgStableName_header,
  offset_StgStableName_sn: () => offset_StgStableName_sn,
  offset_StgStack_sp: () => offset_StgStack_sp,
  offset_StgStack_stack: () => offset_StgStack_stack,
  offset_StgStack_stack_size: () => offset_StgStack_stack_size,
  offset_StgTSO_block_info: () => offset_StgTSO_block_info,
  offset_StgTSO_id: () => offset_StgTSO_id,
  offset_StgTSO_stackobj: () => offset_StgTSO_stackobj,
  offset_StgTSO_what_next: () => offset_StgTSO_what_next,
  offset_StgTSO_why_blocked: () => offset_StgTSO_why_blocked,
  offset_StgThunkInfoTable_i: () => offset_StgThunkInfoTable_i,
  offset_StgThunkInfoTable_srt: () => offset_StgThunkInfoTable_srt,
  offset_StgThunk_payload: () => offset_StgThunk_payload,
  offset_StgUpdateFrame_updatee: () => offset_StgUpdateFrame_updatee,
  offset_StgWeak_cfinalizers: () => offset_StgWeak_cfinalizers,
  offset_StgWeak_finalizer: () => offset_StgWeak_finalizer,
  offset_StgWeak_key: () => offset_StgWeak_key,
  offset_StgWeak_link: () => offset_StgWeak_link,
  offset_StgWeak_value: () => offset_StgWeak_value,
  offset_bdescr_blocks: () => offset_bdescr_blocks,
  offset_bdescr_flags: () => offset_bdescr_flags,
  offset_bdescr_free: () => offset_bdescr_free,
  offset_bdescr_gen_no: () => offset_bdescr_gen_no,
  offset_bdescr_link: () => offset_bdescr_link,
  offset_bdescr_node: () => offset_bdescr_node,
  offset_bdescr_start: () => offset_bdescr_start,
  offset_first_bdescr: () => offset_first_bdescr,
  offset_first_block: () => offset_first_block,
  offset_stat_dev: () => offset_stat_dev,
  offset_stat_ino: () => offset_stat_ino,
  offset_stat_mode: () => offset_stat_mode,
  offset_stat_mtime: () => offset_stat_mtime,
  offset_stat_size: () => offset_stat_size,
  offset_timespec_tv_nsec: () => offset_timespec_tv_nsec,
  offset_timespec_tv_sec: () => offset_timespec_tv_sec,
  pageSize: () => pageSize,
  sizeof_StgAP: () => sizeof_StgAP,
  sizeof_StgAP_STACK: () => sizeof_StgAP_STACK,
  sizeof_StgArrBytes: () => sizeof_StgArrBytes,
  sizeof_StgInd: () => sizeof_StgInd,
  sizeof_StgIndStatic: () => sizeof_StgIndStatic,
  sizeof_StgMutArrPtrs: () => sizeof_StgMutArrPtrs,
  sizeof_StgPAP: () => sizeof_StgPAP,
  sizeof_StgRetFun: () => sizeof_StgRetFun,
  sizeof_StgSelector: () => sizeof_StgSelector,
  sizeof_StgSmallMutArrPtrs: () => sizeof_StgSmallMutArrPtrs,
  sizeof_StgStableName: () => sizeof_StgStableName,
  sizeof_StgThunk: () => sizeof_StgThunk,
  sizeof_bdescr: () => sizeof_bdescr,
  sizeof_first_mblock: () => sizeof_first_mblock
});
var mblock_size = 1048576;
var mblock_size_log2 = 20;
var block_size = 4096;
var blocks_per_mblock = 252;
var offset_timespec_tv_sec = 0;
var offset_timespec_tv_nsec = 8;
var sizeof_bdescr = 64;
var offset_first_bdescr = 256;
var offset_first_block = 16384;
var sizeof_first_mblock = 1032192;
var offset_bdescr_start = 0;
var offset_bdescr_free = 8;
var offset_bdescr_link = 16;
var offset_bdescr_gen_no = 40;
var offset_bdescr_node = 44;
var offset_bdescr_flags = 46;
var offset_bdescr_blocks = 48;
var BF_PINNED = 4;
var pageSize = 65536;
var offset_Capability_r = 24;
var sizeof_StgAP = 32;
var offset_StgAP_arity = 16;
var offset_StgAP_n_args = 20;
var offset_StgAP_fun = 24;
var offset_StgAP_payload = 32;
var sizeof_StgAP_STACK = 32;
var offset_StgAP_STACK_size = 16;
var offset_StgAP_STACK_fun = 24;
var offset_StgAP_STACK_payload = 32;
var sizeof_StgArrBytes = 16;
var offset_StgArrBytes_bytes = 8;
var offset_StgFunInfoExtraFwd_fun_type = 0;
var offset_StgFunInfoExtraFwd_srt = 8;
var offset_StgFunInfoExtraFwd_b = 16;
var offset_StgFunInfoTable_i = 0;
var offset_StgFunInfoTable_f = 24;
var sizeof_StgInd = 16;
var offset_StgInd_indirectee = 8;
var sizeof_StgIndStatic = 32;
var offset_StgIndStatic_indirectee = 8;
var offset_StgInfoTable_layout = 8;
var offset_StgInfoTable_type = 16;
var offset_StgInfoTable_srt = 20;
var offset_StgLargeBitmap_size = 0;
var offset_StgLargeBitmap_bitmap = 8;
var sizeof_StgMutArrPtrs = 24;
var offset_StgMutArrPtrs_ptrs = 8;
var offset_StgMutArrPtrs_payload = 24;
var offset_StgMVar_head = 8;
var offset_StgMVar_tail = 16;
var offset_StgMVar_value = 24;
var sizeof_StgPAP = 24;
var offset_StgPAP_arity = 8;
var offset_StgPAP_n_args = 12;
var offset_StgPAP_fun = 16;
var offset_StgPAP_payload = 24;
var offset_StgRegTable_rR1 = 0;
var offset_StgRegTable_rF1 = 80;
var offset_StgRegTable_rD1 = 104;
var offset_StgRegTable_rCurrentNursery = 888;
var offset_StgRegTable_rHpAlloc = 904;
var offset_StgRegTable_rRet = 912;
var sizeof_StgRetFun = 24;
var offset_StgRetFun_size = 8;
var offset_StgRetFun_fun = 16;
var offset_StgRetFun_payload = 24;
var offset_StgRetInfoTable_i = 0;
var offset_StgRetInfoTable_srt = 24;
var sizeof_StgSelector = 24;
var offset_StgSelector_selectee = 16;
var sizeof_StgSmallMutArrPtrs = 16;
var offset_StgSmallMutArrPtrs_ptrs = 8;
var offset_StgSmallMutArrPtrs_payload = 16;
var sizeof_StgThunk = 16;
var offset_StgThunk_payload = 16;
var offset_StgThunkInfoTable_i = 0;
var offset_StgThunkInfoTable_srt = 24;
var offset_StgTSO_id = 48;
var offset_StgTSO_stackobj = 24;
var offset_StgTSO_what_next = 32;
var offset_StgTSO_why_blocked = 34;
var offset_StgTSO_block_info = 40;
var offset_StgStack_stack_size = 8;
var offset_StgStack_sp = 16;
var offset_StgStack_stack = 24;
var offset_StgUpdateFrame_updatee = 8;
var offset_StgWeak_cfinalizers = 8;
var offset_StgWeak_key = 16;
var offset_StgWeak_value = 24;
var offset_StgWeak_finalizer = 32;
var offset_StgWeak_link = 40;
var sizeof_StgStableName = 16;
var offset_StgStableName_header = 0;
var offset_StgStableName_sn = 8;
var offset_stat_mtime = 88;
var offset_stat_size = 48;
var offset_stat_mode = 24;
var offset_stat_dev = 0;
var offset_stat_ino = 8;
var clock_monotonic = 1;
var clock_realtime = 0;
var hsTyCons = ["JSVal", "Bool", "Char", "Double", "Float", "Int", "Int8", "Int16", "Int32", "Int64", "Word", "Word8", "Word16", "Word32", "Word64", "StablePtr", "Ptr", "FunPtr"];

// src/_generated/rts.memory.mjs
function checkNullAndTag(p) {
  if (!p) {
    throw new WebAssembly.RuntimeError(`Allocator returned NULL`);
  }
  return p;
}
var Memory = class {
  constructor(components) {
    this.components = components;
    this.memory = void 0;
    this.staticMBlocks = void 0;
    Object.seal(this);
  }
  get i8View() {
    return new Uint8Array(this.memory.buffer);
  }
  get dataView() {
    return new DataView(this.memory.buffer);
  }
  /**
   * Initializes the {@link Memory} object.
   */
  init(memory, static_mblocks) {
    this.memory = memory;
    this.staticMBlocks = static_mblocks;
  }
  static unDynTag(p) {
    const np = Number(p);
    return np - (np & 7);
  }
  static getDynTag(p) {
    return Number(p) & 7;
  }
  static setDynTag(p, t) {
    const np = Number(p);
    return np - (np & 7) + t;
  }
  i8Load(p) {
    return this.i8View[p];
  }
  i8Store(p, v) {
    this.i8View[p] = Number(v);
  }
  i16Load(p) {
    return this.dataView.getUint16(p, true);
  }
  i16Store(p, v) {
    this.dataView.setUint16(p, Number(v), true);
  }
  i32Load(p) {
    return this.dataView.getUint32(p, true);
  }
  i32Store(p, v) {
    this.dataView.setUint32(p, Number(v), true);
  }
  i64Load(p) {
    return this.dataView.getBigUint64(p, true);
  }
  i64Store(p, v) {
    this.dataView.setBigUint64(p, BigInt(v), true);
  }
  f32Load(p) {
    return this.dataView.getFloat32(p, true);
  }
  f32Store(p, v) {
    this.dataView.setFloat32(p, Number(v), true);
  }
  f64Load(p) {
    return this.dataView.getFloat64(p, true);
  }
  f64Store(p, v) {
    this.dataView.setFloat64(p, Number(v), true);
  }
  i32LoadS8(p) {
    return this.dataView.getInt8(p);
  }
  i32LoadU8(p) {
    return this.dataView.getUint8(p);
  }
  i32LoadS16(p) {
    return this.dataView.getInt16(p, true);
  }
  i32LoadU16(p) {
    return this.dataView.getUint16(p, true);
  }
  i64LoadS8(p) {
    return BigInt(this.dataView.getInt8(p));
  }
  i64LoadU8(p) {
    return BigInt(this.dataView.getUint8(p));
  }
  i64LoadS16(p) {
    return BigInt(this.dataView.getInt16(p, true));
  }
  i64LoadU16(p) {
    return BigInt(this.dataView.getUint16(p, true));
  }
  /**
   * Checks whether the object at address {@param p} is
   * heap-allocated, i.e. whether it resides in the dynamic
   * part of the memory. Used during garbage collection
   * (in {@link GC#evacuateClosure}) to avoid evacuating
   * objects in the static MBlocks.
   */
  heapAlloced(p) {
    return p >= this.staticMBlocks << mblock_size_log2;
  }
  /**
   * Obtains {@param n} MBlocks from {@link Memory#memory}.
   * @returns The memory address at the beginning of the
   *   requested free memory area.
   */
  getMBlocks(n) {
    return checkNullAndTag(
      this.components.exports.aligned_alloc(
        mblock_size,
        mblock_size * n
      )
    );
  }
  /**
   * Frees MBlocks starting at address {@param p}.
   */
  freeMBlocks(p) {
    this.components.exports.free(p);
  }
  expose(p, len, t) {
    return new t(this.memory.buffer, p, len);
  }
  strlen(_str) {
    return this.components.exports.strlen(_str);
  }
  strLoad(_str) {
    let p = _str;
    let s = "";
    let i = 0;
    while (1) {
      let c = this.i8View[p + i];
      if (c == 0) {
        return s;
      }
      s += String.fromCharCode(c);
      i++;
    }
  }
  memchr(_ptr, val, num) {
    return this.components.exports.memchr(_ptr, val, num);
  }
  memcpy(_dst, _src, n) {
    return this.components.exports.memcpy(_dst, _src, n);
  }
  memset(_dst, c, n, size = 1) {
    const ty = {
      1: Uint8Array,
      2: Uint16Array,
      4: Uint32Array,
      8: BigUint64Array
    };
    const buf = this.expose(_dst, n, ty[size]);
    if (size === 8) {
      buf.fill(BigInt(c));
    } else {
      buf.fill(c);
    }
  }
  memsetFloat32(_dst, c, n) {
    const buf = this.expose(_dst, n, Float32Array);
    buf.fill(c);
  }
  memsetFloat64(_dst, c, n) {
    const buf = this.expose(_dst, n, Float64Array);
    buf.fill(c);
  }
};

// src/_generated/rts.memorytrap.mjs
var MemoryTrap = class {
  constructor(logger, symbol_table, memory) {
    this.logger = logger;
    this.symbolLookupTable = /* @__PURE__ */ new Map();
    for (const [k, v] of symbol_table.allEntries()) {
      this.symbolLookupTable.set(v, k);
    }
    this.memory = memory;
    Object.freeze(this);
  }
  trap(sym, p) {
  }
  loadI8(sym, bp, o) {
    const p = Number(bp + BigInt(o));
    this.trap(sym, p);
    return this.memory.i8Load(p);
  }
  loadI16(sym, bp, o) {
    const p = Number(bp + BigInt(o));
    this.trap(sym, p);
    return this.memory.i16Load(p);
  }
  loadI32(sym, bp, o) {
    const p = Number(bp + BigInt(o));
    this.trap(sym, p);
    return this.memory.i32Load(p);
  }
  loadI64(sym, bp, o) {
    const p = Number(bp + BigInt(o));
    this.trap(sym, p);
    return this.memory.i64Load(p);
  }
  loadI32S8(sym, bp, o) {
    const p = Number(bp + BigInt(o));
    this.trap(sym, p);
    return this.memory.i32LoadS8(p);
  }
  loadI32U8(sym, bp, o) {
    const p = Number(bp + BigInt(o));
    this.trap(sym, p);
    return this.memory.i32LoadU8(p);
  }
  loadI32S16(sym, bp, o) {
    const p = Number(bp + BigInt(o));
    this.trap(sym, p);
    return this.memory.i32LoadS16(p);
  }
  loadI32U16(sym, bp, o) {
    const p = Number(bp + BigInt(o));
    this.trap(sym, p);
    return this.memory.i32LoadU16(p);
  }
  loadI64S8(sym, bp, o) {
    const p = Number(bp + BigInt(o));
    this.trap(sym, p);
    return this.memory.i64LoadS8(p);
  }
  loadI64U8(sym, bp, o) {
    const p = Number(bp + BigInt(o));
    this.trap(sym, p);
    return this.memory.i64LoadU8(p);
  }
  loadI64S16(sym, bp, o) {
    const p = Number(bp + BigInt(o));
    this.trap(sym, p);
    return this.memory.i64LoadS16(p);
  }
  loadI64U16(sym, bp, o) {
    const p = Number(bp + BigInt(o));
    this.trap(sym, p);
    return this.memory.i64LoadU16(p);
  }
  loadF32(sym, bp, o) {
    const p = Number(bp + BigInt(o));
    this.trap(sym, p);
    return this.memory.f32Load(p);
  }
  loadF64(sym, bp, o) {
    const p = Number(bp + BigInt(o));
    this.trap(sym, p);
    return this.memory.f64Load(p);
  }
  storeI8(sym, bp, o, v) {
    const p = Number(bp + BigInt(o));
    this.trap(sym, p);
    this.memory.i8Store(p, v);
  }
  storeI16(sym, bp, o, v) {
    const p = Number(bp + BigInt(o));
    this.trap(sym, p);
    this.memory.i16Store(p, v);
  }
  storeI32(sym, bp, o, v) {
    const p = Number(bp + BigInt(o));
    this.trap(sym, p);
    this.memory.i32Store(p, v);
  }
  storeI64(sym, bp, o, v) {
    const p = Number(bp + BigInt(o));
    this.trap(sym, p);
    this.memory.i64Store(p, v);
  }
  storeF32(sym, bp, o, v) {
    const p = Number(bp + BigInt(o));
    this.trap(sym, p);
    this.memory.f32Store(p, v);
  }
  storeF64(sym, bp, o, v) {
    const p = Number(bp + BigInt(o));
    this.trap(sym, p);
    this.memory.f64Store(p, v);
  }
};

// src/_generated/rts.heapalloc.mjs
var HeapAlloc = class {
  constructor(memory) {
    this.memory = memory;
    this.currentPools = [void 0, void 0];
    this.generations = new Array(2);
    this.mgroups = /* @__PURE__ */ new Set();
    Object.freeze(this);
  }
  /**
   * Initializes the pinned & unpinned pools.
   */
  init() {
    this.setGenerationNo(0);
    this.currentPools[1] = this.allocMegaGroup(1, true);
  }
  /**
   * Sets the current generation number, so that new closures and
   * MBlocks are allocated in the right space and with correct flag.
   * @param {number} gen_no The generation number
   * @param {boolean} [forceNewAlloc=true] Force the allocation
   *   of a new MBlock.
   */
  setGenerationNo(gen_no, forceNewAlloc = true) {
    let pool = this.generations[gen_no];
    if (forceNewAlloc || !pool) {
      pool = this.allocMegaGroup(1, false, gen_no);
      this.generations[gen_no] = pool;
    }
    this.currentPools[0] = pool;
  }
  /**
   * Allocates a new MegaGroup of enough MBlocks to
   * accommodate the supplied amount of bytes.
   * @param b The number of bytes to allocate
   * @param pinned Whether the MBlocks should be pinned
   * @param gen_no The generation number
   * @returns The address of the block descriptor
   *  of the first MBlock of the MegaGroup.
   */
  hpAlloc(b, pinned = false, gen_no = 0) {
    const mblocks = b <= sizeof_first_mblock ? 1 : 1 + Math.ceil(
      (b - sizeof_first_mblock) / mblock_size
    ), bd = this.allocMegaGroup(mblocks, pinned, gen_no);
    return bd;
  }
  /**
   * Allocates enough blocks to accommodate the given number
   * of words in the appropriate pool.
   * @param n The number of (64 bit) words to allocate
   * @param pinned Whether to allocate in the pinned pool
   */
  allocate(n, pinned = false) {
    const b = n << 3;
    pinned = pinned || b >= block_size;
    let pool = this.currentPools[Number(pinned)], current_start = Number(
      this.memory.i64Load(pool + offset_bdescr_start)
    ), current_free = Number(
      this.memory.i64Load(pool + offset_bdescr_free)
    );
    const current_blocks = this.memory.i32Load(
      pool + offset_bdescr_blocks
    ), current_limit = current_start + block_size * current_blocks, new_free = current_free + b;
    if (new_free <= current_limit) {
      this.memory.i64Store(
        pool + offset_bdescr_free,
        new_free
      );
    } else {
      if (pinned) {
        pool = this.hpAlloc(b, true);
        this.currentPools[1] = pool;
      } else {
        const gen_no = this.memory.i16Load(pool + offset_bdescr_gen_no);
        pool = this.hpAlloc(b, false, gen_no);
        this.currentPools[0] = pool;
        this.generations[gen_no] = pool;
      }
      current_free = Number(
        this.memory.i64Load(
          pool + offset_bdescr_free
        )
      );
      this.memory.i64Store(
        pool + offset_bdescr_free,
        current_free + b
      );
    }
    return current_free;
  }
  /**
   * Allocates the given number of words in the pinned pool.
   * @param n The number of (64 bit) words to allocate
   */
  allocatePinned(n) {
    return this.allocate(n, true);
  }
  /**
   * Allocates a new MegaGroup of size the supplied number of MBlocks.
   * @param n The number of requested MBlocks
   * @param pinned Whether the MBlocks should be pinned
   * @param gen_no The generation number
   * @return The address of the block descriptor
   *  of the first MBlock of the MegaGroup
   */
  allocMegaGroup(n, pinned = false, gen_no = 0) {
    const req_blocks = (mblock_size * n - offset_first_block) / block_size, mblock = this.memory.getMBlocks(n), bd = mblock + offset_first_bdescr, block_addr = mblock + offset_first_block;
    this.memory.i64Store(bd + offset_bdescr_start, block_addr);
    this.memory.i64Store(bd + offset_bdescr_free, block_addr);
    this.memory.i64Store(bd + offset_bdescr_link, 0);
    this.memory.i16Store(bd + offset_bdescr_node, n);
    this.memory.i32Store(bd + offset_bdescr_blocks, req_blocks);
    this.memory.i16Store(
      bd + offset_bdescr_flags,
      pinned ? BF_PINNED : 0
    );
    this.memory.i16Store(bd + offset_bdescr_gen_no, gen_no);
    this.mgroups.add(bd);
    return bd;
  }
  /**
   * Frees the garbage MBlocks by taking into account the
   * information on live and dead MBlocks passed by the
   * garbage collector. Used by {@link GC#performGC}.
   * @param live_mblocks The set of current live MBlocks
   * @param live_mblocks The set of current dead MBlocks
   * @param major Whether this info comes from a minor or major GC
   */
  handleLiveness(live_mblocks, dead_mblocks, major = true) {
    for (const bd of live_mblocks) {
      if (!this.mgroups.has(bd)) {
        throw new WebAssembly.RuntimeError(
          `Invalid live mblock 0x${bd.toString(16)}`
        );
      }
    }
    for (const bd of dead_mblocks) {
      if (!this.mgroups.has(bd)) {
        throw new WebAssembly.RuntimeError(
          `Invalid dead mblock 0x${bd.toString(16)}`
        );
      }
      this.mgroups.delete(bd);
      const p = bd - offset_first_bdescr;
      this.memory.freeMBlocks(p);
    }
    for (const bd of Array.from(this.mgroups)) {
      if (!live_mblocks.has(bd)) {
        const gen_no = this.memory.i16Load(bd + offset_bdescr_gen_no), pinned = Boolean(
          this.memory.i16Load(bd + offset_bdescr_flags) & BF_PINNED
        );
        if (major || !pinned && gen_no == 0) {
          this.mgroups.delete(bd);
          const p = bd - offset_first_bdescr, n = this.memory.i16Load(bd + offset_bdescr_node);
          this.memory.freeMBlocks(p, n);
        }
      }
    }
    if (!this.mgroups.has(this.currentPools[1])) {
      this.currentPools[1] = this.allocMegaGroup(1, true);
    }
    for (let i = 0; i < this.generations.length; i++)
      if (!this.mgroups.has(this.generations[i])) {
        this.generations[i] = void 0;
      }
  }
  /**
   * Estimates the size of living objects by counting the number
   * of MBlocks that were allocated by {@link GC#getMBlocks}
   * some time ago, but have not been yet been freed by {@link GC#freeMBlocks}.
   * @returns The number of allocated MBlocks
   */
  liveSize() {
    let acc = 0;
    for (const bd of this.mgroups) {
      acc += this.memory.i16Load(bd + offset_bdescr_node);
    }
    return acc;
  }
};

// src/_generated/rts.jsval.mjs
var JSValManager = class {
  constructor(components) {
    this.components = components;
    this.closure2Val = /* @__PURE__ */ new Map();
    Object.seal(this);
  }
  newJSValzh(v) {
    const c = this.components.heapAlloc.allocate(1);
    this.components.memory.i64Store(
      c,
      this.components.symbolTable.addressOf("stg_JSVAL_info")
    );
    this.closure2Val.set(c, v);
    return c;
  }
  getJSValzh(c) {
    if (!this.closure2Val.has(c)) {
      throw new WebAssembly.RuntimeError(`Invalid JSVal# 0x${c.toString(16)}`);
    }
    return this.closure2Val.get(c);
  }
  freeJSValzh(c) {
    if (!this.closure2Val.delete(c)) {
      throw new WebAssembly.RuntimeError(`Invalid JSVal# 0x${c.toString(16)}`);
    }
  }
};

// src/_generated/rts.stableptr.mjs
var StablePtrManager = class {
  constructor() {
    this.spt = /* @__PURE__ */ new Map();
    this.last = 0;
    Object.seal(this);
  }
  newStablePtr(addr) {
    const sp = ++this.last;
    this.spt.set(sp, addr);
    return sp;
  }
  deRefStablePtr(sp) {
    return this.spt.get(sp);
  }
  freeStablePtr(sp) {
    this.spt.delete(sp);
  }
  hasStablePtr(sp) {
    return this.spt.has(sp);
  }
};

// src/_generated/rts.stablename.mjs
var StableNameManager = class {
  constructor(memory, heapalloc, symbol_table) {
    this.memory = memory;
    this.heapalloc = heapalloc;
    this.ptr2stable = /* @__PURE__ */ new Map();
    this.SymbolTable = symbol_table;
    Object.seal(this);
  }
  makeStableName(ptr) {
    const oldstable = this.ptr2stable.get(ptr);
    if (oldstable !== void 0)
      return oldstable;
    const tag = this.ptr2stable.size;
    let stableptr = this.heapalloc.allocate(
      Math.ceil(sizeof_StgStableName / 8)
    );
    this.memory.i64Store(stableptr, this.SymbolTable.addressOf("stg_STABLE_NAME_info"));
    this.memory.i64Store(stableptr + offset_StgStableName_sn, tag);
    this.ptr2stable.set(ptr, stableptr);
    return stableptr;
  }
};

// src/_generated/rts.staticptr.mjs
var w0_mask = (BigInt(1) << BigInt(64)) - BigInt(1);
var StaticPtrManager = class {
  constructor(memory, stableptr_manager, spt_entries) {
    this.memory = memory;
    this.stablePtrManager = stableptr_manager;
    this.sptEntries = spt_entries;
    Object.freeze(this);
    for (const [, c] of this.sptEntries) {
      this.stablePtrManager.newStablePtr(c);
    }
  }
  hs_spt_lookup(w0_lo, w0_hi, w1_lo, w1_hi) {
    const r = this.sptEntries.get(
      BigInt(w1_hi) << BigInt(96) | BigInt(w1_lo) << BigInt(64) | BigInt(w0_hi) << BigInt(32) | BigInt(w0_lo)
    );
    return r ? r : 0;
  }
  hs_spt_key_count() {
    return this.sptEntries.size;
  }
  hs_spt_keys(p, n) {
    if (n !== this.hs_spt_key_count()) {
      throw new WebAssembly.RuntimeError(
        `hs_spt_keys required ${n} keys, but there are ${this.hs_spt_key_count()}`
      );
    }
    for (const [k] of this.sptEntries) {
      this.memory.i64Store(p, k & w0_mask);
      this.memory.i64Store(p + 8, k >> BigInt(64));
      p += 16;
    }
    return n;
  }
};

// src/_generated/rts.scheduler.mjs
var Scheduler = class {
  constructor(components, memory, symbol_table, stablePtrManager) {
    this.components = components;
    this.memory = memory;
    this.symbolTable = symbol_table;
    this.lastTid = 0;
    this.tsos = /* @__PURE__ */ new Map();
    this.exports = void 0;
    this.stablePtrManager = stablePtrManager;
    this.gc = void 0;
    this.blockingPromise = void 0;
    Object.seal(this);
  }
  setGC(gc) {
    this.gc = gc;
  }
  /**
   * Create a new TSO. Called by "createThread"
   *
   * @returns Number TSO ID.
   */
  newTSO() {
    const tid = ++this.lastTid;
    let promise_resolve, promise_reject;
    const ret_promise = new Promise((resolve, reject) => {
      promise_resolve = resolve;
      promise_reject = reject;
    });
    this.tsos.set(
      tid,
      Object.seal({
        addr: -1,
        // TSO struct address in Wasm memory
        ret: 0,
        // returned object address in Wasm memory
        retError: void 0,
        rstat: -1,
        // thread status
        ffiRet: void 0,
        // FFI returned value
        ffiRetType: void 0,
        // FFI returned value type
        ffiRetErr: void 0,
        // FFI returned error
        returnPromise: ret_promise,
        promise_resolve,
        // Settle the promise used by user
        promise_reject
      })
    );
    return tid;
  }
  getTSOaddr(tid) {
    return this.tsos.get(tid).addr;
  }
  getTSOret(tid) {
    return this.tsos.get(tid).ret;
  }
  getTSOrstat(tid) {
    return this.tsos.get(tid).rstat;
  }
  setTSOaddr(tid, addr) {
    this.tsos.get(tid).addr = addr;
  }
  setTSOret(tid, ret) {
    this.tsos.get(tid).ret = ret;
  }
  setTSOrstat(tid, rstat) {
    this.tsos.get(tid).rstat = rstat;
  }
  getTSOid(tso) {
    return this.memory.i32Load(tso + offset_StgTSO_id);
  }
  /**
   * Called from a generated safe FFI import call.
   *
   * @param ffiPromise Promise executing the FFI import code asynchronously.
   */
  returnFFIPromise(ffiPromise) {
    this.blockingPromise = ffiPromise;
  }
  /**
   * Called when a thread stops for some reason.
   */
  returnedFromTSO(tid) {
    const tso_info = this.tsos.get(tid);
    const tso = tso_info.addr;
    const reason = Number(
      this.memory.i64Load(
        this.symbolTable.addressOf("MainCapability") + offset_Capability_r + offset_StgRegTable_rRet
      )
    );
    switch (reason) {
      case 1: {
        this.gc.performGC();
        setImmediate(() => this.tick(tid));
        break;
      }
      case 2: {
        const prev_stack = Number(
          this.memory.i64Load(tso + offset_StgTSO_stackobj)
        ), next_stack = this.exports.growStack(prev_stack);
        this.memory.i64Store(
          tso + offset_StgTSO_stackobj,
          next_stack
        );
        setImmediate(() => this.tick(tid));
        break;
      }
      case 3: {
        setImmediate(() => this.tick(tid));
        break;
      }
      case 4: {
        const why_blocked = Number(
          this.memory.i16Load(tso + offset_StgTSO_why_blocked)
        );
        switch (why_blocked) {
          case Blocked.OnCCall:
          case Blocked.OnCCall_Interruptible: {
            const blocking_promise = this.blockingPromise;
            this.blockingPromise = void 0;
            blocking_promise.then(
              (v) => {
                const [retTyp, retVal] = v;
                tso_info.ffiRet = retVal;
                tso_info.ffiRetType = retTyp;
                setImmediate(() => this.tick(tid));
              },
              (e) => {
                tso_info.ffiRetErr = e;
                setImmediate(() => this.tick(tid));
              }
            );
            break;
          }
          case Blocked.OnDelay: {
            const us_delay = Number(
              this.memory.i64Load(tso + offset_StgTSO_block_info)
            );
            const blocking_promise = new Promise((resolve, reject) => {
              setTimeout(() => resolve(), us_delay / 1e3);
            });
            blocking_promise.then(
              () => {
                setImmediate(() => this.tick(tid));
              },
              (e) => {
                throw new WebAssembly.RuntimeError(
                  `Scheduler: blocking TSO Promise rejected with ${e}`
                );
              }
            );
            break;
          }
          case Blocked.OnBlackHole:
          case Blocked.OnMVar:
          case Blocked.OnMVarRead: {
            break;
          }
          default: {
            throw new WebAssembly.RuntimeError(
              `Unhandled thread blocking reason: ${why_blocked}`
            );
          }
        }
        break;
      }
      case 5: {
        const what_next = Number(
          this.memory.i16Load(tso + offset_StgTSO_what_next)
        );
        switch (what_next) {
          case 1: {
            setImmediate(() => this.tick(tid));
            break;
          }
          case 3: {
            tso_info.ret = 0;
            tso_info.rstat = 2;
            tso_info.promise_reject(tso_info.retError);
            break;
          }
          case 4: {
            const stackobj = Number(
              this.memory.i64Load(tso + offset_StgTSO_stackobj)
            );
            const sp = Number(
              this.memory.i64Load(stackobj + offset_StgStack_sp)
            );
            tso_info.ret = Number(this.memory.i64Load(sp + 8));
            tso_info.rstat = 1;
            tso_info.promise_resolve(tid);
            break;
          }
        }
        break;
      }
      default: {
        throw new WebAssembly.RuntimeError(
          `returnFFIPromise: unsupported thread stopping reason ${reason}`
        );
      }
    }
  }
  tick(tid) {
    this.exports.context.reentrancyGuard.enter(0);
    try {
      const tso_info = this.tsos.get(tid);
      const tso = tso_info.addr;
      if (tso_info.ffiRetErr) {
        throw tso_info.ffiRetErr;
        const stackobj = Number(
          this.memory.i64Load(tso + offset_StgTSO_stackobj)
        ), sp = Number(
          this.memory.i64Load(stackobj + offset_StgStack_sp)
        ) - 16, exception_closure = this.exports.rts_apply(
          this.symbolTable.addressOf(
            "base_AsteriusziTypesziJSException_mkJSException_closure"
          ),
          this.exports.rts_mkJSVal(
            this.components.jsvalManager.newJSValzh(tso_info.ffiRetErr)
          )
        );
        this.memory.i64Store(stackobj + offset_StgStack_sp, sp);
        this.memory.i64Store(sp, this.symbolTable.addressOf("stg_raise_ret_info"));
        this.memory.i64Store(sp + 8, exception_closure);
      } else if (typeof tso_info.ffiRetType === "number") {
        switch (tso_info.ffiRetType) {
          case 0: {
            break;
          }
          case 1: {
            const ptr = this.components.jsvalManager.newJSValzh(tso_info.ffiRet);
            this.memory.i64Store(
              this.symbolTable.addressOf("MainCapability") + offset_Capability_r + offset_StgRegTable_rR1,
              ptr
            );
            break;
          }
          case 2: {
            this.memory.i64Store(
              this.symbolTable.addressOf("MainCapability") + offset_Capability_r + offset_StgRegTable_rR1,
              tso_info.ffiRet
            );
            break;
          }
          case 3: {
            this.memory.f32Store(
              this.symbolTable.addressOf("MainCapability") + offset_Capability_r + offset_StgRegTable_rF1,
              tso_info.ffiRet
            );
            break;
          }
          case 4: {
            this.memory.f64Store(
              this.symbolTable.addressOf("MainCapability") + offset_Capability_r + offset_StgRegTable_rD1,
              tso_info.ffiRet
            );
            break;
          }
          default:
            throw new WebAssembly.RuntimeError(
              `Unsupported FFI return value type tag ${tso_info.ffiRetType} (more than one value?): ${tso_info.ffiRet}`
            );
        }
      }
      tso_info.ffiRet = void 0;
      tso_info.ffiRetType = void 0;
      tso_info.ffiRetErr = void 0;
      let sync_err = false;
      try {
        this.exports.scheduleTSO(tso);
      } catch (err2) {
        sync_err = true;
        this.exports.stg_returnToSchedNotPaused();
        tso_info.ffiRetErr = err2;
        setImmediate(() => this.tick(tid));
      }
      if (!sync_err) {
        this.returnedFromTSO(tid);
      }
    } finally {
      this.exports.context.reentrancyGuard.exit(0);
    }
  }
  tsoReportException(tso, v) {
    const err2 = this.components.jsvalManager.getJSValzh(v);
    this.components.jsvalManager.freeJSValzh(v);
    const tid = this.getTSOid(tso);
    this.tsos.get(tid).retError = err2;
  }
  /**
   * Enqueue the TSO in the run-queue and wake-up the scheduler.
   */
  enqueueTSO(tso) {
    const tid = this.getTSOid(tso);
    const tso_info = this.tsos.get(tid);
    if (tso_info.addr == -1) {
      tso_info.addr = Number(tso);
    }
    setImmediate(() => this.tick(tid));
  }
  /**
   * Submit a thread creation command.
   *
   * @param createThread The name of an exported function with prototype:
   *                     TSO * createThread(closure*). E.g. "createIOThread".
   * @param closure      The closure to evaluate in the thread.
   */
  submitCmdCreateThread(createThread, closure) {
    const tso = this.exports[createThread](closure), tid = this.getTSOid(tso), tso_info = this.tsos.get(tid);
    this.enqueueTSO(tso);
    return tso_info.returnPromise;
  }
};
var Blocked = {
  NotBlocked: 0,
  OnMVar: 1,
  OnMVarRead: 14,
  OnBlackHole: 2,
  OnRead: 3,
  OnWrite: 4,
  OnDelay: 5,
  OnSTM: 6,
  OnDoProc: 7,
  OnCCall: 10,
  OnCCall_Interruptible: 11,
  OnMsgThrowTo: 12,
  ThreadMigrating: 13
};

// src/_generated/rts.integer.mjs
var IntegerManager = class {
  constructor() {
    this.view = new DataView(new ArrayBuffer(8));
    Object.freeze(this);
  }
  mul2(hi_hi, hi_lo, lo_hi, lo_lo, ipiece) {
    this.view.setInt32(
      /*offset=*/
      0,
      hi_lo,
      /*littleEndian=*/
      true
    );
    this.view.setInt32(
      /*offset=*/
      4,
      hi_hi,
      /*littleEndian=*/
      true
    );
    const hi = this.view.getBigUint64(
      /*offset=*/
      0,
      /*littleEndian=*/
      true
    );
    this.view.setInt32(
      /*offset=*/
      0,
      lo_lo,
      /*littleEndian=*/
      true
    );
    this.view.setInt32(
      /*offset=*/
      4,
      lo_hi,
      /*littleEndian=*/
      true
    );
    const lo = this.view.getBigUint64(
      /*offset=*/
      0,
      /*littleEndian=*/
      true
    );
    const mul = hi * lo;
    const val = Number(
      mul >> BigInt(32 * ipiece) & (BigInt(1) << BigInt(32)) - BigInt(1)
    );
    return Number(val);
  }
  quotrem2_quotient(lhs_hi_hi, lhs_hi_lo, lhs_lo_hi, lhs_lo_lo, rhs_hi, rhs_lo, ipiece) {
    this.view.setInt32(
      /*offset=*/
      0,
      lhs_hi_lo,
      /*littleEndian=*/
      true
    );
    this.view.setInt32(
      /*offset=*/
      4,
      lhs_hi_hi,
      /*littleEndian=*/
      true
    );
    const lhs_hi = this.view.getBigUint64(
      /*offset=*/
      0,
      /*littleEndian=*/
      true
    );
    this.view.setInt32(
      /*offset=*/
      0,
      lhs_lo_lo,
      /*littleEndian=*/
      true
    );
    this.view.setInt32(
      /*offset=*/
      4,
      lhs_lo_hi,
      /*littleEndian=*/
      true
    );
    const lhs_lo = this.view.getBigUint64(
      /*offset=*/
      0,
      /*littleEndian=*/
      true
    );
    const lhs = lhs_hi << BigInt(64) | lhs_lo;
    this.view.setInt32(
      /*offset=*/
      0,
      rhs_lo,
      /*littleEndian=*/
      true
    );
    this.view.setInt32(
      /*offset=*/
      4,
      rhs_hi,
      /*littleEndian=*/
      true
    );
    const rhs = this.view.getBigUint64(
      /*offset=*/
      0,
      /*littleEndian=*/
      true
    );
    const quot = lhs / rhs;
    const val = Number(
      quot >> BigInt(32 * ipiece) & (BigInt(1) << BigInt(32)) - BigInt(1)
    );
    return Number(val);
  }
  quotrem2_remainder(lhs_hi_hi, lhs_hi_lo, lhs_lo_hi, lhs_lo_lo, rhs_hi, rhs_lo, ipiece) {
    this.view.setInt32(
      /*offset=*/
      0,
      lhs_hi_lo,
      /*littleEndian=*/
      true
    );
    this.view.setInt32(
      /*offset=*/
      4,
      lhs_hi_hi,
      /*littleEndian=*/
      true
    );
    const lhs_hi = this.view.getBigUint64(
      /*offset=*/
      0,
      /*littleEndian=*/
      true
    );
    this.view.setInt32(
      /*offset=*/
      0,
      lhs_lo_lo,
      /*littleEndian=*/
      true
    );
    this.view.setInt32(
      /*offset=*/
      4,
      lhs_lo_hi,
      /*littleEndian=*/
      true
    );
    const lhs_lo = this.view.getBigUint64(
      /*offset=*/
      0,
      /*littleEndian=*/
      true
    );
    const lhs = lhs_hi << BigInt(64) | lhs_lo;
    this.view.setInt32(
      /*offset=*/
      0,
      rhs_lo,
      /*littleEndian=*/
      true
    );
    this.view.setInt32(
      /*offset=*/
      4,
      rhs_hi,
      /*littleEndian=*/
      true
    );
    const rhs = this.view.getBigUint64(
      /*offset=*/
      0,
      /*littleEndian=*/
      true
    );
    const rem = lhs % rhs;
    const val = Number(
      rem >> BigInt(32 * ipiece) & (BigInt(1) << BigInt(32)) - BigInt(1)
    );
    return Number(val);
  }
};

// src/_generated/rts.time.mjs
var TimeCBits = class {
  constructor(memory, targetSpecificModule) {
    this.memory = memory;
    this.resolution = targetSpecificModule.Time.resolution;
    this.getCPUTime = targetSpecificModule.Time.getCPUTime;
    this.getUnixEpochTime = targetSpecificModule.Time.getUnixEpochTime;
    Object.freeze(this);
  }
  /**
   * Returns a (monotonic) nanoseconds timestamp.
   */
  getMonotonicNSec() {
    const time = this.getCPUTime();
    return time[0] * 1e9 + time[1];
  }
  /**
   * Stores at a memory address the resolution of a given clock.
   * @param clk_id the type of requested clock
   *   ({@link rtsConstants.clock_monotonic} or {@link rtsConstants.clock_realtime})
   * @param addr the memory address 
   */
  clock_getres(clk_id, addr) {
    if (addr) {
      let sec = 0, nsec = this.resolution;
      if (nsec > 1e9) {
        sec = Math.floor(this.resolution / 1e9);
        nsec = 0;
      }
      this.memory.i64Store(addr + offset_timespec_tv_sec, sec);
      this.memory.i64Store(addr + offset_timespec_tv_nsec, nsec);
    }
    return 0;
  }
  /**
   * Stores at a memory address the time of a given clock.
   * @param clk_id the type of requested clock
   *   ({@link rtsConstants.clock_monotonic} or {@link rtsConstants.clock_realtime})
   * @param addr the memory address 
   */
  clock_gettime(clk_id, addr) {
    if (addr) {
      const time = clk_id == clock_monotonic ? this.getCPUTime() : this.getUnixEpochTime();
      this.memory.i64Store(addr + offset_timespec_tv_sec, time[0]);
      this.memory.i64Store(addr + offset_timespec_tv_nsec, time[1]);
    }
    return 0;
  }
};

// src/_generated/rts.closuretypes.mjs
var CONSTR = 1;
var CONSTR_1_0 = 2;
var CONSTR_0_1 = 3;
var CONSTR_2_0 = 4;
var CONSTR_1_1 = 5;
var CONSTR_0_2 = 6;
var CONSTR_NOCAF = 7;
var FUN = 8;
var FUN_1_0 = 9;
var FUN_0_1 = 10;
var FUN_2_0 = 11;
var FUN_1_1 = 12;
var FUN_0_2 = 13;
var FUN_STATIC = 14;
var THUNK = 15;
var THUNK_1_0 = 16;
var THUNK_0_1 = 17;
var THUNK_2_0 = 18;
var THUNK_1_1 = 19;
var THUNK_0_2 = 20;
var THUNK_STATIC = 21;
var THUNK_SELECTOR = 22;
var AP = 24;
var PAP = 25;
var AP_STACK = 26;
var IND = 27;
var IND_STATIC = 28;
var RET_SMALL = 30;
var RET_BIG = 31;
var RET_FUN = 32;
var UPDATE_FRAME = 33;
var CATCH_FRAME = 34;
var UNDERFLOW_FRAME = 35;
var STOP_FRAME = 36;
var BLACKHOLE = 38;
var MVAR_CLEAN = 39;
var MVAR_DIRTY = 40;
var ARR_WORDS = 42;
var MUT_ARR_PTRS_CLEAN = 43;
var MUT_ARR_PTRS_DIRTY = 44;
var MUT_ARR_PTRS_FROZEN_DIRTY = 45;
var MUT_ARR_PTRS_FROZEN_CLEAN = 46;
var MUT_VAR_CLEAN = 47;
var MUT_VAR_DIRTY = 48;
var WEAK = 49;
var PRIM = 50;
var MUT_PRIM = 51;
var TSO = 52;
var STACK = 53;
var ATOMICALLY_FRAME = 55;
var CATCH_RETRY_FRAME = 56;
var CATCH_STM_FRAME = 57;
var SMALL_MUT_ARR_PTRS_CLEAN = 59;
var SMALL_MUT_ARR_PTRS_DIRTY = 60;
var SMALL_MUT_ARR_PTRS_FROZEN_DIRTY = 61;
var SMALL_MUT_ARR_PTRS_FROZEN_CLEAN = 62;
var COMPACT_NFDATA = 63;

// src/_generated/rts.funtypes.mjs
var ARG_GEN = 0;
var ARG_GEN_BIG = 1;
var ARG_BCO = 2;

// src/_generated/rts.autoapply.mjs
var stg_arg_bitmaps = [
  0,
  0,
  0,
  0,
  65,
  1,
  65,
  65,
  65,
  194,
  964,
  16328,
  194,
  66,
  130,
  2,
  451,
  195,
  323,
  67,
  387,
  131,
  259,
  3,
  4,
  5,
  6,
  7,
  8
];

// src/_generated/rts.gc.mjs
function bdescr(c) {
  const nc = Number(c);
  return nc - (nc & mblock_size - 1) + offset_first_bdescr;
}
var GC = class {
  constructor(components, memory, heapalloc, stableptr_manager, stablename_manager, scheduler, info_tables, symbol_table, reentrancy_guard, yolo, gcThreshold) {
    this.components = components;
    this.memory = memory;
    this.heapAlloc = heapalloc;
    this.stablePtrManager = stableptr_manager;
    this.stableNameManager = stablename_manager;
    this.scheduler = scheduler;
    this.infoTables = info_tables;
    this.symbolTable = symbol_table;
    this.reentrancyGuard = reentrancy_guard;
    this.yolo = yolo;
    this.gcThreshold = gcThreshold;
    this.nonMovedObjects = /* @__PURE__ */ new Set();
    this.nonMovedObjectsToScavenge = [];
    this.liveMBlocks = /* @__PURE__ */ new Set();
    this.blocksToScavenge = [];
    this.deadMBlocks = /* @__PURE__ */ new Set();
    this.liveJSValManager = new JSValManager(components);
    Object.seal(this);
  }
  /**
   * Checks whether the provided memory address resides
   * in a pinned MBlock. Used by {@link GC#evacuateClosure}
   * to avoid evacuating pinned objects.
   * @param addr The memory address to check
   */
  isPinned(addr) {
    const bd = bdescr(addr), flags = this.memory.i16Load(bd + offset_bdescr_flags);
    return Boolean(flags & BF_PINNED);
  }
  /**
   * Heap allocates a physical copy of the given closure.
   * Used during evacuation by {@link GC#evacuateClosure}.
   * @param c The source address of the closure
   * @param bytes The size in bytes of the closure
   */
  copyClosure(c, bytes) {
    const dest_c = this.heapAlloc.allocate(Math.ceil(bytes / 8));
    this.memory.memcpy(dest_c, c, bytes);
    const dest_block = bdescr(dest_c);
    if (!this.liveMBlocks.has(dest_block)) {
      this.blocksToScavenge.push(dest_block);
      this.liveMBlocks.add(dest_block);
    }
    this.deadMBlocks.add(bdescr(c));
    return dest_c;
  }
  /**
   * Performs _stingy_ evaluation, i.e. a very frugual form
   * of evaluation that is carried during garbage collection.
   * It implements the following two optimizations:
   * - Indirections short-cutting;
   * - Selector optimization: remove thunks of applications of field
   *   selectors.
   * Only the argument `c` is required: the other arguments will be
   * computed in case they are `undefined`.
   * @param {number} c - The address of the closure
   * @param {number=} untagged_c - The unDynTag-ed address
   * @param {number=} info - The info pointer of `c`
   * @param {number=} type - The closure type of `c`
   * @returns A tuple array `[res_c, res_type]` containing
   *   the resulting address and type of the closure after
   *   the optimisation.
   */
  stingyEval(c, untagged_c, info, type2) {
    if (!untagged_c) {
      untagged_c = Memory.unDynTag(c);
      info = Number(this.memory.i64Load(untagged_c));
      if (info % 2 == 0) {
        type2 = this.memory.i32Load(
          info + offset_StgInfoTable_type
        );
      }
    }
    switch (type2) {
      case IND: {
        this.memory.i64Store(
          untagged_c,
          this.symbolTable.addressOf("stg_WHITEHOLE_info")
        );
        const [res_c, _] = this.stingyEval(
          Number(
            this.memory.i64Load(
              untagged_c + offset_StgInd_indirectee
            )
          )
        );
        this.memory.i64Store(untagged_c, this.symbolTable.addressOf("stg_IND_info"));
        this.memory.i64Store(untagged_c + offset_StgInd_indirectee, res_c);
        return [res_c, IND];
      }
      case THUNK_SELECTOR: {
        this.memory.i64Store(
          untagged_c,
          this.symbolTable.addressOf("stg_WHITEHOLE_info")
        );
        const [res_c, res_type] = this.stingyEval(
          Number(
            this.memory.i64Load(
              untagged_c + offset_StgSelector_selectee
            )
          )
        );
        switch (res_type) {
          case CONSTR:
          case CONSTR_2_0:
          case CONSTR_NOCAF: {
            const offset = this.memory.i32Load(
              info + offset_StgInfoTable_layout
            );
            const selectee = this.memory.i64Load(
              Memory.unDynTag(res_c) + (1 + offset << 3)
            );
            this.memory.i64Store(untagged_c + offset_StgInd_indirectee, selectee);
            return this.stingyEval(c, untagged_c, info, IND);
          }
          case CONSTR_1_0:
          case CONSTR_1_1: {
            const selectee = this.memory.i64Load(Memory.unDynTag(res_c) + 8);
            this.memory.i64Store(
              untagged_c + offset_StgInd_indirectee,
              selectee
            );
            return this.stingyEval(c, untagged_c, info, IND);
          }
          default: {
            this.memory.i64Store(untagged_c, info);
            this.memory.i64Store(
              untagged_c + offset_StgSelector_selectee,
              res_c
            );
            return [c, type2];
          }
        }
      }
      default: {
        return [c, type2];
      }
    }
  }
  /**
   * Evacuates a closure. This consists of:
   * (1) Copying the closure into to-space through {@link GC#copyClosure}
   * (2) Map the old unDynTag-ed address of the closure
   *     to its new unDynTag-ed address in {@link GC#closureIndirects}.
   * If that closure had already been evacuated, simply
   * return the forwarding pointer already present in {@link GC#closureIndirects}.
   * @param c The memory address of the closure to evacuate.
   */
  evacuateClosure(c) {
    const tag = Memory.getDynTag(c), untagged_c = Memory.unDynTag(c);
    const info = Number(this.memory.i64Load(untagged_c));
    if (info % 2) {
      return Memory.setDynTag(info, tag);
    } else if (this.nonMovedObjects.has(untagged_c)) {
      return c;
    } else if (!this.memory.heapAlloced(untagged_c)) {
      this.nonMovedObjects.add(untagged_c);
      this.nonMovedObjectsToScavenge.push(untagged_c);
      return c;
    } else if (this.isPinned(untagged_c)) {
      this.nonMovedObjects.add(untagged_c);
      this.nonMovedObjectsToScavenge.push(untagged_c);
      this.liveMBlocks.add(bdescr(untagged_c));
      return c;
    }
    if (this.infoTables && !this.infoTables.has(info))
      throw new WebAssembly.RuntimeError(
        `Invalid info table 0x${info.toString(16)}`
      );
    let dest_c = void 0;
    let type2 = this.memory.i32Load(
      info + offset_StgInfoTable_type
    );
    if (type2 == THUNK_SELECTOR || type2 == IND) {
      type2 = this.stingyEval(Number(c), untagged_c, info, type2)[1];
    }
    switch (type2) {
      case CONSTR_0_1:
      case FUN_0_1:
      case FUN_1_0:
      case CONSTR_1_0: {
        dest_c = this.copyClosure(untagged_c, 16);
        break;
      }
      case THUNK_1_0:
      case THUNK_0_1: {
        dest_c = this.copyClosure(untagged_c, sizeof_StgThunk + 8);
        break;
      }
      case THUNK_1_1:
      case THUNK_2_0:
      case THUNK_0_2: {
        dest_c = this.copyClosure(
          untagged_c,
          sizeof_StgThunk + 16
        );
        break;
      }
      case FUN_1_1:
      case FUN_2_0:
      case FUN_0_2:
      case CONSTR_1_1:
      case CONSTR_2_0:
      case CONSTR_0_2: {
        dest_c = this.copyClosure(untagged_c, 24);
        break;
      }
      case THUNK: {
        const ptrs = this.memory.i32Load(
          info + offset_StgInfoTable_layout
        ), non_ptrs = this.memory.i32Load(
          info + offset_StgInfoTable_layout + 4
        );
        dest_c = this.copyClosure(
          untagged_c,
          sizeof_StgThunk + (ptrs + non_ptrs << 3)
        );
        break;
      }
      case FUN:
      case CONSTR:
      case CONSTR_NOCAF:
      case MVAR_CLEAN:
      case MVAR_DIRTY:
      case MUT_VAR_CLEAN:
      case MUT_VAR_DIRTY:
      case WEAK:
      case PRIM:
      case MUT_PRIM:
      case BLACKHOLE: {
        const ptrs = this.memory.i32Load(
          info + offset_StgInfoTable_layout
        ), non_ptrs = this.memory.i32Load(
          info + offset_StgInfoTable_layout + 4
        );
        dest_c = this.copyClosure(untagged_c, 1 + ptrs + non_ptrs << 3);
        if (info === this.symbolTable.addressOf("stg_JSVAL_info")) {
          this.liveJSValManager.closure2Val.set(
            dest_c,
            this.components.jsvalManager.getJSValzh(untagged_c)
          );
        }
        break;
      }
      case THUNK_SELECTOR: {
        dest_c = this.copyClosure(untagged_c, sizeof_StgSelector);
        break;
      }
      case IND: {
        dest_c = this.evacuateClosure(
          this.memory.i64Load(
            untagged_c + offset_StgInd_indirectee
          )
        );
        this.memory.i64Store(untagged_c, Memory.setDynTag(dest_c, 1));
        return dest_c;
      }
      case PAP: {
        const n_args = this.memory.i32Load(
          untagged_c + offset_StgPAP_n_args
        );
        dest_c = this.copyClosure(
          untagged_c,
          sizeof_StgPAP + (n_args << 3)
        );
        break;
      }
      case AP: {
        const n_args = this.memory.i32Load(
          untagged_c + offset_StgAP_n_args
        );
        dest_c = this.copyClosure(
          untagged_c,
          sizeof_StgAP + (n_args << 3)
        );
        break;
      }
      case AP_STACK: {
        const size = Number(
          this.memory.i64Load(untagged_c + offset_StgAP_STACK_size)
        );
        dest_c = this.copyClosure(
          untagged_c,
          sizeof_StgAP_STACK + (size << 3)
        );
        break;
      }
      case ARR_WORDS: {
        dest_c = this.copyClosure(
          untagged_c,
          Math.ceil(
            (sizeof_StgArrBytes + Number(
              this.memory.i64Load(
                untagged_c + offset_StgArrBytes_bytes
              )
            )) / 8
          ) * 8
        );
        break;
      }
      case MUT_ARR_PTRS_CLEAN:
      case MUT_ARR_PTRS_DIRTY:
      case MUT_ARR_PTRS_FROZEN_DIRTY:
      case MUT_ARR_PTRS_FROZEN_CLEAN: {
        dest_c = this.copyClosure(
          untagged_c,
          sizeof_StgMutArrPtrs + (Number(
            this.memory.i64Load(
              untagged_c + offset_StgMutArrPtrs_ptrs
            )
          ) << 3)
        );
        break;
      }
      case SMALL_MUT_ARR_PTRS_CLEAN:
      case SMALL_MUT_ARR_PTRS_DIRTY:
      case SMALL_MUT_ARR_PTRS_FROZEN_DIRTY:
      case SMALL_MUT_ARR_PTRS_FROZEN_CLEAN: {
        dest_c = this.copyClosure(
          untagged_c,
          sizeof_StgSmallMutArrPtrs + (Number(
            this.memory.i64Load(
              untagged_c + offset_StgSmallMutArrPtrs_ptrs
            )
          ) << 3)
        );
        break;
      }
      default:
        throw new WebAssembly.RuntimeError();
    }
    this.memory.i64Store(untagged_c, dest_c + 1);
    return Memory.setDynTag(dest_c, tag);
  }
  scavengeClosureAt(p) {
    this.memory.i64Store(p, this.evacuateClosure(this.memory.i64Load(p)));
  }
  scavengePointersFirst(payload, ptrs) {
    for (let i = 0; i < ptrs; ++i)
      this.scavengeClosureAt(payload + (i << 3));
  }
  scavengeSmallBitmap(payload, bitmap, size) {
    for (let i = 0; i < size; ++i)
      if (!(Number(bitmap >> BigInt(i)) & 1))
        this.scavengeClosureAt(payload + (i << 3));
  }
  scavengeLargeBitmap(payload, large_bitmap, size) {
    for (let j = 0; j < size; j += 64) {
      const bitmap = this.memory.i64Load(
        large_bitmap + offset_StgLargeBitmap_bitmap + (j >> 3)
      );
      for (let i = j; i - j < 64 && i < size; ++i)
        if (!(Number(bitmap >> BigInt(i - j)) & 1))
          this.scavengeClosureAt(payload + (i << 3));
    }
  }
  scavengePAP(c, offset_fun, payload, n_args) {
    this.scavengeClosureAt(c + offset_fun);
    const fun = this.memory.i64Load(c + offset_fun), fun_info = Number(this.memory.i64Load(Memory.unDynTag(fun)));
    if (this.infoTables && !this.infoTables.has(fun_info))
      throw new WebAssembly.RuntimeError(
        `Invalid info table 0x${fun_info.toString(16)}`
      );
    switch (this.memory.i32Load(
      fun_info + offset_StgFunInfoTable_f + offset_StgFunInfoExtraFwd_fun_type
    )) {
      case ARG_GEN: {
        this.scavengeSmallBitmap(
          payload,
          this.memory.i64Load(
            fun_info + offset_StgFunInfoTable_f + offset_StgFunInfoExtraFwd_b
          ) >> BigInt(6),
          n_args
        );
        break;
      }
      case ARG_GEN_BIG: {
        this.scavengeLargeBitmap(
          payload,
          Number(
            this.memory.i64Load(
              fun_info + offset_StgFunInfoTable_f + offset_StgFunInfoExtraFwd_b
            )
          ),
          n_args
        );
        break;
      }
      case ARG_BCO: {
        throw new WebAssembly.RuntimeError();
      }
      default: {
        this.scavengeSmallBitmap(
          payload,
          BigInt(
            stg_arg_bitmaps[this.memory.i32Load(
              fun_info + offset_StgFunInfoTable_f + offset_StgFunInfoExtraFwd_fun_type
            )]
          ) >> BigInt(6),
          n_args
        );
        break;
      }
    }
  }
  scavengeStackChunk(sp, sp_lim) {
    let c = sp;
    while (true) {
      if (c > sp_lim)
        throw new WebAssembly.RuntimeError();
      if (c == sp_lim)
        break;
      const info = Number(this.memory.i64Load(c)), type2 = this.memory.i32Load(
        info + offset_StgInfoTable_type
      ), raw_layout = this.memory.i64Load(
        info + offset_StgInfoTable_layout
      );
      if (this.infoTables && !this.infoTables.has(info))
        throw new WebAssembly.RuntimeError(
          `Invalid info table 0x${info.toString(16)}`
        );
      if (this.memory.i32Load(info + offset_StgInfoTable_srt))
        this.evacuateClosure(
          this.memory.i64Load(info + offset_StgRetInfoTable_srt)
        );
      switch (type2) {
        case RET_SMALL:
        case UPDATE_FRAME:
        case CATCH_FRAME:
        case UNDERFLOW_FRAME:
        case STOP_FRAME:
        case ATOMICALLY_FRAME:
        case CATCH_RETRY_FRAME:
        case CATCH_STM_FRAME: {
          const size = Number(raw_layout) & 63, bitmap = raw_layout >> BigInt(6);
          this.scavengeSmallBitmap(c + 8, bitmap, size);
          c += 1 + size << 3;
          break;
        }
        case RET_BIG: {
          const size = Number(
            this.memory.i64Load(
              Number(raw_layout) + offset_StgLargeBitmap_size
            )
          );
          this.scavengeLargeBitmap(c + 8, Number(raw_layout), size);
          c += 1 + size << 3;
          break;
        }
        case RET_FUN: {
          const retfun = c;
          const size = Number(
            this.memory.i64Load(retfun + offset_StgRetFun_size)
          );
          this.scavengeClosureAt(retfun + offset_StgRetFun_fun);
          let fun = Number(
            this.memory.i64Load(retfun + offset_StgRetFun_fun)
          );
          const fun_info_p = fun + 0;
          const fun_info = Number(
            this.memory.i64Load(Memory.unDynTag(fun_info_p))
          );
          const fun_type = this.memory.i32Load(
            fun_info + offset_StgFunInfoTable_f + offset_StgFunInfoExtraFwd_fun_type
          );
          const ret_fun_payload = retfun + offset_StgRetFun_payload;
          switch (fun_type) {
            case ARG_GEN: {
              this.scavengeSmallBitmap(
                c + offset_StgRetFun_payload,
                this.memory.i64Load(
                  fun_info + offset_StgFunInfoTable_f + offset_StgFunInfoExtraFwd_b
                ) >> BigInt(6),
                size
              );
              break;
            }
            case ARG_GEN_BIG: {
              this.scavengeLargeBitmap(
                c + offset_StgRetFun_payload,
                Number(
                  this.memory.i64Load(
                    fun_info + offset_StgFunInfoTable_f + offset_StgFunInfoExtraFwd_b
                  )
                ),
                size
              );
              break;
            }
            case ARG_BCO: {
              throw new WebAssembly.RuntimeError();
            }
            default: {
              const BITMAP_SIZE_MASK = 63;
              const BITMAP_BITS_SHIFT = 6;
              const bitmap = stg_arg_bitmaps[fun_type];
              const bitmap_bits = BigInt(bitmap) >> BigInt(BITMAP_BITS_SHIFT);
              const bitmap_size = bitmap & BITMAP_SIZE_MASK;
              this.scavengeSmallBitmap(
                ret_fun_payload,
                bitmap_bits,
                bitmap_size
              );
              break;
            }
          }
          c += sizeof_StgRetFun + (size << 3);
          break;
        }
        default:
          throw new WebAssembly.RuntimeError();
      }
    }
  }
  /**
   * Loops over all reachable objects and scavenges them.
   */
  scavengeLoop() {
    const closures = this.nonMovedObjectsToScavenge, blocks = this.blocksToScavenge;
    let currentBlock = void 0, currentObject = void 0;
    while (true) {
      if (!currentBlock) {
        currentBlock = blocks.pop();
        if (currentBlock)
          currentObject = Number(
            this.memory.i64Load(
              currentBlock + offset_bdescr_start
            )
          );
      }
      while (currentBlock) {
        const currentLimit = Number(
          this.memory.i64Load(
            currentBlock + offset_bdescr_free
          )
        );
        if (currentObject >= currentLimit)
          break;
        currentObject += this.scavengeClosure(currentObject);
      }
      if (blocks.length > 0) {
        currentBlock = currentObject = void 0;
        continue;
      } else if (closures.length == 0)
        return;
      while (closures.length > 0) {
        this.scavengeClosure(closures.pop());
      }
    }
  }
  /**
   * Scavenges a single object in to-space by evacuating
   * each pointer in the object, and replacing the pointer
   * with the address obtained after evacuation.
   * @param c The address of the closure to scavenge
   * @returns The size (in bytes) of the closure c
   */
  scavengeClosure(c) {
    const info = Number(this.memory.i64Load(c)), type2 = this.memory.i32Load(info + offset_StgInfoTable_type);
    if (this.infoTables && !this.infoTables.has(info))
      throw new WebAssembly.RuntimeError(
        `Invalid info table 0x${info.toString(16)}`
      );
    switch (type2) {
      case CONSTR_1_0: {
        this.scavengePointersFirst(c + 8, 1);
        return 16;
      }
      case CONSTR_0_1: {
        return 16;
      }
      case CONSTR_1_1: {
        this.scavengePointersFirst(c + 8, 1);
        return 24;
      }
      case CONSTR_2_0: {
        this.scavengePointersFirst(c + 8, 2);
        return 24;
      }
      case CONSTR_0_2: {
        return 24;
      }
      case FUN:
      case FUN_1_0:
      case FUN_0_1:
      case FUN_2_0:
      case FUN_1_1:
      case FUN_0_2:
      case FUN_STATIC: {
        if (this.memory.i32Load(info + offset_StgInfoTable_srt))
          this.evacuateClosure(
            this.memory.i64Load(
              info + offset_StgFunInfoTable_f + offset_StgFunInfoExtraFwd_srt
            )
          );
        const ptrs = this.memory.i32Load(
          info + offset_StgInfoTable_layout
        ), non_ptrs = this.memory.i32Load(
          info + offset_StgInfoTable_layout + 4
        );
        this.scavengePointersFirst(c + 8, ptrs);
        return 1 + ptrs + non_ptrs << 3;
      }
      case CONSTR:
      case CONSTR_NOCAF:
      case BLACKHOLE:
      case MUT_VAR_CLEAN:
      case MUT_VAR_DIRTY:
      case PRIM:
      case MUT_PRIM:
      case COMPACT_NFDATA: {
        const ptrs = this.memory.i32Load(
          info + offset_StgInfoTable_layout
        ), non_ptrs = this.memory.i32Load(
          info + offset_StgInfoTable_layout + 4
        );
        this.scavengePointersFirst(c + 8, ptrs);
        return 1 + ptrs + non_ptrs << 3;
      }
      case THUNK_STATIC:
      case THUNK:
      case THUNK_1_0:
      case THUNK_0_1:
      case THUNK_2_0:
      case THUNK_1_1:
      case THUNK_0_2: {
        if (this.memory.i32Load(info + offset_StgInfoTable_srt))
          this.evacuateClosure(
            this.memory.i64Load(
              info + offset_StgThunkInfoTable_srt
            )
          );
        const ptrs = this.memory.i32Load(
          info + offset_StgInfoTable_layout
        ), non_ptrs = this.memory.i32Load(
          info + offset_StgInfoTable_layout + 4
        );
        this.scavengePointersFirst(
          c + offset_StgThunk_payload,
          ptrs
        );
        return sizeof_StgThunk + (ptrs + non_ptrs << 3);
      }
      case THUNK_SELECTOR: {
        if (this.memory.i32Load(info + offset_StgInfoTable_srt))
          this.evacuateClosure(
            this.memory.i64Load(
              info + offset_StgThunkInfoTable_srt
            )
          );
        this.scavengeClosureAt(c + offset_StgSelector_selectee);
        return sizeof_StgSelector;
      }
      case AP: {
        const n_args = this.memory.i32Load(
          c + offset_StgAP_n_args
        );
        this.scavengePAP(
          c,
          offset_StgAP_fun,
          c + offset_StgAP_payload,
          n_args
        );
        return sizeof_StgAP + (n_args << 3);
      }
      case PAP: {
        const n_args = this.memory.i32Load(
          c + offset_StgPAP_n_args
        );
        this.scavengePAP(
          c,
          offset_StgPAP_fun,
          c + offset_StgPAP_payload,
          n_args
        );
        return sizeof_StgPAP + (n_args << 3);
      }
      case AP_STACK: {
        const size = Number(
          this.memory.i64Load(
            c + offset_StgAP_STACK_size
          )
        );
        this.scavengeClosureAt(c + offset_StgAP_STACK_fun);
        this.scavengeStackChunk(
          c + offset_StgAP_STACK_payload,
          c + offset_StgAP_STACK_payload + size
        );
        return sizeof_StgAP_STACK + (size << 3);
      }
      case IND_STATIC: {
        this.scavengeClosureAt(c + offset_StgIndStatic_indirectee);
        return;
      }
      case MVAR_CLEAN:
      case MVAR_DIRTY: {
        this.scavengeClosureAt(c + offset_StgMVar_head);
        this.scavengeClosureAt(c + offset_StgMVar_tail);
        this.scavengeClosureAt(c + offset_StgMVar_value);
        return offset_StgMVar_value + 8;
      }
      case ARR_WORDS: {
        return Math.ceil(
          (sizeof_StgArrBytes + Number(
            this.memory.i64Load(c + offset_StgArrBytes_bytes)
          )) / 8
        ) * 8;
      }
      case MUT_ARR_PTRS_CLEAN:
      case MUT_ARR_PTRS_DIRTY:
      case MUT_ARR_PTRS_FROZEN_DIRTY:
      case MUT_ARR_PTRS_FROZEN_CLEAN: {
        const ptrs = Number(
          this.memory.i64Load(c + offset_StgMutArrPtrs_ptrs)
        );
        this.scavengePointersFirst(
          c + offset_StgMutArrPtrs_payload,
          ptrs
        );
        return sizeof_StgMutArrPtrs + (ptrs << 3);
      }
      case WEAK: {
        this.scavengeClosureAt(c + offset_StgWeak_cfinalizers);
        this.scavengeClosureAt(c + offset_StgWeak_key);
        this.scavengeClosureAt(c + offset_StgWeak_value);
        this.scavengeClosureAt(c + offset_StgWeak_finalizer);
        return offset_StgWeak_link + 8;
      }
      case TSO: {
        this.scavengeClosureAt(c + offset_StgTSO_stackobj);
        return;
      }
      case STACK: {
        const stack_size = this.memory.i32Load(c + offset_StgStack_stack_size) << 3, sp = Number(this.memory.i64Load(c + offset_StgStack_sp)), sp_lim = c + offset_StgStack_stack + stack_size;
        this.scavengeStackChunk(sp, sp_lim);
        return offset_StgStack_stack + stack_size;
      }
      case SMALL_MUT_ARR_PTRS_CLEAN:
      case SMALL_MUT_ARR_PTRS_DIRTY:
      case SMALL_MUT_ARR_PTRS_FROZEN_DIRTY:
      case SMALL_MUT_ARR_PTRS_FROZEN_CLEAN: {
        const ptrs = Number(
          this.memory.i64Load(c + offset_StgSmallMutArrPtrs_ptrs)
        );
        this.scavengePointersFirst(
          c + offset_StgSmallMutArrPtrs_payload,
          ptrs
        );
        return offset_StgSmallMutArrPtrs_payload + (ptrs << 3);
      }
      default:
        throw new WebAssembly.RuntimeError();
    }
  }
  /**
   * Allocates a new nursery and stores its address in the appropriate
   * field of the StgRegTable of the main capability.
   */
  updateNursery() {
    const base_reg = this.symbolTable.addressOf("MainCapability") + offset_Capability_r, hp_alloc = Number(
      this.memory.i64Load(base_reg + offset_StgRegTable_rHpAlloc)
    );
    this.memory.i64Store(
      base_reg + offset_StgRegTable_rHpAlloc,
      0
    );
    this.memory.i64Store(
      base_reg + offset_StgRegTable_rCurrentNursery,
      this.heapAlloc.hpAlloc(hp_alloc)
    );
  }
  /**
   * Performs garbage collection, using scheduler Thread State Objects (TSOs) as roots.
   */
  performGC() {
    if (this.yolo || this.heapAlloc.liveSize() < this.gcThreshold) {
      this.updateNursery();
      return;
    }
    this.reentrancyGuard.enter(1);
    this.heapAlloc.setGenerationNo(1);
    for (const [_, tso_info] of this.scheduler.tsos) {
      tso_info.addr = this.evacuateClosure(tso_info.addr);
    }
    for (const [sp, c] of this.stablePtrManager.spt.entries()) {
      this.stablePtrManager.spt.set(sp, this.evacuateClosure(c));
    }
    let ptr2stableMoved = /* @__PURE__ */ new Map();
    for (const [ptr, stable] of this.stableNameManager.ptr2stable.entries()) {
      const ptrMoved = this.evacuateClosure(ptr);
      const stableMoved = this.evacuateClosure(stable);
      ptr2stableMoved.set(ptrMoved, stableMoved);
    }
    this.stableNameManager.ptr2stable = ptr2stableMoved;
    this.scavengeLoop();
    for (const [_, tso_info] of this.scheduler.tsos) {
      if (tso_info.ret) {
        const tso = tso_info.addr;
        const stackobj = Number(
          this.memory.i64Load(tso + offset_StgTSO_stackobj)
        );
        const sp = Number(
          this.memory.i64Load(stackobj + offset_StgStack_sp)
        );
        tso_info.ret = Number(this.memory.i64Load(sp + 8));
      }
    }
    this.heapAlloc.handleLiveness(this.liveMBlocks, this.deadMBlocks);
    this.heapAlloc.setGenerationNo(0);
    this.updateNursery();
    this.components.jsvalManager = this.liveJSValManager;
    this.nonMovedObjects.clear();
    this.liveMBlocks.clear();
    this.deadMBlocks.clear();
    this.liveJSValManager = new JSValManager(this.components);
    this.reentrancyGuard.exit(1);
  }
};

// src/_generated/rts.exception.mjs
var ExceptionHelper = class {
  constructor(memory, heapalloc, exports, info_tables, symbol_table) {
    this.memory = memory;
    this.heapAlloc = heapalloc;
    this.exports = exports;
    this.infoTables = info_tables;
    this.symbolTable = symbol_table;
    this.decoder = new TextDecoder("utf-8", { fatal: true });
    this.errorBuffer = "";
    Object.seal(this);
  }
  /*
      This implements a subset of `raiseExceptionHelper` in `rts/Schedule.c` of
      ghc rts. The function is called by `stg_raisezh` in `Exception.cmm` in rts.
  
      When a Haskell exception is raised, `stg_raisezh` is entered, and it calls
      `raiseExceptionHelper` to traverse the stack from the top. For each update
      frame, the thunk is updated with the "exception closure" (which throws when
      entered). It exits when a catch frame or stop frame is encountered.
  
      The stack pointer is rewritten to the head of last encountered frame, and
      the frame type is returned to `stg_raisezh` for further processing.
    */
  raiseExceptionHelper(reg, tso, exception2) {
    const raise_closure = this.heapAlloc.allocate(
      Math.ceil(sizeof_StgThunk / 8) + 1
    );
    this.memory.i64Store(
      raise_closure,
      this.symbolTable.addressOf("stg_raise_info")
    );
    this.memory.i64Store(
      raise_closure + offset_StgThunk_payload,
      exception2
    );
    const stackobj = Number(
      this.memory.i64Load(tso + offset_StgTSO_stackobj)
    );
    let p = Number(
      this.memory.i64Load(stackobj + offset_StgStack_sp)
    );
    while (true) {
      const info = Number(this.memory.i64Load(p)), type2 = this.memory.i32Load(
        info + offset_StgInfoTable_type
      ), raw_layout = this.memory.i64Load(
        info + offset_StgInfoTable_layout
      );
      if (this.infoTables && !this.infoTables.has(info))
        throw new WebAssembly.RuntimeError(
          `Invalid info table 0x${info.toString(16)}`
        );
      switch (type2) {
        case UPDATE_FRAME: {
          const p1 = Number(
            this.memory.i64Load(p + offset_StgUpdateFrame_updatee)
          );
          this.exports.updateThunk(
            this.symbolTable.addressOf("MainCapability"),
            tso,
            p1,
            raise_closure
          );
          const size = Number(raw_layout & BigInt(63));
          p += 1 + size << 3;
          break;
        }
        case CATCH_FRAME:
        case STOP_FRAME: {
          this.memory.i64Store(stackobj + offset_StgStack_sp, p);
          return type2;
        }
        case RET_SMALL: {
          const size = Number(raw_layout & BigInt(63));
          p += 1 + size << 3;
          break;
        }
        case RET_BIG: {
          const size = Number(
            this.memory.i64Load(
              Number(raw_layout) + offset_StgLargeBitmap_size
            )
          );
          p += 1 + size << 3;
          break;
        }
        case RET_FUN: {
          const size = Number(
            this.memory.i64Load(p + offset_StgRetFun_size)
          );
          p += sizeof_StgRetFun + (size << 3);
          break;
        }
        default:
          throw new WebAssembly.RuntimeError(
            `raiseExceptionHelper: unsupported stack frame ${type2} at 0x${p.toString(
              16
            )}`
          );
      }
    }
  }
  /*
      This implements `barf` in `rts/RtsMessages.c` of ghc rts. The function is
      used to signal a fatal runtime error.
  
      The original `barf` is a varargs C function which takes a format string.
      Unfortunately, we don't implement handling for varargs yet, so we restrict
      our `barf` to take exactly 1 argument: a pointer to a NUL-terminated string
      which is the error message itself.
  
      There exists special `barf`-related logic in various parts of the asterius
      compiler:
  
      * In the rts builtins (`Asterius.Builtins`) module, we import `barf` as
        `__asterius_barf`, and make a `barf` function wrapper which handles the
        i64/f64 conversion workaround.
  
      * The rts cmm files call `barf` with either 0, 1, 2 arguments. In the
        backend we remove extra arguments, and if there isn't any, we use a
        `NULL` pointer as argument, which is interpreted as empty error message in
        our implementation.
     */
  barf(s) {
    if (s) {
      const v0 = this.memory.i8View.subarray(s), len = v0.indexOf(0), v1 = v0.subarray(0, len), r = this.decoder.decode(v1);
      throw new WebAssembly.RuntimeError(`barf: ${r}`);
    } else {
      throw new WebAssembly.RuntimeError("barf");
    }
  }
  /*
      The following two functions implement a variant of `barf` that is used by
      Asterius to report missing symbols. Instead of finding the error message to
      print in a data segment (like `barf` does), this approach accumulates it
      (character by character) into an internal buffer using `barf_push`. Then, a
      call to `barf_signal` reads this buffer and throws the error.
  
      The related logic can be found in two places in the Asterius compiler:
  
      * In the rts builtins (`Asterius.Builtins`) module, we import `barf_push`
        (and `barf_signal`) as `__asterius_barf_push` (and
        `__asterius_barf_signal`), and make a `barf_push` (and `barf_signal`)
        function wrapper which handles the i64/f64 conversion workaround.
  
      * In `Asterius.Internals.Barf` we implement `barf`, which converts a single
        `Barf` expression to a series of calls to `barf_push`, each taking (the
        ascii code of) a single character of the error message, followed by a
        call to `barf_signal`.
  
      In the backend (`Asterius.Backends.Binaryen*`), when we encounter an unresolved
      symbol `sym`, if @verbose_err@ is on, we insert a `barf` call there. So
      if an execution path leads to the unresolved symbol, we're likely to get
      the symbol name from the js error message.
    */
  barf_push(c) {
    this.errorBuffer += String.fromCodePoint(c);
  }
  barf_signal(f) {
    const buf = this.errorBuffer;
    this.errorBuffer = "";
    if (f) {
      throw new WebAssembly.RuntimeError(`barf_signal: ${buf}`);
    } else {
      console.error(`[DEBUG] ${buf}`);
    }
  }
};

// src/_generated/rts.messages.mjs
var Messages = class {
  constructor(memory, fs) {
    this.memory = memory;
    this.fs = fs;
    this.encoder = new TextEncoder();
    Object.freeze(this);
  }
  debugBelch2(fmt, arg) {
    const s = `${this.memory.strLoad(arg)}
`;
    this.fs.writeNonMemory(2, this.encoder.encode(s));
  }
};

// src/_generated/rts.float.mjs
var FloatCBits = class {
  constructor(memory) {
    this.memory = memory;
    this.FLT_MIN_EXP = -125;
    this.FLT_MANT_DIG = 24;
    this.DBL_MIN_EXP = -1021;
    this.DBL_MANT_DIG = 53;
    this.MY_DMINEXP = this.DBL_MIN_EXP - this.DBL_MANT_DIG - 1;
    this.DHIGHBIT = 1048576;
    this.DMSBIT = 2147483648;
    this.MY_FMINEXP = this.FLT_MIN_EXP - this.FLT_MANT_DIG - 1;
    this.FHIGHBIT = 8388608;
    this.FMSBIT = 2147483648;
    this.FLT_HIDDEN = 8388608;
    this.FLT_POWER2 = 16777216;
    this.DBL_HIDDEN = 1048576;
    this.DBL_POWER2 = 2097152;
    this.LTOP_BIT = 2147483648;
    this.buffer = new ArrayBuffer(8);
    this.view = new DataView(this.buffer);
    Object.seal(this);
  }
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
  isFloatNegativeZero(x) {
    return Object.is(-0, x);
  }
  isFloatNaN(x) {
    return x != x;
  }
  isDoubleNaN(x) {
    return x != x;
  }
  isFloatFinite(x) {
    return isFinite(x);
  }
  isDoubleFinite(x) {
    return isFinite(x);
  }
  // Remember, floats have 3 states: {finite, infinite, NaN}.
  isFloatInfinite(x) {
    return !isFinite(x) && !this.isFloatNaN(x);
  }
  isDoubleInfinite(x) {
    return !isFinite(x) && !this.isDoubleNaN(x);
  }
  // extract the mantissa from the little endian representation of the bits
  // of the float.
  // little endian: <0A 0B> stored as mem[p] = 0A, mem[p + 1] = OB
  floatMantissaFromBits(bits) {
    const mask = (1 << 23) - 1;
    return bits & mask;
  }
  // extract the exponent from the little endian representation of the bits
  // of the float.
  floatExponentFromBits(bits) {
    const mask = (1 << 8) - 1;
    const sign = this.floatSignFromBits(bits);
    return (bits ^ sign << 31) >>> 23 & mask;
  }
  floatSignFromBits(bits) {
    return bits >>> 31;
  }
  doubleMantissaFromBits(bits) {
    const mask = (BigInt(1) << BigInt(52)) - BigInt(1);
    return bits & mask;
  }
  doubleExponentFromBits(bits) {
    const mask = BigInt((1 << 11) - 1);
    const sign = this.doubleSignFromBits(bits);
    const bitsNoSign = bits ^ sign << BigInt(63);
    return bitsNoSign >> BigInt(52) & mask;
  }
  doubleSignFromBits(bits) {
    return bits >> BigInt(63);
  }
  // Check if a double is denormal.
  isDoubleDenormalized(x) {
    const bits = this.DoubleToIEEE(x);
    const exponent = this.doubleExponentFromBits(bits);
    const mantissa = this.doubleMantissaFromBits(bits);
    return exponent === BigInt(0) && mantissa !== BigInt(0);
  }
  isFloatDenormalized(x) {
    const bits = this.FloatToIEEE(x);
    const exponent = this.floatExponentFromBits(bits);
    const mantissa = this.floatMantissaFromBits(bits);
    return exponent === 0 && mantissa !== 0;
  }
  // Does it really make sense to have two functions?  probably not...
  isDoubleNegativeZero(x) {
    return Object.is(-0, x);
  }
  FloatToIEEE(f) {
    this.view.setFloat32(0, f);
    return this.view.getUint32(0);
  }
  DoubleToIEEE(d) {
    this.view.setFloat64(0, d);
    return this.view.getBigUint64(0);
  }
  // return two 32-bit integers, [low, high] from a 64 bit double;
  DoubleTo2Int(d) {
    this.view.setFloat64(0, d);
    const low = this.view.getUint32(0);
    const high = this.view.getUint32(
      /*offset=*/
      4
    );
    return [low, high];
  }
  IEEEToFloat(ieee) {
    this.view.setInt32(0, ieee);
    return this.view.getFloat32(0);
  }
  IEEEToDouble(ieee) {
    this.view.setBigInt64(0, ieee);
    return this.view.getFloat64(0);
  }
  __decodeFloat_Int(manp, expp, f) {
    let man, exp, sign;
    let high = this.FloatToIEEE(f);
    if ((high & ~this.FMSBIT) == 0) {
      man = 0;
      exp = 0;
    } else {
      exp = (high >>> 23 & 255) + this.MY_FMINEXP;
      this.view.setUint32(0, high);
      sign = this.view.getInt32(0);
      high &= this.FHIGHBIT - 1;
      if (exp != this.MY_FMINEXP)
        high |= this.FHIGHBIT;
      else {
        exp += 1;
        while (!(high & this.FHIGHBIT)) {
          high <<= 1;
          exp -= 1;
        }
      }
      man = high;
      if (sign < 0) {
        man = -man;
      }
    }
    this.memory.i64Store(manp, man);
    this.memory.i64Store(expp, exp);
  }
  // https://github.com/ghc/ghc/blob/610ec224a49e092c802a336570fd9613ea15ef3c/rts/StgPrimFloat.c
  // From StgPrimFloat.c
  // returns [man_sign, man_high,  man_low, exp]
  __decodeDouble_2IntJS(dbl) {
    let sign, iexp, man_low, man_high, man_sign;
    const ints = this.DoubleTo2Int(dbl);
    let low = ints[1];
    let high = ints[0];
    let exp = 0;
    if (low == 0 && (high & ~this.DMSBIT) == 0) {
      man_low = 0;
      man_high = 0;
      man_sign = 0;
      iexp = 0;
    } else {
      iexp = (high >>> 20 & 2047) + this.MY_DMINEXP;
      this.view.setUint32(0, high);
      sign = this.view.getInt32(0);
      high &= this.DHIGHBIT - 1;
      if (iexp != this.MY_DMINEXP)
        high |= this.DHIGHBIT;
      else {
        iexp++;
        while (!(high & this.DHIGHBIT)) {
          high <<= 1;
          if (low & this.DMSBIT)
            high++;
          low <<= 1;
          iexp--;
        }
      }
      exp = iexp;
      man_low = low;
      man_high = high;
      man_sign = sign < 0 ? -1 : 1;
    }
    return [man_sign, man_high, man_low, exp];
  }
  __decodeDouble_2Int(p_man_sign, p_man_high, p_man_low, p_exp, dbl) {
    const [man_sign, man_high, man_low, exp] = this.__decodeDouble_2IntJS(dbl);
    this.memory.dataView.setBigInt64(p_man_sign, BigInt(man_sign), true);
    this.memory.i64Store(p_man_high, man_high);
    this.memory.i64Store(p_man_low, man_low);
    this.memory.i64Store(p_exp, exp);
  }
  // From GHC/Integer/Type.hs
  decodeDoubleInteger(d) {
    const out = this.__decodeDouble_2IntJS(d);
    const man_sign = out[0];
    const man_high = out[1];
    const man_low = out[2];
    const exp = out[3];
    const acc = BigInt(man_sign) * (BigInt(man_high) * (BigInt(1) << BigInt(32)) + BigInt(man_low));
    return [acc, exp];
  }
  // from cbits/primFloat
  rintFloat(f) {
    const bits = this.FloatToIEEE(f);
    let fexp = BigInt(this.floatExponentFromBits(bits));
    let fman = BigInt(this.floatMantissaFromBits(bits));
    let fsign = BigInt(this.floatSignFromBits(bits));
    const reconstructFloat = () => {
      return this.IEEEToFloat(
        Number(fsign << BigInt(31) | fexp << BigInt(23) | fman)
      );
    };
    if (fexp > 149) {
      return f;
    }
    if (fexp < 126) {
      return 0;
    }
    const half = BigInt(1) << BigInt(149) - fexp;
    const mask = BigInt(2) * half - BigInt(1);
    let mant = fman | BigInt(this.FLT_HIDDEN);
    let frac = mant & mask;
    mant ^= frac;
    if (frac < half || frac == half && (mant & BigInt(2) * half) == 0) {
      if (mant == 0) {
        return 0;
      } else {
        fman = mant ^ BigInt(this.FLT_HIDDEN);
        return reconstructFloat();
      }
    } else {
      mant += BigInt(2) * half;
      if (mant == this.FLT_POWER2) {
        fman = BigInt(0);
        fexp += BigInt(1);
        return reconstructFloat();
      } else {
        fman = mant ^ BigInt(this.FLT_HIDDEN);
        return reconstructFloat();
      }
    }
  }
  rintDouble(d) {
    const bits = this.DoubleToIEEE(d);
    let exp = this.doubleExponentFromBits(bits);
    let manFull = this.doubleMantissaFromBits(bits);
    this.view.setBigUint64(
      0,
      manFull,
      /*little endian=*/
      true
    );
    let mant1 = BigInt(this.view.getUint32(
      0,
      /*little endian=*/
      true
    ));
    let mant0 = BigInt(this.view.getUint32(
      4,
      /*little endian=*/
      true
    ));
    let sign = this.doubleSignFromBits(bits);
    const reconstructDouble = () => {
      this.view.setInt32(0, Number(mant1), true);
      this.view.setInt32(4, Number(mant0), true);
      const mantFull = this.view.getBigUint64(0, true);
      const bits2 = sign << BigInt(63) | exp << BigInt(52) | mantFull;
      const n = Number(this.IEEEToDouble(bits2));
      return n;
    };
    if (exp > 1074) {
      return d;
    }
    if (exp < 1022) {
      return 0;
    }
    if (exp < 1043) {
      const half = BigInt(1) << BigInt(1042) - exp;
      const mask = BigInt(2) * half - BigInt(1);
      let mant = mant0 | BigInt(this.DBL_HIDDEN);
      const frac = mant & mask;
      mant ^= frac;
      if (frac < half || frac == half && mant1 == 0 && (mant & BigInt(2) * half) == 0) {
        if (mant == 0) {
          return 0;
        }
        mant0 = mant ^ BigInt(this.DBL_HIDDEN);
        mant1 = BigInt(0);
        return reconstructDouble();
      } else {
        mant1 = BigInt(0);
        mant += BigInt(2) * half;
        if (mant == this.DBL_POWER2) {
          mant0 = BigInt(0);
          exp += BigInt(1);
          return reconstructDouble();
        }
        mant0 = mant ^ BigInt(this.DBL_HIDDEN);
        return reconstructDouble();
      }
    } else {
      const half = BigInt(1) << BigInt(1074) - exp;
      const mask = BigInt(2) * half - BigInt(1);
      let mant = mant1;
      let frac = mant & mask;
      mant ^= frac;
      if (frac < half || frac == half && (half == this.LTOP_BIT ? mant0 & 1 : mant & 2 * half) == 0) {
        mant1 = mant;
        return reconstructDouble();
      } else {
        mant += BigInt(2) * half;
        mant1 = mant;
        if (mant % (BigInt(1) << BigInt(32)) == 0) {
          mant = mant0 + BigInt(1);
          if (mant == this.DBL_HIDDEN) {
            mant0 = BigInt(0);
            exp += BigInt(1);
            return reconstructDouble();
          } else {
            u.ieee.mantissa0 = mant;
            return reconstructDouble();
          }
        } else {
          return reconstructDouble();
        }
      }
    }
  }
};

// src/_generated/rts.unicode.mjs
var _first = Uint32Array.of(0, 32, 33, 36, 37, 40, 41, 42, 43, 44, 45, 46, 48, 58, 60, 63, 65, 91, 92, 93, 94, 95, 96, 97, 123, 124, 125, 126, 127, 160, 161, 162, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 180, 181, 182, 184, 185, 186, 187, 188, 191, 192, 215, 216, 223, 224, 247, 248, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 290, 291, 292, 293, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317, 318, 319, 320, 321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 332, 333, 334, 335, 336, 337, 338, 339, 340, 341, 342, 343, 344, 345, 346, 347, 348, 349, 350, 351, 352, 353, 354, 355, 356, 357, 358, 359, 360, 361, 362, 363, 364, 365, 366, 367, 368, 369, 370, 371, 372, 373, 374, 375, 376, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386, 387, 388, 389, 390, 391, 392, 393, 395, 396, 397, 398, 399, 400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 419, 420, 421, 422, 423, 424, 425, 426, 428, 429, 430, 431, 432, 433, 435, 436, 437, 438, 439, 440, 441, 442, 443, 444, 445, 446, 447, 448, 452, 453, 454, 455, 456, 457, 458, 459, 460, 461, 462, 463, 464, 465, 466, 467, 468, 469, 470, 471, 472, 473, 474, 475, 476, 477, 478, 479, 480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493, 494, 495, 496, 497, 498, 499, 500, 501, 502, 503, 504, 505, 506, 507, 508, 509, 510, 511, 512, 513, 514, 515, 516, 517, 518, 519, 520, 521, 522, 523, 524, 525, 526, 527, 528, 529, 530, 531, 532, 533, 534, 535, 536, 537, 538, 539, 540, 541, 542, 543, 544, 545, 546, 547, 548, 549, 550, 551, 552, 553, 554, 555, 556, 557, 558, 559, 560, 561, 562, 563, 564, 570, 571, 572, 573, 574, 575, 577, 578, 579, 580, 581, 582, 583, 584, 585, 586, 587, 588, 589, 590, 591, 592, 593, 594, 595, 596, 597, 598, 600, 601, 602, 603, 604, 605, 608, 609, 610, 611, 612, 613, 614, 615, 616, 617, 618, 619, 620, 621, 623, 624, 625, 626, 627, 629, 630, 637, 638, 640, 641, 642, 643, 644, 647, 648, 649, 650, 652, 653, 658, 659, 660, 661, 669, 670, 671, 688, 706, 710, 722, 736, 741, 748, 749, 750, 751, 768, 837, 838, 880, 881, 882, 883, 884, 885, 886, 887, 890, 891, 894, 895, 900, 902, 903, 904, 908, 910, 912, 913, 940, 941, 944, 945, 962, 963, 972, 973, 975, 976, 977, 978, 981, 982, 983, 984, 985, 986, 987, 988, 989, 990, 991, 992, 993, 994, 995, 996, 997, 998, 999, 1e3, 1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010, 1011, 1012, 1013, 1014, 1015, 1016, 1017, 1018, 1019, 1020, 1021, 1024, 1040, 1072, 1104, 1120, 1121, 1122, 1123, 1124, 1125, 1126, 1127, 1128, 1129, 1130, 1131, 1132, 1133, 1134, 1135, 1136, 1137, 1138, 1139, 1140, 1141, 1142, 1143, 1144, 1145, 1146, 1147, 1148, 1149, 1150, 1151, 1152, 1153, 1154, 1155, 1160, 1162, 1163, 1164, 1165, 1166, 1167, 1168, 1169, 1170, 1171, 1172, 1173, 1174, 1175, 1176, 1177, 1178, 1179, 1180, 1181, 1182, 1183, 1184, 1185, 1186, 1187, 1188, 1189, 1190, 1191, 1192, 1193, 1194, 1195, 1196, 1197, 1198, 1199, 1200, 1201, 1202, 1203, 1204, 1205, 1206, 1207, 1208, 1209, 1210, 1211, 1212, 1213, 1214, 1215, 1216, 1217, 1218, 1219, 1220, 1221, 1222, 1223, 1224, 1225, 1226, 1227, 1228, 1229, 1230, 1231, 1232, 1233, 1234, 1235, 1236, 1237, 1238, 1239, 1240, 1241, 1242, 1243, 1244, 1245, 1246, 1247, 1248, 1249, 1250, 1251, 1252, 1253, 1254, 1255, 1256, 1257, 1258, 1259, 1260, 1261, 1262, 1263, 1264, 1265, 1266, 1267, 1268, 1269, 1270, 1271, 1272, 1273, 1274, 1275, 1276, 1277, 1278, 1279, 1280, 1281, 1282, 1283, 1284, 1285, 1286, 1287, 1288, 1289, 1290, 1291, 1292, 1293, 1294, 1295, 1296, 1297, 1298, 1299, 1300, 1301, 1302, 1303, 1304, 1305, 1306, 1307, 1308, 1309, 1310, 1311, 1312, 1313, 1314, 1315, 1316, 1317, 1318, 1319, 1320, 1321, 1322, 1323, 1324, 1325, 1326, 1327, 1329, 1369, 1370, 1376, 1377, 1415, 1417, 1418, 1421, 1423, 1425, 1470, 1471, 1472, 1473, 1475, 1476, 1478, 1479, 1488, 1523, 1536, 1542, 1545, 1547, 1548, 1550, 1552, 1563, 1564, 1566, 1568, 1600, 1601, 1611, 1632, 1642, 1646, 1648, 1649, 1748, 1749, 1750, 1757, 1758, 1759, 1765, 1767, 1769, 1770, 1774, 1776, 1786, 1789, 1791, 1792, 1807, 1808, 1809, 1810, 1840, 1869, 1958, 1969, 1984, 1994, 2027, 2036, 2038, 2039, 2042, 2045, 2046, 2048, 2070, 2074, 2075, 2084, 2085, 2088, 2089, 2096, 2112, 2137, 2142, 2144, 2259, 2274, 2275, 2307, 2308, 2362, 2363, 2364, 2365, 2366, 2369, 2377, 2381, 2382, 2384, 2385, 2392, 2402, 2404, 2406, 2416, 2417, 2418, 2433, 2434, 2437, 2492, 2493, 2494, 2497, 2503, 2509, 2510, 2519, 2524, 2530, 2534, 2544, 2546, 2548, 2554, 2555, 2556, 2557, 2558, 2563, 2565, 2620, 2622, 2625, 2649, 2662, 2672, 2674, 2677, 2678, 2689, 2691, 2693, 2748, 2749, 2750, 2753, 2761, 2765, 2768, 2786, 2790, 2800, 2801, 2809, 2810, 2818, 2821, 2876, 2877, 2878, 2879, 2880, 2881, 2887, 2893, 2903, 2908, 2914, 2918, 2928, 2929, 2930, 2946, 2947, 3006, 3008, 3009, 3021, 3024, 3031, 3046, 3056, 3059, 3065, 3066, 3072, 3073, 3076, 3077, 3134, 3137, 3142, 3160, 3170, 3174, 3191, 3192, 3199, 3200, 3201, 3202, 3204, 3205, 3260, 3261, 3262, 3263, 3264, 3270, 3271, 3276, 3285, 3294, 3298, 3302, 3313, 3328, 3330, 3333, 3387, 3389, 3390, 3393, 3398, 3405, 3406, 3407, 3412, 3415, 3416, 3423, 3426, 3430, 3440, 3449, 3450, 3458, 3461, 3530, 3535, 3538, 3544, 3558, 3570, 3572, 3585, 3633, 3634, 3636, 3647, 3648, 3654, 3655, 3663, 3664, 3674, 3713, 3761, 3762, 3764, 3773, 3782, 3784, 3792, 3804, 3841, 3844, 3859, 3860, 3861, 3864, 3866, 3872, 3882, 3892, 3893, 3894, 3895, 3896, 3897, 3898, 3899, 3900, 3901, 3902, 3904, 3953, 3967, 3968, 3973, 3974, 3976, 3981, 4030, 4038, 4039, 4048, 4053, 4057, 4096, 4139, 4141, 4145, 4146, 4152, 4153, 4155, 4157, 4159, 4160, 4170, 4176, 4182, 4184, 4186, 4190, 4193, 4194, 4197, 4199, 4206, 4209, 4213, 4226, 4227, 4229, 4231, 4237, 4238, 4239, 4240, 4250, 4253, 4254, 4256, 4304, 4347, 4348, 4349, 4352, 4957, 4960, 4969, 4992, 5008, 5024, 5104, 5112, 5120, 5121, 5741, 5743, 5760, 5761, 5787, 5788, 5792, 5867, 5870, 5873, 5906, 5920, 5938, 5941, 5952, 5970, 5984, 6002, 6016, 6068, 6070, 6071, 6078, 6086, 6087, 6089, 6100, 6103, 6104, 6107, 6108, 6109, 6112, 6128, 6144, 6150, 6151, 6155, 6158, 6160, 6176, 6211, 6212, 6277, 6279, 6313, 6314, 6432, 6435, 6439, 6441, 6450, 6451, 6457, 6464, 6468, 6470, 6480, 6608, 6618, 6622, 6656, 6679, 6681, 6683, 6686, 6688, 6741, 6742, 6743, 6744, 6753, 6754, 6755, 6757, 6765, 6771, 6784, 6816, 6823, 6824, 6832, 6846, 6912, 6916, 6917, 6964, 6965, 6966, 6971, 6972, 6973, 6978, 6979, 6981, 6992, 7002, 7009, 7019, 7028, 7040, 7042, 7043, 7073, 7074, 7078, 7080, 7082, 7083, 7086, 7088, 7098, 7142, 7143, 7144, 7146, 7149, 7150, 7151, 7154, 7164, 7168, 7204, 7212, 7220, 7222, 7227, 7232, 7245, 7248, 7258, 7288, 7294, 7296, 7297, 7298, 7299, 7301, 7302, 7303, 7304, 7312, 7360, 7376, 7379, 7380, 7393, 7394, 7401, 7405, 7406, 7412, 7413, 7415, 7416, 7418, 7424, 7468, 7531, 7544, 7545, 7546, 7549, 7550, 7566, 7567, 7579, 7616, 7680, 7681, 7682, 7683, 7684, 7685, 7686, 7687, 7688, 7689, 7690, 7691, 7692, 7693, 7694, 7695, 7696, 7697, 7698, 7699, 7700, 7701, 7702, 7703, 7704, 7705, 7706, 7707, 7708, 7709, 7710, 7711, 7712, 7713, 7714, 7715, 7716, 7717, 7718, 7719, 7720, 7721, 7722, 7723, 7724, 7725, 7726, 7727, 7728, 7729, 7730, 7731, 7732, 7733, 7734, 7735, 7736, 7737, 7738, 7739, 7740, 7741, 7742, 7743, 7744, 7745, 7746, 7747, 7748, 7749, 7750, 7751, 7752, 7753, 7754, 7755, 7756, 7757, 7758, 7759, 7760, 7761, 7762, 7763, 7764, 7765, 7766, 7767, 7768, 7769, 7770, 7771, 7772, 7773, 7774, 7775, 7776, 7777, 7778, 7779, 7780, 7781, 7782, 7783, 7784, 7785, 7786, 7787, 7788, 7789, 7790, 7791, 7792, 7793, 7794, 7795, 7796, 7797, 7798, 7799, 7800, 7801, 7802, 7803, 7804, 7805, 7806, 7807, 7808, 7809, 7810, 7811, 7812, 7813, 7814, 7815, 7816, 7817, 7818, 7819, 7820, 7821, 7822, 7823, 7824, 7825, 7826, 7827, 7828, 7829, 7830, 7835, 7836, 7838, 7839, 7840, 7841, 7842, 7843, 7844, 7845, 7846, 7847, 7848, 7849, 7850, 7851, 7852, 7853, 7854, 7855, 7856, 7857, 7858, 7859, 7860, 7861, 7862, 7863, 7864, 7865, 7866, 7867, 7868, 7869, 7870, 7871, 7872, 7873, 7874, 7875, 7876, 7877, 7878, 7879, 7880, 7881, 7882, 7883, 7884, 7885, 7886, 7887, 7888, 7889, 7890, 7891, 7892, 7893, 7894, 7895, 7896, 7897, 7898, 7899, 7900, 7901, 7902, 7903, 7904, 7905, 7906, 7907, 7908, 7909, 7910, 7911, 7912, 7913, 7914, 7915, 7916, 7917, 7918, 7919, 7920, 7921, 7922, 7923, 7924, 7925, 7926, 7927, 7928, 7929, 7930, 7931, 7932, 7933, 7934, 7935, 7936, 7944, 7952, 7960, 7968, 7976, 7984, 7992, 8e3, 8008, 8016, 8017, 8018, 8019, 8020, 8021, 8022, 8023, 8025, 8032, 8040, 8048, 8050, 8054, 8056, 8058, 8060, 8064, 8072, 8080, 8088, 8096, 8104, 8112, 8114, 8115, 8116, 8120, 8122, 8124, 8125, 8126, 8127, 8130, 8131, 8132, 8136, 8140, 8141, 8144, 8146, 8152, 8154, 8157, 8160, 8162, 8165, 8166, 8168, 8170, 8172, 8173, 8178, 8179, 8180, 8184, 8186, 8188, 8189, 8192, 8203, 8208, 8214, 8216, 8217, 8218, 8219, 8221, 8222, 8223, 8224, 8232, 8233, 8234, 8239, 8240, 8249, 8250, 8251, 8255, 8257, 8260, 8261, 8262, 8263, 8274, 8275, 8276, 8277, 8287, 8288, 8304, 8305, 8308, 8314, 8317, 8318, 8319, 8320, 8330, 8333, 8334, 8336, 8352, 8400, 8413, 8417, 8418, 8421, 8448, 8450, 8451, 8455, 8456, 8458, 8459, 8462, 8464, 8467, 8468, 8469, 8470, 8472, 8473, 8478, 8484, 8485, 8486, 8487, 8488, 8489, 8490, 8491, 8492, 8494, 8495, 8496, 8498, 8499, 8500, 8501, 8505, 8506, 8508, 8510, 8512, 8517, 8518, 8522, 8523, 8524, 8526, 8527, 8528, 8544, 8560, 8576, 8579, 8580, 8581, 8585, 8586, 8592, 8597, 8602, 8604, 8608, 8609, 8611, 8612, 8614, 8615, 8622, 8623, 8654, 8656, 8658, 8659, 8660, 8661, 8692, 8960, 8968, 8969, 8970, 8971, 8972, 8992, 8994, 9001, 9002, 9003, 9084, 9085, 9115, 9140, 9180, 9186, 9312, 9372, 9398, 9424, 9450, 9472, 9655, 9656, 9665, 9666, 9720, 9728, 9839, 9840, 10088, 10089, 10090, 10091, 10092, 10093, 10094, 10095, 10096, 10097, 10098, 10099, 10100, 10101, 10102, 10132, 10176, 10181, 10182, 10183, 10214, 10215, 10216, 10217, 10218, 10219, 10220, 10221, 10222, 10223, 10224, 10240, 10496, 10627, 10628, 10629, 10630, 10631, 10632, 10633, 10634, 10635, 10636, 10637, 10638, 10639, 10640, 10641, 10642, 10643, 10644, 10645, 10646, 10647, 10648, 10649, 10712, 10713, 10714, 10715, 10716, 10748, 10749, 10750, 11008, 11056, 11077, 11079, 11085, 11264, 11312, 11360, 11361, 11362, 11363, 11364, 11365, 11366, 11367, 11368, 11369, 11370, 11371, 11372, 11373, 11374, 11375, 11376, 11377, 11378, 11379, 11380, 11381, 11382, 11383, 11388, 11390, 11392, 11393, 11394, 11395, 11396, 11397, 11398, 11399, 11400, 11401, 11402, 11403, 11404, 11405, 11406, 11407, 11408, 11409, 11410, 11411, 11412, 11413, 11414, 11415, 11416, 11417, 11418, 11419, 11420, 11421, 11422, 11423, 11424, 11425, 11426, 11427, 11428, 11429, 11430, 11431, 11432, 11433, 11434, 11435, 11436, 11437, 11438, 11439, 11440, 11441, 11442, 11443, 11444, 11445, 11446, 11447, 11448, 11449, 11450, 11451, 11452, 11453, 11454, 11455, 11456, 11457, 11458, 11459, 11460, 11461, 11462, 11463, 11464, 11465, 11466, 11467, 11468, 11469, 11470, 11471, 11472, 11473, 11474, 11475, 11476, 11477, 11478, 11479, 11480, 11481, 11482, 11483, 11484, 11485, 11486, 11487, 11488, 11489, 11490, 11491, 11492, 11493, 11499, 11500, 11501, 11502, 11503, 11506, 11507, 11513, 11517, 11518, 11520, 11568, 11631, 11632, 11647, 11648, 11744, 11776, 11778, 11779, 11780, 11781, 11782, 11785, 11786, 11787, 11788, 11789, 11790, 11799, 11800, 11802, 11803, 11804, 11805, 11806, 11808, 11809, 11810, 11811, 11812, 11813, 11814, 11815, 11816, 11817, 11818, 11823, 11824, 11834, 11836, 11840, 11841, 11842, 11843, 11904, 12288, 12289, 12292, 12293, 12294, 12295, 12296, 12297, 12298, 12299, 12300, 12301, 12302, 12303, 12304, 12305, 12306, 12308, 12309, 12310, 12311, 12312, 12313, 12314, 12315, 12316, 12317, 12318, 12320, 12321, 12330, 12334, 12336, 12337, 12342, 12344, 12347, 12348, 12349, 12350, 12353, 12441, 12443, 12445, 12447, 12448, 12449, 12539, 12540, 12543, 12688, 12690, 12694, 12704, 12736, 12784, 12800, 12832, 12842, 12872, 12880, 12881, 12896, 12928, 12938, 12977, 12992, 13312, 19904, 19968, 40981, 40982, 42128, 42192, 42232, 42238, 42240, 42508, 42509, 42512, 42528, 42538, 42560, 42561, 42562, 42563, 42564, 42565, 42566, 42567, 42568, 42569, 42570, 42571, 42572, 42573, 42574, 42575, 42576, 42577, 42578, 42579, 42580, 42581, 42582, 42583, 42584, 42585, 42586, 42587, 42588, 42589, 42590, 42591, 42592, 42593, 42594, 42595, 42596, 42597, 42598, 42599, 42600, 42601, 42602, 42603, 42604, 42605, 42606, 42607, 42608, 42611, 42612, 42622, 42623, 42624, 42625, 42626, 42627, 42628, 42629, 42630, 42631, 42632, 42633, 42634, 42635, 42636, 42637, 42638, 42639, 42640, 42641, 42642, 42643, 42644, 42645, 42646, 42647, 42648, 42649, 42650, 42651, 42652, 42654, 42656, 42726, 42736, 42738, 42752, 42775, 42784, 42786, 42787, 42788, 42789, 42790, 42791, 42792, 42793, 42794, 42795, 42796, 42797, 42798, 42799, 42800, 42802, 42803, 42804, 42805, 42806, 42807, 42808, 42809, 42810, 42811, 42812, 42813, 42814, 42815, 42816, 42817, 42818, 42819, 42820, 42821, 42822, 42823, 42824, 42825, 42826, 42827, 42828, 42829, 42830, 42831, 42832, 42833, 42834, 42835, 42836, 42837, 42838, 42839, 42840, 42841, 42842, 42843, 42844, 42845, 42846, 42847, 42848, 42849, 42850, 42851, 42852, 42853, 42854, 42855, 42856, 42857, 42858, 42859, 42860, 42861, 42862, 42863, 42864, 42865, 42873, 42874, 42875, 42876, 42877, 42878, 42879, 42880, 42881, 42882, 42883, 42884, 42885, 42886, 42887, 42888, 42889, 42891, 42892, 42893, 42894, 42895, 42896, 42897, 42898, 42899, 42900, 42901, 42902, 42903, 42904, 42905, 42906, 42907, 42908, 42909, 42910, 42911, 42912, 42913, 42914, 42915, 42916, 42917, 42918, 42919, 42920, 42921, 42922, 42923, 42924, 42925, 42926, 42927, 42928, 42929, 42930, 42931, 42932, 42933, 42934, 42935, 42936, 42937, 42938, 42939, 42940, 42941, 42942, 42943, 42946, 42947, 42948, 42949, 42950, 42999, 43e3, 43002, 43003, 43010, 43011, 43014, 43015, 43019, 43020, 43043, 43045, 43047, 43048, 43056, 43062, 43064, 43065, 43072, 43124, 43136, 43138, 43188, 43204, 43214, 43216, 43232, 43250, 43256, 43259, 43260, 43261, 43263, 43264, 43274, 43302, 43310, 43312, 43335, 43346, 43359, 43360, 43392, 43395, 43396, 43443, 43444, 43446, 43450, 43452, 43453, 43457, 43471, 43472, 43486, 43488, 43493, 43494, 43495, 43504, 43514, 43561, 43567, 43569, 43571, 43573, 43584, 43587, 43588, 43596, 43597, 43600, 43612, 43616, 43632, 43633, 43639, 43642, 43643, 43644, 43645, 43646, 43696, 43697, 43698, 43701, 43703, 43705, 43710, 43712, 43713, 43714, 43741, 43742, 43744, 43755, 43756, 43758, 43760, 43762, 43763, 43765, 43766, 43777, 43824, 43859, 43860, 43867, 43868, 43872, 43888, 43968, 44003, 44005, 44006, 44008, 44009, 44011, 44012, 44013, 44016, 44032, 64256, 64285, 64286, 64287, 64297, 64298, 64434, 64467, 64830, 64831, 64848, 65020, 65021, 65024, 65040, 65047, 65048, 65049, 65056, 65072, 65073, 65075, 65077, 65078, 65079, 65080, 65081, 65082, 65083, 65084, 65085, 65086, 65087, 65088, 65089, 65090, 65091, 65092, 65093, 65095, 65096, 65097, 65101, 65104, 65112, 65113, 65114, 65115, 65116, 65117, 65118, 65119, 65122, 65123, 65124, 65128, 65129, 65130, 65136, 65279, 65281, 65284, 65285, 65288, 65289, 65290, 65291, 65292, 65293, 65294, 65296, 65306, 65308, 65311, 65313, 65339, 65340, 65341, 65342, 65343, 65344, 65345, 65371, 65372, 65373, 65374, 65375, 65376, 65377, 65378, 65379, 65380, 65382, 65392, 65393, 65438, 65440, 65504, 65506, 65507, 65508, 65509, 65512, 65513, 65517, 65529, 65532, 65536, 65792, 65799, 65847, 65856, 65909, 65913, 65930, 65932, 66045, 66176, 66272, 66273, 66304, 66336, 66349, 66369, 66370, 66378, 66384, 66422, 66432, 66463, 66464, 66512, 66513, 66560, 66600, 66640, 66720, 66736, 66776, 66816, 66927, 67072, 67671, 67672, 67680, 67703, 67705, 67712, 67751, 67808, 67835, 67840, 67862, 67871, 67872, 67903, 67968, 68028, 68030, 68032, 68096, 68097, 68112, 68152, 68160, 68176, 68192, 68221, 68223, 68224, 68253, 68288, 68296, 68297, 68325, 68331, 68336, 68352, 68409, 68416, 68440, 68448, 68472, 68480, 68505, 68521, 68608, 68736, 68800, 68858, 68864, 68900, 68912, 69216, 69376, 69405, 69415, 69446, 69457, 69461, 69600, 69632, 69633, 69634, 69635, 69688, 69703, 69714, 69734, 69759, 69762, 69763, 69808, 69811, 69815, 69817, 69819, 69821, 69822, 69837, 69840, 69872, 69888, 69891, 69927, 69932, 69933, 69942, 69952, 69956, 69957, 69968, 70003, 70004, 70006, 70016, 70018, 70019, 70067, 70070, 70079, 70081, 70085, 70089, 70093, 70096, 70106, 70107, 70108, 70109, 70113, 70144, 70188, 70191, 70194, 70196, 70197, 70198, 70200, 70206, 70272, 70313, 70320, 70367, 70368, 70371, 70384, 70400, 70402, 70405, 70459, 70461, 70462, 70464, 70465, 70480, 70487, 70493, 70498, 70502, 70656, 70709, 70712, 70720, 70722, 70725, 70726, 70727, 70731, 70736, 70747, 70750, 70751, 70832, 70835, 70841, 70842, 70843, 70847, 70849, 70850, 70852, 70854, 70855, 70864, 71040, 71087, 71090, 71096, 71100, 71102, 71103, 71105, 71128, 71132, 71168, 71216, 71219, 71227, 71229, 71230, 71231, 71233, 71236, 71248, 71264, 71296, 71339, 71340, 71341, 71342, 71344, 71350, 71351, 71352, 71360, 71424, 71453, 71456, 71458, 71462, 71463, 71472, 71482, 71484, 71487, 71680, 71724, 71727, 71736, 71737, 71739, 71840, 71872, 71904, 71914, 71935, 72145, 72146, 72147, 72148, 72156, 72160, 72161, 72164, 72192, 72193, 72203, 72243, 72249, 72250, 72251, 72255, 72263, 72272, 72273, 72279, 72281, 72284, 72330, 72343, 72344, 72346, 72349, 72350, 72384, 72751, 72752, 72766, 72767, 72768, 72769, 72784, 72794, 72816, 72818, 72850, 72873, 72874, 72881, 72882, 72884, 72885, 72960, 73009, 73030, 73031, 73040, 73056, 73098, 73104, 73107, 73109, 73110, 73111, 73112, 73120, 73440, 73459, 73461, 73463, 73664, 73685, 73693, 73697, 73727, 73728, 74752, 74864, 74880, 78896, 82944, 92768, 92782, 92880, 92912, 92917, 92928, 92976, 92983, 92988, 92992, 92996, 92997, 93008, 93019, 93027, 93760, 93792, 93824, 93847, 93952, 94031, 94032, 94033, 94095, 94099, 94178, 94179, 94208, 113820, 113821, 113823, 113824, 118784, 119141, 119143, 119146, 119149, 119155, 119163, 119171, 119173, 119180, 119210, 119214, 119362, 119365, 119520, 119552, 119648, 119808, 119834, 119860, 119886, 119912, 119938, 119964, 119990, 120016, 120042, 120068, 120094, 120120, 120146, 120172, 120198, 120224, 120250, 120276, 120302, 120328, 120354, 120380, 120406, 120432, 120458, 120488, 120513, 120514, 120539, 120540, 120546, 120571, 120572, 120597, 120598, 120604, 120629, 120630, 120655, 120656, 120662, 120687, 120688, 120713, 120714, 120720, 120745, 120746, 120771, 120772, 120778, 120779, 120782, 120832, 121344, 121399, 121403, 121453, 121461, 121462, 121476, 121477, 121479, 121499, 123136, 123184, 123191, 123200, 123214, 123628, 123632, 123647, 124928, 125127, 125136, 125184, 125218, 125252, 125264, 125278, 126065, 126124, 126125, 126128, 126129, 126254, 126255, 126464, 126704, 126976, 127232, 127248, 127995, 128e3, 131072, 917505, 917760);
var _last = Uint32Array.of(31, 32, 35, 36, 39, 40, 41, 42, 43, 44, 45, 47, 57, 59, 62, 64, 90, 91, 92, 93, 94, 95, 96, 122, 123, 124, 125, 126, 159, 160, 161, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 179, 180, 181, 183, 184, 185, 186, 187, 190, 191, 214, 215, 222, 223, 246, 247, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 290, 291, 292, 293, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317, 318, 319, 320, 321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 332, 333, 334, 335, 336, 337, 338, 339, 340, 341, 342, 343, 344, 345, 346, 347, 348, 349, 350, 351, 352, 353, 354, 355, 356, 357, 358, 359, 360, 361, 362, 363, 364, 365, 366, 367, 368, 369, 370, 371, 372, 373, 374, 375, 376, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386, 387, 388, 389, 390, 391, 392, 394, 395, 396, 397, 398, 399, 400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 419, 420, 421, 422, 423, 424, 425, 427, 428, 429, 430, 431, 432, 434, 435, 436, 437, 438, 439, 440, 441, 442, 443, 444, 445, 446, 447, 451, 452, 453, 454, 455, 456, 457, 458, 459, 460, 461, 462, 463, 464, 465, 466, 467, 468, 469, 470, 471, 472, 473, 474, 475, 476, 477, 478, 479, 480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493, 494, 495, 496, 497, 498, 499, 500, 501, 502, 503, 504, 505, 506, 507, 508, 509, 510, 511, 512, 513, 514, 515, 516, 517, 518, 519, 520, 521, 522, 523, 524, 525, 526, 527, 528, 529, 530, 531, 532, 533, 534, 535, 536, 537, 538, 539, 540, 541, 542, 543, 544, 545, 546, 547, 548, 549, 550, 551, 552, 553, 554, 555, 556, 557, 558, 559, 560, 561, 562, 563, 569, 570, 571, 572, 573, 574, 576, 577, 578, 579, 580, 581, 582, 583, 584, 585, 586, 587, 588, 589, 590, 591, 592, 593, 594, 595, 596, 597, 599, 600, 601, 602, 603, 604, 607, 608, 609, 610, 611, 612, 613, 614, 615, 616, 617, 618, 619, 620, 622, 623, 624, 625, 626, 628, 629, 636, 637, 639, 640, 641, 642, 643, 646, 647, 648, 649, 651, 652, 657, 658, 659, 660, 668, 669, 670, 687, 705, 709, 721, 735, 740, 747, 748, 749, 750, 767, 836, 837, 879, 880, 881, 882, 883, 884, 885, 886, 887, 890, 893, 894, 895, 901, 902, 903, 906, 908, 911, 912, 939, 940, 943, 944, 961, 962, 971, 972, 974, 975, 976, 977, 980, 981, 982, 983, 984, 985, 986, 987, 988, 989, 990, 991, 992, 993, 994, 995, 996, 997, 998, 999, 1e3, 1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010, 1011, 1012, 1013, 1014, 1015, 1016, 1017, 1018, 1019, 1020, 1023, 1039, 1071, 1103, 1119, 1120, 1121, 1122, 1123, 1124, 1125, 1126, 1127, 1128, 1129, 1130, 1131, 1132, 1133, 1134, 1135, 1136, 1137, 1138, 1139, 1140, 1141, 1142, 1143, 1144, 1145, 1146, 1147, 1148, 1149, 1150, 1151, 1152, 1153, 1154, 1159, 1161, 1162, 1163, 1164, 1165, 1166, 1167, 1168, 1169, 1170, 1171, 1172, 1173, 1174, 1175, 1176, 1177, 1178, 1179, 1180, 1181, 1182, 1183, 1184, 1185, 1186, 1187, 1188, 1189, 1190, 1191, 1192, 1193, 1194, 1195, 1196, 1197, 1198, 1199, 1200, 1201, 1202, 1203, 1204, 1205, 1206, 1207, 1208, 1209, 1210, 1211, 1212, 1213, 1214, 1215, 1216, 1217, 1218, 1219, 1220, 1221, 1222, 1223, 1224, 1225, 1226, 1227, 1228, 1229, 1230, 1231, 1232, 1233, 1234, 1235, 1236, 1237, 1238, 1239, 1240, 1241, 1242, 1243, 1244, 1245, 1246, 1247, 1248, 1249, 1250, 1251, 1252, 1253, 1254, 1255, 1256, 1257, 1258, 1259, 1260, 1261, 1262, 1263, 1264, 1265, 1266, 1267, 1268, 1269, 1270, 1271, 1272, 1273, 1274, 1275, 1276, 1277, 1278, 1279, 1280, 1281, 1282, 1283, 1284, 1285, 1286, 1287, 1288, 1289, 1290, 1291, 1292, 1293, 1294, 1295, 1296, 1297, 1298, 1299, 1300, 1301, 1302, 1303, 1304, 1305, 1306, 1307, 1308, 1309, 1310, 1311, 1312, 1313, 1314, 1315, 1316, 1317, 1318, 1319, 1320, 1321, 1322, 1323, 1324, 1325, 1326, 1327, 1366, 1369, 1375, 1376, 1414, 1416, 1417, 1418, 1422, 1423, 1469, 1470, 1471, 1472, 1474, 1475, 1477, 1478, 1479, 1522, 1524, 1541, 1544, 1546, 1547, 1549, 1551, 1562, 1563, 1564, 1567, 1599, 1600, 1610, 1631, 1641, 1645, 1647, 1648, 1747, 1748, 1749, 1756, 1757, 1758, 1764, 1766, 1768, 1769, 1773, 1775, 1785, 1788, 1790, 1791, 1805, 1807, 1808, 1809, 1839, 1866, 1957, 1968, 1969, 1993, 2026, 2035, 2037, 2038, 2041, 2042, 2045, 2047, 2069, 2073, 2074, 2083, 2084, 2087, 2088, 2093, 2110, 2136, 2139, 2142, 2237, 2273, 2274, 2306, 2307, 2361, 2362, 2363, 2364, 2365, 2368, 2376, 2380, 2381, 2383, 2384, 2391, 2401, 2403, 2405, 2415, 2416, 2417, 2432, 2433, 2435, 2489, 2492, 2493, 2496, 2500, 2508, 2509, 2510, 2519, 2529, 2531, 2543, 2545, 2547, 2553, 2554, 2555, 2556, 2557, 2562, 2563, 2617, 2620, 2624, 2641, 2654, 2671, 2673, 2676, 2677, 2678, 2690, 2691, 2745, 2748, 2749, 2752, 2760, 2764, 2765, 2785, 2787, 2799, 2800, 2801, 2809, 2817, 2819, 2873, 2876, 2877, 2878, 2879, 2880, 2884, 2892, 2902, 2903, 2913, 2915, 2927, 2928, 2929, 2935, 2946, 3001, 3007, 3008, 3020, 3021, 3024, 3031, 3055, 3058, 3064, 3065, 3066, 3072, 3075, 3076, 3133, 3136, 3140, 3158, 3169, 3171, 3183, 3191, 3198, 3199, 3200, 3201, 3203, 3204, 3257, 3260, 3261, 3262, 3263, 3268, 3270, 3275, 3277, 3286, 3297, 3299, 3311, 3314, 3329, 3331, 3386, 3388, 3389, 3392, 3396, 3404, 3405, 3406, 3407, 3414, 3415, 3422, 3425, 3427, 3439, 3448, 3449, 3455, 3459, 3526, 3530, 3537, 3542, 3551, 3567, 3571, 3572, 3632, 3633, 3635, 3642, 3647, 3653, 3654, 3662, 3663, 3673, 3675, 3760, 3761, 3763, 3772, 3780, 3782, 3789, 3801, 3840, 3843, 3858, 3859, 3860, 3863, 3865, 3871, 3881, 3891, 3892, 3893, 3894, 3895, 3896, 3897, 3898, 3899, 3900, 3901, 3903, 3948, 3966, 3967, 3972, 3973, 3975, 3980, 4028, 4037, 4038, 4047, 4052, 4056, 4058, 4138, 4140, 4144, 4145, 4151, 4152, 4154, 4156, 4158, 4159, 4169, 4175, 4181, 4183, 4185, 4189, 4192, 4193, 4196, 4198, 4205, 4208, 4212, 4225, 4226, 4228, 4230, 4236, 4237, 4238, 4239, 4249, 4252, 4253, 4255, 4301, 4346, 4347, 4348, 4351, 4954, 4959, 4968, 4988, 5007, 5017, 5103, 5109, 5117, 5120, 5740, 5742, 5759, 5760, 5786, 5787, 5788, 5866, 5869, 5872, 5905, 5908, 5937, 5940, 5942, 5969, 5971, 6e3, 6003, 6067, 6069, 6070, 6077, 6085, 6086, 6088, 6099, 6102, 6103, 6106, 6107, 6108, 6109, 6121, 6137, 6149, 6150, 6154, 6157, 6158, 6169, 6210, 6211, 6276, 6278, 6312, 6313, 6430, 6434, 6438, 6440, 6449, 6450, 6456, 6459, 6464, 6469, 6479, 6601, 6617, 6618, 6655, 6678, 6680, 6682, 6683, 6687, 6740, 6741, 6742, 6743, 6752, 6753, 6754, 6756, 6764, 6770, 6783, 6809, 6822, 6823, 6829, 6845, 6846, 6915, 6916, 6963, 6964, 6965, 6970, 6971, 6972, 6977, 6978, 6980, 6987, 7001, 7008, 7018, 7027, 7036, 7041, 7042, 7072, 7073, 7077, 7079, 7081, 7082, 7085, 7087, 7097, 7141, 7142, 7143, 7145, 7148, 7149, 7150, 7153, 7155, 7167, 7203, 7211, 7219, 7221, 7223, 7231, 7241, 7247, 7257, 7287, 7293, 7295, 7296, 7297, 7298, 7300, 7301, 7302, 7303, 7304, 7359, 7367, 7378, 7379, 7392, 7393, 7400, 7404, 7405, 7411, 7412, 7414, 7415, 7417, 7418, 7467, 7530, 7543, 7544, 7545, 7548, 7549, 7565, 7566, 7578, 7615, 7679, 7680, 7681, 7682, 7683, 7684, 7685, 7686, 7687, 7688, 7689, 7690, 7691, 7692, 7693, 7694, 7695, 7696, 7697, 7698, 7699, 7700, 7701, 7702, 7703, 7704, 7705, 7706, 7707, 7708, 7709, 7710, 7711, 7712, 7713, 7714, 7715, 7716, 7717, 7718, 7719, 7720, 7721, 7722, 7723, 7724, 7725, 7726, 7727, 7728, 7729, 7730, 7731, 7732, 7733, 7734, 7735, 7736, 7737, 7738, 7739, 7740, 7741, 7742, 7743, 7744, 7745, 7746, 7747, 7748, 7749, 7750, 7751, 7752, 7753, 7754, 7755, 7756, 7757, 7758, 7759, 7760, 7761, 7762, 7763, 7764, 7765, 7766, 7767, 7768, 7769, 7770, 7771, 7772, 7773, 7774, 7775, 7776, 7777, 7778, 7779, 7780, 7781, 7782, 7783, 7784, 7785, 7786, 7787, 7788, 7789, 7790, 7791, 7792, 7793, 7794, 7795, 7796, 7797, 7798, 7799, 7800, 7801, 7802, 7803, 7804, 7805, 7806, 7807, 7808, 7809, 7810, 7811, 7812, 7813, 7814, 7815, 7816, 7817, 7818, 7819, 7820, 7821, 7822, 7823, 7824, 7825, 7826, 7827, 7828, 7829, 7834, 7835, 7837, 7838, 7839, 7840, 7841, 7842, 7843, 7844, 7845, 7846, 7847, 7848, 7849, 7850, 7851, 7852, 7853, 7854, 7855, 7856, 7857, 7858, 7859, 7860, 7861, 7862, 7863, 7864, 7865, 7866, 7867, 7868, 7869, 7870, 7871, 7872, 7873, 7874, 7875, 7876, 7877, 7878, 7879, 7880, 7881, 7882, 7883, 7884, 7885, 7886, 7887, 7888, 7889, 7890, 7891, 7892, 7893, 7894, 7895, 7896, 7897, 7898, 7899, 7900, 7901, 7902, 7903, 7904, 7905, 7906, 7907, 7908, 7909, 7910, 7911, 7912, 7913, 7914, 7915, 7916, 7917, 7918, 7919, 7920, 7921, 7922, 7923, 7924, 7925, 7926, 7927, 7928, 7929, 7930, 7931, 7932, 7933, 7934, 7935, 7943, 7951, 7957, 7965, 7975, 7983, 7991, 7999, 8005, 8013, 8016, 8017, 8018, 8019, 8020, 8021, 8022, 8023, 8031, 8039, 8047, 8049, 8053, 8055, 8057, 8059, 8061, 8071, 8079, 8087, 8095, 8103, 8111, 8113, 8114, 8115, 8119, 8121, 8123, 8124, 8125, 8126, 8129, 8130, 8131, 8135, 8139, 8140, 8143, 8145, 8151, 8153, 8155, 8159, 8161, 8164, 8165, 8167, 8169, 8171, 8172, 8175, 8178, 8179, 8183, 8185, 8187, 8188, 8190, 8202, 8207, 8213, 8215, 8216, 8217, 8218, 8220, 8221, 8222, 8223, 8231, 8232, 8233, 8238, 8239, 8248, 8249, 8250, 8254, 8256, 8259, 8260, 8261, 8262, 8273, 8274, 8275, 8276, 8286, 8287, 8303, 8304, 8305, 8313, 8316, 8317, 8318, 8319, 8329, 8332, 8333, 8334, 8348, 8383, 8412, 8416, 8417, 8420, 8432, 8449, 8450, 8454, 8455, 8457, 8458, 8461, 8463, 8466, 8467, 8468, 8469, 8471, 8472, 8477, 8483, 8484, 8485, 8486, 8487, 8488, 8489, 8490, 8491, 8493, 8494, 8495, 8497, 8498, 8499, 8500, 8504, 8505, 8507, 8509, 8511, 8516, 8517, 8521, 8522, 8523, 8525, 8526, 8527, 8543, 8559, 8575, 8578, 8579, 8580, 8584, 8585, 8587, 8596, 8601, 8603, 8607, 8608, 8610, 8611, 8613, 8614, 8621, 8622, 8653, 8655, 8657, 8658, 8659, 8660, 8691, 8959, 8967, 8968, 8969, 8970, 8971, 8991, 8993, 9e3, 9001, 9002, 9083, 9084, 9114, 9139, 9179, 9185, 9290, 9371, 9397, 9423, 9449, 9471, 9654, 9655, 9664, 9665, 9719, 9727, 9838, 9839, 10087, 10088, 10089, 10090, 10091, 10092, 10093, 10094, 10095, 10096, 10097, 10098, 10099, 10100, 10101, 10131, 10175, 10180, 10181, 10182, 10213, 10214, 10215, 10216, 10217, 10218, 10219, 10220, 10221, 10222, 10223, 10239, 10495, 10626, 10627, 10628, 10629, 10630, 10631, 10632, 10633, 10634, 10635, 10636, 10637, 10638, 10639, 10640, 10641, 10642, 10643, 10644, 10645, 10646, 10647, 10648, 10711, 10712, 10713, 10714, 10715, 10747, 10748, 10749, 11007, 11055, 11076, 11078, 11084, 11263, 11310, 11358, 11360, 11361, 11362, 11363, 11364, 11365, 11366, 11367, 11368, 11369, 11370, 11371, 11372, 11373, 11374, 11375, 11376, 11377, 11378, 11379, 11380, 11381, 11382, 11387, 11389, 11391, 11392, 11393, 11394, 11395, 11396, 11397, 11398, 11399, 11400, 11401, 11402, 11403, 11404, 11405, 11406, 11407, 11408, 11409, 11410, 11411, 11412, 11413, 11414, 11415, 11416, 11417, 11418, 11419, 11420, 11421, 11422, 11423, 11424, 11425, 11426, 11427, 11428, 11429, 11430, 11431, 11432, 11433, 11434, 11435, 11436, 11437, 11438, 11439, 11440, 11441, 11442, 11443, 11444, 11445, 11446, 11447, 11448, 11449, 11450, 11451, 11452, 11453, 11454, 11455, 11456, 11457, 11458, 11459, 11460, 11461, 11462, 11463, 11464, 11465, 11466, 11467, 11468, 11469, 11470, 11471, 11472, 11473, 11474, 11475, 11476, 11477, 11478, 11479, 11480, 11481, 11482, 11483, 11484, 11485, 11486, 11487, 11488, 11489, 11490, 11491, 11492, 11498, 11499, 11500, 11501, 11502, 11505, 11506, 11507, 11516, 11517, 11519, 11565, 11623, 11631, 11632, 11647, 11742, 11775, 11777, 11778, 11779, 11780, 11781, 11784, 11785, 11786, 11787, 11788, 11789, 11798, 11799, 11801, 11802, 11803, 11804, 11805, 11807, 11808, 11809, 11810, 11811, 11812, 11813, 11814, 11815, 11816, 11817, 11822, 11823, 11833, 11835, 11839, 11840, 11841, 11842, 11855, 12283, 12288, 12291, 12292, 12293, 12294, 12295, 12296, 12297, 12298, 12299, 12300, 12301, 12302, 12303, 12304, 12305, 12307, 12308, 12309, 12310, 12311, 12312, 12313, 12314, 12315, 12316, 12317, 12319, 12320, 12329, 12333, 12335, 12336, 12341, 12343, 12346, 12347, 12348, 12349, 12351, 12438, 12442, 12444, 12446, 12447, 12448, 12538, 12539, 12542, 12686, 12689, 12693, 12703, 12730, 12771, 12799, 12830, 12841, 12871, 12879, 12880, 12895, 12927, 12937, 12976, 12991, 13311, 19893, 19967, 40980, 40981, 42124, 42182, 42231, 42237, 42239, 42507, 42508, 42511, 42527, 42537, 42539, 42560, 42561, 42562, 42563, 42564, 42565, 42566, 42567, 42568, 42569, 42570, 42571, 42572, 42573, 42574, 42575, 42576, 42577, 42578, 42579, 42580, 42581, 42582, 42583, 42584, 42585, 42586, 42587, 42588, 42589, 42590, 42591, 42592, 42593, 42594, 42595, 42596, 42597, 42598, 42599, 42600, 42601, 42602, 42603, 42604, 42605, 42606, 42607, 42610, 42611, 42621, 42622, 42623, 42624, 42625, 42626, 42627, 42628, 42629, 42630, 42631, 42632, 42633, 42634, 42635, 42636, 42637, 42638, 42639, 42640, 42641, 42642, 42643, 42644, 42645, 42646, 42647, 42648, 42649, 42650, 42651, 42653, 42655, 42725, 42735, 42737, 42743, 42774, 42783, 42785, 42786, 42787, 42788, 42789, 42790, 42791, 42792, 42793, 42794, 42795, 42796, 42797, 42798, 42799, 42801, 42802, 42803, 42804, 42805, 42806, 42807, 42808, 42809, 42810, 42811, 42812, 42813, 42814, 42815, 42816, 42817, 42818, 42819, 42820, 42821, 42822, 42823, 42824, 42825, 42826, 42827, 42828, 42829, 42830, 42831, 42832, 42833, 42834, 42835, 42836, 42837, 42838, 42839, 42840, 42841, 42842, 42843, 42844, 42845, 42846, 42847, 42848, 42849, 42850, 42851, 42852, 42853, 42854, 42855, 42856, 42857, 42858, 42859, 42860, 42861, 42862, 42863, 42864, 42872, 42873, 42874, 42875, 42876, 42877, 42878, 42879, 42880, 42881, 42882, 42883, 42884, 42885, 42886, 42887, 42888, 42890, 42891, 42892, 42893, 42894, 42895, 42896, 42897, 42898, 42899, 42900, 42901, 42902, 42903, 42904, 42905, 42906, 42907, 42908, 42909, 42910, 42911, 42912, 42913, 42914, 42915, 42916, 42917, 42918, 42919, 42920, 42921, 42922, 42923, 42924, 42925, 42926, 42927, 42928, 42929, 42930, 42931, 42932, 42933, 42934, 42935, 42936, 42937, 42938, 42939, 42940, 42941, 42942, 42943, 42946, 42947, 42948, 42949, 42950, 42999, 43001, 43002, 43009, 43010, 43013, 43014, 43018, 43019, 43042, 43044, 43046, 43047, 43051, 43061, 43063, 43064, 43065, 43123, 43127, 43137, 43187, 43203, 43205, 43215, 43225, 43249, 43255, 43258, 43259, 43260, 43262, 43263, 43273, 43301, 43309, 43311, 43334, 43345, 43347, 43359, 43388, 43394, 43395, 43442, 43443, 43445, 43449, 43451, 43452, 43456, 43469, 43471, 43481, 43487, 43492, 43493, 43494, 43503, 43513, 43560, 43566, 43568, 43570, 43572, 43574, 43586, 43587, 43595, 43596, 43597, 43609, 43615, 43631, 43632, 43638, 43641, 43642, 43643, 43644, 43645, 43695, 43696, 43697, 43700, 43702, 43704, 43709, 43711, 43712, 43713, 43740, 43741, 43743, 43754, 43755, 43757, 43759, 43761, 43762, 43764, 43765, 43766, 43822, 43858, 43859, 43866, 43867, 43871, 43879, 43967, 44002, 44004, 44005, 44007, 44008, 44010, 44011, 44012, 44013, 44025, 64217, 64279, 64285, 64286, 64296, 64297, 64433, 64449, 64829, 64830, 64831, 65019, 65020, 65021, 65039, 65046, 65047, 65048, 65049, 65071, 65072, 65074, 65076, 65077, 65078, 65079, 65080, 65081, 65082, 65083, 65084, 65085, 65086, 65087, 65088, 65089, 65090, 65091, 65092, 65094, 65095, 65096, 65100, 65103, 65111, 65112, 65113, 65114, 65115, 65116, 65117, 65118, 65121, 65122, 65123, 65126, 65128, 65129, 65131, 65276, 65279, 65283, 65284, 65287, 65288, 65289, 65290, 65291, 65292, 65293, 65295, 65305, 65307, 65310, 65312, 65338, 65339, 65340, 65341, 65342, 65343, 65344, 65370, 65371, 65372, 65373, 65374, 65375, 65376, 65377, 65378, 65379, 65381, 65391, 65392, 65437, 65439, 65500, 65505, 65506, 65507, 65508, 65510, 65512, 65516, 65518, 65531, 65533, 65786, 65794, 65843, 65855, 65908, 65912, 65929, 65931, 66044, 66045, 66256, 66272, 66299, 66335, 66339, 66368, 66369, 66377, 66378, 66421, 66426, 66461, 66463, 66511, 66512, 66517, 66599, 66639, 66717, 66729, 66771, 66811, 66915, 66927, 67669, 67671, 67679, 67702, 67704, 67711, 67742, 67759, 67829, 67839, 67861, 67867, 67871, 67897, 67903, 68023, 68029, 68031, 68095, 68096, 68111, 68149, 68159, 68168, 68184, 68220, 68222, 68223, 68252, 68255, 68295, 68296, 68324, 68326, 68335, 68342, 68405, 68415, 68437, 68447, 68466, 68479, 68497, 68508, 68527, 68680, 68786, 68850, 68863, 68899, 68903, 68921, 69246, 69404, 69414, 69445, 69456, 69460, 69465, 69622, 69632, 69633, 69634, 69687, 69702, 69709, 69733, 69743, 69761, 69762, 69807, 69810, 69814, 69816, 69818, 69820, 69821, 69825, 69837, 69864, 69881, 69890, 69926, 69931, 69932, 69940, 69951, 69955, 69956, 69958, 70002, 70003, 70005, 70006, 70017, 70018, 70066, 70069, 70078, 70080, 70084, 70088, 70092, 70093, 70105, 70106, 70107, 70108, 70111, 70132, 70187, 70190, 70193, 70195, 70196, 70197, 70199, 70205, 70206, 70312, 70313, 70366, 70367, 70370, 70378, 70393, 70401, 70403, 70457, 70460, 70461, 70463, 70464, 70477, 70480, 70487, 70497, 70499, 70516, 70708, 70711, 70719, 70721, 70724, 70725, 70726, 70730, 70735, 70745, 70749, 70750, 70831, 70834, 70840, 70841, 70842, 70846, 70848, 70849, 70851, 70853, 70854, 70855, 70873, 71086, 71089, 71093, 71099, 71101, 71102, 71104, 71127, 71131, 71133, 71215, 71218, 71226, 71228, 71229, 71230, 71232, 71235, 71236, 71257, 71276, 71338, 71339, 71340, 71341, 71343, 71349, 71350, 71351, 71352, 71369, 71450, 71455, 71457, 71461, 71462, 71467, 71481, 71483, 71486, 71487, 71723, 71726, 71735, 71736, 71738, 71739, 71871, 71903, 71913, 71922, 72144, 72145, 72146, 72147, 72155, 72159, 72160, 72163, 72164, 72192, 72202, 72242, 72248, 72249, 72250, 72254, 72262, 72263, 72272, 72278, 72280, 72283, 72329, 72342, 72343, 72345, 72348, 72349, 72354, 72750, 72751, 72765, 72766, 72767, 72768, 72773, 72793, 72812, 72817, 72847, 72871, 72873, 72880, 72881, 72883, 72884, 72886, 73008, 73029, 73030, 73031, 73049, 73097, 73102, 73105, 73108, 73109, 73110, 73111, 73112, 73129, 73458, 73460, 73462, 73464, 73684, 73692, 73696, 73713, 73727, 74649, 74862, 74868, 78894, 78904, 92766, 92777, 92783, 92909, 92916, 92917, 92975, 92982, 92987, 92991, 92995, 92996, 92997, 93017, 93025, 93071, 93791, 93823, 93846, 93850, 94026, 94031, 94032, 94087, 94098, 94177, 94178, 94179, 113817, 113820, 113822, 113823, 113827, 119140, 119142, 119145, 119148, 119154, 119162, 119170, 119172, 119179, 119209, 119213, 119361, 119364, 119365, 119539, 119638, 119672, 119833, 119859, 119885, 119911, 119937, 119963, 119989, 120015, 120041, 120067, 120092, 120119, 120144, 120171, 120197, 120223, 120249, 120275, 120301, 120327, 120353, 120379, 120405, 120431, 120457, 120485, 120512, 120513, 120538, 120539, 120545, 120570, 120571, 120596, 120597, 120603, 120628, 120629, 120654, 120655, 120661, 120686, 120687, 120712, 120713, 120719, 120744, 120745, 120770, 120771, 120777, 120778, 120779, 120831, 121343, 121398, 121402, 121452, 121460, 121461, 121475, 121476, 121478, 121483, 122922, 123180, 123190, 123197, 123209, 123627, 123631, 123641, 123647, 125124, 125135, 125142, 125217, 125251, 125258, 125273, 125279, 126123, 126124, 126127, 126128, 126253, 126254, 126269, 126651, 126705, 127221, 127244, 127994, 127999, 129685, 195101, 917631, 917999);
var _idx = Uint8Array.of(0, 1, 2, 3, 2, 4, 5, 2, 6, 2, 7, 2, 8, 2, 6, 2, 9, 4, 2, 5, 10, 11, 10, 12, 4, 6, 5, 6, 0, 1, 2, 3, 13, 2, 10, 13, 14, 15, 6, 16, 13, 10, 13, 6, 17, 10, 18, 2, 10, 17, 14, 19, 17, 2, 9, 6, 9, 20, 12, 6, 12, 21, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 24, 25, 22, 23, 22, 23, 22, 23, 20, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 20, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 26, 22, 23, 22, 23, 22, 23, 27, 28, 29, 22, 23, 22, 23, 30, 22, 23, 31, 22, 23, 20, 32, 33, 34, 22, 23, 31, 35, 36, 37, 38, 22, 23, 39, 20, 37, 40, 41, 42, 22, 23, 22, 23, 22, 23, 43, 22, 23, 43, 20, 22, 23, 43, 22, 23, 44, 22, 23, 22, 23, 45, 22, 23, 20, 14, 22, 23, 20, 46, 14, 47, 48, 49, 47, 48, 49, 47, 48, 49, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 50, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 20, 47, 48, 49, 22, 23, 51, 52, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 53, 20, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 20, 54, 22, 23, 55, 56, 57, 22, 23, 58, 59, 60, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 61, 62, 63, 64, 65, 20, 66, 20, 67, 20, 68, 69, 20, 66, 70, 20, 71, 20, 72, 73, 20, 74, 75, 73, 76, 77, 20, 75, 20, 78, 79, 20, 80, 20, 81, 20, 82, 20, 83, 82, 20, 84, 82, 85, 86, 87, 20, 88, 20, 14, 20, 89, 90, 20, 91, 10, 91, 10, 91, 10, 91, 10, 91, 10, 92, 93, 92, 22, 23, 22, 23, 91, 10, 22, 23, 91, 41, 2, 94, 10, 95, 2, 96, 97, 98, 20, 9, 99, 100, 20, 12, 101, 12, 102, 103, 104, 105, 106, 107, 108, 109, 110, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 111, 112, 113, 114, 115, 116, 6, 22, 23, 117, 22, 23, 20, 53, 118, 9, 12, 112, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 13, 92, 119, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 120, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 121, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 122, 91, 2, 20, 123, 20, 2, 7, 13, 3, 92, 7, 92, 2, 92, 2, 92, 2, 92, 14, 2, 16, 6, 2, 3, 2, 13, 92, 2, 16, 2, 14, 91, 14, 92, 8, 2, 14, 92, 14, 2, 14, 92, 16, 13, 92, 91, 92, 13, 92, 14, 8, 14, 13, 14, 2, 16, 14, 92, 14, 92, 14, 92, 14, 8, 14, 92, 91, 13, 2, 91, 92, 3, 14, 92, 91, 92, 91, 92, 91, 92, 2, 14, 92, 2, 14, 92, 16, 92, 124, 14, 92, 124, 92, 14, 124, 92, 124, 92, 124, 14, 92, 14, 92, 2, 8, 2, 91, 14, 92, 124, 14, 92, 14, 124, 92, 124, 92, 14, 124, 14, 92, 8, 14, 3, 17, 13, 3, 14, 2, 92, 124, 14, 92, 124, 92, 14, 8, 92, 14, 92, 2, 92, 124, 14, 92, 14, 124, 92, 124, 92, 14, 92, 8, 2, 3, 14, 92, 124, 14, 92, 14, 124, 92, 124, 92, 124, 92, 124, 14, 92, 8, 13, 14, 17, 92, 14, 124, 92, 124, 92, 14, 124, 8, 17, 13, 3, 13, 92, 124, 92, 14, 92, 124, 92, 14, 92, 8, 2, 17, 13, 14, 92, 124, 2, 14, 92, 14, 124, 92, 124, 92, 124, 92, 124, 14, 92, 8, 14, 92, 124, 14, 92, 14, 124, 92, 124, 92, 14, 13, 14, 124, 17, 14, 92, 8, 17, 13, 14, 124, 14, 92, 124, 92, 124, 8, 124, 2, 14, 92, 14, 92, 3, 14, 91, 92, 2, 8, 2, 14, 92, 14, 92, 14, 91, 92, 8, 14, 13, 2, 13, 2, 13, 92, 13, 8, 17, 13, 92, 13, 92, 13, 92, 4, 5, 4, 5, 124, 14, 92, 124, 92, 2, 92, 14, 92, 13, 92, 13, 2, 13, 2, 14, 124, 92, 124, 92, 124, 92, 124, 92, 14, 8, 2, 14, 124, 92, 14, 92, 14, 124, 14, 124, 14, 92, 14, 92, 124, 92, 124, 92, 14, 124, 8, 124, 92, 13, 125, 126, 2, 91, 126, 14, 92, 2, 17, 14, 13, 127, 104, 110, 7, 14, 2, 14, 1, 14, 4, 5, 14, 2, 128, 14, 92, 14, 92, 2, 14, 92, 14, 92, 14, 92, 124, 92, 124, 92, 124, 92, 2, 91, 2, 3, 14, 92, 8, 17, 2, 7, 2, 92, 16, 8, 14, 91, 14, 92, 14, 92, 14, 92, 124, 92, 124, 92, 124, 92, 13, 2, 8, 14, 8, 17, 13, 14, 92, 124, 92, 2, 14, 124, 92, 124, 92, 124, 92, 124, 92, 124, 92, 8, 2, 91, 2, 92, 119, 92, 124, 14, 92, 124, 92, 124, 92, 124, 92, 124, 14, 8, 2, 13, 92, 13, 92, 124, 14, 124, 92, 124, 92, 124, 92, 14, 8, 14, 92, 124, 92, 124, 92, 124, 92, 124, 2, 14, 124, 92, 124, 92, 2, 8, 14, 8, 14, 91, 2, 129, 130, 131, 132, 133, 134, 135, 136, 137, 2, 92, 2, 92, 124, 92, 14, 92, 14, 92, 14, 124, 92, 14, 20, 91, 20, 91, 138, 20, 139, 20, 140, 20, 91, 92, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 20, 141, 20, 142, 20, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 143, 144, 143, 144, 143, 144, 143, 144, 143, 144, 20, 143, 20, 143, 20, 143, 20, 143, 144, 143, 144, 145, 146, 147, 148, 149, 150, 143, 151, 143, 151, 143, 151, 143, 20, 152, 20, 144, 153, 154, 10, 155, 10, 20, 152, 20, 156, 154, 10, 143, 20, 144, 157, 10, 143, 20, 113, 20, 144, 158, 117, 10, 20, 152, 20, 159, 160, 154, 10, 1, 16, 7, 2, 15, 19, 4, 15, 19, 4, 15, 2, 161, 162, 16, 1, 2, 15, 19, 2, 11, 2, 6, 4, 5, 2, 6, 2, 11, 2, 1, 16, 17, 91, 17, 6, 4, 5, 91, 17, 6, 4, 5, 91, 3, 92, 119, 92, 119, 92, 13, 107, 13, 107, 13, 20, 107, 20, 107, 20, 13, 107, 13, 6, 107, 13, 107, 13, 163, 13, 107, 13, 164, 165, 107, 13, 20, 107, 166, 107, 20, 14, 20, 13, 20, 107, 6, 107, 20, 13, 6, 13, 167, 13, 17, 168, 169, 128, 22, 23, 128, 17, 13, 6, 13, 6, 13, 6, 13, 6, 13, 6, 13, 6, 13, 6, 13, 6, 13, 6, 13, 6, 13, 4, 5, 4, 5, 13, 6, 13, 4, 5, 13, 6, 13, 6, 13, 6, 13, 17, 13, 170, 171, 17, 13, 6, 13, 6, 13, 6, 13, 6, 13, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 17, 13, 6, 4, 5, 6, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 6, 13, 6, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 6, 4, 5, 4, 5, 6, 4, 5, 6, 13, 6, 13, 6, 13, 122, 123, 22, 23, 172, 173, 174, 175, 176, 22, 23, 22, 23, 22, 23, 177, 178, 179, 180, 20, 22, 23, 20, 22, 23, 20, 91, 181, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 20, 13, 22, 23, 22, 23, 92, 22, 23, 2, 17, 2, 182, 14, 91, 2, 92, 14, 92, 2, 15, 19, 15, 19, 2, 15, 19, 2, 15, 19, 2, 7, 2, 7, 2, 15, 19, 2, 15, 19, 4, 5, 4, 5, 4, 5, 4, 5, 2, 91, 2, 7, 2, 7, 2, 4, 2, 13, 1, 2, 13, 91, 14, 128, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 13, 4, 5, 4, 5, 4, 5, 4, 5, 7, 4, 5, 13, 128, 92, 124, 7, 91, 13, 128, 91, 14, 2, 13, 14, 92, 10, 91, 14, 7, 14, 2, 91, 14, 13, 17, 13, 14, 13, 14, 13, 17, 13, 17, 13, 17, 13, 17, 13, 17, 13, 14, 13, 14, 91, 14, 13, 14, 91, 2, 14, 91, 2, 14, 8, 14, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 14, 92, 119, 2, 92, 2, 91, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 91, 92, 14, 128, 92, 2, 10, 91, 10, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 20, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 91, 20, 22, 23, 22, 23, 183, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 91, 10, 22, 23, 184, 20, 14, 22, 23, 22, 23, 185, 20, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 186, 187, 188, 189, 186, 20, 190, 191, 192, 193, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 22, 23, 194, 195, 196, 14, 91, 20, 14, 92, 14, 92, 14, 92, 14, 124, 92, 124, 13, 17, 13, 3, 13, 14, 2, 124, 14, 124, 92, 2, 8, 92, 14, 2, 14, 2, 14, 92, 8, 14, 92, 2, 14, 92, 124, 2, 14, 92, 124, 14, 92, 124, 92, 124, 92, 124, 2, 91, 8, 2, 14, 92, 91, 14, 8, 14, 92, 124, 92, 124, 92, 14, 92, 14, 92, 124, 8, 2, 14, 91, 14, 13, 14, 124, 92, 124, 14, 92, 14, 92, 14, 92, 14, 92, 14, 92, 14, 91, 2, 14, 124, 92, 124, 2, 14, 91, 124, 92, 14, 20, 197, 20, 10, 91, 20, 198, 14, 124, 92, 124, 92, 124, 2, 124, 92, 8, 14, 20, 14, 92, 14, 6, 14, 10, 14, 5, 4, 14, 3, 13, 92, 2, 4, 5, 2, 92, 2, 7, 11, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 2, 4, 5, 2, 11, 2, 7, 4, 5, 4, 5, 4, 5, 2, 6, 7, 6, 2, 3, 2, 14, 16, 2, 3, 2, 4, 5, 2, 6, 2, 7, 2, 8, 2, 6, 2, 9, 4, 2, 5, 10, 11, 10, 12, 4, 6, 5, 6, 4, 5, 2, 4, 5, 2, 14, 91, 14, 91, 14, 3, 6, 10, 13, 3, 13, 6, 13, 16, 13, 14, 2, 17, 13, 128, 17, 13, 17, 13, 92, 14, 92, 17, 14, 17, 14, 128, 14, 128, 14, 92, 14, 2, 14, 2, 128, 199, 200, 14, 8, 199, 200, 14, 2, 14, 2, 17, 14, 13, 17, 14, 17, 14, 17, 14, 17, 2, 14, 2, 14, 17, 14, 17, 14, 92, 14, 92, 17, 2, 14, 17, 2, 14, 17, 14, 13, 14, 92, 17, 2, 14, 2, 14, 17, 14, 17, 14, 2, 17, 14, 97, 102, 17, 14, 92, 8, 17, 14, 17, 14, 92, 17, 2, 14, 124, 92, 124, 14, 92, 2, 17, 8, 92, 124, 14, 124, 92, 124, 92, 2, 16, 2, 16, 14, 8, 92, 14, 92, 124, 92, 8, 2, 14, 124, 14, 92, 2, 14, 92, 124, 14, 124, 92, 124, 14, 2, 92, 2, 8, 14, 2, 14, 2, 17, 14, 124, 92, 124, 92, 124, 92, 2, 92, 14, 2, 14, 92, 124, 92, 8, 92, 124, 14, 92, 14, 124, 92, 124, 14, 124, 14, 124, 92, 14, 124, 92, 124, 92, 124, 92, 14, 2, 8, 2, 92, 14, 124, 92, 124, 92, 124, 92, 124, 92, 14, 2, 14, 8, 14, 124, 92, 124, 92, 124, 92, 2, 14, 92, 14, 124, 92, 124, 92, 124, 92, 2, 14, 8, 2, 14, 92, 124, 92, 124, 92, 124, 92, 14, 8, 14, 92, 124, 92, 124, 92, 8, 17, 2, 13, 14, 124, 92, 124, 92, 2, 9, 12, 8, 17, 14, 124, 92, 124, 92, 124, 92, 14, 124, 14, 92, 14, 92, 124, 14, 92, 2, 92, 14, 92, 124, 92, 14, 92, 124, 92, 2, 14, 2, 14, 124, 92, 124, 92, 14, 2, 8, 17, 2, 14, 92, 124, 92, 124, 92, 124, 92, 14, 92, 14, 92, 8, 14, 124, 92, 124, 92, 124, 92, 14, 8, 14, 92, 124, 2, 17, 13, 3, 13, 2, 14, 128, 2, 14, 16, 14, 8, 2, 14, 92, 2, 14, 92, 2, 13, 91, 2, 13, 8, 17, 14, 9, 12, 17, 2, 14, 92, 14, 124, 92, 91, 2, 91, 14, 13, 92, 2, 16, 13, 124, 92, 13, 124, 16, 92, 13, 92, 13, 92, 13, 92, 13, 17, 13, 17, 107, 20, 107, 20, 107, 20, 107, 20, 107, 20, 107, 20, 107, 20, 107, 20, 107, 20, 107, 20, 107, 20, 107, 20, 107, 20, 107, 6, 20, 6, 20, 107, 6, 20, 6, 20, 107, 6, 20, 6, 20, 107, 6, 20, 6, 20, 107, 6, 20, 6, 20, 107, 20, 8, 13, 92, 13, 92, 13, 92, 13, 92, 13, 2, 92, 14, 92, 91, 8, 14, 92, 8, 3, 14, 17, 92, 201, 202, 92, 8, 2, 17, 13, 17, 3, 17, 13, 17, 14, 6, 13, 17, 13, 10, 13, 14, 16, 92);
var _gencat = Uint8Array.of(25, 22, 17, 19, 13, 14, 18, 12, 8, 0, 20, 11, 1, 21, 4, 15, 26, 10, 1, 16, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 2, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 5, 5, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 7, 0, 1, 0, 1, 6, 0, 1, 0, 9, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 2, 1, 0, 2, 1, 0, 0, 0, 0, 0, 23, 24, 0, 0, 0, 0, 1, 9, 9, 21, 21, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 1);
var _toupper = Int32Array.of(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -32, 0, 0, 0, 0, 0, 743, 0, 0, 121, 0, -1, 0, -232, 0, -300, 195, 0, 0, 0, 0, 0, 0, 0, 97, 0, 0, 163, 0, 130, 0, 0, 0, 0, 56, 0, -1, -2, -79, 0, 0, 0, 0, 0, 0, 10815, 0, 0, 0, 10783, 10780, 10782, -210, -206, -205, -202, -203, 42319, 42315, -207, 42280, 42308, -209, -211, 10743, 42305, 10749, -213, -214, 10727, -218, 42307, 42282, -69, -217, -71, -219, 42261, 42258, 0, 0, 84, 0, 0, 0, 0, 0, -38, -37, -31, -64, -63, 0, -62, -57, 0, -47, -54, -8, -86, -80, 7, -116, 0, -96, 0, 0, 0, 0, -15, 0, -48, 0, 0, 3008, 0, 0, -6254, -6253, -6244, -6242, -6243, -6236, -6181, 35266, 0, 35332, 3814, 35384, -59, 0, 8, 0, 74, 86, 100, 128, 112, 126, 0, 9, 0, 0, -7205, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -28, 0, -16, 0, -26, 0, 0, 0, -10795, -10792, 0, 0, 0, 0, 0, -7264, 0, 0, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -928, -38864, 0, -40, 0, -34);
var _tolower = Int32Array.of(0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, -199, 0, -121, 0, 0, 210, 206, 205, 79, 202, 203, 207, 0, 211, 209, 0, 213, 0, 214, 218, 217, 219, 0, 2, 1, 0, 0, -97, -56, -130, 10795, -163, 10792, 0, -195, 69, 71, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 38, 37, 64, 63, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -60, 0, -7, 80, 0, 15, 0, 48, 0, 0, 7264, 0, 38864, 0, 0, 0, 0, 0, 0, 0, 0, 0, -3008, 0, 0, 0, 0, -7615, 0, -8, 0, 0, 0, 0, 0, 0, -8, 0, -74, -9, 0, -86, -100, -112, -128, -126, 0, 0, -7517, -8383, -8262, 28, 0, 16, 0, 26, 0, -10743, -3814, -10727, 0, 0, -10780, -10749, -10783, -10782, -10815, 0, -35332, -42280, 0, -42308, -42319, -42315, -42305, -42258, -42282, -42261, 928, -48, -42307, -35384, 0, 0, 40, 0, 34, 0);
var _totitle = Int32Array.of(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -32, 0, 0, 0, 0, 0, 743, 0, 0, 121, 0, -1, 0, -232, 0, -300, 195, 0, 0, 0, 0, 0, 0, 0, 97, 0, 0, 163, 0, 130, 0, 0, 0, 0, 56, 1, 0, -1, -79, 0, 0, 0, 0, 0, 0, 10815, 0, 0, 0, 10783, 10780, 10782, -210, -206, -205, -202, -203, 42319, 42315, -207, 42280, 42308, -209, -211, 10743, 42305, 10749, -213, -214, 10727, -218, 42307, 42282, -69, -217, -71, -219, 42261, 42258, 0, 0, 84, 0, 0, 0, 0, 0, -38, -37, -31, -64, -63, 0, -62, -57, 0, -47, -54, -8, -86, -80, 7, -116, 0, -96, 0, 0, 0, 0, -15, 0, -48, 0, 0, 0, 0, 0, -6254, -6253, -6244, -6242, -6243, -6236, -6181, 35266, 0, 35332, 3814, 35384, -59, 0, 8, 0, 74, 86, 100, 128, 112, 126, 0, 9, 0, 0, -7205, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -28, 0, -16, 0, -26, 0, 0, 0, -10795, -10792, 0, 0, 0, 0, 0, -7264, 0, 0, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -928, -38864, 0, -40, 0, -34);
function _bbsearch(key, start, end) {
  const isBaseCase = start + 1 == end;
  const pivot = ~~((start + end) / 2);
  if (key < _first[pivot]) {
    return isBaseCase ? -1 : _bbsearch(key, start, pivot);
  } else if (key <= _last[pivot]) {
    return pivot;
  } else {
    return isBaseCase ? -1 : _bbsearch(key, pivot, end);
  }
}
function _property(table, c) {
  const idx = _bbsearch(c, 0, c + 1);
  return idx == -1 ? 0 : table[_idx[idx]];
}
var Unicode = class {
  constructor(logger) {
    Object.seal(this);
  }
  u_gencat(c) {
    return _property(_gencat, c);
  }
  u_iswupper(c) {
    return !!(1 << this.u_gencat(c) & 5);
  }
  u_iswlower(c) {
    return !!(1 << this.u_gencat(c) & 2);
  }
  u_iswspace(c) {
    return !!(1 << this.u_gencat(c) & 4194304);
  }
  u_iswalpha(c) {
    return !!(1 << this.u_gencat(c) & 31);
  }
  u_iswdigit(c) {
    return !!(1 << this.u_gencat(c) & 256);
  }
  u_iswalnum(c) {
    return !!(1 << this.u_gencat(c) & 1823);
  }
  u_iswprint(c) {
    return !!(1 << this.u_gencat(c) & 8388607);
  }
  u_iswcntrl(c) {
    return !!(1 << this.u_gencat(c) & 33554432);
  }
  u_towlower(c) {
    return c + _property(_tolower, c);
  }
  u_towupper(c) {
    return c + _property(_toupper, c);
  }
  u_towtitle(c) {
    return c + _property(_totitle, c);
  }
};

// src/_generated/rts.exports.mjs
function decodeTys(arr, tag) {
  const tys = [];
  while (tag) {
    const i = (tag & 31) - 1;
    if (!arr[i]) {
      throw new WebAssembly.RuntimeError(`decodeTys: unsupported tag ${tag}`);
    }
    tys.push(arr[i]);
    tag >>>= 5;
  }
  return tys;
}
function decodeRtsMk(e, ty) {
  switch (ty) {
    case "JSVal": {
      return (v) => e.rts_mkJSVal(e.context.components.jsvalManager.newJSValzh(v));
    }
    default: {
      const f = `rts_mk${ty}`;
      return (v) => e[f](v);
    }
  }
}
function decodeRtsGet(e, ty) {
  switch (ty) {
    case "JSVal": {
      return (p) => e.context.components.jsvalManager.getJSValzh(e.rts_getJSVal(p));
    }
    default: {
      const f = `rts_get${ty}`;
      return (p) => e[f](p);
    }
  }
}
var Exports = class {
  constructor(components, memory, reentrancy_guard, symbol_table, scheduler, stableptr_manager) {
    this.context = Object.freeze({
      components,
      memory,
      reentrancyGuard: reentrancy_guard,
      symbolTable: symbol_table,
      scheduler,
      stablePtrManager: stableptr_manager,
      callbackStablePtrs: /* @__PURE__ */ new Map(),
      rtsMkFuncs: hsTyCons.map((ty) => decodeRtsMk(this, ty)),
      rtsGetFuncs: hsTyCons.map((ty) => decodeRtsGet(this, ty))
    });
  }
  rts_evalIO(p) {
    return this.context.scheduler.submitCmdCreateThread(
      "createStrictIOThread",
      p
    );
  }
  rts_evalLazyIO(p) {
    return this.context.scheduler.submitCmdCreateThread("createIOThread", p);
  }
  newHaskellCallback(sp, arg_tag, ret_tag, io, finalizer) {
    const arg_mk_funcs = decodeTys(this.context.rtsMkFuncs, arg_tag), ret_get_funcs = decodeTys(this.context.rtsGetFuncs, ret_tag), run_func = this.context.symbolTable.addressOf(
      io ? "base_AsteriusziTopHandler_runIO_closure" : "base_AsteriusziTopHandler_runNonIO_closure"
    ), eval_func = ret_get_funcs.length ? (p) => this.rts_evalIO(p) : (p) => this.rts_evalLazyIO(p);
    if (ret_get_funcs.length > 1) {
      throw new WebAssembly.RuntimeError(`Multiple returns not supported`);
    }
    const cb = async (...args) => {
      try {
        if (args.length < arg_mk_funcs.length) {
          throw new WebAssembly.RuntimeError(
            `Expected ${arg_mk_funcs.length} arguments, got ${args.length}`
          );
        }
        let p = this.context.stablePtrManager.deRefStablePtr(sp);
        for (let i = 0; i < arg_mk_funcs.length; ++i) {
          p = this.rts_apply(p, arg_mk_funcs[i](args[i]));
        }
        p = this.rts_apply(run_func, p);
        const tid = await eval_func(p);
        if (ret_get_funcs.length) {
          return ret_get_funcs[0](this.context.scheduler.getTSOret(tid));
        }
      } finally {
        finalizer();
      }
    };
    this.context.callbackStablePtrs.set(cb, sp);
    return cb;
  }
  freeHaskellCallback(sn) {
    const cb = this.context.components.jsvalManager.getJSValzh(sn);
    this.context.stablePtrManager.freeStablePtr(
      this.context.callbackStablePtrs.get(cb)
    );
    this.context.callbackStablePtrs.delete(cb);
    this.context.components.jsvalManager.freeJSValzh(sn);
  }
};

// src/_generated/rts.fs.mjs
var Device = class {
  constructor(f, console_history) {
    this.flush = f;
    this.consoleHistory = console_history;
    this.history = "";
    this.buffer = "";
    this.decoder = new TextDecoder("utf-8", { fatal: true });
    Object.seal(this);
  }
  read() {
    const r = this.history;
    this.history = "";
    return r;
  }
  write(buf) {
    const str2 = typeof buf === "string" ? buf : this.decoder.decode(buf, { stream: true });
    if (this.consoleHistory) {
      this.history += str2;
    }
    this.buffer += str2;
    const segs = this.buffer.split("\n");
    this.buffer = segs.pop();
    for (const seg of segs) {
      this.flush(seg);
    }
    return buf.length;
  }
};
var FS = class {
  constructor(components) {
    this.components = components;
    this.stdout = new Device(console.log, true);
    this.stderr = new Device(console.error, true);
  }
  read(fd, buf, count) {
    throw new WebAssembly.RuntimeError(
      `Attempting to read(${fd}, ${buf}, ${count})`
    );
  }
  write(fd, buf, count) {
    buf = this.components.memory.expose(buf, count, Uint8Array);
    switch (fd) {
      case 1: {
        return this.stdout.write(buf);
      }
      case 2: {
        return this.stderr.write(buf);
      }
      default: {
        throw new WebAssembly.RuntimeError(
          `Attempting to write(${fd}, ${buf}, ${count})`
        );
      }
    }
  }
  writeNonMemory(fd, data) {
    switch (fd) {
      case 1: {
        this.stdout.write(data);
        break;
      }
      case 2: {
        this.stderr.write(data);
        break;
      }
      default: {
        throw new WebAssembly.RuntimeError(`writeNonMemory(${fd}, ${data})`);
      }
    }
  }
  history(fd) {
    switch (fd) {
      case 1: {
        return this.stdout.read();
      }
      case 2: {
        return this.stderr.read();
      }
      default: {
        throw new WebAssembly.RuntimeError(
          `Attempting to get history of ${fd}`
        );
      }
    }
  }
};

// src/_generated/rts.symtable.mjs
var SymbolTable = class {
  constructor(fn_offset_table, ss_offset_table, table_base, memory_base) {
    this.symbolTable = /* @__PURE__ */ new Map();
    for (const [k, off] of Object.entries(fn_offset_table)) {
      this.symbolTable.set(k, table_base + off);
    }
    for (const [k, off] of Object.entries(ss_offset_table)) {
      this.symbolTable.set(k, memory_base + off);
    }
    Object.freeze(this);
  }
  addressOf(sym) {
    if (!this.symbolTable.has(sym)) {
      throw new WebAssembly.RuntimeError(`${sym} not in symbol table`);
    }
    return this.symbolTable.get(sym);
  }
  allEntries() {
    return this.symbolTable;
  }
};

// src/_generated/rts.wasi.mjs
var WASI = class {
  constructor() {
  }
  get wasiImport() {
    return modulify(this);
  }
  initialize() {
  }
  args_get(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: args_get(${args})`
    );
  }
  args_sizes_get(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: args_sizes_get(${args})`
    );
  }
  environ_get(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: environ_get(${args})`
    );
  }
  environ_sizes_get(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: environ_sizes_get(${args})`
    );
  }
  clock_res_get(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: clock_res_get(${args})`
    );
  }
  clock_time_get(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: clock_time_get(${args})`
    );
  }
  fd_advise(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: fd_advise(${args})`
    );
  }
  fd_allocate(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: fd_allocate(${args})`
    );
  }
  fd_close(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: fd_close(${args})`
    );
  }
  fd_datasync(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: fd_datasync(${args})`
    );
  }
  fd_fdstat_get(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: fd_fdstat_get(${args})`
    );
  }
  fd_fdstat_set_flags(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: fd_fdstat_set_flags(${args})`
    );
  }
  fd_fdstat_set_rights(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: fd_fdstat_set_rights(${args})`
    );
  }
  fd_filestat_get(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: fd_filestat_get(${args})`
    );
  }
  fd_filestat_set_size(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: fd_filestat_set_size(${args})`
    );
  }
  fd_filestat_set_times(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: fd_filestat_set_times(${args})`
    );
  }
  fd_pread(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: fd_pread(${args})`
    );
  }
  fd_prestat_get(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: fd_prestat_get(${args})`
    );
  }
  fd_prestat_dir_name(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: fd_prestat_dir_name(${args})`
    );
  }
  fd_pwrite(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: fd_pwrite(${args})`
    );
  }
  fd_read(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: fd_read(${args})`
    );
  }
  fd_readdir(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: fd_readdir(${args})`
    );
  }
  fd_renumber(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: fd_renumber(${args})`
    );
  }
  fd_seek(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: fd_seek(${args})`
    );
  }
  fd_sync(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: fd_sync(${args})`
    );
  }
  fd_tell(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: fd_tell(${args})`
    );
  }
  fd_write(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: fd_write(${args})`
    );
  }
  path_create_directory(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: path_create_directory(${args})`
    );
  }
  path_filestat_get(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: path_filestat_get(${args})`
    );
  }
  path_filestat_set_times(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: path_filestat_set_times(${args})`
    );
  }
  path_link(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: path_link(${args})`
    );
  }
  path_open(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: path_open(${args})`
    );
  }
  path_readlink(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: path_readlink(${args})`
    );
  }
  path_remove_directory(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: path_remove_directory(${args})`
    );
  }
  path_rename(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: path_rename(${args})`
    );
  }
  path_symlink(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: path_symlink(${args})`
    );
  }
  path_unlink_file(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: path_unlink_file(${args})`
    );
  }
  poll_oneoff(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: poll_oneoff(${args})`
    );
  }
  proc_exit(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: proc_exit(${args})`
    );
  }
  proc_raise(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: proc_raise(${args})`
    );
  }
  sched_yield(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: sched_yield(${args})`
    );
  }
  random_get(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: random_get(${args})`
    );
  }
  sock_recv(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: sock_recv(${args})`
    );
  }
  sock_send(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: sock_send(${args})`
    );
  }
  sock_shutdown(...args) {
    throw new WebAssembly.RuntimeError(
      `Unsupported wasi syscall: sock_shutdown(${args})`
    );
  }
};

// src/_generated/rts.mjs
async function newAsteriusInstance(req) {
  const __asterius_components = {};
  let __asterius_table_base = new WebAssembly.Global(
    { value: "i32", mutable: false },
    req.defaultTableBase
    // TODO: make dynamic.
  ), __asterius_memory_base = new WebAssembly.Global(
    { value: "i32", mutable: false },
    req.defaultMemoryBase
    // TODO: make dynamic.
  );
  let mkSptEntries = function(spt_offset_entries) {
    const absolute_spt_entries = /* @__PURE__ */ new Map();
    for (const [k, off] of spt_offset_entries.entries()) {
      absolute_spt_entries.set(
        k,
        __asterius_memory_base.value + off
      );
    }
    return absolute_spt_entries;
  };
  let mkInfoTable = function(offset_info_tables) {
    if (!(typeof offset_info_table === "undefined")) {
      const absolute_info_tables = /* @__PURE__ */ new Set();
      for (const off of offset_info_tables.keys()) {
        absolute_info_tables.add(
          __asterius_memory_base.value + off
        );
      }
      return absolute_info_tables;
    }
  };
  let __asterius_persistent_state = req.persistentState ? req.persistentState : {}, __asterius_symbol_table = new SymbolTable(
    req.functionsOffsetTable,
    req.staticsOffsetTable,
    __asterius_table_base.value,
    __asterius_memory_base.value
  ), __asterius_spt_entries = mkSptEntries(req.sptOffsetEntries), __asterius_info_tables = mkInfoTable(req.offsetInfoTables), __asterius_reentrancy_guard = new ReentrancyGuard(["Scheduler", "GC"]), __asterius_fs = new FS(__asterius_components), __asterius_logger = new EventLogManager(), __asterius_tracer = new Tracer(__asterius_logger, __asterius_symbol_table), __asterius_static_mblocks = Math.ceil(
    (__asterius_memory_base.value + req.staticBytes) / mblock_size
  ), __asterius_memory = new Memory(__asterius_components), __asterius_memory_trap = new MemoryTrap(
    __asterius_logger,
    __asterius_symbol_table,
    __asterius_memory
  ), __asterius_heapalloc = new HeapAlloc(
    __asterius_memory
  ), __asterius_jsval_manager = new JSValManager(__asterius_components), __asterius_stableptr_manager = new StablePtrManager(), __asterius_stablename_manager = new StableNameManager(
    __asterius_memory,
    __asterius_heapalloc,
    __asterius_symbol_table
  ), __asterius_staticptr_manager = new StaticPtrManager(
    __asterius_memory,
    __asterius_stableptr_manager,
    __asterius_spt_entries
  ), __asterius_scheduler = new Scheduler(
    __asterius_components,
    __asterius_memory,
    __asterius_symbol_table,
    __asterius_stableptr_manager
  ), __asterius_integer_manager = new IntegerManager(), __asterius_time_cbits = new TimeCBits(__asterius_memory, req.targetSpecificModule), __asterius_gc = new GC(
    __asterius_components,
    __asterius_memory,
    __asterius_heapalloc,
    __asterius_stableptr_manager,
    __asterius_stablename_manager,
    __asterius_scheduler,
    __asterius_info_tables,
    __asterius_symbol_table,
    __asterius_reentrancy_guard,
    req.yolo,
    req.gcThreshold
  ), __asterius_float_cbits = new FloatCBits(__asterius_memory), __asterius_messages = new Messages(__asterius_memory, __asterius_fs), __asterius_unicode = new Unicode(), __asterius_exports = new Exports(
    __asterius_components,
    __asterius_memory,
    __asterius_reentrancy_guard,
    __asterius_symbol_table,
    __asterius_scheduler,
    __asterius_stableptr_manager
  ), __asterius_exception_helper = new ExceptionHelper(
    __asterius_memory,
    __asterius_heapalloc,
    __asterius_exports,
    __asterius_info_tables,
    __asterius_symbol_table
  );
  const __asterius_wasi = new WASI(req.progName);
  __asterius_scheduler.exports = __asterius_exports;
  __asterius_components.memory = __asterius_memory;
  __asterius_components.exports = __asterius_exports;
  __asterius_components.heapAlloc = __asterius_heapalloc;
  __asterius_components.symbolTable = __asterius_symbol_table;
  __asterius_components.jsvalManager = __asterius_jsval_manager;
  function __asterius_show_I64(x) {
    return `0x${x.toString(16).padStart(8, "0")}`;
  }
  const __asterius_jsffi_instance = {
    exposeMemory: (p, len, t = Uint8Array) => __asterius_memory.expose(p, len, t),
    newJSValzh: (v) => __asterius_components.jsvalManager.newJSValzh(v),
    getJSValzh: (i) => __asterius_components.jsvalManager.getJSValzh(i),
    freeJSValzh: (i) => __asterius_components.jsvalManager.freeJSValzh(i),
    fs: __asterius_fs,
    stdio: {
      stdout: () => __asterius_fs.history(1),
      stderr: () => __asterius_fs.history(2)
    },
    returnFFIPromise: (promise) => __asterius_scheduler.returnFFIPromise(promise)
  };
  const importObject = Object.assign(
    req.jsffiFactory(__asterius_jsffi_instance),
    {
      wasi_snapshot_preview1: __asterius_wasi.wasiImport,
      env: {
        __memory_base: __asterius_memory_base,
        __table_base: __asterius_table_base
      },
      rts: {
        printI64: (x) => __asterius_fs.writeNonMemory(1, `${__asterius_show_I64(x)}
`),
        assertEqI64: function(x, y) {
          if (x != y) {
            throw new WebAssembly.RuntimeError(`unequal I64: ${x}, ${y}`);
          }
        },
        print: (x) => __asterius_fs.writeNonMemory(1, `${x}
`)
      },
      fs: {
        read: (fd, buf, count) => __asterius_fs.read(fd, buf, count),
        write: (fd, buf, count) => __asterius_fs.write(fd, buf, count)
      },
      posix: modulify(new req.targetSpecificModule.posix(__asterius_memory, rts_constants_exports)),
      time: modulify(__asterius_time_cbits),
      // cannot name this float since float is a keyword.
      floatCBits: modulify(__asterius_float_cbits),
      GC: modulify(__asterius_gc),
      ExceptionHelper: modulify(__asterius_exception_helper),
      HeapAlloc: modulify(__asterius_heapalloc),
      Integer: modulify(__asterius_integer_manager),
      Memory: modulify(__asterius_memory),
      MemoryTrap: modulify(__asterius_memory_trap),
      Messages: modulify(__asterius_messages),
      StablePtr: modulify(__asterius_stableptr_manager),
      StableName: modulify(__asterius_stablename_manager),
      StaticPtr: modulify(__asterius_staticptr_manager),
      Unicode: modulify(__asterius_unicode),
      Tracing: modulify(__asterius_tracer),
      Exports: {
        newHaskellCallback: (sp, arg_tag, ret_tag, io, oneshot) => {
          let sn = [];
          let cb = __asterius_exports.newHaskellCallback(
            sp,
            arg_tag,
            ret_tag,
            io,
            oneshot ? () => __asterius_exports.freeHaskellCallback(sn[0]) : () => {
            }
          );
          sn[0] = __asterius_components.jsvalManager.newJSValzh(cb);
          return sn[0];
        },
        freeHaskellCallback: (sn) => __asterius_exports.freeHaskellCallback(sn)
      },
      Scheduler: modulify(__asterius_scheduler)
    }
  );
  return WebAssembly.instantiate(req.module, importObject).then((i) => {
    i.exports.memory.grow(1024);
    if (req.pic) {
      i.exports.__wasm_apply_relocs();
    }
    __asterius_wasi.initialize(i);
    Object.assign(__asterius_exports, i.exports);
    __asterius_memory.init(i.exports.memory, __asterius_static_mblocks);
    __asterius_heapalloc.init();
    __asterius_scheduler.setGC(__asterius_gc);
    for (const [f, off, a, r, i2] of req.exportsStaticOffsets) {
      __asterius_exports[f] = __asterius_exports.newHaskellCallback(
        __asterius_stableptr_manager.newStablePtr(
          __asterius_memory_base.value + off
        ),
        a,
        r,
        i2,
        () => {
        }
      );
    }
    __asterius_exports.hs_init();
    return Object.assign(__asterius_jsffi_instance, {
      exports: __asterius_exports,
      symbolTable: __asterius_symbol_table,
      persistentState: __asterius_persistent_state
    });
  });
}

// src/utils.ts
function arrayBufferToBase64(buffer) {
  let binary2 = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary2 += String.fromCharCode(bytes[i]);
  }
  return globalThis.btoa(binary2);
}

// node_modules/pako/dist/pako.esm.mjs
var pako_esm_exports = {};
__export(pako_esm_exports, {
  Deflate: () => Deflate_1,
  Inflate: () => Inflate_1,
  constants: () => constants_1,
  default: () => pako,
  deflate: () => deflate_1,
  deflateRaw: () => deflateRaw_1,
  gzip: () => gzip_1,
  inflate: () => inflate_1,
  inflateRaw: () => inflateRaw_1,
  ungzip: () => ungzip_1
});
var Z_FIXED$1 = 4;
var Z_BINARY = 0;
var Z_TEXT = 1;
var Z_UNKNOWN$1 = 2;
function zero$1(buf) {
  let len = buf.length;
  while (--len >= 0) {
    buf[len] = 0;
  }
}
var STORED_BLOCK = 0;
var STATIC_TREES = 1;
var DYN_TREES = 2;
var MIN_MATCH$1 = 3;
var MAX_MATCH$1 = 258;
var LENGTH_CODES$1 = 29;
var LITERALS$1 = 256;
var L_CODES$1 = LITERALS$1 + 1 + LENGTH_CODES$1;
var D_CODES$1 = 30;
var BL_CODES$1 = 19;
var HEAP_SIZE$1 = 2 * L_CODES$1 + 1;
var MAX_BITS$1 = 15;
var Buf_size = 16;
var MAX_BL_BITS = 7;
var END_BLOCK = 256;
var REP_3_6 = 16;
var REPZ_3_10 = 17;
var REPZ_11_138 = 18;
var extra_lbits = (
  /* extra bits for each length code */
  new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0])
);
var extra_dbits = (
  /* extra bits for each distance code */
  new Uint8Array([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13])
);
var extra_blbits = (
  /* extra bits for each bit length code */
  new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7])
);
var bl_order = new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
var DIST_CODE_LEN = 512;
var static_ltree = new Array((L_CODES$1 + 2) * 2);
zero$1(static_ltree);
var static_dtree = new Array(D_CODES$1 * 2);
zero$1(static_dtree);
var _dist_code = new Array(DIST_CODE_LEN);
zero$1(_dist_code);
var _length_code = new Array(MAX_MATCH$1 - MIN_MATCH$1 + 1);
zero$1(_length_code);
var base_length = new Array(LENGTH_CODES$1);
zero$1(base_length);
var base_dist = new Array(D_CODES$1);
zero$1(base_dist);
function StaticTreeDesc(static_tree, extra_bits, extra_base, elems, max_length) {
  this.static_tree = static_tree;
  this.extra_bits = extra_bits;
  this.extra_base = extra_base;
  this.elems = elems;
  this.max_length = max_length;
  this.has_stree = static_tree && static_tree.length;
}
var static_l_desc;
var static_d_desc;
var static_bl_desc;
function TreeDesc(dyn_tree, stat_desc) {
  this.dyn_tree = dyn_tree;
  this.max_code = 0;
  this.stat_desc = stat_desc;
}
var d_code = (dist) => {
  return dist < 256 ? _dist_code[dist] : _dist_code[256 + (dist >>> 7)];
};
var put_short = (s, w) => {
  s.pending_buf[s.pending++] = w & 255;
  s.pending_buf[s.pending++] = w >>> 8 & 255;
};
var send_bits = (s, value, length) => {
  if (s.bi_valid > Buf_size - length) {
    s.bi_buf |= value << s.bi_valid & 65535;
    put_short(s, s.bi_buf);
    s.bi_buf = value >> Buf_size - s.bi_valid;
    s.bi_valid += length - Buf_size;
  } else {
    s.bi_buf |= value << s.bi_valid & 65535;
    s.bi_valid += length;
  }
};
var send_code = (s, c, tree) => {
  send_bits(
    s,
    tree[c * 2],
    tree[c * 2 + 1]
    /*.Len*/
  );
};
var bi_reverse = (code, len) => {
  let res = 0;
  do {
    res |= code & 1;
    code >>>= 1;
    res <<= 1;
  } while (--len > 0);
  return res >>> 1;
};
var bi_flush = (s) => {
  if (s.bi_valid === 16) {
    put_short(s, s.bi_buf);
    s.bi_buf = 0;
    s.bi_valid = 0;
  } else if (s.bi_valid >= 8) {
    s.pending_buf[s.pending++] = s.bi_buf & 255;
    s.bi_buf >>= 8;
    s.bi_valid -= 8;
  }
};
var gen_bitlen = (s, desc) => {
  const tree = desc.dyn_tree;
  const max_code = desc.max_code;
  const stree = desc.stat_desc.static_tree;
  const has_stree = desc.stat_desc.has_stree;
  const extra = desc.stat_desc.extra_bits;
  const base = desc.stat_desc.extra_base;
  const max_length = desc.stat_desc.max_length;
  let h;
  let n, m;
  let bits;
  let xbits;
  let f;
  let overflow = 0;
  for (bits = 0; bits <= MAX_BITS$1; bits++) {
    s.bl_count[bits] = 0;
  }
  tree[s.heap[s.heap_max] * 2 + 1] = 0;
  for (h = s.heap_max + 1; h < HEAP_SIZE$1; h++) {
    n = s.heap[h];
    bits = tree[tree[n * 2 + 1] * 2 + 1] + 1;
    if (bits > max_length) {
      bits = max_length;
      overflow++;
    }
    tree[n * 2 + 1] = bits;
    if (n > max_code) {
      continue;
    }
    s.bl_count[bits]++;
    xbits = 0;
    if (n >= base) {
      xbits = extra[n - base];
    }
    f = tree[n * 2];
    s.opt_len += f * (bits + xbits);
    if (has_stree) {
      s.static_len += f * (stree[n * 2 + 1] + xbits);
    }
  }
  if (overflow === 0) {
    return;
  }
  do {
    bits = max_length - 1;
    while (s.bl_count[bits] === 0) {
      bits--;
    }
    s.bl_count[bits]--;
    s.bl_count[bits + 1] += 2;
    s.bl_count[max_length]--;
    overflow -= 2;
  } while (overflow > 0);
  for (bits = max_length; bits !== 0; bits--) {
    n = s.bl_count[bits];
    while (n !== 0) {
      m = s.heap[--h];
      if (m > max_code) {
        continue;
      }
      if (tree[m * 2 + 1] !== bits) {
        s.opt_len += (bits - tree[m * 2 + 1]) * tree[m * 2];
        tree[m * 2 + 1] = bits;
      }
      n--;
    }
  }
};
var gen_codes = (tree, max_code, bl_count) => {
  const next_code = new Array(MAX_BITS$1 + 1);
  let code = 0;
  let bits;
  let n;
  for (bits = 1; bits <= MAX_BITS$1; bits++) {
    code = code + bl_count[bits - 1] << 1;
    next_code[bits] = code;
  }
  for (n = 0; n <= max_code; n++) {
    let len = tree[n * 2 + 1];
    if (len === 0) {
      continue;
    }
    tree[n * 2] = bi_reverse(next_code[len]++, len);
  }
};
var tr_static_init = () => {
  let n;
  let bits;
  let length;
  let code;
  let dist;
  const bl_count = new Array(MAX_BITS$1 + 1);
  length = 0;
  for (code = 0; code < LENGTH_CODES$1 - 1; code++) {
    base_length[code] = length;
    for (n = 0; n < 1 << extra_lbits[code]; n++) {
      _length_code[length++] = code;
    }
  }
  _length_code[length - 1] = code;
  dist = 0;
  for (code = 0; code < 16; code++) {
    base_dist[code] = dist;
    for (n = 0; n < 1 << extra_dbits[code]; n++) {
      _dist_code[dist++] = code;
    }
  }
  dist >>= 7;
  for (; code < D_CODES$1; code++) {
    base_dist[code] = dist << 7;
    for (n = 0; n < 1 << extra_dbits[code] - 7; n++) {
      _dist_code[256 + dist++] = code;
    }
  }
  for (bits = 0; bits <= MAX_BITS$1; bits++) {
    bl_count[bits] = 0;
  }
  n = 0;
  while (n <= 143) {
    static_ltree[n * 2 + 1] = 8;
    n++;
    bl_count[8]++;
  }
  while (n <= 255) {
    static_ltree[n * 2 + 1] = 9;
    n++;
    bl_count[9]++;
  }
  while (n <= 279) {
    static_ltree[n * 2 + 1] = 7;
    n++;
    bl_count[7]++;
  }
  while (n <= 287) {
    static_ltree[n * 2 + 1] = 8;
    n++;
    bl_count[8]++;
  }
  gen_codes(static_ltree, L_CODES$1 + 1, bl_count);
  for (n = 0; n < D_CODES$1; n++) {
    static_dtree[n * 2 + 1] = 5;
    static_dtree[n * 2] = bi_reverse(n, 5);
  }
  static_l_desc = new StaticTreeDesc(static_ltree, extra_lbits, LITERALS$1 + 1, L_CODES$1, MAX_BITS$1);
  static_d_desc = new StaticTreeDesc(static_dtree, extra_dbits, 0, D_CODES$1, MAX_BITS$1);
  static_bl_desc = new StaticTreeDesc(new Array(0), extra_blbits, 0, BL_CODES$1, MAX_BL_BITS);
};
var init_block = (s) => {
  let n;
  for (n = 0; n < L_CODES$1; n++) {
    s.dyn_ltree[n * 2] = 0;
  }
  for (n = 0; n < D_CODES$1; n++) {
    s.dyn_dtree[n * 2] = 0;
  }
  for (n = 0; n < BL_CODES$1; n++) {
    s.bl_tree[n * 2] = 0;
  }
  s.dyn_ltree[END_BLOCK * 2] = 1;
  s.opt_len = s.static_len = 0;
  s.sym_next = s.matches = 0;
};
var bi_windup = (s) => {
  if (s.bi_valid > 8) {
    put_short(s, s.bi_buf);
  } else if (s.bi_valid > 0) {
    s.pending_buf[s.pending++] = s.bi_buf;
  }
  s.bi_buf = 0;
  s.bi_valid = 0;
};
var smaller = (tree, n, m, depth) => {
  const _n2 = n * 2;
  const _m2 = m * 2;
  return tree[_n2] < tree[_m2] || tree[_n2] === tree[_m2] && depth[n] <= depth[m];
};
var pqdownheap = (s, tree, k) => {
  const v = s.heap[k];
  let j = k << 1;
  while (j <= s.heap_len) {
    if (j < s.heap_len && smaller(tree, s.heap[j + 1], s.heap[j], s.depth)) {
      j++;
    }
    if (smaller(tree, v, s.heap[j], s.depth)) {
      break;
    }
    s.heap[k] = s.heap[j];
    k = j;
    j <<= 1;
  }
  s.heap[k] = v;
};
var compress_block = (s, ltree, dtree) => {
  let dist;
  let lc;
  let sx = 0;
  let code;
  let extra;
  if (s.sym_next !== 0) {
    do {
      dist = s.pending_buf[s.sym_buf + sx++] & 255;
      dist += (s.pending_buf[s.sym_buf + sx++] & 255) << 8;
      lc = s.pending_buf[s.sym_buf + sx++];
      if (dist === 0) {
        send_code(s, lc, ltree);
      } else {
        code = _length_code[lc];
        send_code(s, code + LITERALS$1 + 1, ltree);
        extra = extra_lbits[code];
        if (extra !== 0) {
          lc -= base_length[code];
          send_bits(s, lc, extra);
        }
        dist--;
        code = d_code(dist);
        send_code(s, code, dtree);
        extra = extra_dbits[code];
        if (extra !== 0) {
          dist -= base_dist[code];
          send_bits(s, dist, extra);
        }
      }
    } while (sx < s.sym_next);
  }
  send_code(s, END_BLOCK, ltree);
};
var build_tree = (s, desc) => {
  const tree = desc.dyn_tree;
  const stree = desc.stat_desc.static_tree;
  const has_stree = desc.stat_desc.has_stree;
  const elems = desc.stat_desc.elems;
  let n, m;
  let max_code = -1;
  let node;
  s.heap_len = 0;
  s.heap_max = HEAP_SIZE$1;
  for (n = 0; n < elems; n++) {
    if (tree[n * 2] !== 0) {
      s.heap[++s.heap_len] = max_code = n;
      s.depth[n] = 0;
    } else {
      tree[n * 2 + 1] = 0;
    }
  }
  while (s.heap_len < 2) {
    node = s.heap[++s.heap_len] = max_code < 2 ? ++max_code : 0;
    tree[node * 2] = 1;
    s.depth[node] = 0;
    s.opt_len--;
    if (has_stree) {
      s.static_len -= stree[node * 2 + 1];
    }
  }
  desc.max_code = max_code;
  for (n = s.heap_len >> 1; n >= 1; n--) {
    pqdownheap(s, tree, n);
  }
  node = elems;
  do {
    n = s.heap[
      1
      /*SMALLEST*/
    ];
    s.heap[
      1
      /*SMALLEST*/
    ] = s.heap[s.heap_len--];
    pqdownheap(
      s,
      tree,
      1
      /*SMALLEST*/
    );
    m = s.heap[
      1
      /*SMALLEST*/
    ];
    s.heap[--s.heap_max] = n;
    s.heap[--s.heap_max] = m;
    tree[node * 2] = tree[n * 2] + tree[m * 2];
    s.depth[node] = (s.depth[n] >= s.depth[m] ? s.depth[n] : s.depth[m]) + 1;
    tree[n * 2 + 1] = tree[m * 2 + 1] = node;
    s.heap[
      1
      /*SMALLEST*/
    ] = node++;
    pqdownheap(
      s,
      tree,
      1
      /*SMALLEST*/
    );
  } while (s.heap_len >= 2);
  s.heap[--s.heap_max] = s.heap[
    1
    /*SMALLEST*/
  ];
  gen_bitlen(s, desc);
  gen_codes(tree, max_code, s.bl_count);
};
var scan_tree = (s, tree, max_code) => {
  let n;
  let prevlen = -1;
  let curlen;
  let nextlen = tree[0 * 2 + 1];
  let count = 0;
  let max_count = 7;
  let min_count = 4;
  if (nextlen === 0) {
    max_count = 138;
    min_count = 3;
  }
  tree[(max_code + 1) * 2 + 1] = 65535;
  for (n = 0; n <= max_code; n++) {
    curlen = nextlen;
    nextlen = tree[(n + 1) * 2 + 1];
    if (++count < max_count && curlen === nextlen) {
      continue;
    } else if (count < min_count) {
      s.bl_tree[curlen * 2] += count;
    } else if (curlen !== 0) {
      if (curlen !== prevlen) {
        s.bl_tree[curlen * 2]++;
      }
      s.bl_tree[REP_3_6 * 2]++;
    } else if (count <= 10) {
      s.bl_tree[REPZ_3_10 * 2]++;
    } else {
      s.bl_tree[REPZ_11_138 * 2]++;
    }
    count = 0;
    prevlen = curlen;
    if (nextlen === 0) {
      max_count = 138;
      min_count = 3;
    } else if (curlen === nextlen) {
      max_count = 6;
      min_count = 3;
    } else {
      max_count = 7;
      min_count = 4;
    }
  }
};
var send_tree = (s, tree, max_code) => {
  let n;
  let prevlen = -1;
  let curlen;
  let nextlen = tree[0 * 2 + 1];
  let count = 0;
  let max_count = 7;
  let min_count = 4;
  if (nextlen === 0) {
    max_count = 138;
    min_count = 3;
  }
  for (n = 0; n <= max_code; n++) {
    curlen = nextlen;
    nextlen = tree[(n + 1) * 2 + 1];
    if (++count < max_count && curlen === nextlen) {
      continue;
    } else if (count < min_count) {
      do {
        send_code(s, curlen, s.bl_tree);
      } while (--count !== 0);
    } else if (curlen !== 0) {
      if (curlen !== prevlen) {
        send_code(s, curlen, s.bl_tree);
        count--;
      }
      send_code(s, REP_3_6, s.bl_tree);
      send_bits(s, count - 3, 2);
    } else if (count <= 10) {
      send_code(s, REPZ_3_10, s.bl_tree);
      send_bits(s, count - 3, 3);
    } else {
      send_code(s, REPZ_11_138, s.bl_tree);
      send_bits(s, count - 11, 7);
    }
    count = 0;
    prevlen = curlen;
    if (nextlen === 0) {
      max_count = 138;
      min_count = 3;
    } else if (curlen === nextlen) {
      max_count = 6;
      min_count = 3;
    } else {
      max_count = 7;
      min_count = 4;
    }
  }
};
var build_bl_tree = (s) => {
  let max_blindex;
  scan_tree(s, s.dyn_ltree, s.l_desc.max_code);
  scan_tree(s, s.dyn_dtree, s.d_desc.max_code);
  build_tree(s, s.bl_desc);
  for (max_blindex = BL_CODES$1 - 1; max_blindex >= 3; max_blindex--) {
    if (s.bl_tree[bl_order[max_blindex] * 2 + 1] !== 0) {
      break;
    }
  }
  s.opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;
  return max_blindex;
};
var send_all_trees = (s, lcodes, dcodes, blcodes) => {
  let rank2;
  send_bits(s, lcodes - 257, 5);
  send_bits(s, dcodes - 1, 5);
  send_bits(s, blcodes - 4, 4);
  for (rank2 = 0; rank2 < blcodes; rank2++) {
    send_bits(s, s.bl_tree[bl_order[rank2] * 2 + 1], 3);
  }
  send_tree(s, s.dyn_ltree, lcodes - 1);
  send_tree(s, s.dyn_dtree, dcodes - 1);
};
var detect_data_type = (s) => {
  let block_mask = 4093624447;
  let n;
  for (n = 0; n <= 31; n++, block_mask >>>= 1) {
    if (block_mask & 1 && s.dyn_ltree[n * 2] !== 0) {
      return Z_BINARY;
    }
  }
  if (s.dyn_ltree[9 * 2] !== 0 || s.dyn_ltree[10 * 2] !== 0 || s.dyn_ltree[13 * 2] !== 0) {
    return Z_TEXT;
  }
  for (n = 32; n < LITERALS$1; n++) {
    if (s.dyn_ltree[n * 2] !== 0) {
      return Z_TEXT;
    }
  }
  return Z_BINARY;
};
var static_init_done = false;
var _tr_init$1 = (s) => {
  if (!static_init_done) {
    tr_static_init();
    static_init_done = true;
  }
  s.l_desc = new TreeDesc(s.dyn_ltree, static_l_desc);
  s.d_desc = new TreeDesc(s.dyn_dtree, static_d_desc);
  s.bl_desc = new TreeDesc(s.bl_tree, static_bl_desc);
  s.bi_buf = 0;
  s.bi_valid = 0;
  init_block(s);
};
var _tr_stored_block$1 = (s, buf, stored_len, last) => {
  send_bits(s, (STORED_BLOCK << 1) + (last ? 1 : 0), 3);
  bi_windup(s);
  put_short(s, stored_len);
  put_short(s, ~stored_len);
  if (stored_len) {
    s.pending_buf.set(s.window.subarray(buf, buf + stored_len), s.pending);
  }
  s.pending += stored_len;
};
var _tr_align$1 = (s) => {
  send_bits(s, STATIC_TREES << 1, 3);
  send_code(s, END_BLOCK, static_ltree);
  bi_flush(s);
};
var _tr_flush_block$1 = (s, buf, stored_len, last) => {
  let opt_lenb, static_lenb;
  let max_blindex = 0;
  if (s.level > 0) {
    if (s.strm.data_type === Z_UNKNOWN$1) {
      s.strm.data_type = detect_data_type(s);
    }
    build_tree(s, s.l_desc);
    build_tree(s, s.d_desc);
    max_blindex = build_bl_tree(s);
    opt_lenb = s.opt_len + 3 + 7 >>> 3;
    static_lenb = s.static_len + 3 + 7 >>> 3;
    if (static_lenb <= opt_lenb) {
      opt_lenb = static_lenb;
    }
  } else {
    opt_lenb = static_lenb = stored_len + 5;
  }
  if (stored_len + 4 <= opt_lenb && buf !== -1) {
    _tr_stored_block$1(s, buf, stored_len, last);
  } else if (s.strategy === Z_FIXED$1 || static_lenb === opt_lenb) {
    send_bits(s, (STATIC_TREES << 1) + (last ? 1 : 0), 3);
    compress_block(s, static_ltree, static_dtree);
  } else {
    send_bits(s, (DYN_TREES << 1) + (last ? 1 : 0), 3);
    send_all_trees(s, s.l_desc.max_code + 1, s.d_desc.max_code + 1, max_blindex + 1);
    compress_block(s, s.dyn_ltree, s.dyn_dtree);
  }
  init_block(s);
  if (last) {
    bi_windup(s);
  }
};
var _tr_tally$1 = (s, dist, lc) => {
  s.pending_buf[s.sym_buf + s.sym_next++] = dist;
  s.pending_buf[s.sym_buf + s.sym_next++] = dist >> 8;
  s.pending_buf[s.sym_buf + s.sym_next++] = lc;
  if (dist === 0) {
    s.dyn_ltree[lc * 2]++;
  } else {
    s.matches++;
    dist--;
    s.dyn_ltree[(_length_code[lc] + LITERALS$1 + 1) * 2]++;
    s.dyn_dtree[d_code(dist) * 2]++;
  }
  return s.sym_next === s.sym_end;
};
var _tr_init_1 = _tr_init$1;
var _tr_stored_block_1 = _tr_stored_block$1;
var _tr_flush_block_1 = _tr_flush_block$1;
var _tr_tally_1 = _tr_tally$1;
var _tr_align_1 = _tr_align$1;
var trees = {
  _tr_init: _tr_init_1,
  _tr_stored_block: _tr_stored_block_1,
  _tr_flush_block: _tr_flush_block_1,
  _tr_tally: _tr_tally_1,
  _tr_align: _tr_align_1
};
var adler32 = (adler, buf, len, pos) => {
  let s1 = adler & 65535 | 0, s2 = adler >>> 16 & 65535 | 0, n = 0;
  while (len !== 0) {
    n = len > 2e3 ? 2e3 : len;
    len -= n;
    do {
      s1 = s1 + buf[pos++] | 0;
      s2 = s2 + s1 | 0;
    } while (--n);
    s1 %= 65521;
    s2 %= 65521;
  }
  return s1 | s2 << 16 | 0;
};
var adler32_1 = adler32;
var makeTable = () => {
  let c, table = [];
  for (var n = 0; n < 256; n++) {
    c = n;
    for (var k = 0; k < 8; k++) {
      c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
    }
    table[n] = c;
  }
  return table;
};
var crcTable = new Uint32Array(makeTable());
var crc32 = (crc, buf, len, pos) => {
  const t = crcTable;
  const end = pos + len;
  crc ^= -1;
  for (let i = pos; i < end; i++) {
    crc = crc >>> 8 ^ t[(crc ^ buf[i]) & 255];
  }
  return crc ^ -1;
};
var crc32_1 = crc32;
var messages = {
  2: "need dictionary",
  /* Z_NEED_DICT       2  */
  1: "stream end",
  /* Z_STREAM_END      1  */
  0: "",
  /* Z_OK              0  */
  "-1": "file error",
  /* Z_ERRNO         (-1) */
  "-2": "stream error",
  /* Z_STREAM_ERROR  (-2) */
  "-3": "data error",
  /* Z_DATA_ERROR    (-3) */
  "-4": "insufficient memory",
  /* Z_MEM_ERROR     (-4) */
  "-5": "buffer error",
  /* Z_BUF_ERROR     (-5) */
  "-6": "incompatible version"
  /* Z_VERSION_ERROR (-6) */
};
var constants$2 = {
  /* Allowed flush values; see deflate() and inflate() below for details */
  Z_NO_FLUSH: 0,
  Z_PARTIAL_FLUSH: 1,
  Z_SYNC_FLUSH: 2,
  Z_FULL_FLUSH: 3,
  Z_FINISH: 4,
  Z_BLOCK: 5,
  Z_TREES: 6,
  /* Return codes for the compression/decompression functions. Negative values
  * are errors, positive values are used for special but normal events.
  */
  Z_OK: 0,
  Z_STREAM_END: 1,
  Z_NEED_DICT: 2,
  Z_ERRNO: -1,
  Z_STREAM_ERROR: -2,
  Z_DATA_ERROR: -3,
  Z_MEM_ERROR: -4,
  Z_BUF_ERROR: -5,
  //Z_VERSION_ERROR: -6,
  /* compression levels */
  Z_NO_COMPRESSION: 0,
  Z_BEST_SPEED: 1,
  Z_BEST_COMPRESSION: 9,
  Z_DEFAULT_COMPRESSION: -1,
  Z_FILTERED: 1,
  Z_HUFFMAN_ONLY: 2,
  Z_RLE: 3,
  Z_FIXED: 4,
  Z_DEFAULT_STRATEGY: 0,
  /* Possible values of the data_type field (though see inflate()) */
  Z_BINARY: 0,
  Z_TEXT: 1,
  //Z_ASCII:                1, // = Z_TEXT (deprecated)
  Z_UNKNOWN: 2,
  /* The deflate compression method */
  Z_DEFLATED: 8
  //Z_NULL:                 null // Use -1 or null inline, depending on var type
};
var { _tr_init, _tr_stored_block, _tr_flush_block, _tr_tally, _tr_align } = trees;
var {
  Z_NO_FLUSH: Z_NO_FLUSH$2,
  Z_PARTIAL_FLUSH,
  Z_FULL_FLUSH: Z_FULL_FLUSH$1,
  Z_FINISH: Z_FINISH$3,
  Z_BLOCK: Z_BLOCK$1,
  Z_OK: Z_OK$3,
  Z_STREAM_END: Z_STREAM_END$3,
  Z_STREAM_ERROR: Z_STREAM_ERROR$2,
  Z_DATA_ERROR: Z_DATA_ERROR$2,
  Z_BUF_ERROR: Z_BUF_ERROR$1,
  Z_DEFAULT_COMPRESSION: Z_DEFAULT_COMPRESSION$1,
  Z_FILTERED,
  Z_HUFFMAN_ONLY,
  Z_RLE,
  Z_FIXED,
  Z_DEFAULT_STRATEGY: Z_DEFAULT_STRATEGY$1,
  Z_UNKNOWN,
  Z_DEFLATED: Z_DEFLATED$2
} = constants$2;
var MAX_MEM_LEVEL = 9;
var MAX_WBITS$1 = 15;
var DEF_MEM_LEVEL = 8;
var LENGTH_CODES = 29;
var LITERALS = 256;
var L_CODES = LITERALS + 1 + LENGTH_CODES;
var D_CODES = 30;
var BL_CODES = 19;
var HEAP_SIZE = 2 * L_CODES + 1;
var MAX_BITS = 15;
var MIN_MATCH = 3;
var MAX_MATCH = 258;
var MIN_LOOKAHEAD = MAX_MATCH + MIN_MATCH + 1;
var PRESET_DICT = 32;
var INIT_STATE = 42;
var GZIP_STATE = 57;
var EXTRA_STATE = 69;
var NAME_STATE = 73;
var COMMENT_STATE = 91;
var HCRC_STATE = 103;
var BUSY_STATE = 113;
var FINISH_STATE = 666;
var BS_NEED_MORE = 1;
var BS_BLOCK_DONE = 2;
var BS_FINISH_STARTED = 3;
var BS_FINISH_DONE = 4;
var OS_CODE = 3;
var err = (strm, errorCode) => {
  strm.msg = messages[errorCode];
  return errorCode;
};
var rank = (f) => {
  return f * 2 - (f > 4 ? 9 : 0);
};
var zero = (buf) => {
  let len = buf.length;
  while (--len >= 0) {
    buf[len] = 0;
  }
};
var slide_hash = (s) => {
  let n, m;
  let p;
  let wsize = s.w_size;
  n = s.hash_size;
  p = n;
  do {
    m = s.head[--p];
    s.head[p] = m >= wsize ? m - wsize : 0;
  } while (--n);
  n = wsize;
  p = n;
  do {
    m = s.prev[--p];
    s.prev[p] = m >= wsize ? m - wsize : 0;
  } while (--n);
};
var HASH_ZLIB = (s, prev, data) => (prev << s.hash_shift ^ data) & s.hash_mask;
var HASH = HASH_ZLIB;
var flush_pending = (strm) => {
  const s = strm.state;
  let len = s.pending;
  if (len > strm.avail_out) {
    len = strm.avail_out;
  }
  if (len === 0) {
    return;
  }
  strm.output.set(s.pending_buf.subarray(s.pending_out, s.pending_out + len), strm.next_out);
  strm.next_out += len;
  s.pending_out += len;
  strm.total_out += len;
  strm.avail_out -= len;
  s.pending -= len;
  if (s.pending === 0) {
    s.pending_out = 0;
  }
};
var flush_block_only = (s, last) => {
  _tr_flush_block(s, s.block_start >= 0 ? s.block_start : -1, s.strstart - s.block_start, last);
  s.block_start = s.strstart;
  flush_pending(s.strm);
};
var put_byte = (s, b) => {
  s.pending_buf[s.pending++] = b;
};
var putShortMSB = (s, b) => {
  s.pending_buf[s.pending++] = b >>> 8 & 255;
  s.pending_buf[s.pending++] = b & 255;
};
var read_buf = (strm, buf, start, size) => {
  let len = strm.avail_in;
  if (len > size) {
    len = size;
  }
  if (len === 0) {
    return 0;
  }
  strm.avail_in -= len;
  buf.set(strm.input.subarray(strm.next_in, strm.next_in + len), start);
  if (strm.state.wrap === 1) {
    strm.adler = adler32_1(strm.adler, buf, len, start);
  } else if (strm.state.wrap === 2) {
    strm.adler = crc32_1(strm.adler, buf, len, start);
  }
  strm.next_in += len;
  strm.total_in += len;
  return len;
};
var longest_match = (s, cur_match) => {
  let chain_length = s.max_chain_length;
  let scan = s.strstart;
  let match;
  let len;
  let best_len = s.prev_length;
  let nice_match = s.nice_match;
  const limit = s.strstart > s.w_size - MIN_LOOKAHEAD ? s.strstart - (s.w_size - MIN_LOOKAHEAD) : 0;
  const _win = s.window;
  const wmask = s.w_mask;
  const prev = s.prev;
  const strend = s.strstart + MAX_MATCH;
  let scan_end1 = _win[scan + best_len - 1];
  let scan_end = _win[scan + best_len];
  if (s.prev_length >= s.good_match) {
    chain_length >>= 2;
  }
  if (nice_match > s.lookahead) {
    nice_match = s.lookahead;
  }
  do {
    match = cur_match;
    if (_win[match + best_len] !== scan_end || _win[match + best_len - 1] !== scan_end1 || _win[match] !== _win[scan] || _win[++match] !== _win[scan + 1]) {
      continue;
    }
    scan += 2;
    match++;
    do {
    } while (_win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && scan < strend);
    len = MAX_MATCH - (strend - scan);
    scan = strend - MAX_MATCH;
    if (len > best_len) {
      s.match_start = cur_match;
      best_len = len;
      if (len >= nice_match) {
        break;
      }
      scan_end1 = _win[scan + best_len - 1];
      scan_end = _win[scan + best_len];
    }
  } while ((cur_match = prev[cur_match & wmask]) > limit && --chain_length !== 0);
  if (best_len <= s.lookahead) {
    return best_len;
  }
  return s.lookahead;
};
var fill_window = (s) => {
  const _w_size = s.w_size;
  let n, more, str2;
  do {
    more = s.window_size - s.lookahead - s.strstart;
    if (s.strstart >= _w_size + (_w_size - MIN_LOOKAHEAD)) {
      s.window.set(s.window.subarray(_w_size, _w_size + _w_size - more), 0);
      s.match_start -= _w_size;
      s.strstart -= _w_size;
      s.block_start -= _w_size;
      if (s.insert > s.strstart) {
        s.insert = s.strstart;
      }
      slide_hash(s);
      more += _w_size;
    }
    if (s.strm.avail_in === 0) {
      break;
    }
    n = read_buf(s.strm, s.window, s.strstart + s.lookahead, more);
    s.lookahead += n;
    if (s.lookahead + s.insert >= MIN_MATCH) {
      str2 = s.strstart - s.insert;
      s.ins_h = s.window[str2];
      s.ins_h = HASH(s, s.ins_h, s.window[str2 + 1]);
      while (s.insert) {
        s.ins_h = HASH(s, s.ins_h, s.window[str2 + MIN_MATCH - 1]);
        s.prev[str2 & s.w_mask] = s.head[s.ins_h];
        s.head[s.ins_h] = str2;
        str2++;
        s.insert--;
        if (s.lookahead + s.insert < MIN_MATCH) {
          break;
        }
      }
    }
  } while (s.lookahead < MIN_LOOKAHEAD && s.strm.avail_in !== 0);
};
var deflate_stored = (s, flush) => {
  let min_block = s.pending_buf_size - 5 > s.w_size ? s.w_size : s.pending_buf_size - 5;
  let len, left, have, last = 0;
  let used = s.strm.avail_in;
  do {
    len = 65535;
    have = s.bi_valid + 42 >> 3;
    if (s.strm.avail_out < have) {
      break;
    }
    have = s.strm.avail_out - have;
    left = s.strstart - s.block_start;
    if (len > left + s.strm.avail_in) {
      len = left + s.strm.avail_in;
    }
    if (len > have) {
      len = have;
    }
    if (len < min_block && (len === 0 && flush !== Z_FINISH$3 || flush === Z_NO_FLUSH$2 || len !== left + s.strm.avail_in)) {
      break;
    }
    last = flush === Z_FINISH$3 && len === left + s.strm.avail_in ? 1 : 0;
    _tr_stored_block(s, 0, 0, last);
    s.pending_buf[s.pending - 4] = len;
    s.pending_buf[s.pending - 3] = len >> 8;
    s.pending_buf[s.pending - 2] = ~len;
    s.pending_buf[s.pending - 1] = ~len >> 8;
    flush_pending(s.strm);
    if (left) {
      if (left > len) {
        left = len;
      }
      s.strm.output.set(s.window.subarray(s.block_start, s.block_start + left), s.strm.next_out);
      s.strm.next_out += left;
      s.strm.avail_out -= left;
      s.strm.total_out += left;
      s.block_start += left;
      len -= left;
    }
    if (len) {
      read_buf(s.strm, s.strm.output, s.strm.next_out, len);
      s.strm.next_out += len;
      s.strm.avail_out -= len;
      s.strm.total_out += len;
    }
  } while (last === 0);
  used -= s.strm.avail_in;
  if (used) {
    if (used >= s.w_size) {
      s.matches = 2;
      s.window.set(s.strm.input.subarray(s.strm.next_in - s.w_size, s.strm.next_in), 0);
      s.strstart = s.w_size;
      s.insert = s.strstart;
    } else {
      if (s.window_size - s.strstart <= used) {
        s.strstart -= s.w_size;
        s.window.set(s.window.subarray(s.w_size, s.w_size + s.strstart), 0);
        if (s.matches < 2) {
          s.matches++;
        }
        if (s.insert > s.strstart) {
          s.insert = s.strstart;
        }
      }
      s.window.set(s.strm.input.subarray(s.strm.next_in - used, s.strm.next_in), s.strstart);
      s.strstart += used;
      s.insert += used > s.w_size - s.insert ? s.w_size - s.insert : used;
    }
    s.block_start = s.strstart;
  }
  if (s.high_water < s.strstart) {
    s.high_water = s.strstart;
  }
  if (last) {
    return BS_FINISH_DONE;
  }
  if (flush !== Z_NO_FLUSH$2 && flush !== Z_FINISH$3 && s.strm.avail_in === 0 && s.strstart === s.block_start) {
    return BS_BLOCK_DONE;
  }
  have = s.window_size - s.strstart;
  if (s.strm.avail_in > have && s.block_start >= s.w_size) {
    s.block_start -= s.w_size;
    s.strstart -= s.w_size;
    s.window.set(s.window.subarray(s.w_size, s.w_size + s.strstart), 0);
    if (s.matches < 2) {
      s.matches++;
    }
    have += s.w_size;
    if (s.insert > s.strstart) {
      s.insert = s.strstart;
    }
  }
  if (have > s.strm.avail_in) {
    have = s.strm.avail_in;
  }
  if (have) {
    read_buf(s.strm, s.window, s.strstart, have);
    s.strstart += have;
    s.insert += have > s.w_size - s.insert ? s.w_size - s.insert : have;
  }
  if (s.high_water < s.strstart) {
    s.high_water = s.strstart;
  }
  have = s.bi_valid + 42 >> 3;
  have = s.pending_buf_size - have > 65535 ? 65535 : s.pending_buf_size - have;
  min_block = have > s.w_size ? s.w_size : have;
  left = s.strstart - s.block_start;
  if (left >= min_block || (left || flush === Z_FINISH$3) && flush !== Z_NO_FLUSH$2 && s.strm.avail_in === 0 && left <= have) {
    len = left > have ? have : left;
    last = flush === Z_FINISH$3 && s.strm.avail_in === 0 && len === left ? 1 : 0;
    _tr_stored_block(s, s.block_start, len, last);
    s.block_start += len;
    flush_pending(s.strm);
  }
  return last ? BS_FINISH_STARTED : BS_NEED_MORE;
};
var deflate_fast = (s, flush) => {
  let hash_head;
  let bflush;
  for (; ; ) {
    if (s.lookahead < MIN_LOOKAHEAD) {
      fill_window(s);
      if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH$2) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) {
        break;
      }
    }
    hash_head = 0;
    if (s.lookahead >= MIN_MATCH) {
      s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
      hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
      s.head[s.ins_h] = s.strstart;
    }
    if (hash_head !== 0 && s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD) {
      s.match_length = longest_match(s, hash_head);
    }
    if (s.match_length >= MIN_MATCH) {
      bflush = _tr_tally(s, s.strstart - s.match_start, s.match_length - MIN_MATCH);
      s.lookahead -= s.match_length;
      if (s.match_length <= s.max_lazy_match && s.lookahead >= MIN_MATCH) {
        s.match_length--;
        do {
          s.strstart++;
          s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
        } while (--s.match_length !== 0);
        s.strstart++;
      } else {
        s.strstart += s.match_length;
        s.match_length = 0;
        s.ins_h = s.window[s.strstart];
        s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + 1]);
      }
    } else {
      bflush = _tr_tally(s, 0, s.window[s.strstart]);
      s.lookahead--;
      s.strstart++;
    }
    if (bflush) {
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    }
  }
  s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
  if (flush === Z_FINISH$3) {
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    return BS_FINISH_DONE;
  }
  if (s.sym_next) {
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
  }
  return BS_BLOCK_DONE;
};
var deflate_slow = (s, flush) => {
  let hash_head;
  let bflush;
  let max_insert;
  for (; ; ) {
    if (s.lookahead < MIN_LOOKAHEAD) {
      fill_window(s);
      if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH$2) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) {
        break;
      }
    }
    hash_head = 0;
    if (s.lookahead >= MIN_MATCH) {
      s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
      hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
      s.head[s.ins_h] = s.strstart;
    }
    s.prev_length = s.match_length;
    s.prev_match = s.match_start;
    s.match_length = MIN_MATCH - 1;
    if (hash_head !== 0 && s.prev_length < s.max_lazy_match && s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD) {
      s.match_length = longest_match(s, hash_head);
      if (s.match_length <= 5 && (s.strategy === Z_FILTERED || s.match_length === MIN_MATCH && s.strstart - s.match_start > 4096)) {
        s.match_length = MIN_MATCH - 1;
      }
    }
    if (s.prev_length >= MIN_MATCH && s.match_length <= s.prev_length) {
      max_insert = s.strstart + s.lookahead - MIN_MATCH;
      bflush = _tr_tally(s, s.strstart - 1 - s.prev_match, s.prev_length - MIN_MATCH);
      s.lookahead -= s.prev_length - 1;
      s.prev_length -= 2;
      do {
        if (++s.strstart <= max_insert) {
          s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
        }
      } while (--s.prev_length !== 0);
      s.match_available = 0;
      s.match_length = MIN_MATCH - 1;
      s.strstart++;
      if (bflush) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
    } else if (s.match_available) {
      bflush = _tr_tally(s, 0, s.window[s.strstart - 1]);
      if (bflush) {
        flush_block_only(s, false);
      }
      s.strstart++;
      s.lookahead--;
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    } else {
      s.match_available = 1;
      s.strstart++;
      s.lookahead--;
    }
  }
  if (s.match_available) {
    bflush = _tr_tally(s, 0, s.window[s.strstart - 1]);
    s.match_available = 0;
  }
  s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
  if (flush === Z_FINISH$3) {
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    return BS_FINISH_DONE;
  }
  if (s.sym_next) {
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
  }
  return BS_BLOCK_DONE;
};
var deflate_rle = (s, flush) => {
  let bflush;
  let prev;
  let scan, strend;
  const _win = s.window;
  for (; ; ) {
    if (s.lookahead <= MAX_MATCH) {
      fill_window(s);
      if (s.lookahead <= MAX_MATCH && flush === Z_NO_FLUSH$2) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) {
        break;
      }
    }
    s.match_length = 0;
    if (s.lookahead >= MIN_MATCH && s.strstart > 0) {
      scan = s.strstart - 1;
      prev = _win[scan];
      if (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan]) {
        strend = s.strstart + MAX_MATCH;
        do {
        } while (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && scan < strend);
        s.match_length = MAX_MATCH - (strend - scan);
        if (s.match_length > s.lookahead) {
          s.match_length = s.lookahead;
        }
      }
    }
    if (s.match_length >= MIN_MATCH) {
      bflush = _tr_tally(s, 1, s.match_length - MIN_MATCH);
      s.lookahead -= s.match_length;
      s.strstart += s.match_length;
      s.match_length = 0;
    } else {
      bflush = _tr_tally(s, 0, s.window[s.strstart]);
      s.lookahead--;
      s.strstart++;
    }
    if (bflush) {
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    }
  }
  s.insert = 0;
  if (flush === Z_FINISH$3) {
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    return BS_FINISH_DONE;
  }
  if (s.sym_next) {
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
  }
  return BS_BLOCK_DONE;
};
var deflate_huff = (s, flush) => {
  let bflush;
  for (; ; ) {
    if (s.lookahead === 0) {
      fill_window(s);
      if (s.lookahead === 0) {
        if (flush === Z_NO_FLUSH$2) {
          return BS_NEED_MORE;
        }
        break;
      }
    }
    s.match_length = 0;
    bflush = _tr_tally(s, 0, s.window[s.strstart]);
    s.lookahead--;
    s.strstart++;
    if (bflush) {
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    }
  }
  s.insert = 0;
  if (flush === Z_FINISH$3) {
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    return BS_FINISH_DONE;
  }
  if (s.sym_next) {
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
  }
  return BS_BLOCK_DONE;
};
function Config(good_length, max_lazy, nice_length, max_chain, func) {
  this.good_length = good_length;
  this.max_lazy = max_lazy;
  this.nice_length = nice_length;
  this.max_chain = max_chain;
  this.func = func;
}
var configuration_table = [
  /*      good lazy nice chain */
  new Config(0, 0, 0, 0, deflate_stored),
  /* 0 store only */
  new Config(4, 4, 8, 4, deflate_fast),
  /* 1 max speed, no lazy matches */
  new Config(4, 5, 16, 8, deflate_fast),
  /* 2 */
  new Config(4, 6, 32, 32, deflate_fast),
  /* 3 */
  new Config(4, 4, 16, 16, deflate_slow),
  /* 4 lazy matches */
  new Config(8, 16, 32, 32, deflate_slow),
  /* 5 */
  new Config(8, 16, 128, 128, deflate_slow),
  /* 6 */
  new Config(8, 32, 128, 256, deflate_slow),
  /* 7 */
  new Config(32, 128, 258, 1024, deflate_slow),
  /* 8 */
  new Config(32, 258, 258, 4096, deflate_slow)
  /* 9 max compression */
];
var lm_init = (s) => {
  s.window_size = 2 * s.w_size;
  zero(s.head);
  s.max_lazy_match = configuration_table[s.level].max_lazy;
  s.good_match = configuration_table[s.level].good_length;
  s.nice_match = configuration_table[s.level].nice_length;
  s.max_chain_length = configuration_table[s.level].max_chain;
  s.strstart = 0;
  s.block_start = 0;
  s.lookahead = 0;
  s.insert = 0;
  s.match_length = s.prev_length = MIN_MATCH - 1;
  s.match_available = 0;
  s.ins_h = 0;
};
function DeflateState() {
  this.strm = null;
  this.status = 0;
  this.pending_buf = null;
  this.pending_buf_size = 0;
  this.pending_out = 0;
  this.pending = 0;
  this.wrap = 0;
  this.gzhead = null;
  this.gzindex = 0;
  this.method = Z_DEFLATED$2;
  this.last_flush = -1;
  this.w_size = 0;
  this.w_bits = 0;
  this.w_mask = 0;
  this.window = null;
  this.window_size = 0;
  this.prev = null;
  this.head = null;
  this.ins_h = 0;
  this.hash_size = 0;
  this.hash_bits = 0;
  this.hash_mask = 0;
  this.hash_shift = 0;
  this.block_start = 0;
  this.match_length = 0;
  this.prev_match = 0;
  this.match_available = 0;
  this.strstart = 0;
  this.match_start = 0;
  this.lookahead = 0;
  this.prev_length = 0;
  this.max_chain_length = 0;
  this.max_lazy_match = 0;
  this.level = 0;
  this.strategy = 0;
  this.good_match = 0;
  this.nice_match = 0;
  this.dyn_ltree = new Uint16Array(HEAP_SIZE * 2);
  this.dyn_dtree = new Uint16Array((2 * D_CODES + 1) * 2);
  this.bl_tree = new Uint16Array((2 * BL_CODES + 1) * 2);
  zero(this.dyn_ltree);
  zero(this.dyn_dtree);
  zero(this.bl_tree);
  this.l_desc = null;
  this.d_desc = null;
  this.bl_desc = null;
  this.bl_count = new Uint16Array(MAX_BITS + 1);
  this.heap = new Uint16Array(2 * L_CODES + 1);
  zero(this.heap);
  this.heap_len = 0;
  this.heap_max = 0;
  this.depth = new Uint16Array(2 * L_CODES + 1);
  zero(this.depth);
  this.sym_buf = 0;
  this.lit_bufsize = 0;
  this.sym_next = 0;
  this.sym_end = 0;
  this.opt_len = 0;
  this.static_len = 0;
  this.matches = 0;
  this.insert = 0;
  this.bi_buf = 0;
  this.bi_valid = 0;
}
var deflateStateCheck = (strm) => {
  if (!strm) {
    return 1;
  }
  const s = strm.state;
  if (!s || s.strm !== strm || s.status !== INIT_STATE && //#ifdef GZIP
  s.status !== GZIP_STATE && //#endif
  s.status !== EXTRA_STATE && s.status !== NAME_STATE && s.status !== COMMENT_STATE && s.status !== HCRC_STATE && s.status !== BUSY_STATE && s.status !== FINISH_STATE) {
    return 1;
  }
  return 0;
};
var deflateResetKeep = (strm) => {
  if (deflateStateCheck(strm)) {
    return err(strm, Z_STREAM_ERROR$2);
  }
  strm.total_in = strm.total_out = 0;
  strm.data_type = Z_UNKNOWN;
  const s = strm.state;
  s.pending = 0;
  s.pending_out = 0;
  if (s.wrap < 0) {
    s.wrap = -s.wrap;
  }
  s.status = //#ifdef GZIP
  s.wrap === 2 ? GZIP_STATE : (
    //#endif
    s.wrap ? INIT_STATE : BUSY_STATE
  );
  strm.adler = s.wrap === 2 ? 0 : 1;
  s.last_flush = -2;
  _tr_init(s);
  return Z_OK$3;
};
var deflateReset = (strm) => {
  const ret = deflateResetKeep(strm);
  if (ret === Z_OK$3) {
    lm_init(strm.state);
  }
  return ret;
};
var deflateSetHeader = (strm, head) => {
  if (deflateStateCheck(strm) || strm.state.wrap !== 2) {
    return Z_STREAM_ERROR$2;
  }
  strm.state.gzhead = head;
  return Z_OK$3;
};
var deflateInit2 = (strm, level, method, windowBits, memLevel, strategy) => {
  if (!strm) {
    return Z_STREAM_ERROR$2;
  }
  let wrap = 1;
  if (level === Z_DEFAULT_COMPRESSION$1) {
    level = 6;
  }
  if (windowBits < 0) {
    wrap = 0;
    windowBits = -windowBits;
  } else if (windowBits > 15) {
    wrap = 2;
    windowBits -= 16;
  }
  if (memLevel < 1 || memLevel > MAX_MEM_LEVEL || method !== Z_DEFLATED$2 || windowBits < 8 || windowBits > 15 || level < 0 || level > 9 || strategy < 0 || strategy > Z_FIXED || windowBits === 8 && wrap !== 1) {
    return err(strm, Z_STREAM_ERROR$2);
  }
  if (windowBits === 8) {
    windowBits = 9;
  }
  const s = new DeflateState();
  strm.state = s;
  s.strm = strm;
  s.status = INIT_STATE;
  s.wrap = wrap;
  s.gzhead = null;
  s.w_bits = windowBits;
  s.w_size = 1 << s.w_bits;
  s.w_mask = s.w_size - 1;
  s.hash_bits = memLevel + 7;
  s.hash_size = 1 << s.hash_bits;
  s.hash_mask = s.hash_size - 1;
  s.hash_shift = ~~((s.hash_bits + MIN_MATCH - 1) / MIN_MATCH);
  s.window = new Uint8Array(s.w_size * 2);
  s.head = new Uint16Array(s.hash_size);
  s.prev = new Uint16Array(s.w_size);
  s.lit_bufsize = 1 << memLevel + 6;
  s.pending_buf_size = s.lit_bufsize * 4;
  s.pending_buf = new Uint8Array(s.pending_buf_size);
  s.sym_buf = s.lit_bufsize;
  s.sym_end = (s.lit_bufsize - 1) * 3;
  s.level = level;
  s.strategy = strategy;
  s.method = method;
  return deflateReset(strm);
};
var deflateInit = (strm, level) => {
  return deflateInit2(strm, level, Z_DEFLATED$2, MAX_WBITS$1, DEF_MEM_LEVEL, Z_DEFAULT_STRATEGY$1);
};
var deflate$2 = (strm, flush) => {
  if (deflateStateCheck(strm) || flush > Z_BLOCK$1 || flush < 0) {
    return strm ? err(strm, Z_STREAM_ERROR$2) : Z_STREAM_ERROR$2;
  }
  const s = strm.state;
  if (!strm.output || strm.avail_in !== 0 && !strm.input || s.status === FINISH_STATE && flush !== Z_FINISH$3) {
    return err(strm, strm.avail_out === 0 ? Z_BUF_ERROR$1 : Z_STREAM_ERROR$2);
  }
  const old_flush = s.last_flush;
  s.last_flush = flush;
  if (s.pending !== 0) {
    flush_pending(strm);
    if (strm.avail_out === 0) {
      s.last_flush = -1;
      return Z_OK$3;
    }
  } else if (strm.avail_in === 0 && rank(flush) <= rank(old_flush) && flush !== Z_FINISH$3) {
    return err(strm, Z_BUF_ERROR$1);
  }
  if (s.status === FINISH_STATE && strm.avail_in !== 0) {
    return err(strm, Z_BUF_ERROR$1);
  }
  if (s.status === INIT_STATE && s.wrap === 0) {
    s.status = BUSY_STATE;
  }
  if (s.status === INIT_STATE) {
    let header = Z_DEFLATED$2 + (s.w_bits - 8 << 4) << 8;
    let level_flags = -1;
    if (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2) {
      level_flags = 0;
    } else if (s.level < 6) {
      level_flags = 1;
    } else if (s.level === 6) {
      level_flags = 2;
    } else {
      level_flags = 3;
    }
    header |= level_flags << 6;
    if (s.strstart !== 0) {
      header |= PRESET_DICT;
    }
    header += 31 - header % 31;
    putShortMSB(s, header);
    if (s.strstart !== 0) {
      putShortMSB(s, strm.adler >>> 16);
      putShortMSB(s, strm.adler & 65535);
    }
    strm.adler = 1;
    s.status = BUSY_STATE;
    flush_pending(strm);
    if (s.pending !== 0) {
      s.last_flush = -1;
      return Z_OK$3;
    }
  }
  if (s.status === GZIP_STATE) {
    strm.adler = 0;
    put_byte(s, 31);
    put_byte(s, 139);
    put_byte(s, 8);
    if (!s.gzhead) {
      put_byte(s, 0);
      put_byte(s, 0);
      put_byte(s, 0);
      put_byte(s, 0);
      put_byte(s, 0);
      put_byte(s, s.level === 9 ? 2 : s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ? 4 : 0);
      put_byte(s, OS_CODE);
      s.status = BUSY_STATE;
      flush_pending(strm);
      if (s.pending !== 0) {
        s.last_flush = -1;
        return Z_OK$3;
      }
    } else {
      put_byte(
        s,
        (s.gzhead.text ? 1 : 0) + (s.gzhead.hcrc ? 2 : 0) + (!s.gzhead.extra ? 0 : 4) + (!s.gzhead.name ? 0 : 8) + (!s.gzhead.comment ? 0 : 16)
      );
      put_byte(s, s.gzhead.time & 255);
      put_byte(s, s.gzhead.time >> 8 & 255);
      put_byte(s, s.gzhead.time >> 16 & 255);
      put_byte(s, s.gzhead.time >> 24 & 255);
      put_byte(s, s.level === 9 ? 2 : s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ? 4 : 0);
      put_byte(s, s.gzhead.os & 255);
      if (s.gzhead.extra && s.gzhead.extra.length) {
        put_byte(s, s.gzhead.extra.length & 255);
        put_byte(s, s.gzhead.extra.length >> 8 & 255);
      }
      if (s.gzhead.hcrc) {
        strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending, 0);
      }
      s.gzindex = 0;
      s.status = EXTRA_STATE;
    }
  }
  if (s.status === EXTRA_STATE) {
    if (s.gzhead.extra) {
      let beg = s.pending;
      let left = (s.gzhead.extra.length & 65535) - s.gzindex;
      while (s.pending + left > s.pending_buf_size) {
        let copy = s.pending_buf_size - s.pending;
        s.pending_buf.set(s.gzhead.extra.subarray(s.gzindex, s.gzindex + copy), s.pending);
        s.pending = s.pending_buf_size;
        if (s.gzhead.hcrc && s.pending > beg) {
          strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
        }
        s.gzindex += copy;
        flush_pending(strm);
        if (s.pending !== 0) {
          s.last_flush = -1;
          return Z_OK$3;
        }
        beg = 0;
        left -= copy;
      }
      let gzhead_extra = new Uint8Array(s.gzhead.extra);
      s.pending_buf.set(gzhead_extra.subarray(s.gzindex, s.gzindex + left), s.pending);
      s.pending += left;
      if (s.gzhead.hcrc && s.pending > beg) {
        strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
      }
      s.gzindex = 0;
    }
    s.status = NAME_STATE;
  }
  if (s.status === NAME_STATE) {
    if (s.gzhead.name) {
      let beg = s.pending;
      let val;
      do {
        if (s.pending === s.pending_buf_size) {
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          flush_pending(strm);
          if (s.pending !== 0) {
            s.last_flush = -1;
            return Z_OK$3;
          }
          beg = 0;
        }
        if (s.gzindex < s.gzhead.name.length) {
          val = s.gzhead.name.charCodeAt(s.gzindex++) & 255;
        } else {
          val = 0;
        }
        put_byte(s, val);
      } while (val !== 0);
      if (s.gzhead.hcrc && s.pending > beg) {
        strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
      }
      s.gzindex = 0;
    }
    s.status = COMMENT_STATE;
  }
  if (s.status === COMMENT_STATE) {
    if (s.gzhead.comment) {
      let beg = s.pending;
      let val;
      do {
        if (s.pending === s.pending_buf_size) {
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          flush_pending(strm);
          if (s.pending !== 0) {
            s.last_flush = -1;
            return Z_OK$3;
          }
          beg = 0;
        }
        if (s.gzindex < s.gzhead.comment.length) {
          val = s.gzhead.comment.charCodeAt(s.gzindex++) & 255;
        } else {
          val = 0;
        }
        put_byte(s, val);
      } while (val !== 0);
      if (s.gzhead.hcrc && s.pending > beg) {
        strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
      }
    }
    s.status = HCRC_STATE;
  }
  if (s.status === HCRC_STATE) {
    if (s.gzhead.hcrc) {
      if (s.pending + 2 > s.pending_buf_size) {
        flush_pending(strm);
        if (s.pending !== 0) {
          s.last_flush = -1;
          return Z_OK$3;
        }
      }
      put_byte(s, strm.adler & 255);
      put_byte(s, strm.adler >> 8 & 255);
      strm.adler = 0;
    }
    s.status = BUSY_STATE;
    flush_pending(strm);
    if (s.pending !== 0) {
      s.last_flush = -1;
      return Z_OK$3;
    }
  }
  if (strm.avail_in !== 0 || s.lookahead !== 0 || flush !== Z_NO_FLUSH$2 && s.status !== FINISH_STATE) {
    let bstate = s.level === 0 ? deflate_stored(s, flush) : s.strategy === Z_HUFFMAN_ONLY ? deflate_huff(s, flush) : s.strategy === Z_RLE ? deflate_rle(s, flush) : configuration_table[s.level].func(s, flush);
    if (bstate === BS_FINISH_STARTED || bstate === BS_FINISH_DONE) {
      s.status = FINISH_STATE;
    }
    if (bstate === BS_NEED_MORE || bstate === BS_FINISH_STARTED) {
      if (strm.avail_out === 0) {
        s.last_flush = -1;
      }
      return Z_OK$3;
    }
    if (bstate === BS_BLOCK_DONE) {
      if (flush === Z_PARTIAL_FLUSH) {
        _tr_align(s);
      } else if (flush !== Z_BLOCK$1) {
        _tr_stored_block(s, 0, 0, false);
        if (flush === Z_FULL_FLUSH$1) {
          zero(s.head);
          if (s.lookahead === 0) {
            s.strstart = 0;
            s.block_start = 0;
            s.insert = 0;
          }
        }
      }
      flush_pending(strm);
      if (strm.avail_out === 0) {
        s.last_flush = -1;
        return Z_OK$3;
      }
    }
  }
  if (flush !== Z_FINISH$3) {
    return Z_OK$3;
  }
  if (s.wrap <= 0) {
    return Z_STREAM_END$3;
  }
  if (s.wrap === 2) {
    put_byte(s, strm.adler & 255);
    put_byte(s, strm.adler >> 8 & 255);
    put_byte(s, strm.adler >> 16 & 255);
    put_byte(s, strm.adler >> 24 & 255);
    put_byte(s, strm.total_in & 255);
    put_byte(s, strm.total_in >> 8 & 255);
    put_byte(s, strm.total_in >> 16 & 255);
    put_byte(s, strm.total_in >> 24 & 255);
  } else {
    putShortMSB(s, strm.adler >>> 16);
    putShortMSB(s, strm.adler & 65535);
  }
  flush_pending(strm);
  if (s.wrap > 0) {
    s.wrap = -s.wrap;
  }
  return s.pending !== 0 ? Z_OK$3 : Z_STREAM_END$3;
};
var deflateEnd = (strm) => {
  if (deflateStateCheck(strm)) {
    return Z_STREAM_ERROR$2;
  }
  const status = strm.state.status;
  strm.state = null;
  return status === BUSY_STATE ? err(strm, Z_DATA_ERROR$2) : Z_OK$3;
};
var deflateSetDictionary = (strm, dictionary) => {
  let dictLength = dictionary.length;
  if (deflateStateCheck(strm)) {
    return Z_STREAM_ERROR$2;
  }
  const s = strm.state;
  const wrap = s.wrap;
  if (wrap === 2 || wrap === 1 && s.status !== INIT_STATE || s.lookahead) {
    return Z_STREAM_ERROR$2;
  }
  if (wrap === 1) {
    strm.adler = adler32_1(strm.adler, dictionary, dictLength, 0);
  }
  s.wrap = 0;
  if (dictLength >= s.w_size) {
    if (wrap === 0) {
      zero(s.head);
      s.strstart = 0;
      s.block_start = 0;
      s.insert = 0;
    }
    let tmpDict = new Uint8Array(s.w_size);
    tmpDict.set(dictionary.subarray(dictLength - s.w_size, dictLength), 0);
    dictionary = tmpDict;
    dictLength = s.w_size;
  }
  const avail = strm.avail_in;
  const next = strm.next_in;
  const input = strm.input;
  strm.avail_in = dictLength;
  strm.next_in = 0;
  strm.input = dictionary;
  fill_window(s);
  while (s.lookahead >= MIN_MATCH) {
    let str2 = s.strstart;
    let n = s.lookahead - (MIN_MATCH - 1);
    do {
      s.ins_h = HASH(s, s.ins_h, s.window[str2 + MIN_MATCH - 1]);
      s.prev[str2 & s.w_mask] = s.head[s.ins_h];
      s.head[s.ins_h] = str2;
      str2++;
    } while (--n);
    s.strstart = str2;
    s.lookahead = MIN_MATCH - 1;
    fill_window(s);
  }
  s.strstart += s.lookahead;
  s.block_start = s.strstart;
  s.insert = s.lookahead;
  s.lookahead = 0;
  s.match_length = s.prev_length = MIN_MATCH - 1;
  s.match_available = 0;
  strm.next_in = next;
  strm.input = input;
  strm.avail_in = avail;
  s.wrap = wrap;
  return Z_OK$3;
};
var deflateInit_1 = deflateInit;
var deflateInit2_1 = deflateInit2;
var deflateReset_1 = deflateReset;
var deflateResetKeep_1 = deflateResetKeep;
var deflateSetHeader_1 = deflateSetHeader;
var deflate_2$1 = deflate$2;
var deflateEnd_1 = deflateEnd;
var deflateSetDictionary_1 = deflateSetDictionary;
var deflateInfo = "pako deflate (from Nodeca project)";
var deflate_1$2 = {
  deflateInit: deflateInit_1,
  deflateInit2: deflateInit2_1,
  deflateReset: deflateReset_1,
  deflateResetKeep: deflateResetKeep_1,
  deflateSetHeader: deflateSetHeader_1,
  deflate: deflate_2$1,
  deflateEnd: deflateEnd_1,
  deflateSetDictionary: deflateSetDictionary_1,
  deflateInfo
};
var _has = (obj, key) => {
  return Object.prototype.hasOwnProperty.call(obj, key);
};
var assign = function(obj) {
  const sources = Array.prototype.slice.call(arguments, 1);
  while (sources.length) {
    const source = sources.shift();
    if (!source) {
      continue;
    }
    if (typeof source !== "object") {
      throw new TypeError(source + "must be non-object");
    }
    for (const p in source) {
      if (_has(source, p)) {
        obj[p] = source[p];
      }
    }
  }
  return obj;
};
var flattenChunks = (chunks) => {
  let len = 0;
  for (let i = 0, l = chunks.length; i < l; i++) {
    len += chunks[i].length;
  }
  const result = new Uint8Array(len);
  for (let i = 0, pos = 0, l = chunks.length; i < l; i++) {
    let chunk = chunks[i];
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return result;
};
var common = {
  assign,
  flattenChunks
};
var STR_APPLY_UIA_OK = true;
try {
  String.fromCharCode.apply(null, new Uint8Array(1));
} catch (__) {
  STR_APPLY_UIA_OK = false;
}
var _utf8len = new Uint8Array(256);
for (let q = 0; q < 256; q++) {
  _utf8len[q] = q >= 252 ? 6 : q >= 248 ? 5 : q >= 240 ? 4 : q >= 224 ? 3 : q >= 192 ? 2 : 1;
}
_utf8len[254] = _utf8len[254] = 1;
var string2buf = (str2) => {
  if (typeof TextEncoder === "function" && TextEncoder.prototype.encode) {
    return new TextEncoder().encode(str2);
  }
  let buf, c, c2, m_pos, i, str_len = str2.length, buf_len = 0;
  for (m_pos = 0; m_pos < str_len; m_pos++) {
    c = str2.charCodeAt(m_pos);
    if ((c & 64512) === 55296 && m_pos + 1 < str_len) {
      c2 = str2.charCodeAt(m_pos + 1);
      if ((c2 & 64512) === 56320) {
        c = 65536 + (c - 55296 << 10) + (c2 - 56320);
        m_pos++;
      }
    }
    buf_len += c < 128 ? 1 : c < 2048 ? 2 : c < 65536 ? 3 : 4;
  }
  buf = new Uint8Array(buf_len);
  for (i = 0, m_pos = 0; i < buf_len; m_pos++) {
    c = str2.charCodeAt(m_pos);
    if ((c & 64512) === 55296 && m_pos + 1 < str_len) {
      c2 = str2.charCodeAt(m_pos + 1);
      if ((c2 & 64512) === 56320) {
        c = 65536 + (c - 55296 << 10) + (c2 - 56320);
        m_pos++;
      }
    }
    if (c < 128) {
      buf[i++] = c;
    } else if (c < 2048) {
      buf[i++] = 192 | c >>> 6;
      buf[i++] = 128 | c & 63;
    } else if (c < 65536) {
      buf[i++] = 224 | c >>> 12;
      buf[i++] = 128 | c >>> 6 & 63;
      buf[i++] = 128 | c & 63;
    } else {
      buf[i++] = 240 | c >>> 18;
      buf[i++] = 128 | c >>> 12 & 63;
      buf[i++] = 128 | c >>> 6 & 63;
      buf[i++] = 128 | c & 63;
    }
  }
  return buf;
};
var buf2binstring = (buf, len) => {
  if (len < 65534) {
    if (buf.subarray && STR_APPLY_UIA_OK) {
      return String.fromCharCode.apply(null, buf.length === len ? buf : buf.subarray(0, len));
    }
  }
  let result = "";
  for (let i = 0; i < len; i++) {
    result += String.fromCharCode(buf[i]);
  }
  return result;
};
var buf2string = (buf, max) => {
  const len = max || buf.length;
  if (typeof TextDecoder === "function" && TextDecoder.prototype.decode) {
    return new TextDecoder().decode(buf.subarray(0, max));
  }
  let i, out;
  const utf16buf = new Array(len * 2);
  for (out = 0, i = 0; i < len; ) {
    let c = buf[i++];
    if (c < 128) {
      utf16buf[out++] = c;
      continue;
    }
    let c_len = _utf8len[c];
    if (c_len > 4) {
      utf16buf[out++] = 65533;
      i += c_len - 1;
      continue;
    }
    c &= c_len === 2 ? 31 : c_len === 3 ? 15 : 7;
    while (c_len > 1 && i < len) {
      c = c << 6 | buf[i++] & 63;
      c_len--;
    }
    if (c_len > 1) {
      utf16buf[out++] = 65533;
      continue;
    }
    if (c < 65536) {
      utf16buf[out++] = c;
    } else {
      c -= 65536;
      utf16buf[out++] = 55296 | c >> 10 & 1023;
      utf16buf[out++] = 56320 | c & 1023;
    }
  }
  return buf2binstring(utf16buf, out);
};
var utf8border = (buf, max) => {
  max = max || buf.length;
  if (max > buf.length) {
    max = buf.length;
  }
  let pos = max - 1;
  while (pos >= 0 && (buf[pos] & 192) === 128) {
    pos--;
  }
  if (pos < 0) {
    return max;
  }
  if (pos === 0) {
    return max;
  }
  return pos + _utf8len[buf[pos]] > max ? pos : max;
};
var strings = {
  string2buf,
  buf2string,
  utf8border
};
function ZStream() {
  this.input = null;
  this.next_in = 0;
  this.avail_in = 0;
  this.total_in = 0;
  this.output = null;
  this.next_out = 0;
  this.avail_out = 0;
  this.total_out = 0;
  this.msg = "";
  this.state = null;
  this.data_type = 2;
  this.adler = 0;
}
var zstream = ZStream;
var toString$1 = Object.prototype.toString;
var {
  Z_NO_FLUSH: Z_NO_FLUSH$1,
  Z_SYNC_FLUSH,
  Z_FULL_FLUSH,
  Z_FINISH: Z_FINISH$2,
  Z_OK: Z_OK$2,
  Z_STREAM_END: Z_STREAM_END$2,
  Z_DEFAULT_COMPRESSION,
  Z_DEFAULT_STRATEGY,
  Z_DEFLATED: Z_DEFLATED$1
} = constants$2;
function Deflate$1(options) {
  this.options = common.assign({
    level: Z_DEFAULT_COMPRESSION,
    method: Z_DEFLATED$1,
    chunkSize: 16384,
    windowBits: 15,
    memLevel: 8,
    strategy: Z_DEFAULT_STRATEGY
  }, options || {});
  let opt = this.options;
  if (opt.raw && opt.windowBits > 0) {
    opt.windowBits = -opt.windowBits;
  } else if (opt.gzip && opt.windowBits > 0 && opt.windowBits < 16) {
    opt.windowBits += 16;
  }
  this.err = 0;
  this.msg = "";
  this.ended = false;
  this.chunks = [];
  this.strm = new zstream();
  this.strm.avail_out = 0;
  let status = deflate_1$2.deflateInit2(
    this.strm,
    opt.level,
    opt.method,
    opt.windowBits,
    opt.memLevel,
    opt.strategy
  );
  if (status !== Z_OK$2) {
    throw new Error(messages[status]);
  }
  if (opt.header) {
    deflate_1$2.deflateSetHeader(this.strm, opt.header);
  }
  if (opt.dictionary) {
    let dict;
    if (typeof opt.dictionary === "string") {
      dict = strings.string2buf(opt.dictionary);
    } else if (toString$1.call(opt.dictionary) === "[object ArrayBuffer]") {
      dict = new Uint8Array(opt.dictionary);
    } else {
      dict = opt.dictionary;
    }
    status = deflate_1$2.deflateSetDictionary(this.strm, dict);
    if (status !== Z_OK$2) {
      throw new Error(messages[status]);
    }
    this._dict_set = true;
  }
}
Deflate$1.prototype.push = function(data, flush_mode) {
  const strm = this.strm;
  const chunkSize = this.options.chunkSize;
  let status, _flush_mode;
  if (this.ended) {
    return false;
  }
  if (flush_mode === ~~flush_mode)
    _flush_mode = flush_mode;
  else
    _flush_mode = flush_mode === true ? Z_FINISH$2 : Z_NO_FLUSH$1;
  if (typeof data === "string") {
    strm.input = strings.string2buf(data);
  } else if (toString$1.call(data) === "[object ArrayBuffer]") {
    strm.input = new Uint8Array(data);
  } else {
    strm.input = data;
  }
  strm.next_in = 0;
  strm.avail_in = strm.input.length;
  for (; ; ) {
    if (strm.avail_out === 0) {
      strm.output = new Uint8Array(chunkSize);
      strm.next_out = 0;
      strm.avail_out = chunkSize;
    }
    if ((_flush_mode === Z_SYNC_FLUSH || _flush_mode === Z_FULL_FLUSH) && strm.avail_out <= 6) {
      this.onData(strm.output.subarray(0, strm.next_out));
      strm.avail_out = 0;
      continue;
    }
    status = deflate_1$2.deflate(strm, _flush_mode);
    if (status === Z_STREAM_END$2) {
      if (strm.next_out > 0) {
        this.onData(strm.output.subarray(0, strm.next_out));
      }
      status = deflate_1$2.deflateEnd(this.strm);
      this.onEnd(status);
      this.ended = true;
      return status === Z_OK$2;
    }
    if (strm.avail_out === 0) {
      this.onData(strm.output);
      continue;
    }
    if (_flush_mode > 0 && strm.next_out > 0) {
      this.onData(strm.output.subarray(0, strm.next_out));
      strm.avail_out = 0;
      continue;
    }
    if (strm.avail_in === 0)
      break;
  }
  return true;
};
Deflate$1.prototype.onData = function(chunk) {
  this.chunks.push(chunk);
};
Deflate$1.prototype.onEnd = function(status) {
  if (status === Z_OK$2) {
    this.result = common.flattenChunks(this.chunks);
  }
  this.chunks = [];
  this.err = status;
  this.msg = this.strm.msg;
};
function deflate$1(input, options) {
  const deflator = new Deflate$1(options);
  deflator.push(input, true);
  if (deflator.err) {
    throw deflator.msg || messages[deflator.err];
  }
  return deflator.result;
}
function deflateRaw$1(input, options) {
  options = options || {};
  options.raw = true;
  return deflate$1(input, options);
}
function gzip$1(input, options) {
  options = options || {};
  options.gzip = true;
  return deflate$1(input, options);
}
var Deflate_1$1 = Deflate$1;
var deflate_2 = deflate$1;
var deflateRaw_1$1 = deflateRaw$1;
var gzip_1$1 = gzip$1;
var constants$1 = constants$2;
var deflate_1$1 = {
  Deflate: Deflate_1$1,
  deflate: deflate_2,
  deflateRaw: deflateRaw_1$1,
  gzip: gzip_1$1,
  constants: constants$1
};
var BAD$1 = 16209;
var TYPE$1 = 16191;
var inffast = function inflate_fast(strm, start) {
  let _in;
  let last;
  let _out;
  let beg;
  let end;
  let dmax;
  let wsize;
  let whave;
  let wnext;
  let s_window;
  let hold;
  let bits;
  let lcode;
  let dcode;
  let lmask;
  let dmask;
  let here;
  let op;
  let len;
  let dist;
  let from;
  let from_source;
  let input, output;
  const state = strm.state;
  _in = strm.next_in;
  input = strm.input;
  last = _in + (strm.avail_in - 5);
  _out = strm.next_out;
  output = strm.output;
  beg = _out - (start - strm.avail_out);
  end = _out + (strm.avail_out - 257);
  dmax = state.dmax;
  wsize = state.wsize;
  whave = state.whave;
  wnext = state.wnext;
  s_window = state.window;
  hold = state.hold;
  bits = state.bits;
  lcode = state.lencode;
  dcode = state.distcode;
  lmask = (1 << state.lenbits) - 1;
  dmask = (1 << state.distbits) - 1;
  top:
    do {
      if (bits < 15) {
        hold += input[_in++] << bits;
        bits += 8;
        hold += input[_in++] << bits;
        bits += 8;
      }
      here = lcode[hold & lmask];
      dolen:
        for (; ; ) {
          op = here >>> 24;
          hold >>>= op;
          bits -= op;
          op = here >>> 16 & 255;
          if (op === 0) {
            output[_out++] = here & 65535;
          } else if (op & 16) {
            len = here & 65535;
            op &= 15;
            if (op) {
              if (bits < op) {
                hold += input[_in++] << bits;
                bits += 8;
              }
              len += hold & (1 << op) - 1;
              hold >>>= op;
              bits -= op;
            }
            if (bits < 15) {
              hold += input[_in++] << bits;
              bits += 8;
              hold += input[_in++] << bits;
              bits += 8;
            }
            here = dcode[hold & dmask];
            dodist:
              for (; ; ) {
                op = here >>> 24;
                hold >>>= op;
                bits -= op;
                op = here >>> 16 & 255;
                if (op & 16) {
                  dist = here & 65535;
                  op &= 15;
                  if (bits < op) {
                    hold += input[_in++] << bits;
                    bits += 8;
                    if (bits < op) {
                      hold += input[_in++] << bits;
                      bits += 8;
                    }
                  }
                  dist += hold & (1 << op) - 1;
                  if (dist > dmax) {
                    strm.msg = "invalid distance too far back";
                    state.mode = BAD$1;
                    break top;
                  }
                  hold >>>= op;
                  bits -= op;
                  op = _out - beg;
                  if (dist > op) {
                    op = dist - op;
                    if (op > whave) {
                      if (state.sane) {
                        strm.msg = "invalid distance too far back";
                        state.mode = BAD$1;
                        break top;
                      }
                    }
                    from = 0;
                    from_source = s_window;
                    if (wnext === 0) {
                      from += wsize - op;
                      if (op < len) {
                        len -= op;
                        do {
                          output[_out++] = s_window[from++];
                        } while (--op);
                        from = _out - dist;
                        from_source = output;
                      }
                    } else if (wnext < op) {
                      from += wsize + wnext - op;
                      op -= wnext;
                      if (op < len) {
                        len -= op;
                        do {
                          output[_out++] = s_window[from++];
                        } while (--op);
                        from = 0;
                        if (wnext < len) {
                          op = wnext;
                          len -= op;
                          do {
                            output[_out++] = s_window[from++];
                          } while (--op);
                          from = _out - dist;
                          from_source = output;
                        }
                      }
                    } else {
                      from += wnext - op;
                      if (op < len) {
                        len -= op;
                        do {
                          output[_out++] = s_window[from++];
                        } while (--op);
                        from = _out - dist;
                        from_source = output;
                      }
                    }
                    while (len > 2) {
                      output[_out++] = from_source[from++];
                      output[_out++] = from_source[from++];
                      output[_out++] = from_source[from++];
                      len -= 3;
                    }
                    if (len) {
                      output[_out++] = from_source[from++];
                      if (len > 1) {
                        output[_out++] = from_source[from++];
                      }
                    }
                  } else {
                    from = _out - dist;
                    do {
                      output[_out++] = output[from++];
                      output[_out++] = output[from++];
                      output[_out++] = output[from++];
                      len -= 3;
                    } while (len > 2);
                    if (len) {
                      output[_out++] = output[from++];
                      if (len > 1) {
                        output[_out++] = output[from++];
                      }
                    }
                  }
                } else if ((op & 64) === 0) {
                  here = dcode[(here & 65535) + (hold & (1 << op) - 1)];
                  continue dodist;
                } else {
                  strm.msg = "invalid distance code";
                  state.mode = BAD$1;
                  break top;
                }
                break;
              }
          } else if ((op & 64) === 0) {
            here = lcode[(here & 65535) + (hold & (1 << op) - 1)];
            continue dolen;
          } else if (op & 32) {
            state.mode = TYPE$1;
            break top;
          } else {
            strm.msg = "invalid literal/length code";
            state.mode = BAD$1;
            break top;
          }
          break;
        }
    } while (_in < last && _out < end);
  len = bits >> 3;
  _in -= len;
  bits -= len << 3;
  hold &= (1 << bits) - 1;
  strm.next_in = _in;
  strm.next_out = _out;
  strm.avail_in = _in < last ? 5 + (last - _in) : 5 - (_in - last);
  strm.avail_out = _out < end ? 257 + (end - _out) : 257 - (_out - end);
  state.hold = hold;
  state.bits = bits;
  return;
};
var MAXBITS = 15;
var ENOUGH_LENS$1 = 852;
var ENOUGH_DISTS$1 = 592;
var CODES$1 = 0;
var LENS$1 = 1;
var DISTS$1 = 2;
var lbase = new Uint16Array([
  /* Length codes 257..285 base */
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  13,
  15,
  17,
  19,
  23,
  27,
  31,
  35,
  43,
  51,
  59,
  67,
  83,
  99,
  115,
  131,
  163,
  195,
  227,
  258,
  0,
  0
]);
var lext = new Uint8Array([
  /* Length codes 257..285 extra */
  16,
  16,
  16,
  16,
  16,
  16,
  16,
  16,
  17,
  17,
  17,
  17,
  18,
  18,
  18,
  18,
  19,
  19,
  19,
  19,
  20,
  20,
  20,
  20,
  21,
  21,
  21,
  21,
  16,
  72,
  78
]);
var dbase = new Uint16Array([
  /* Distance codes 0..29 base */
  1,
  2,
  3,
  4,
  5,
  7,
  9,
  13,
  17,
  25,
  33,
  49,
  65,
  97,
  129,
  193,
  257,
  385,
  513,
  769,
  1025,
  1537,
  2049,
  3073,
  4097,
  6145,
  8193,
  12289,
  16385,
  24577,
  0,
  0
]);
var dext = new Uint8Array([
  /* Distance codes 0..29 extra */
  16,
  16,
  16,
  16,
  17,
  17,
  18,
  18,
  19,
  19,
  20,
  20,
  21,
  21,
  22,
  22,
  23,
  23,
  24,
  24,
  25,
  25,
  26,
  26,
  27,
  27,
  28,
  28,
  29,
  29,
  64,
  64
]);
var inflate_table = (type2, lens, lens_index, codes, table, table_index, work, opts) => {
  const bits = opts.bits;
  let len = 0;
  let sym = 0;
  let min = 0, max = 0;
  let root = 0;
  let curr = 0;
  let drop = 0;
  let left = 0;
  let used = 0;
  let huff = 0;
  let incr;
  let fill;
  let low;
  let mask;
  let next;
  let base = null;
  let match;
  const count = new Uint16Array(MAXBITS + 1);
  const offs = new Uint16Array(MAXBITS + 1);
  let extra = null;
  let here_bits, here_op, here_val;
  for (len = 0; len <= MAXBITS; len++) {
    count[len] = 0;
  }
  for (sym = 0; sym < codes; sym++) {
    count[lens[lens_index + sym]]++;
  }
  root = bits;
  for (max = MAXBITS; max >= 1; max--) {
    if (count[max] !== 0) {
      break;
    }
  }
  if (root > max) {
    root = max;
  }
  if (max === 0) {
    table[table_index++] = 1 << 24 | 64 << 16 | 0;
    table[table_index++] = 1 << 24 | 64 << 16 | 0;
    opts.bits = 1;
    return 0;
  }
  for (min = 1; min < max; min++) {
    if (count[min] !== 0) {
      break;
    }
  }
  if (root < min) {
    root = min;
  }
  left = 1;
  for (len = 1; len <= MAXBITS; len++) {
    left <<= 1;
    left -= count[len];
    if (left < 0) {
      return -1;
    }
  }
  if (left > 0 && (type2 === CODES$1 || max !== 1)) {
    return -1;
  }
  offs[1] = 0;
  for (len = 1; len < MAXBITS; len++) {
    offs[len + 1] = offs[len] + count[len];
  }
  for (sym = 0; sym < codes; sym++) {
    if (lens[lens_index + sym] !== 0) {
      work[offs[lens[lens_index + sym]]++] = sym;
    }
  }
  if (type2 === CODES$1) {
    base = extra = work;
    match = 20;
  } else if (type2 === LENS$1) {
    base = lbase;
    extra = lext;
    match = 257;
  } else {
    base = dbase;
    extra = dext;
    match = 0;
  }
  huff = 0;
  sym = 0;
  len = min;
  next = table_index;
  curr = root;
  drop = 0;
  low = -1;
  used = 1 << root;
  mask = used - 1;
  if (type2 === LENS$1 && used > ENOUGH_LENS$1 || type2 === DISTS$1 && used > ENOUGH_DISTS$1) {
    return 1;
  }
  for (; ; ) {
    here_bits = len - drop;
    if (work[sym] + 1 < match) {
      here_op = 0;
      here_val = work[sym];
    } else if (work[sym] >= match) {
      here_op = extra[work[sym] - match];
      here_val = base[work[sym] - match];
    } else {
      here_op = 32 + 64;
      here_val = 0;
    }
    incr = 1 << len - drop;
    fill = 1 << curr;
    min = fill;
    do {
      fill -= incr;
      table[next + (huff >> drop) + fill] = here_bits << 24 | here_op << 16 | here_val | 0;
    } while (fill !== 0);
    incr = 1 << len - 1;
    while (huff & incr) {
      incr >>= 1;
    }
    if (incr !== 0) {
      huff &= incr - 1;
      huff += incr;
    } else {
      huff = 0;
    }
    sym++;
    if (--count[len] === 0) {
      if (len === max) {
        break;
      }
      len = lens[lens_index + work[sym]];
    }
    if (len > root && (huff & mask) !== low) {
      if (drop === 0) {
        drop = root;
      }
      next += min;
      curr = len - drop;
      left = 1 << curr;
      while (curr + drop < max) {
        left -= count[curr + drop];
        if (left <= 0) {
          break;
        }
        curr++;
        left <<= 1;
      }
      used += 1 << curr;
      if (type2 === LENS$1 && used > ENOUGH_LENS$1 || type2 === DISTS$1 && used > ENOUGH_DISTS$1) {
        return 1;
      }
      low = huff & mask;
      table[low] = root << 24 | curr << 16 | next - table_index | 0;
    }
  }
  if (huff !== 0) {
    table[next + huff] = len - drop << 24 | 64 << 16 | 0;
  }
  opts.bits = root;
  return 0;
};
var inftrees = inflate_table;
var CODES = 0;
var LENS = 1;
var DISTS = 2;
var {
  Z_FINISH: Z_FINISH$1,
  Z_BLOCK,
  Z_TREES,
  Z_OK: Z_OK$1,
  Z_STREAM_END: Z_STREAM_END$1,
  Z_NEED_DICT: Z_NEED_DICT$1,
  Z_STREAM_ERROR: Z_STREAM_ERROR$1,
  Z_DATA_ERROR: Z_DATA_ERROR$1,
  Z_MEM_ERROR: Z_MEM_ERROR$1,
  Z_BUF_ERROR,
  Z_DEFLATED
} = constants$2;
var HEAD = 16180;
var FLAGS = 16181;
var TIME = 16182;
var OS = 16183;
var EXLEN = 16184;
var EXTRA = 16185;
var NAME = 16186;
var COMMENT = 16187;
var HCRC = 16188;
var DICTID = 16189;
var DICT = 16190;
var TYPE = 16191;
var TYPEDO = 16192;
var STORED = 16193;
var COPY_ = 16194;
var COPY = 16195;
var TABLE = 16196;
var LENLENS = 16197;
var CODELENS = 16198;
var LEN_ = 16199;
var LEN = 16200;
var LENEXT = 16201;
var DIST = 16202;
var DISTEXT = 16203;
var MATCH = 16204;
var LIT = 16205;
var CHECK = 16206;
var LENGTH = 16207;
var DONE = 16208;
var BAD = 16209;
var MEM = 16210;
var SYNC = 16211;
var ENOUGH_LENS = 852;
var ENOUGH_DISTS = 592;
var MAX_WBITS = 15;
var DEF_WBITS = MAX_WBITS;
var zswap32 = (q) => {
  return (q >>> 24 & 255) + (q >>> 8 & 65280) + ((q & 65280) << 8) + ((q & 255) << 24);
};
function InflateState() {
  this.strm = null;
  this.mode = 0;
  this.last = false;
  this.wrap = 0;
  this.havedict = false;
  this.flags = 0;
  this.dmax = 0;
  this.check = 0;
  this.total = 0;
  this.head = null;
  this.wbits = 0;
  this.wsize = 0;
  this.whave = 0;
  this.wnext = 0;
  this.window = null;
  this.hold = 0;
  this.bits = 0;
  this.length = 0;
  this.offset = 0;
  this.extra = 0;
  this.lencode = null;
  this.distcode = null;
  this.lenbits = 0;
  this.distbits = 0;
  this.ncode = 0;
  this.nlen = 0;
  this.ndist = 0;
  this.have = 0;
  this.next = null;
  this.lens = new Uint16Array(320);
  this.work = new Uint16Array(288);
  this.lendyn = null;
  this.distdyn = null;
  this.sane = 0;
  this.back = 0;
  this.was = 0;
}
var inflateStateCheck = (strm) => {
  if (!strm) {
    return 1;
  }
  const state = strm.state;
  if (!state || state.strm !== strm || state.mode < HEAD || state.mode > SYNC) {
    return 1;
  }
  return 0;
};
var inflateResetKeep = (strm) => {
  if (inflateStateCheck(strm)) {
    return Z_STREAM_ERROR$1;
  }
  const state = strm.state;
  strm.total_in = strm.total_out = state.total = 0;
  strm.msg = "";
  if (state.wrap) {
    strm.adler = state.wrap & 1;
  }
  state.mode = HEAD;
  state.last = 0;
  state.havedict = 0;
  state.flags = -1;
  state.dmax = 32768;
  state.head = null;
  state.hold = 0;
  state.bits = 0;
  state.lencode = state.lendyn = new Int32Array(ENOUGH_LENS);
  state.distcode = state.distdyn = new Int32Array(ENOUGH_DISTS);
  state.sane = 1;
  state.back = -1;
  return Z_OK$1;
};
var inflateReset = (strm) => {
  if (inflateStateCheck(strm)) {
    return Z_STREAM_ERROR$1;
  }
  const state = strm.state;
  state.wsize = 0;
  state.whave = 0;
  state.wnext = 0;
  return inflateResetKeep(strm);
};
var inflateReset2 = (strm, windowBits) => {
  let wrap;
  if (inflateStateCheck(strm)) {
    return Z_STREAM_ERROR$1;
  }
  const state = strm.state;
  if (windowBits < 0) {
    wrap = 0;
    windowBits = -windowBits;
  } else {
    wrap = (windowBits >> 4) + 5;
    if (windowBits < 48) {
      windowBits &= 15;
    }
  }
  if (windowBits && (windowBits < 8 || windowBits > 15)) {
    return Z_STREAM_ERROR$1;
  }
  if (state.window !== null && state.wbits !== windowBits) {
    state.window = null;
  }
  state.wrap = wrap;
  state.wbits = windowBits;
  return inflateReset(strm);
};
var inflateInit2 = (strm, windowBits) => {
  if (!strm) {
    return Z_STREAM_ERROR$1;
  }
  const state = new InflateState();
  strm.state = state;
  state.strm = strm;
  state.window = null;
  state.mode = HEAD;
  const ret = inflateReset2(strm, windowBits);
  if (ret !== Z_OK$1) {
    strm.state = null;
  }
  return ret;
};
var inflateInit = (strm) => {
  return inflateInit2(strm, DEF_WBITS);
};
var virgin = true;
var lenfix;
var distfix;
var fixedtables = (state) => {
  if (virgin) {
    lenfix = new Int32Array(512);
    distfix = new Int32Array(32);
    let sym = 0;
    while (sym < 144) {
      state.lens[sym++] = 8;
    }
    while (sym < 256) {
      state.lens[sym++] = 9;
    }
    while (sym < 280) {
      state.lens[sym++] = 7;
    }
    while (sym < 288) {
      state.lens[sym++] = 8;
    }
    inftrees(LENS, state.lens, 0, 288, lenfix, 0, state.work, { bits: 9 });
    sym = 0;
    while (sym < 32) {
      state.lens[sym++] = 5;
    }
    inftrees(DISTS, state.lens, 0, 32, distfix, 0, state.work, { bits: 5 });
    virgin = false;
  }
  state.lencode = lenfix;
  state.lenbits = 9;
  state.distcode = distfix;
  state.distbits = 5;
};
var updatewindow = (strm, src, end, copy) => {
  let dist;
  const state = strm.state;
  if (state.window === null) {
    state.wsize = 1 << state.wbits;
    state.wnext = 0;
    state.whave = 0;
    state.window = new Uint8Array(state.wsize);
  }
  if (copy >= state.wsize) {
    state.window.set(src.subarray(end - state.wsize, end), 0);
    state.wnext = 0;
    state.whave = state.wsize;
  } else {
    dist = state.wsize - state.wnext;
    if (dist > copy) {
      dist = copy;
    }
    state.window.set(src.subarray(end - copy, end - copy + dist), state.wnext);
    copy -= dist;
    if (copy) {
      state.window.set(src.subarray(end - copy, end), 0);
      state.wnext = copy;
      state.whave = state.wsize;
    } else {
      state.wnext += dist;
      if (state.wnext === state.wsize) {
        state.wnext = 0;
      }
      if (state.whave < state.wsize) {
        state.whave += dist;
      }
    }
  }
  return 0;
};
var inflate$2 = (strm, flush) => {
  let state;
  let input, output;
  let next;
  let put;
  let have, left;
  let hold;
  let bits;
  let _in, _out;
  let copy;
  let from;
  let from_source;
  let here = 0;
  let here_bits, here_op, here_val;
  let last_bits, last_op, last_val;
  let len;
  let ret;
  const hbuf = new Uint8Array(4);
  let opts;
  let n;
  const order = (
    /* permutation of code lengths */
    new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15])
  );
  if (inflateStateCheck(strm) || !strm.output || !strm.input && strm.avail_in !== 0) {
    return Z_STREAM_ERROR$1;
  }
  state = strm.state;
  if (state.mode === TYPE) {
    state.mode = TYPEDO;
  }
  put = strm.next_out;
  output = strm.output;
  left = strm.avail_out;
  next = strm.next_in;
  input = strm.input;
  have = strm.avail_in;
  hold = state.hold;
  bits = state.bits;
  _in = have;
  _out = left;
  ret = Z_OK$1;
  inf_leave:
    for (; ; ) {
      switch (state.mode) {
        case HEAD:
          if (state.wrap === 0) {
            state.mode = TYPEDO;
            break;
          }
          while (bits < 16) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if (state.wrap & 2 && hold === 35615) {
            if (state.wbits === 0) {
              state.wbits = 15;
            }
            state.check = 0;
            hbuf[0] = hold & 255;
            hbuf[1] = hold >>> 8 & 255;
            state.check = crc32_1(state.check, hbuf, 2, 0);
            hold = 0;
            bits = 0;
            state.mode = FLAGS;
            break;
          }
          if (state.head) {
            state.head.done = false;
          }
          if (!(state.wrap & 1) || /* check if zlib header allowed */
          (((hold & 255) << 8) + (hold >> 8)) % 31) {
            strm.msg = "incorrect header check";
            state.mode = BAD;
            break;
          }
          if ((hold & 15) !== Z_DEFLATED) {
            strm.msg = "unknown compression method";
            state.mode = BAD;
            break;
          }
          hold >>>= 4;
          bits -= 4;
          len = (hold & 15) + 8;
          if (state.wbits === 0) {
            state.wbits = len;
          }
          if (len > 15 || len > state.wbits) {
            strm.msg = "invalid window size";
            state.mode = BAD;
            break;
          }
          state.dmax = 1 << state.wbits;
          state.flags = 0;
          strm.adler = state.check = 1;
          state.mode = hold & 512 ? DICTID : TYPE;
          hold = 0;
          bits = 0;
          break;
        case FLAGS:
          while (bits < 16) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          state.flags = hold;
          if ((state.flags & 255) !== Z_DEFLATED) {
            strm.msg = "unknown compression method";
            state.mode = BAD;
            break;
          }
          if (state.flags & 57344) {
            strm.msg = "unknown header flags set";
            state.mode = BAD;
            break;
          }
          if (state.head) {
            state.head.text = hold >> 8 & 1;
          }
          if (state.flags & 512 && state.wrap & 4) {
            hbuf[0] = hold & 255;
            hbuf[1] = hold >>> 8 & 255;
            state.check = crc32_1(state.check, hbuf, 2, 0);
          }
          hold = 0;
          bits = 0;
          state.mode = TIME;
        case TIME:
          while (bits < 32) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if (state.head) {
            state.head.time = hold;
          }
          if (state.flags & 512 && state.wrap & 4) {
            hbuf[0] = hold & 255;
            hbuf[1] = hold >>> 8 & 255;
            hbuf[2] = hold >>> 16 & 255;
            hbuf[3] = hold >>> 24 & 255;
            state.check = crc32_1(state.check, hbuf, 4, 0);
          }
          hold = 0;
          bits = 0;
          state.mode = OS;
        case OS:
          while (bits < 16) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if (state.head) {
            state.head.xflags = hold & 255;
            state.head.os = hold >> 8;
          }
          if (state.flags & 512 && state.wrap & 4) {
            hbuf[0] = hold & 255;
            hbuf[1] = hold >>> 8 & 255;
            state.check = crc32_1(state.check, hbuf, 2, 0);
          }
          hold = 0;
          bits = 0;
          state.mode = EXLEN;
        case EXLEN:
          if (state.flags & 1024) {
            while (bits < 16) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            state.length = hold;
            if (state.head) {
              state.head.extra_len = hold;
            }
            if (state.flags & 512 && state.wrap & 4) {
              hbuf[0] = hold & 255;
              hbuf[1] = hold >>> 8 & 255;
              state.check = crc32_1(state.check, hbuf, 2, 0);
            }
            hold = 0;
            bits = 0;
          } else if (state.head) {
            state.head.extra = null;
          }
          state.mode = EXTRA;
        case EXTRA:
          if (state.flags & 1024) {
            copy = state.length;
            if (copy > have) {
              copy = have;
            }
            if (copy) {
              if (state.head) {
                len = state.head.extra_len - state.length;
                if (!state.head.extra) {
                  state.head.extra = new Uint8Array(state.head.extra_len);
                }
                state.head.extra.set(
                  input.subarray(
                    next,
                    // extra field is limited to 65536 bytes
                    // - no need for additional size check
                    next + copy
                  ),
                  /*len + copy > state.head.extra_max - len ? state.head.extra_max : copy,*/
                  len
                );
              }
              if (state.flags & 512 && state.wrap & 4) {
                state.check = crc32_1(state.check, input, copy, next);
              }
              have -= copy;
              next += copy;
              state.length -= copy;
            }
            if (state.length) {
              break inf_leave;
            }
          }
          state.length = 0;
          state.mode = NAME;
        case NAME:
          if (state.flags & 2048) {
            if (have === 0) {
              break inf_leave;
            }
            copy = 0;
            do {
              len = input[next + copy++];
              if (state.head && len && state.length < 65536) {
                state.head.name += String.fromCharCode(len);
              }
            } while (len && copy < have);
            if (state.flags & 512 && state.wrap & 4) {
              state.check = crc32_1(state.check, input, copy, next);
            }
            have -= copy;
            next += copy;
            if (len) {
              break inf_leave;
            }
          } else if (state.head) {
            state.head.name = null;
          }
          state.length = 0;
          state.mode = COMMENT;
        case COMMENT:
          if (state.flags & 4096) {
            if (have === 0) {
              break inf_leave;
            }
            copy = 0;
            do {
              len = input[next + copy++];
              if (state.head && len && state.length < 65536) {
                state.head.comment += String.fromCharCode(len);
              }
            } while (len && copy < have);
            if (state.flags & 512 && state.wrap & 4) {
              state.check = crc32_1(state.check, input, copy, next);
            }
            have -= copy;
            next += copy;
            if (len) {
              break inf_leave;
            }
          } else if (state.head) {
            state.head.comment = null;
          }
          state.mode = HCRC;
        case HCRC:
          if (state.flags & 512) {
            while (bits < 16) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if (state.wrap & 4 && hold !== (state.check & 65535)) {
              strm.msg = "header crc mismatch";
              state.mode = BAD;
              break;
            }
            hold = 0;
            bits = 0;
          }
          if (state.head) {
            state.head.hcrc = state.flags >> 9 & 1;
            state.head.done = true;
          }
          strm.adler = state.check = 0;
          state.mode = TYPE;
          break;
        case DICTID:
          while (bits < 32) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          strm.adler = state.check = zswap32(hold);
          hold = 0;
          bits = 0;
          state.mode = DICT;
        case DICT:
          if (state.havedict === 0) {
            strm.next_out = put;
            strm.avail_out = left;
            strm.next_in = next;
            strm.avail_in = have;
            state.hold = hold;
            state.bits = bits;
            return Z_NEED_DICT$1;
          }
          strm.adler = state.check = 1;
          state.mode = TYPE;
        case TYPE:
          if (flush === Z_BLOCK || flush === Z_TREES) {
            break inf_leave;
          }
        case TYPEDO:
          if (state.last) {
            hold >>>= bits & 7;
            bits -= bits & 7;
            state.mode = CHECK;
            break;
          }
          while (bits < 3) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          state.last = hold & 1;
          hold >>>= 1;
          bits -= 1;
          switch (hold & 3) {
            case 0:
              state.mode = STORED;
              break;
            case 1:
              fixedtables(state);
              state.mode = LEN_;
              if (flush === Z_TREES) {
                hold >>>= 2;
                bits -= 2;
                break inf_leave;
              }
              break;
            case 2:
              state.mode = TABLE;
              break;
            case 3:
              strm.msg = "invalid block type";
              state.mode = BAD;
          }
          hold >>>= 2;
          bits -= 2;
          break;
        case STORED:
          hold >>>= bits & 7;
          bits -= bits & 7;
          while (bits < 32) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if ((hold & 65535) !== (hold >>> 16 ^ 65535)) {
            strm.msg = "invalid stored block lengths";
            state.mode = BAD;
            break;
          }
          state.length = hold & 65535;
          hold = 0;
          bits = 0;
          state.mode = COPY_;
          if (flush === Z_TREES) {
            break inf_leave;
          }
        case COPY_:
          state.mode = COPY;
        case COPY:
          copy = state.length;
          if (copy) {
            if (copy > have) {
              copy = have;
            }
            if (copy > left) {
              copy = left;
            }
            if (copy === 0) {
              break inf_leave;
            }
            output.set(input.subarray(next, next + copy), put);
            have -= copy;
            next += copy;
            left -= copy;
            put += copy;
            state.length -= copy;
            break;
          }
          state.mode = TYPE;
          break;
        case TABLE:
          while (bits < 14) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          state.nlen = (hold & 31) + 257;
          hold >>>= 5;
          bits -= 5;
          state.ndist = (hold & 31) + 1;
          hold >>>= 5;
          bits -= 5;
          state.ncode = (hold & 15) + 4;
          hold >>>= 4;
          bits -= 4;
          if (state.nlen > 286 || state.ndist > 30) {
            strm.msg = "too many length or distance symbols";
            state.mode = BAD;
            break;
          }
          state.have = 0;
          state.mode = LENLENS;
        case LENLENS:
          while (state.have < state.ncode) {
            while (bits < 3) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            state.lens[order[state.have++]] = hold & 7;
            hold >>>= 3;
            bits -= 3;
          }
          while (state.have < 19) {
            state.lens[order[state.have++]] = 0;
          }
          state.lencode = state.lendyn;
          state.lenbits = 7;
          opts = { bits: state.lenbits };
          ret = inftrees(CODES, state.lens, 0, 19, state.lencode, 0, state.work, opts);
          state.lenbits = opts.bits;
          if (ret) {
            strm.msg = "invalid code lengths set";
            state.mode = BAD;
            break;
          }
          state.have = 0;
          state.mode = CODELENS;
        case CODELENS:
          while (state.have < state.nlen + state.ndist) {
            for (; ; ) {
              here = state.lencode[hold & (1 << state.lenbits) - 1];
              here_bits = here >>> 24;
              here_op = here >>> 16 & 255;
              here_val = here & 65535;
              if (here_bits <= bits) {
                break;
              }
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if (here_val < 16) {
              hold >>>= here_bits;
              bits -= here_bits;
              state.lens[state.have++] = here_val;
            } else {
              if (here_val === 16) {
                n = here_bits + 2;
                while (bits < n) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                hold >>>= here_bits;
                bits -= here_bits;
                if (state.have === 0) {
                  strm.msg = "invalid bit length repeat";
                  state.mode = BAD;
                  break;
                }
                len = state.lens[state.have - 1];
                copy = 3 + (hold & 3);
                hold >>>= 2;
                bits -= 2;
              } else if (here_val === 17) {
                n = here_bits + 3;
                while (bits < n) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                hold >>>= here_bits;
                bits -= here_bits;
                len = 0;
                copy = 3 + (hold & 7);
                hold >>>= 3;
                bits -= 3;
              } else {
                n = here_bits + 7;
                while (bits < n) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                hold >>>= here_bits;
                bits -= here_bits;
                len = 0;
                copy = 11 + (hold & 127);
                hold >>>= 7;
                bits -= 7;
              }
              if (state.have + copy > state.nlen + state.ndist) {
                strm.msg = "invalid bit length repeat";
                state.mode = BAD;
                break;
              }
              while (copy--) {
                state.lens[state.have++] = len;
              }
            }
          }
          if (state.mode === BAD) {
            break;
          }
          if (state.lens[256] === 0) {
            strm.msg = "invalid code -- missing end-of-block";
            state.mode = BAD;
            break;
          }
          state.lenbits = 9;
          opts = { bits: state.lenbits };
          ret = inftrees(LENS, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
          state.lenbits = opts.bits;
          if (ret) {
            strm.msg = "invalid literal/lengths set";
            state.mode = BAD;
            break;
          }
          state.distbits = 6;
          state.distcode = state.distdyn;
          opts = { bits: state.distbits };
          ret = inftrees(DISTS, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
          state.distbits = opts.bits;
          if (ret) {
            strm.msg = "invalid distances set";
            state.mode = BAD;
            break;
          }
          state.mode = LEN_;
          if (flush === Z_TREES) {
            break inf_leave;
          }
        case LEN_:
          state.mode = LEN;
        case LEN:
          if (have >= 6 && left >= 258) {
            strm.next_out = put;
            strm.avail_out = left;
            strm.next_in = next;
            strm.avail_in = have;
            state.hold = hold;
            state.bits = bits;
            inffast(strm, _out);
            put = strm.next_out;
            output = strm.output;
            left = strm.avail_out;
            next = strm.next_in;
            input = strm.input;
            have = strm.avail_in;
            hold = state.hold;
            bits = state.bits;
            if (state.mode === TYPE) {
              state.back = -1;
            }
            break;
          }
          state.back = 0;
          for (; ; ) {
            here = state.lencode[hold & (1 << state.lenbits) - 1];
            here_bits = here >>> 24;
            here_op = here >>> 16 & 255;
            here_val = here & 65535;
            if (here_bits <= bits) {
              break;
            }
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if (here_op && (here_op & 240) === 0) {
            last_bits = here_bits;
            last_op = here_op;
            last_val = here_val;
            for (; ; ) {
              here = state.lencode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
              here_bits = here >>> 24;
              here_op = here >>> 16 & 255;
              here_val = here & 65535;
              if (last_bits + here_bits <= bits) {
                break;
              }
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            hold >>>= last_bits;
            bits -= last_bits;
            state.back += last_bits;
          }
          hold >>>= here_bits;
          bits -= here_bits;
          state.back += here_bits;
          state.length = here_val;
          if (here_op === 0) {
            state.mode = LIT;
            break;
          }
          if (here_op & 32) {
            state.back = -1;
            state.mode = TYPE;
            break;
          }
          if (here_op & 64) {
            strm.msg = "invalid literal/length code";
            state.mode = BAD;
            break;
          }
          state.extra = here_op & 15;
          state.mode = LENEXT;
        case LENEXT:
          if (state.extra) {
            n = state.extra;
            while (bits < n) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            state.length += hold & (1 << state.extra) - 1;
            hold >>>= state.extra;
            bits -= state.extra;
            state.back += state.extra;
          }
          state.was = state.length;
          state.mode = DIST;
        case DIST:
          for (; ; ) {
            here = state.distcode[hold & (1 << state.distbits) - 1];
            here_bits = here >>> 24;
            here_op = here >>> 16 & 255;
            here_val = here & 65535;
            if (here_bits <= bits) {
              break;
            }
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if ((here_op & 240) === 0) {
            last_bits = here_bits;
            last_op = here_op;
            last_val = here_val;
            for (; ; ) {
              here = state.distcode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
              here_bits = here >>> 24;
              here_op = here >>> 16 & 255;
              here_val = here & 65535;
              if (last_bits + here_bits <= bits) {
                break;
              }
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            hold >>>= last_bits;
            bits -= last_bits;
            state.back += last_bits;
          }
          hold >>>= here_bits;
          bits -= here_bits;
          state.back += here_bits;
          if (here_op & 64) {
            strm.msg = "invalid distance code";
            state.mode = BAD;
            break;
          }
          state.offset = here_val;
          state.extra = here_op & 15;
          state.mode = DISTEXT;
        case DISTEXT:
          if (state.extra) {
            n = state.extra;
            while (bits < n) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            state.offset += hold & (1 << state.extra) - 1;
            hold >>>= state.extra;
            bits -= state.extra;
            state.back += state.extra;
          }
          if (state.offset > state.dmax) {
            strm.msg = "invalid distance too far back";
            state.mode = BAD;
            break;
          }
          state.mode = MATCH;
        case MATCH:
          if (left === 0) {
            break inf_leave;
          }
          copy = _out - left;
          if (state.offset > copy) {
            copy = state.offset - copy;
            if (copy > state.whave) {
              if (state.sane) {
                strm.msg = "invalid distance too far back";
                state.mode = BAD;
                break;
              }
            }
            if (copy > state.wnext) {
              copy -= state.wnext;
              from = state.wsize - copy;
            } else {
              from = state.wnext - copy;
            }
            if (copy > state.length) {
              copy = state.length;
            }
            from_source = state.window;
          } else {
            from_source = output;
            from = put - state.offset;
            copy = state.length;
          }
          if (copy > left) {
            copy = left;
          }
          left -= copy;
          state.length -= copy;
          do {
            output[put++] = from_source[from++];
          } while (--copy);
          if (state.length === 0) {
            state.mode = LEN;
          }
          break;
        case LIT:
          if (left === 0) {
            break inf_leave;
          }
          output[put++] = state.length;
          left--;
          state.mode = LEN;
          break;
        case CHECK:
          if (state.wrap) {
            while (bits < 32) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold |= input[next++] << bits;
              bits += 8;
            }
            _out -= left;
            strm.total_out += _out;
            state.total += _out;
            if (state.wrap & 4 && _out) {
              strm.adler = state.check = /*UPDATE_CHECK(state.check, put - _out, _out);*/
              state.flags ? crc32_1(state.check, output, _out, put - _out) : adler32_1(state.check, output, _out, put - _out);
            }
            _out = left;
            if (state.wrap & 4 && (state.flags ? hold : zswap32(hold)) !== state.check) {
              strm.msg = "incorrect data check";
              state.mode = BAD;
              break;
            }
            hold = 0;
            bits = 0;
          }
          state.mode = LENGTH;
        case LENGTH:
          if (state.wrap && state.flags) {
            while (bits < 32) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if (state.wrap & 4 && hold !== (state.total & 4294967295)) {
              strm.msg = "incorrect length check";
              state.mode = BAD;
              break;
            }
            hold = 0;
            bits = 0;
          }
          state.mode = DONE;
        case DONE:
          ret = Z_STREAM_END$1;
          break inf_leave;
        case BAD:
          ret = Z_DATA_ERROR$1;
          break inf_leave;
        case MEM:
          return Z_MEM_ERROR$1;
        case SYNC:
        default:
          return Z_STREAM_ERROR$1;
      }
    }
  strm.next_out = put;
  strm.avail_out = left;
  strm.next_in = next;
  strm.avail_in = have;
  state.hold = hold;
  state.bits = bits;
  if (state.wsize || _out !== strm.avail_out && state.mode < BAD && (state.mode < CHECK || flush !== Z_FINISH$1)) {
    if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out))
      ;
  }
  _in -= strm.avail_in;
  _out -= strm.avail_out;
  strm.total_in += _in;
  strm.total_out += _out;
  state.total += _out;
  if (state.wrap & 4 && _out) {
    strm.adler = state.check = /*UPDATE_CHECK(state.check, strm.next_out - _out, _out);*/
    state.flags ? crc32_1(state.check, output, _out, strm.next_out - _out) : adler32_1(state.check, output, _out, strm.next_out - _out);
  }
  strm.data_type = state.bits + (state.last ? 64 : 0) + (state.mode === TYPE ? 128 : 0) + (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
  if ((_in === 0 && _out === 0 || flush === Z_FINISH$1) && ret === Z_OK$1) {
    ret = Z_BUF_ERROR;
  }
  return ret;
};
var inflateEnd = (strm) => {
  if (inflateStateCheck(strm)) {
    return Z_STREAM_ERROR$1;
  }
  let state = strm.state;
  if (state.window) {
    state.window = null;
  }
  strm.state = null;
  return Z_OK$1;
};
var inflateGetHeader = (strm, head) => {
  if (inflateStateCheck(strm)) {
    return Z_STREAM_ERROR$1;
  }
  const state = strm.state;
  if ((state.wrap & 2) === 0) {
    return Z_STREAM_ERROR$1;
  }
  state.head = head;
  head.done = false;
  return Z_OK$1;
};
var inflateSetDictionary = (strm, dictionary) => {
  const dictLength = dictionary.length;
  let state;
  let dictid;
  let ret;
  if (inflateStateCheck(strm)) {
    return Z_STREAM_ERROR$1;
  }
  state = strm.state;
  if (state.wrap !== 0 && state.mode !== DICT) {
    return Z_STREAM_ERROR$1;
  }
  if (state.mode === DICT) {
    dictid = 1;
    dictid = adler32_1(dictid, dictionary, dictLength, 0);
    if (dictid !== state.check) {
      return Z_DATA_ERROR$1;
    }
  }
  ret = updatewindow(strm, dictionary, dictLength, dictLength);
  if (ret) {
    state.mode = MEM;
    return Z_MEM_ERROR$1;
  }
  state.havedict = 1;
  return Z_OK$1;
};
var inflateReset_1 = inflateReset;
var inflateReset2_1 = inflateReset2;
var inflateResetKeep_1 = inflateResetKeep;
var inflateInit_1 = inflateInit;
var inflateInit2_1 = inflateInit2;
var inflate_2$1 = inflate$2;
var inflateEnd_1 = inflateEnd;
var inflateGetHeader_1 = inflateGetHeader;
var inflateSetDictionary_1 = inflateSetDictionary;
var inflateInfo = "pako inflate (from Nodeca project)";
var inflate_1$2 = {
  inflateReset: inflateReset_1,
  inflateReset2: inflateReset2_1,
  inflateResetKeep: inflateResetKeep_1,
  inflateInit: inflateInit_1,
  inflateInit2: inflateInit2_1,
  inflate: inflate_2$1,
  inflateEnd: inflateEnd_1,
  inflateGetHeader: inflateGetHeader_1,
  inflateSetDictionary: inflateSetDictionary_1,
  inflateInfo
};
function GZheader() {
  this.text = 0;
  this.time = 0;
  this.xflags = 0;
  this.os = 0;
  this.extra = null;
  this.extra_len = 0;
  this.name = "";
  this.comment = "";
  this.hcrc = 0;
  this.done = false;
}
var gzheader = GZheader;
var toString = Object.prototype.toString;
var {
  Z_NO_FLUSH,
  Z_FINISH,
  Z_OK,
  Z_STREAM_END,
  Z_NEED_DICT,
  Z_STREAM_ERROR,
  Z_DATA_ERROR,
  Z_MEM_ERROR
} = constants$2;
function Inflate$1(options) {
  this.options = common.assign({
    chunkSize: 1024 * 64,
    windowBits: 15,
    to: ""
  }, options || {});
  const opt = this.options;
  if (opt.raw && opt.windowBits >= 0 && opt.windowBits < 16) {
    opt.windowBits = -opt.windowBits;
    if (opt.windowBits === 0) {
      opt.windowBits = -15;
    }
  }
  if (opt.windowBits >= 0 && opt.windowBits < 16 && !(options && options.windowBits)) {
    opt.windowBits += 32;
  }
  if (opt.windowBits > 15 && opt.windowBits < 48) {
    if ((opt.windowBits & 15) === 0) {
      opt.windowBits |= 15;
    }
  }
  this.err = 0;
  this.msg = "";
  this.ended = false;
  this.chunks = [];
  this.strm = new zstream();
  this.strm.avail_out = 0;
  let status = inflate_1$2.inflateInit2(
    this.strm,
    opt.windowBits
  );
  if (status !== Z_OK) {
    throw new Error(messages[status]);
  }
  this.header = new gzheader();
  inflate_1$2.inflateGetHeader(this.strm, this.header);
  if (opt.dictionary) {
    if (typeof opt.dictionary === "string") {
      opt.dictionary = strings.string2buf(opt.dictionary);
    } else if (toString.call(opt.dictionary) === "[object ArrayBuffer]") {
      opt.dictionary = new Uint8Array(opt.dictionary);
    }
    if (opt.raw) {
      status = inflate_1$2.inflateSetDictionary(this.strm, opt.dictionary);
      if (status !== Z_OK) {
        throw new Error(messages[status]);
      }
    }
  }
}
Inflate$1.prototype.push = function(data, flush_mode) {
  const strm = this.strm;
  const chunkSize = this.options.chunkSize;
  const dictionary = this.options.dictionary;
  let status, _flush_mode, last_avail_out;
  if (this.ended)
    return false;
  if (flush_mode === ~~flush_mode)
    _flush_mode = flush_mode;
  else
    _flush_mode = flush_mode === true ? Z_FINISH : Z_NO_FLUSH;
  if (toString.call(data) === "[object ArrayBuffer]") {
    strm.input = new Uint8Array(data);
  } else {
    strm.input = data;
  }
  strm.next_in = 0;
  strm.avail_in = strm.input.length;
  for (; ; ) {
    if (strm.avail_out === 0) {
      strm.output = new Uint8Array(chunkSize);
      strm.next_out = 0;
      strm.avail_out = chunkSize;
    }
    status = inflate_1$2.inflate(strm, _flush_mode);
    if (status === Z_NEED_DICT && dictionary) {
      status = inflate_1$2.inflateSetDictionary(strm, dictionary);
      if (status === Z_OK) {
        status = inflate_1$2.inflate(strm, _flush_mode);
      } else if (status === Z_DATA_ERROR) {
        status = Z_NEED_DICT;
      }
    }
    while (strm.avail_in > 0 && status === Z_STREAM_END && strm.state.wrap > 0 && data[strm.next_in] !== 0) {
      inflate_1$2.inflateReset(strm);
      status = inflate_1$2.inflate(strm, _flush_mode);
    }
    switch (status) {
      case Z_STREAM_ERROR:
      case Z_DATA_ERROR:
      case Z_NEED_DICT:
      case Z_MEM_ERROR:
        this.onEnd(status);
        this.ended = true;
        return false;
    }
    last_avail_out = strm.avail_out;
    if (strm.next_out) {
      if (strm.avail_out === 0 || status === Z_STREAM_END) {
        if (this.options.to === "string") {
          let next_out_utf8 = strings.utf8border(strm.output, strm.next_out);
          let tail = strm.next_out - next_out_utf8;
          let utf8str = strings.buf2string(strm.output, next_out_utf8);
          strm.next_out = tail;
          strm.avail_out = chunkSize - tail;
          if (tail)
            strm.output.set(strm.output.subarray(next_out_utf8, next_out_utf8 + tail), 0);
          this.onData(utf8str);
        } else {
          this.onData(strm.output.length === strm.next_out ? strm.output : strm.output.subarray(0, strm.next_out));
        }
      }
    }
    if (status === Z_OK && last_avail_out === 0)
      continue;
    if (status === Z_STREAM_END) {
      status = inflate_1$2.inflateEnd(this.strm);
      this.onEnd(status);
      this.ended = true;
      return true;
    }
    if (strm.avail_in === 0)
      break;
  }
  return true;
};
Inflate$1.prototype.onData = function(chunk) {
  this.chunks.push(chunk);
};
Inflate$1.prototype.onEnd = function(status) {
  if (status === Z_OK) {
    if (this.options.to === "string") {
      this.result = this.chunks.join("");
    } else {
      this.result = common.flattenChunks(this.chunks);
    }
  }
  this.chunks = [];
  this.err = status;
  this.msg = this.strm.msg;
};
function inflate$1(input, options) {
  const inflator = new Inflate$1(options);
  inflator.push(input);
  if (inflator.err)
    throw inflator.msg || messages[inflator.err];
  return inflator.result;
}
function inflateRaw$1(input, options) {
  options = options || {};
  options.raw = true;
  return inflate$1(input, options);
}
var Inflate_1$1 = Inflate$1;
var inflate_2 = inflate$1;
var inflateRaw_1$1 = inflateRaw$1;
var ungzip$1 = inflate$1;
var constants = constants$2;
var inflate_1$1 = {
  Inflate: Inflate_1$1,
  inflate: inflate_2,
  inflateRaw: inflateRaw_1$1,
  ungzip: ungzip$1,
  constants
};
var { Deflate, deflate, deflateRaw, gzip } = deflate_1$1;
var { Inflate, inflate, inflateRaw, ungzip } = inflate_1$1;
var Deflate_1 = Deflate;
var deflate_1 = deflate;
var deflateRaw_1 = deflateRaw;
var gzip_1 = gzip;
var Inflate_1 = Inflate;
var inflate_1 = inflate;
var inflateRaw_1 = inflateRaw;
var ungzip_1 = ungzip;
var constants_1 = constants$2;
var pako = {
  Deflate: Deflate_1,
  deflate: deflate_1,
  deflateRaw: deflateRaw_1,
  gzip: gzip_1,
  Inflate: Inflate_1,
  inflate: inflate_1,
  inflateRaw: inflateRaw_1,
  ungzip: ungzip_1,
  constants: constants_1
};

// src/pandoc.ts
var crc322 = __toESM(require_crc32(), 1);
var crc32c = __toESM(require_crc32c(), 1);
var import_adler_32 = __toESM(require_adler32(), 1);

// node_modules/js-yaml/dist/js-yaml.mjs
function isNothing(subject) {
  return typeof subject === "undefined" || subject === null;
}
function isObject(subject) {
  return typeof subject === "object" && subject !== null;
}
function toArray(sequence) {
  if (Array.isArray(sequence))
    return sequence;
  else if (isNothing(sequence))
    return [];
  return [sequence];
}
function extend(target, source) {
  var index, length, key, sourceKeys;
  if (source) {
    sourceKeys = Object.keys(source);
    for (index = 0, length = sourceKeys.length; index < length; index += 1) {
      key = sourceKeys[index];
      target[key] = source[key];
    }
  }
  return target;
}
function repeat(string, count) {
  var result = "", cycle;
  for (cycle = 0; cycle < count; cycle += 1) {
    result += string;
  }
  return result;
}
function isNegativeZero(number) {
  return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
}
var isNothing_1 = isNothing;
var isObject_1 = isObject;
var toArray_1 = toArray;
var repeat_1 = repeat;
var isNegativeZero_1 = isNegativeZero;
var extend_1 = extend;
var common2 = {
  isNothing: isNothing_1,
  isObject: isObject_1,
  toArray: toArray_1,
  repeat: repeat_1,
  isNegativeZero: isNegativeZero_1,
  extend: extend_1
};
function formatError(exception2, compact) {
  var where = "", message = exception2.reason || "(unknown reason)";
  if (!exception2.mark)
    return message;
  if (exception2.mark.name) {
    where += 'in "' + exception2.mark.name + '" ';
  }
  where += "(" + (exception2.mark.line + 1) + ":" + (exception2.mark.column + 1) + ")";
  if (!compact && exception2.mark.snippet) {
    where += "\n\n" + exception2.mark.snippet;
  }
  return message + " " + where;
}
function YAMLException$1(reason, mark) {
  Error.call(this);
  this.name = "YAMLException";
  this.reason = reason;
  this.mark = mark;
  this.message = formatError(this, false);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.constructor);
  } else {
    this.stack = new Error().stack || "";
  }
}
YAMLException$1.prototype = Object.create(Error.prototype);
YAMLException$1.prototype.constructor = YAMLException$1;
YAMLException$1.prototype.toString = function toString2(compact) {
  return this.name + ": " + formatError(this, compact);
};
var exception = YAMLException$1;
function getLine(buffer, lineStart, lineEnd, position, maxLineLength) {
  var head = "";
  var tail = "";
  var maxHalfLength = Math.floor(maxLineLength / 2) - 1;
  if (position - lineStart > maxHalfLength) {
    head = " ... ";
    lineStart = position - maxHalfLength + head.length;
  }
  if (lineEnd - position > maxHalfLength) {
    tail = " ...";
    lineEnd = position + maxHalfLength - tail.length;
  }
  return {
    str: head + buffer.slice(lineStart, lineEnd).replace(/\t/g, "\u2192") + tail,
    pos: position - lineStart + head.length
    // relative position
  };
}
function padStart(string, max) {
  return common2.repeat(" ", max - string.length) + string;
}
function makeSnippet(mark, options) {
  options = Object.create(options || null);
  if (!mark.buffer)
    return null;
  if (!options.maxLength)
    options.maxLength = 79;
  if (typeof options.indent !== "number")
    options.indent = 1;
  if (typeof options.linesBefore !== "number")
    options.linesBefore = 3;
  if (typeof options.linesAfter !== "number")
    options.linesAfter = 2;
  var re = /\r?\n|\r|\0/g;
  var lineStarts = [0];
  var lineEnds = [];
  var match;
  var foundLineNo = -1;
  while (match = re.exec(mark.buffer)) {
    lineEnds.push(match.index);
    lineStarts.push(match.index + match[0].length);
    if (mark.position <= match.index && foundLineNo < 0) {
      foundLineNo = lineStarts.length - 2;
    }
  }
  if (foundLineNo < 0)
    foundLineNo = lineStarts.length - 1;
  var result = "", i, line;
  var lineNoLength = Math.min(mark.line + options.linesAfter, lineEnds.length).toString().length;
  var maxLineLength = options.maxLength - (options.indent + lineNoLength + 3);
  for (i = 1; i <= options.linesBefore; i++) {
    if (foundLineNo - i < 0)
      break;
    line = getLine(
      mark.buffer,
      lineStarts[foundLineNo - i],
      lineEnds[foundLineNo - i],
      mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]),
      maxLineLength
    );
    result = common2.repeat(" ", options.indent) + padStart((mark.line - i + 1).toString(), lineNoLength) + " | " + line.str + "\n" + result;
  }
  line = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
  result += common2.repeat(" ", options.indent) + padStart((mark.line + 1).toString(), lineNoLength) + " | " + line.str + "\n";
  result += common2.repeat("-", options.indent + lineNoLength + 3 + line.pos) + "^\n";
  for (i = 1; i <= options.linesAfter; i++) {
    if (foundLineNo + i >= lineEnds.length)
      break;
    line = getLine(
      mark.buffer,
      lineStarts[foundLineNo + i],
      lineEnds[foundLineNo + i],
      mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]),
      maxLineLength
    );
    result += common2.repeat(" ", options.indent) + padStart((mark.line + i + 1).toString(), lineNoLength) + " | " + line.str + "\n";
  }
  return result.replace(/\n$/, "");
}
var snippet = makeSnippet;
var TYPE_CONSTRUCTOR_OPTIONS = [
  "kind",
  "multi",
  "resolve",
  "construct",
  "instanceOf",
  "predicate",
  "represent",
  "representName",
  "defaultStyle",
  "styleAliases"
];
var YAML_NODE_KINDS = [
  "scalar",
  "sequence",
  "mapping"
];
function compileStyleAliases(map2) {
  var result = {};
  if (map2 !== null) {
    Object.keys(map2).forEach(function(style) {
      map2[style].forEach(function(alias) {
        result[String(alias)] = style;
      });
    });
  }
  return result;
}
function Type$1(tag, options) {
  options = options || {};
  Object.keys(options).forEach(function(name) {
    if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) {
      throw new exception('Unknown option "' + name + '" is met in definition of "' + tag + '" YAML type.');
    }
  });
  this.options = options;
  this.tag = tag;
  this.kind = options["kind"] || null;
  this.resolve = options["resolve"] || function() {
    return true;
  };
  this.construct = options["construct"] || function(data) {
    return data;
  };
  this.instanceOf = options["instanceOf"] || null;
  this.predicate = options["predicate"] || null;
  this.represent = options["represent"] || null;
  this.representName = options["representName"] || null;
  this.defaultStyle = options["defaultStyle"] || null;
  this.multi = options["multi"] || false;
  this.styleAliases = compileStyleAliases(options["styleAliases"] || null);
  if (YAML_NODE_KINDS.indexOf(this.kind) === -1) {
    throw new exception('Unknown kind "' + this.kind + '" is specified for "' + tag + '" YAML type.');
  }
}
var type = Type$1;
function compileList(schema2, name) {
  var result = [];
  schema2[name].forEach(function(currentType) {
    var newIndex = result.length;
    result.forEach(function(previousType, previousIndex) {
      if (previousType.tag === currentType.tag && previousType.kind === currentType.kind && previousType.multi === currentType.multi) {
        newIndex = previousIndex;
      }
    });
    result[newIndex] = currentType;
  });
  return result;
}
function compileMap() {
  var result = {
    scalar: {},
    sequence: {},
    mapping: {},
    fallback: {},
    multi: {
      scalar: [],
      sequence: [],
      mapping: [],
      fallback: []
    }
  }, index, length;
  function collectType(type2) {
    if (type2.multi) {
      result.multi[type2.kind].push(type2);
      result.multi["fallback"].push(type2);
    } else {
      result[type2.kind][type2.tag] = result["fallback"][type2.tag] = type2;
    }
  }
  for (index = 0, length = arguments.length; index < length; index += 1) {
    arguments[index].forEach(collectType);
  }
  return result;
}
function Schema$1(definition) {
  return this.extend(definition);
}
Schema$1.prototype.extend = function extend2(definition) {
  var implicit = [];
  var explicit = [];
  if (definition instanceof type) {
    explicit.push(definition);
  } else if (Array.isArray(definition)) {
    explicit = explicit.concat(definition);
  } else if (definition && (Array.isArray(definition.implicit) || Array.isArray(definition.explicit))) {
    if (definition.implicit)
      implicit = implicit.concat(definition.implicit);
    if (definition.explicit)
      explicit = explicit.concat(definition.explicit);
  } else {
    throw new exception("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");
  }
  implicit.forEach(function(type$1) {
    if (!(type$1 instanceof type)) {
      throw new exception("Specified list of YAML types (or a single Type object) contains a non-Type object.");
    }
    if (type$1.loadKind && type$1.loadKind !== "scalar") {
      throw new exception("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
    }
    if (type$1.multi) {
      throw new exception("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.");
    }
  });
  explicit.forEach(function(type$1) {
    if (!(type$1 instanceof type)) {
      throw new exception("Specified list of YAML types (or a single Type object) contains a non-Type object.");
    }
  });
  var result = Object.create(Schema$1.prototype);
  result.implicit = (this.implicit || []).concat(implicit);
  result.explicit = (this.explicit || []).concat(explicit);
  result.compiledImplicit = compileList(result, "implicit");
  result.compiledExplicit = compileList(result, "explicit");
  result.compiledTypeMap = compileMap(result.compiledImplicit, result.compiledExplicit);
  return result;
};
var schema = Schema$1;
var str = new type("tag:yaml.org,2002:str", {
  kind: "scalar",
  construct: function(data) {
    return data !== null ? data : "";
  }
});
var seq = new type("tag:yaml.org,2002:seq", {
  kind: "sequence",
  construct: function(data) {
    return data !== null ? data : [];
  }
});
var map = new type("tag:yaml.org,2002:map", {
  kind: "mapping",
  construct: function(data) {
    return data !== null ? data : {};
  }
});
var failsafe = new schema({
  explicit: [
    str,
    seq,
    map
  ]
});
function resolveYamlNull(data) {
  if (data === null)
    return true;
  var max = data.length;
  return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
}
function constructYamlNull() {
  return null;
}
function isNull(object) {
  return object === null;
}
var _null = new type("tag:yaml.org,2002:null", {
  kind: "scalar",
  resolve: resolveYamlNull,
  construct: constructYamlNull,
  predicate: isNull,
  represent: {
    canonical: function() {
      return "~";
    },
    lowercase: function() {
      return "null";
    },
    uppercase: function() {
      return "NULL";
    },
    camelcase: function() {
      return "Null";
    },
    empty: function() {
      return "";
    }
  },
  defaultStyle: "lowercase"
});
function resolveYamlBoolean(data) {
  if (data === null)
    return false;
  var max = data.length;
  return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
}
function constructYamlBoolean(data) {
  return data === "true" || data === "True" || data === "TRUE";
}
function isBoolean(object) {
  return Object.prototype.toString.call(object) === "[object Boolean]";
}
var bool = new type("tag:yaml.org,2002:bool", {
  kind: "scalar",
  resolve: resolveYamlBoolean,
  construct: constructYamlBoolean,
  predicate: isBoolean,
  represent: {
    lowercase: function(object) {
      return object ? "true" : "false";
    },
    uppercase: function(object) {
      return object ? "TRUE" : "FALSE";
    },
    camelcase: function(object) {
      return object ? "True" : "False";
    }
  },
  defaultStyle: "lowercase"
});
function isHexCode(c) {
  return 48 <= c && c <= 57 || 65 <= c && c <= 70 || 97 <= c && c <= 102;
}
function isOctCode(c) {
  return 48 <= c && c <= 55;
}
function isDecCode(c) {
  return 48 <= c && c <= 57;
}
function resolveYamlInteger(data) {
  if (data === null)
    return false;
  var max = data.length, index = 0, hasDigits = false, ch;
  if (!max)
    return false;
  ch = data[index];
  if (ch === "-" || ch === "+") {
    ch = data[++index];
  }
  if (ch === "0") {
    if (index + 1 === max)
      return true;
    ch = data[++index];
    if (ch === "b") {
      index++;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_")
          continue;
        if (ch !== "0" && ch !== "1")
          return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
    if (ch === "x") {
      index++;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_")
          continue;
        if (!isHexCode(data.charCodeAt(index)))
          return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
    if (ch === "o") {
      index++;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_")
          continue;
        if (!isOctCode(data.charCodeAt(index)))
          return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
  }
  if (ch === "_")
    return false;
  for (; index < max; index++) {
    ch = data[index];
    if (ch === "_")
      continue;
    if (!isDecCode(data.charCodeAt(index))) {
      return false;
    }
    hasDigits = true;
  }
  if (!hasDigits || ch === "_")
    return false;
  return true;
}
function constructYamlInteger(data) {
  var value = data, sign = 1, ch;
  if (value.indexOf("_") !== -1) {
    value = value.replace(/_/g, "");
  }
  ch = value[0];
  if (ch === "-" || ch === "+") {
    if (ch === "-")
      sign = -1;
    value = value.slice(1);
    ch = value[0];
  }
  if (value === "0")
    return 0;
  if (ch === "0") {
    if (value[1] === "b")
      return sign * parseInt(value.slice(2), 2);
    if (value[1] === "x")
      return sign * parseInt(value.slice(2), 16);
    if (value[1] === "o")
      return sign * parseInt(value.slice(2), 8);
  }
  return sign * parseInt(value, 10);
}
function isInteger(object) {
  return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 === 0 && !common2.isNegativeZero(object));
}
var int = new type("tag:yaml.org,2002:int", {
  kind: "scalar",
  resolve: resolveYamlInteger,
  construct: constructYamlInteger,
  predicate: isInteger,
  represent: {
    binary: function(obj) {
      return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
    },
    octal: function(obj) {
      return obj >= 0 ? "0o" + obj.toString(8) : "-0o" + obj.toString(8).slice(1);
    },
    decimal: function(obj) {
      return obj.toString(10);
    },
    /* eslint-disable max-len */
    hexadecimal: function(obj) {
      return obj >= 0 ? "0x" + obj.toString(16).toUpperCase() : "-0x" + obj.toString(16).toUpperCase().slice(1);
    }
  },
  defaultStyle: "decimal",
  styleAliases: {
    binary: [2, "bin"],
    octal: [8, "oct"],
    decimal: [10, "dec"],
    hexadecimal: [16, "hex"]
  }
});
var YAML_FLOAT_PATTERN = new RegExp(
  // 2.5e4, 2.5 and integers
  "^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"
);
function resolveYamlFloat(data) {
  if (data === null)
    return false;
  if (!YAML_FLOAT_PATTERN.test(data) || // Quick hack to not allow integers end with `_`
  // Probably should update regexp & check speed
  data[data.length - 1] === "_") {
    return false;
  }
  return true;
}
function constructYamlFloat(data) {
  var value, sign;
  value = data.replace(/_/g, "").toLowerCase();
  sign = value[0] === "-" ? -1 : 1;
  if ("+-".indexOf(value[0]) >= 0) {
    value = value.slice(1);
  }
  if (value === ".inf") {
    return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  } else if (value === ".nan") {
    return NaN;
  }
  return sign * parseFloat(value, 10);
}
var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
function representYamlFloat(object, style) {
  var res;
  if (isNaN(object)) {
    switch (style) {
      case "lowercase":
        return ".nan";
      case "uppercase":
        return ".NAN";
      case "camelcase":
        return ".NaN";
    }
  } else if (Number.POSITIVE_INFINITY === object) {
    switch (style) {
      case "lowercase":
        return ".inf";
      case "uppercase":
        return ".INF";
      case "camelcase":
        return ".Inf";
    }
  } else if (Number.NEGATIVE_INFINITY === object) {
    switch (style) {
      case "lowercase":
        return "-.inf";
      case "uppercase":
        return "-.INF";
      case "camelcase":
        return "-.Inf";
    }
  } else if (common2.isNegativeZero(object)) {
    return "-0.0";
  }
  res = object.toString(10);
  return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
}
function isFloat(object) {
  return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || common2.isNegativeZero(object));
}
var float = new type("tag:yaml.org,2002:float", {
  kind: "scalar",
  resolve: resolveYamlFloat,
  construct: constructYamlFloat,
  predicate: isFloat,
  represent: representYamlFloat,
  defaultStyle: "lowercase"
});
var json = failsafe.extend({
  implicit: [
    _null,
    bool,
    int,
    float
  ]
});
var core = json;
var YAML_DATE_REGEXP = new RegExp(
  "^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"
);
var YAML_TIMESTAMP_REGEXP = new RegExp(
  "^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$"
);
function resolveYamlTimestamp(data) {
  if (data === null)
    return false;
  if (YAML_DATE_REGEXP.exec(data) !== null)
    return true;
  if (YAML_TIMESTAMP_REGEXP.exec(data) !== null)
    return true;
  return false;
}
function constructYamlTimestamp(data) {
  var match, year, month, day, hour, minute, second, fraction = 0, delta = null, tz_hour, tz_minute, date;
  match = YAML_DATE_REGEXP.exec(data);
  if (match === null)
    match = YAML_TIMESTAMP_REGEXP.exec(data);
  if (match === null)
    throw new Error("Date resolve error");
  year = +match[1];
  month = +match[2] - 1;
  day = +match[3];
  if (!match[4]) {
    return new Date(Date.UTC(year, month, day));
  }
  hour = +match[4];
  minute = +match[5];
  second = +match[6];
  if (match[7]) {
    fraction = match[7].slice(0, 3);
    while (fraction.length < 3) {
      fraction += "0";
    }
    fraction = +fraction;
  }
  if (match[9]) {
    tz_hour = +match[10];
    tz_minute = +(match[11] || 0);
    delta = (tz_hour * 60 + tz_minute) * 6e4;
    if (match[9] === "-")
      delta = -delta;
  }
  date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
  if (delta)
    date.setTime(date.getTime() - delta);
  return date;
}
function representYamlTimestamp(object) {
  return object.toISOString();
}
var timestamp = new type("tag:yaml.org,2002:timestamp", {
  kind: "scalar",
  resolve: resolveYamlTimestamp,
  construct: constructYamlTimestamp,
  instanceOf: Date,
  represent: representYamlTimestamp
});
function resolveYamlMerge(data) {
  return data === "<<" || data === null;
}
var merge = new type("tag:yaml.org,2002:merge", {
  kind: "scalar",
  resolve: resolveYamlMerge
});
var BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
function resolveYamlBinary(data) {
  if (data === null)
    return false;
  var code, idx, bitlen = 0, max = data.length, map2 = BASE64_MAP;
  for (idx = 0; idx < max; idx++) {
    code = map2.indexOf(data.charAt(idx));
    if (code > 64)
      continue;
    if (code < 0)
      return false;
    bitlen += 6;
  }
  return bitlen % 8 === 0;
}
function constructYamlBinary(data) {
  var idx, tailbits, input = data.replace(/[\r\n=]/g, ""), max = input.length, map2 = BASE64_MAP, bits = 0, result = [];
  for (idx = 0; idx < max; idx++) {
    if (idx % 4 === 0 && idx) {
      result.push(bits >> 16 & 255);
      result.push(bits >> 8 & 255);
      result.push(bits & 255);
    }
    bits = bits << 6 | map2.indexOf(input.charAt(idx));
  }
  tailbits = max % 4 * 6;
  if (tailbits === 0) {
    result.push(bits >> 16 & 255);
    result.push(bits >> 8 & 255);
    result.push(bits & 255);
  } else if (tailbits === 18) {
    result.push(bits >> 10 & 255);
    result.push(bits >> 2 & 255);
  } else if (tailbits === 12) {
    result.push(bits >> 4 & 255);
  }
  return new Uint8Array(result);
}
function representYamlBinary(object) {
  var result = "", bits = 0, idx, tail, max = object.length, map2 = BASE64_MAP;
  for (idx = 0; idx < max; idx++) {
    if (idx % 3 === 0 && idx) {
      result += map2[bits >> 18 & 63];
      result += map2[bits >> 12 & 63];
      result += map2[bits >> 6 & 63];
      result += map2[bits & 63];
    }
    bits = (bits << 8) + object[idx];
  }
  tail = max % 3;
  if (tail === 0) {
    result += map2[bits >> 18 & 63];
    result += map2[bits >> 12 & 63];
    result += map2[bits >> 6 & 63];
    result += map2[bits & 63];
  } else if (tail === 2) {
    result += map2[bits >> 10 & 63];
    result += map2[bits >> 4 & 63];
    result += map2[bits << 2 & 63];
    result += map2[64];
  } else if (tail === 1) {
    result += map2[bits >> 2 & 63];
    result += map2[bits << 4 & 63];
    result += map2[64];
    result += map2[64];
  }
  return result;
}
function isBinary(obj) {
  return Object.prototype.toString.call(obj) === "[object Uint8Array]";
}
var binary = new type("tag:yaml.org,2002:binary", {
  kind: "scalar",
  resolve: resolveYamlBinary,
  construct: constructYamlBinary,
  predicate: isBinary,
  represent: representYamlBinary
});
var _hasOwnProperty$3 = Object.prototype.hasOwnProperty;
var _toString$2 = Object.prototype.toString;
function resolveYamlOmap(data) {
  if (data === null)
    return true;
  var objectKeys = [], index, length, pair, pairKey, pairHasKey, object = data;
  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];
    pairHasKey = false;
    if (_toString$2.call(pair) !== "[object Object]")
      return false;
    for (pairKey in pair) {
      if (_hasOwnProperty$3.call(pair, pairKey)) {
        if (!pairHasKey)
          pairHasKey = true;
        else
          return false;
      }
    }
    if (!pairHasKey)
      return false;
    if (objectKeys.indexOf(pairKey) === -1)
      objectKeys.push(pairKey);
    else
      return false;
  }
  return true;
}
function constructYamlOmap(data) {
  return data !== null ? data : [];
}
var omap = new type("tag:yaml.org,2002:omap", {
  kind: "sequence",
  resolve: resolveYamlOmap,
  construct: constructYamlOmap
});
var _toString$1 = Object.prototype.toString;
function resolveYamlPairs(data) {
  if (data === null)
    return true;
  var index, length, pair, keys, result, object = data;
  result = new Array(object.length);
  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];
    if (_toString$1.call(pair) !== "[object Object]")
      return false;
    keys = Object.keys(pair);
    if (keys.length !== 1)
      return false;
    result[index] = [keys[0], pair[keys[0]]];
  }
  return true;
}
function constructYamlPairs(data) {
  if (data === null)
    return [];
  var index, length, pair, keys, result, object = data;
  result = new Array(object.length);
  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];
    keys = Object.keys(pair);
    result[index] = [keys[0], pair[keys[0]]];
  }
  return result;
}
var pairs = new type("tag:yaml.org,2002:pairs", {
  kind: "sequence",
  resolve: resolveYamlPairs,
  construct: constructYamlPairs
});
var _hasOwnProperty$2 = Object.prototype.hasOwnProperty;
function resolveYamlSet(data) {
  if (data === null)
    return true;
  var key, object = data;
  for (key in object) {
    if (_hasOwnProperty$2.call(object, key)) {
      if (object[key] !== null)
        return false;
    }
  }
  return true;
}
function constructYamlSet(data) {
  return data !== null ? data : {};
}
var set = new type("tag:yaml.org,2002:set", {
  kind: "mapping",
  resolve: resolveYamlSet,
  construct: constructYamlSet
});
var _default = core.extend({
  implicit: [
    timestamp,
    merge
  ],
  explicit: [
    binary,
    omap,
    pairs,
    set
  ]
});
var _hasOwnProperty$1 = Object.prototype.hasOwnProperty;
var CONTEXT_FLOW_IN = 1;
var CONTEXT_FLOW_OUT = 2;
var CONTEXT_BLOCK_IN = 3;
var CONTEXT_BLOCK_OUT = 4;
var CHOMPING_CLIP = 1;
var CHOMPING_STRIP = 2;
var CHOMPING_KEEP = 3;
var PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
var PATTERN_FLOW_INDICATORS = /[,\[\]\{\}]/;
var PATTERN_TAG_HANDLE = /^(?:!|!!|![a-z\-]+!)$/i;
var PATTERN_TAG_URI = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
function _class(obj) {
  return Object.prototype.toString.call(obj);
}
function is_EOL(c) {
  return c === 10 || c === 13;
}
function is_WHITE_SPACE(c) {
  return c === 9 || c === 32;
}
function is_WS_OR_EOL(c) {
  return c === 9 || c === 32 || c === 10 || c === 13;
}
function is_FLOW_INDICATOR(c) {
  return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
}
function fromHexCode(c) {
  var lc;
  if (48 <= c && c <= 57) {
    return c - 48;
  }
  lc = c | 32;
  if (97 <= lc && lc <= 102) {
    return lc - 97 + 10;
  }
  return -1;
}
function escapedHexLen(c) {
  if (c === 120) {
    return 2;
  }
  if (c === 117) {
    return 4;
  }
  if (c === 85) {
    return 8;
  }
  return 0;
}
function fromDecimalCode(c) {
  if (48 <= c && c <= 57) {
    return c - 48;
  }
  return -1;
}
function simpleEscapeSequence(c) {
  return c === 48 ? "\0" : c === 97 ? "\x07" : c === 98 ? "\b" : c === 116 ? "	" : c === 9 ? "	" : c === 110 ? "\n" : c === 118 ? "\v" : c === 102 ? "\f" : c === 114 ? "\r" : c === 101 ? "\x1B" : c === 32 ? " " : c === 34 ? '"' : c === 47 ? "/" : c === 92 ? "\\" : c === 78 ? "\x85" : c === 95 ? "\xA0" : c === 76 ? "\u2028" : c === 80 ? "\u2029" : "";
}
function charFromCodepoint(c) {
  if (c <= 65535) {
    return String.fromCharCode(c);
  }
  return String.fromCharCode(
    (c - 65536 >> 10) + 55296,
    (c - 65536 & 1023) + 56320
  );
}
var simpleEscapeCheck = new Array(256);
var simpleEscapeMap = new Array(256);
for (i = 0; i < 256; i++) {
  simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
  simpleEscapeMap[i] = simpleEscapeSequence(i);
}
var i;
function State$1(input, options) {
  this.input = input;
  this.filename = options["filename"] || null;
  this.schema = options["schema"] || _default;
  this.onWarning = options["onWarning"] || null;
  this.legacy = options["legacy"] || false;
  this.json = options["json"] || false;
  this.listener = options["listener"] || null;
  this.implicitTypes = this.schema.compiledImplicit;
  this.typeMap = this.schema.compiledTypeMap;
  this.length = input.length;
  this.position = 0;
  this.line = 0;
  this.lineStart = 0;
  this.lineIndent = 0;
  this.firstTabInLine = -1;
  this.documents = [];
}
function generateError(state, message) {
  var mark = {
    name: state.filename,
    buffer: state.input.slice(0, -1),
    // omit trailing \0
    position: state.position,
    line: state.line,
    column: state.position - state.lineStart
  };
  mark.snippet = snippet(mark);
  return new exception(message, mark);
}
function throwError(state, message) {
  throw generateError(state, message);
}
function throwWarning(state, message) {
  if (state.onWarning) {
    state.onWarning.call(null, generateError(state, message));
  }
}
var directiveHandlers = {
  YAML: function handleYamlDirective(state, name, args) {
    var match, major, minor;
    if (state.version !== null) {
      throwError(state, "duplication of %YAML directive");
    }
    if (args.length !== 1) {
      throwError(state, "YAML directive accepts exactly one argument");
    }
    match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
    if (match === null) {
      throwError(state, "ill-formed argument of the YAML directive");
    }
    major = parseInt(match[1], 10);
    minor = parseInt(match[2], 10);
    if (major !== 1) {
      throwError(state, "unacceptable YAML version of the document");
    }
    state.version = args[0];
    state.checkLineBreaks = minor < 2;
    if (minor !== 1 && minor !== 2) {
      throwWarning(state, "unsupported YAML version of the document");
    }
  },
  TAG: function handleTagDirective(state, name, args) {
    var handle, prefix;
    if (args.length !== 2) {
      throwError(state, "TAG directive accepts exactly two arguments");
    }
    handle = args[0];
    prefix = args[1];
    if (!PATTERN_TAG_HANDLE.test(handle)) {
      throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
    }
    if (_hasOwnProperty$1.call(state.tagMap, handle)) {
      throwError(state, 'there is a previously declared suffix for "' + handle + '" tag handle');
    }
    if (!PATTERN_TAG_URI.test(prefix)) {
      throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
    }
    try {
      prefix = decodeURIComponent(prefix);
    } catch (err2) {
      throwError(state, "tag prefix is malformed: " + prefix);
    }
    state.tagMap[handle] = prefix;
  }
};
function captureSegment(state, start, end, checkJson) {
  var _position, _length, _character, _result;
  if (start < end) {
    _result = state.input.slice(start, end);
    if (checkJson) {
      for (_position = 0, _length = _result.length; _position < _length; _position += 1) {
        _character = _result.charCodeAt(_position);
        if (!(_character === 9 || 32 <= _character && _character <= 1114111)) {
          throwError(state, "expected valid JSON character");
        }
      }
    } else if (PATTERN_NON_PRINTABLE.test(_result)) {
      throwError(state, "the stream contains non-printable characters");
    }
    state.result += _result;
  }
}
function mergeMappings(state, destination, source, overridableKeys) {
  var sourceKeys, key, index, quantity;
  if (!common2.isObject(source)) {
    throwError(state, "cannot merge mappings; the provided source object is unacceptable");
  }
  sourceKeys = Object.keys(source);
  for (index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
    key = sourceKeys[index];
    if (!_hasOwnProperty$1.call(destination, key)) {
      destination[key] = source[key];
      overridableKeys[key] = true;
    }
  }
}
function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startLineStart, startPos) {
  var index, quantity;
  if (Array.isArray(keyNode)) {
    keyNode = Array.prototype.slice.call(keyNode);
    for (index = 0, quantity = keyNode.length; index < quantity; index += 1) {
      if (Array.isArray(keyNode[index])) {
        throwError(state, "nested arrays are not supported inside keys");
      }
      if (typeof keyNode === "object" && _class(keyNode[index]) === "[object Object]") {
        keyNode[index] = "[object Object]";
      }
    }
  }
  if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") {
    keyNode = "[object Object]";
  }
  keyNode = String(keyNode);
  if (_result === null) {
    _result = {};
  }
  if (keyTag === "tag:yaml.org,2002:merge") {
    if (Array.isArray(valueNode)) {
      for (index = 0, quantity = valueNode.length; index < quantity; index += 1) {
        mergeMappings(state, _result, valueNode[index], overridableKeys);
      }
    } else {
      mergeMappings(state, _result, valueNode, overridableKeys);
    }
  } else {
    if (!state.json && !_hasOwnProperty$1.call(overridableKeys, keyNode) && _hasOwnProperty$1.call(_result, keyNode)) {
      state.line = startLine || state.line;
      state.lineStart = startLineStart || state.lineStart;
      state.position = startPos || state.position;
      throwError(state, "duplicated mapping key");
    }
    if (keyNode === "__proto__") {
      Object.defineProperty(_result, keyNode, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: valueNode
      });
    } else {
      _result[keyNode] = valueNode;
    }
    delete overridableKeys[keyNode];
  }
  return _result;
}
function readLineBreak(state) {
  var ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 10) {
    state.position++;
  } else if (ch === 13) {
    state.position++;
    if (state.input.charCodeAt(state.position) === 10) {
      state.position++;
    }
  } else {
    throwError(state, "a line break is expected");
  }
  state.line += 1;
  state.lineStart = state.position;
  state.firstTabInLine = -1;
}
function skipSeparationSpace(state, allowComments, checkIndent) {
  var lineBreaks = 0, ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    while (is_WHITE_SPACE(ch)) {
      if (ch === 9 && state.firstTabInLine === -1) {
        state.firstTabInLine = state.position;
      }
      ch = state.input.charCodeAt(++state.position);
    }
    if (allowComments && ch === 35) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (ch !== 10 && ch !== 13 && ch !== 0);
    }
    if (is_EOL(ch)) {
      readLineBreak(state);
      ch = state.input.charCodeAt(state.position);
      lineBreaks++;
      state.lineIndent = 0;
      while (ch === 32) {
        state.lineIndent++;
        ch = state.input.charCodeAt(++state.position);
      }
    } else {
      break;
    }
  }
  if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) {
    throwWarning(state, "deficient indentation");
  }
  return lineBreaks;
}
function testDocumentSeparator(state) {
  var _position = state.position, ch;
  ch = state.input.charCodeAt(_position);
  if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(_position + 1) && ch === state.input.charCodeAt(_position + 2)) {
    _position += 3;
    ch = state.input.charCodeAt(_position);
    if (ch === 0 || is_WS_OR_EOL(ch)) {
      return true;
    }
  }
  return false;
}
function writeFoldedLines(state, count) {
  if (count === 1) {
    state.result += " ";
  } else if (count > 1) {
    state.result += common2.repeat("\n", count - 1);
  }
}
function readPlainScalar(state, nodeIndent, withinFlowCollection) {
  var preceding, following, captureStart, captureEnd, hasPendingContent, _line, _lineStart, _lineIndent, _kind = state.kind, _result = state.result, ch;
  ch = state.input.charCodeAt(state.position);
  if (is_WS_OR_EOL(ch) || is_FLOW_INDICATOR(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96) {
    return false;
  }
  if (ch === 63 || ch === 45) {
    following = state.input.charCodeAt(state.position + 1);
    if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
      return false;
    }
  }
  state.kind = "scalar";
  state.result = "";
  captureStart = captureEnd = state.position;
  hasPendingContent = false;
  while (ch !== 0) {
    if (ch === 58) {
      following = state.input.charCodeAt(state.position + 1);
      if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
        break;
      }
    } else if (ch === 35) {
      preceding = state.input.charCodeAt(state.position - 1);
      if (is_WS_OR_EOL(preceding)) {
        break;
      }
    } else if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && is_FLOW_INDICATOR(ch)) {
      break;
    } else if (is_EOL(ch)) {
      _line = state.line;
      _lineStart = state.lineStart;
      _lineIndent = state.lineIndent;
      skipSeparationSpace(state, false, -1);
      if (state.lineIndent >= nodeIndent) {
        hasPendingContent = true;
        ch = state.input.charCodeAt(state.position);
        continue;
      } else {
        state.position = captureEnd;
        state.line = _line;
        state.lineStart = _lineStart;
        state.lineIndent = _lineIndent;
        break;
      }
    }
    if (hasPendingContent) {
      captureSegment(state, captureStart, captureEnd, false);
      writeFoldedLines(state, state.line - _line);
      captureStart = captureEnd = state.position;
      hasPendingContent = false;
    }
    if (!is_WHITE_SPACE(ch)) {
      captureEnd = state.position + 1;
    }
    ch = state.input.charCodeAt(++state.position);
  }
  captureSegment(state, captureStart, captureEnd, false);
  if (state.result) {
    return true;
  }
  state.kind = _kind;
  state.result = _result;
  return false;
}
function readSingleQuotedScalar(state, nodeIndent) {
  var ch, captureStart, captureEnd;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 39) {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  state.position++;
  captureStart = captureEnd = state.position;
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    if (ch === 39) {
      captureSegment(state, captureStart, state.position, true);
      ch = state.input.charCodeAt(++state.position);
      if (ch === 39) {
        captureStart = state.position;
        state.position++;
        captureEnd = state.position;
      } else {
        return true;
      }
    } else if (is_EOL(ch)) {
      captureSegment(state, captureStart, captureEnd, true);
      writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
      captureStart = captureEnd = state.position;
    } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
      throwError(state, "unexpected end of the document within a single quoted scalar");
    } else {
      state.position++;
      captureEnd = state.position;
    }
  }
  throwError(state, "unexpected end of the stream within a single quoted scalar");
}
function readDoubleQuotedScalar(state, nodeIndent) {
  var captureStart, captureEnd, hexLength, hexResult, tmp, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 34) {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  state.position++;
  captureStart = captureEnd = state.position;
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    if (ch === 34) {
      captureSegment(state, captureStart, state.position, true);
      state.position++;
      return true;
    } else if (ch === 92) {
      captureSegment(state, captureStart, state.position, true);
      ch = state.input.charCodeAt(++state.position);
      if (is_EOL(ch)) {
        skipSeparationSpace(state, false, nodeIndent);
      } else if (ch < 256 && simpleEscapeCheck[ch]) {
        state.result += simpleEscapeMap[ch];
        state.position++;
      } else if ((tmp = escapedHexLen(ch)) > 0) {
        hexLength = tmp;
        hexResult = 0;
        for (; hexLength > 0; hexLength--) {
          ch = state.input.charCodeAt(++state.position);
          if ((tmp = fromHexCode(ch)) >= 0) {
            hexResult = (hexResult << 4) + tmp;
          } else {
            throwError(state, "expected hexadecimal character");
          }
        }
        state.result += charFromCodepoint(hexResult);
        state.position++;
      } else {
        throwError(state, "unknown escape sequence");
      }
      captureStart = captureEnd = state.position;
    } else if (is_EOL(ch)) {
      captureSegment(state, captureStart, captureEnd, true);
      writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
      captureStart = captureEnd = state.position;
    } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
      throwError(state, "unexpected end of the document within a double quoted scalar");
    } else {
      state.position++;
      captureEnd = state.position;
    }
  }
  throwError(state, "unexpected end of the stream within a double quoted scalar");
}
function readFlowCollection(state, nodeIndent) {
  var readNext = true, _line, _lineStart, _pos, _tag = state.tag, _result, _anchor = state.anchor, following, terminator, isPair, isExplicitPair, isMapping, overridableKeys = /* @__PURE__ */ Object.create(null), keyNode, keyTag, valueNode, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 91) {
    terminator = 93;
    isMapping = false;
    _result = [];
  } else if (ch === 123) {
    terminator = 125;
    isMapping = true;
    _result = {};
  } else {
    return false;
  }
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(++state.position);
  while (ch !== 0) {
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if (ch === terminator) {
      state.position++;
      state.tag = _tag;
      state.anchor = _anchor;
      state.kind = isMapping ? "mapping" : "sequence";
      state.result = _result;
      return true;
    } else if (!readNext) {
      throwError(state, "missed comma between flow collection entries");
    } else if (ch === 44) {
      throwError(state, "expected the node content, but found ','");
    }
    keyTag = keyNode = valueNode = null;
    isPair = isExplicitPair = false;
    if (ch === 63) {
      following = state.input.charCodeAt(state.position + 1);
      if (is_WS_OR_EOL(following)) {
        isPair = isExplicitPair = true;
        state.position++;
        skipSeparationSpace(state, true, nodeIndent);
      }
    }
    _line = state.line;
    _lineStart = state.lineStart;
    _pos = state.position;
    composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
    keyTag = state.tag;
    keyNode = state.result;
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if ((isExplicitPair || state.line === _line) && ch === 58) {
      isPair = true;
      ch = state.input.charCodeAt(++state.position);
      skipSeparationSpace(state, true, nodeIndent);
      composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
      valueNode = state.result;
    }
    if (isMapping) {
      storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos);
    } else if (isPair) {
      _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos));
    } else {
      _result.push(keyNode);
    }
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if (ch === 44) {
      readNext = true;
      ch = state.input.charCodeAt(++state.position);
    } else {
      readNext = false;
    }
  }
  throwError(state, "unexpected end of the stream within a flow collection");
}
function readBlockScalar(state, nodeIndent) {
  var captureStart, folding, chomping = CHOMPING_CLIP, didReadContent = false, detectedIndent = false, textIndent = nodeIndent, emptyLines = 0, atMoreIndented = false, tmp, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 124) {
    folding = false;
  } else if (ch === 62) {
    folding = true;
  } else {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  while (ch !== 0) {
    ch = state.input.charCodeAt(++state.position);
    if (ch === 43 || ch === 45) {
      if (CHOMPING_CLIP === chomping) {
        chomping = ch === 43 ? CHOMPING_KEEP : CHOMPING_STRIP;
      } else {
        throwError(state, "repeat of a chomping mode identifier");
      }
    } else if ((tmp = fromDecimalCode(ch)) >= 0) {
      if (tmp === 0) {
        throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
      } else if (!detectedIndent) {
        textIndent = nodeIndent + tmp - 1;
        detectedIndent = true;
      } else {
        throwError(state, "repeat of an indentation width identifier");
      }
    } else {
      break;
    }
  }
  if (is_WHITE_SPACE(ch)) {
    do {
      ch = state.input.charCodeAt(++state.position);
    } while (is_WHITE_SPACE(ch));
    if (ch === 35) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (!is_EOL(ch) && ch !== 0);
    }
  }
  while (ch !== 0) {
    readLineBreak(state);
    state.lineIndent = 0;
    ch = state.input.charCodeAt(state.position);
    while ((!detectedIndent || state.lineIndent < textIndent) && ch === 32) {
      state.lineIndent++;
      ch = state.input.charCodeAt(++state.position);
    }
    if (!detectedIndent && state.lineIndent > textIndent) {
      textIndent = state.lineIndent;
    }
    if (is_EOL(ch)) {
      emptyLines++;
      continue;
    }
    if (state.lineIndent < textIndent) {
      if (chomping === CHOMPING_KEEP) {
        state.result += common2.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
      } else if (chomping === CHOMPING_CLIP) {
        if (didReadContent) {
          state.result += "\n";
        }
      }
      break;
    }
    if (folding) {
      if (is_WHITE_SPACE(ch)) {
        atMoreIndented = true;
        state.result += common2.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
      } else if (atMoreIndented) {
        atMoreIndented = false;
        state.result += common2.repeat("\n", emptyLines + 1);
      } else if (emptyLines === 0) {
        if (didReadContent) {
          state.result += " ";
        }
      } else {
        state.result += common2.repeat("\n", emptyLines);
      }
    } else {
      state.result += common2.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
    }
    didReadContent = true;
    detectedIndent = true;
    emptyLines = 0;
    captureStart = state.position;
    while (!is_EOL(ch) && ch !== 0) {
      ch = state.input.charCodeAt(++state.position);
    }
    captureSegment(state, captureStart, state.position, false);
  }
  return true;
}
function readBlockSequence(state, nodeIndent) {
  var _line, _tag = state.tag, _anchor = state.anchor, _result = [], following, detected = false, ch;
  if (state.firstTabInLine !== -1)
    return false;
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    if (state.firstTabInLine !== -1) {
      state.position = state.firstTabInLine;
      throwError(state, "tab characters must not be used in indentation");
    }
    if (ch !== 45) {
      break;
    }
    following = state.input.charCodeAt(state.position + 1);
    if (!is_WS_OR_EOL(following)) {
      break;
    }
    detected = true;
    state.position++;
    if (skipSeparationSpace(state, true, -1)) {
      if (state.lineIndent <= nodeIndent) {
        _result.push(null);
        ch = state.input.charCodeAt(state.position);
        continue;
      }
    }
    _line = state.line;
    composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
    _result.push(state.result);
    skipSeparationSpace(state, true, -1);
    ch = state.input.charCodeAt(state.position);
    if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
      throwError(state, "bad indentation of a sequence entry");
    } else if (state.lineIndent < nodeIndent) {
      break;
    }
  }
  if (detected) {
    state.tag = _tag;
    state.anchor = _anchor;
    state.kind = "sequence";
    state.result = _result;
    return true;
  }
  return false;
}
function readBlockMapping(state, nodeIndent, flowIndent) {
  var following, allowCompact, _line, _keyLine, _keyLineStart, _keyPos, _tag = state.tag, _anchor = state.anchor, _result = {}, overridableKeys = /* @__PURE__ */ Object.create(null), keyTag = null, keyNode = null, valueNode = null, atExplicitKey = false, detected = false, ch;
  if (state.firstTabInLine !== -1)
    return false;
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    if (!atExplicitKey && state.firstTabInLine !== -1) {
      state.position = state.firstTabInLine;
      throwError(state, "tab characters must not be used in indentation");
    }
    following = state.input.charCodeAt(state.position + 1);
    _line = state.line;
    if ((ch === 63 || ch === 58) && is_WS_OR_EOL(following)) {
      if (ch === 63) {
        if (atExplicitKey) {
          storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
          keyTag = keyNode = valueNode = null;
        }
        detected = true;
        atExplicitKey = true;
        allowCompact = true;
      } else if (atExplicitKey) {
        atExplicitKey = false;
        allowCompact = true;
      } else {
        throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
      }
      state.position += 1;
      ch = following;
    } else {
      _keyLine = state.line;
      _keyLineStart = state.lineStart;
      _keyPos = state.position;
      if (!composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {
        break;
      }
      if (state.line === _line) {
        ch = state.input.charCodeAt(state.position);
        while (is_WHITE_SPACE(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        if (ch === 58) {
          ch = state.input.charCodeAt(++state.position);
          if (!is_WS_OR_EOL(ch)) {
            throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
          }
          if (atExplicitKey) {
            storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
            keyTag = keyNode = valueNode = null;
          }
          detected = true;
          atExplicitKey = false;
          allowCompact = false;
          keyTag = state.tag;
          keyNode = state.result;
        } else if (detected) {
          throwError(state, "can not read an implicit mapping pair; a colon is missed");
        } else {
          state.tag = _tag;
          state.anchor = _anchor;
          return true;
        }
      } else if (detected) {
        throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
      } else {
        state.tag = _tag;
        state.anchor = _anchor;
        return true;
      }
    }
    if (state.line === _line || state.lineIndent > nodeIndent) {
      if (atExplicitKey) {
        _keyLine = state.line;
        _keyLineStart = state.lineStart;
        _keyPos = state.position;
      }
      if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
        if (atExplicitKey) {
          keyNode = state.result;
        } else {
          valueNode = state.result;
        }
      }
      if (!atExplicitKey) {
        storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _keyLine, _keyLineStart, _keyPos);
        keyTag = keyNode = valueNode = null;
      }
      skipSeparationSpace(state, true, -1);
      ch = state.input.charCodeAt(state.position);
    }
    if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
      throwError(state, "bad indentation of a mapping entry");
    } else if (state.lineIndent < nodeIndent) {
      break;
    }
  }
  if (atExplicitKey) {
    storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
  }
  if (detected) {
    state.tag = _tag;
    state.anchor = _anchor;
    state.kind = "mapping";
    state.result = _result;
  }
  return detected;
}
function readTagProperty(state) {
  var _position, isVerbatim = false, isNamed = false, tagHandle, tagName, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 33)
    return false;
  if (state.tag !== null) {
    throwError(state, "duplication of a tag property");
  }
  ch = state.input.charCodeAt(++state.position);
  if (ch === 60) {
    isVerbatim = true;
    ch = state.input.charCodeAt(++state.position);
  } else if (ch === 33) {
    isNamed = true;
    tagHandle = "!!";
    ch = state.input.charCodeAt(++state.position);
  } else {
    tagHandle = "!";
  }
  _position = state.position;
  if (isVerbatim) {
    do {
      ch = state.input.charCodeAt(++state.position);
    } while (ch !== 0 && ch !== 62);
    if (state.position < state.length) {
      tagName = state.input.slice(_position, state.position);
      ch = state.input.charCodeAt(++state.position);
    } else {
      throwError(state, "unexpected end of the stream within a verbatim tag");
    }
  } else {
    while (ch !== 0 && !is_WS_OR_EOL(ch)) {
      if (ch === 33) {
        if (!isNamed) {
          tagHandle = state.input.slice(_position - 1, state.position + 1);
          if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
            throwError(state, "named tag handle cannot contain such characters");
          }
          isNamed = true;
          _position = state.position + 1;
        } else {
          throwError(state, "tag suffix cannot contain exclamation marks");
        }
      }
      ch = state.input.charCodeAt(++state.position);
    }
    tagName = state.input.slice(_position, state.position);
    if (PATTERN_FLOW_INDICATORS.test(tagName)) {
      throwError(state, "tag suffix cannot contain flow indicator characters");
    }
  }
  if (tagName && !PATTERN_TAG_URI.test(tagName)) {
    throwError(state, "tag name cannot contain such characters: " + tagName);
  }
  try {
    tagName = decodeURIComponent(tagName);
  } catch (err2) {
    throwError(state, "tag name is malformed: " + tagName);
  }
  if (isVerbatim) {
    state.tag = tagName;
  } else if (_hasOwnProperty$1.call(state.tagMap, tagHandle)) {
    state.tag = state.tagMap[tagHandle] + tagName;
  } else if (tagHandle === "!") {
    state.tag = "!" + tagName;
  } else if (tagHandle === "!!") {
    state.tag = "tag:yaml.org,2002:" + tagName;
  } else {
    throwError(state, 'undeclared tag handle "' + tagHandle + '"');
  }
  return true;
}
function readAnchorProperty(state) {
  var _position, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 38)
    return false;
  if (state.anchor !== null) {
    throwError(state, "duplication of an anchor property");
  }
  ch = state.input.charCodeAt(++state.position);
  _position = state.position;
  while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
    ch = state.input.charCodeAt(++state.position);
  }
  if (state.position === _position) {
    throwError(state, "name of an anchor node must contain at least one character");
  }
  state.anchor = state.input.slice(_position, state.position);
  return true;
}
function readAlias(state) {
  var _position, alias, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 42)
    return false;
  ch = state.input.charCodeAt(++state.position);
  _position = state.position;
  while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
    ch = state.input.charCodeAt(++state.position);
  }
  if (state.position === _position) {
    throwError(state, "name of an alias node must contain at least one character");
  }
  alias = state.input.slice(_position, state.position);
  if (!_hasOwnProperty$1.call(state.anchorMap, alias)) {
    throwError(state, 'unidentified alias "' + alias + '"');
  }
  state.result = state.anchorMap[alias];
  skipSeparationSpace(state, true, -1);
  return true;
}
function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
  var allowBlockStyles, allowBlockScalars, allowBlockCollections, indentStatus = 1, atNewLine = false, hasContent = false, typeIndex, typeQuantity, typeList, type2, flowIndent, blockIndent;
  if (state.listener !== null) {
    state.listener("open", state);
  }
  state.tag = null;
  state.anchor = null;
  state.kind = null;
  state.result = null;
  allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
  if (allowToSeek) {
    if (skipSeparationSpace(state, true, -1)) {
      atNewLine = true;
      if (state.lineIndent > parentIndent) {
        indentStatus = 1;
      } else if (state.lineIndent === parentIndent) {
        indentStatus = 0;
      } else if (state.lineIndent < parentIndent) {
        indentStatus = -1;
      }
    }
  }
  if (indentStatus === 1) {
    while (readTagProperty(state) || readAnchorProperty(state)) {
      if (skipSeparationSpace(state, true, -1)) {
        atNewLine = true;
        allowBlockCollections = allowBlockStyles;
        if (state.lineIndent > parentIndent) {
          indentStatus = 1;
        } else if (state.lineIndent === parentIndent) {
          indentStatus = 0;
        } else if (state.lineIndent < parentIndent) {
          indentStatus = -1;
        }
      } else {
        allowBlockCollections = false;
      }
    }
  }
  if (allowBlockCollections) {
    allowBlockCollections = atNewLine || allowCompact;
  }
  if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
    if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
      flowIndent = parentIndent;
    } else {
      flowIndent = parentIndent + 1;
    }
    blockIndent = state.position - state.lineStart;
    if (indentStatus === 1) {
      if (allowBlockCollections && (readBlockSequence(state, blockIndent) || readBlockMapping(state, blockIndent, flowIndent)) || readFlowCollection(state, flowIndent)) {
        hasContent = true;
      } else {
        if (allowBlockScalars && readBlockScalar(state, flowIndent) || readSingleQuotedScalar(state, flowIndent) || readDoubleQuotedScalar(state, flowIndent)) {
          hasContent = true;
        } else if (readAlias(state)) {
          hasContent = true;
          if (state.tag !== null || state.anchor !== null) {
            throwError(state, "alias node should not have any properties");
          }
        } else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
          hasContent = true;
          if (state.tag === null) {
            state.tag = "?";
          }
        }
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
      }
    } else if (indentStatus === 0) {
      hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
    }
  }
  if (state.tag === null) {
    if (state.anchor !== null) {
      state.anchorMap[state.anchor] = state.result;
    }
  } else if (state.tag === "?") {
    if (state.result !== null && state.kind !== "scalar") {
      throwError(state, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + state.kind + '"');
    }
    for (typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
      type2 = state.implicitTypes[typeIndex];
      if (type2.resolve(state.result)) {
        state.result = type2.construct(state.result);
        state.tag = type2.tag;
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
        break;
      }
    }
  } else if (state.tag !== "!") {
    if (_hasOwnProperty$1.call(state.typeMap[state.kind || "fallback"], state.tag)) {
      type2 = state.typeMap[state.kind || "fallback"][state.tag];
    } else {
      type2 = null;
      typeList = state.typeMap.multi[state.kind || "fallback"];
      for (typeIndex = 0, typeQuantity = typeList.length; typeIndex < typeQuantity; typeIndex += 1) {
        if (state.tag.slice(0, typeList[typeIndex].tag.length) === typeList[typeIndex].tag) {
          type2 = typeList[typeIndex];
          break;
        }
      }
    }
    if (!type2) {
      throwError(state, "unknown tag !<" + state.tag + ">");
    }
    if (state.result !== null && type2.kind !== state.kind) {
      throwError(state, "unacceptable node kind for !<" + state.tag + '> tag; it should be "' + type2.kind + '", not "' + state.kind + '"');
    }
    if (!type2.resolve(state.result, state.tag)) {
      throwError(state, "cannot resolve a node with !<" + state.tag + "> explicit tag");
    } else {
      state.result = type2.construct(state.result, state.tag);
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = state.result;
      }
    }
  }
  if (state.listener !== null) {
    state.listener("close", state);
  }
  return state.tag !== null || state.anchor !== null || hasContent;
}
function readDocument(state) {
  var documentStart = state.position, _position, directiveName, directiveArgs, hasDirectives = false, ch;
  state.version = null;
  state.checkLineBreaks = state.legacy;
  state.tagMap = /* @__PURE__ */ Object.create(null);
  state.anchorMap = /* @__PURE__ */ Object.create(null);
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    skipSeparationSpace(state, true, -1);
    ch = state.input.charCodeAt(state.position);
    if (state.lineIndent > 0 || ch !== 37) {
      break;
    }
    hasDirectives = true;
    ch = state.input.charCodeAt(++state.position);
    _position = state.position;
    while (ch !== 0 && !is_WS_OR_EOL(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }
    directiveName = state.input.slice(_position, state.position);
    directiveArgs = [];
    if (directiveName.length < 1) {
      throwError(state, "directive name must not be less than one character in length");
    }
    while (ch !== 0) {
      while (is_WHITE_SPACE(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      if (ch === 35) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (ch !== 0 && !is_EOL(ch));
        break;
      }
      if (is_EOL(ch))
        break;
      _position = state.position;
      while (ch !== 0 && !is_WS_OR_EOL(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      directiveArgs.push(state.input.slice(_position, state.position));
    }
    if (ch !== 0)
      readLineBreak(state);
    if (_hasOwnProperty$1.call(directiveHandlers, directiveName)) {
      directiveHandlers[directiveName](state, directiveName, directiveArgs);
    } else {
      throwWarning(state, 'unknown document directive "' + directiveName + '"');
    }
  }
  skipSeparationSpace(state, true, -1);
  if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45) {
    state.position += 3;
    skipSeparationSpace(state, true, -1);
  } else if (hasDirectives) {
    throwError(state, "directives end mark is expected");
  }
  composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
  skipSeparationSpace(state, true, -1);
  if (state.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
    throwWarning(state, "non-ASCII line breaks are interpreted as content");
  }
  state.documents.push(state.result);
  if (state.position === state.lineStart && testDocumentSeparator(state)) {
    if (state.input.charCodeAt(state.position) === 46) {
      state.position += 3;
      skipSeparationSpace(state, true, -1);
    }
    return;
  }
  if (state.position < state.length - 1) {
    throwError(state, "end of the stream or a document separator is expected");
  } else {
    return;
  }
}
function loadDocuments(input, options) {
  input = String(input);
  options = options || {};
  if (input.length !== 0) {
    if (input.charCodeAt(input.length - 1) !== 10 && input.charCodeAt(input.length - 1) !== 13) {
      input += "\n";
    }
    if (input.charCodeAt(0) === 65279) {
      input = input.slice(1);
    }
  }
  var state = new State$1(input, options);
  var nullpos = input.indexOf("\0");
  if (nullpos !== -1) {
    state.position = nullpos;
    throwError(state, "null byte is not allowed in input");
  }
  state.input += "\0";
  while (state.input.charCodeAt(state.position) === 32) {
    state.lineIndent += 1;
    state.position += 1;
  }
  while (state.position < state.length - 1) {
    readDocument(state);
  }
  return state.documents;
}
function loadAll$1(input, iterator, options) {
  if (iterator !== null && typeof iterator === "object" && typeof options === "undefined") {
    options = iterator;
    iterator = null;
  }
  var documents = loadDocuments(input, options);
  if (typeof iterator !== "function") {
    return documents;
  }
  for (var index = 0, length = documents.length; index < length; index += 1) {
    iterator(documents[index]);
  }
}
function load$1(input, options) {
  var documents = loadDocuments(input, options);
  if (documents.length === 0) {
    return void 0;
  } else if (documents.length === 1) {
    return documents[0];
  }
  throw new exception("expected a single document in the stream, but found more");
}
var loadAll_1 = loadAll$1;
var load_1 = load$1;
var loader = {
  loadAll: loadAll_1,
  load: load_1
};
var _toString = Object.prototype.toString;
var _hasOwnProperty = Object.prototype.hasOwnProperty;
var CHAR_BOM = 65279;
var CHAR_TAB = 9;
var CHAR_LINE_FEED = 10;
var CHAR_CARRIAGE_RETURN = 13;
var CHAR_SPACE = 32;
var CHAR_EXCLAMATION = 33;
var CHAR_DOUBLE_QUOTE = 34;
var CHAR_SHARP = 35;
var CHAR_PERCENT = 37;
var CHAR_AMPERSAND = 38;
var CHAR_SINGLE_QUOTE = 39;
var CHAR_ASTERISK = 42;
var CHAR_COMMA = 44;
var CHAR_MINUS = 45;
var CHAR_COLON = 58;
var CHAR_EQUALS = 61;
var CHAR_GREATER_THAN = 62;
var CHAR_QUESTION = 63;
var CHAR_COMMERCIAL_AT = 64;
var CHAR_LEFT_SQUARE_BRACKET = 91;
var CHAR_RIGHT_SQUARE_BRACKET = 93;
var CHAR_GRAVE_ACCENT = 96;
var CHAR_LEFT_CURLY_BRACKET = 123;
var CHAR_VERTICAL_LINE = 124;
var CHAR_RIGHT_CURLY_BRACKET = 125;
var ESCAPE_SEQUENCES = {};
ESCAPE_SEQUENCES[0] = "\\0";
ESCAPE_SEQUENCES[7] = "\\a";
ESCAPE_SEQUENCES[8] = "\\b";
ESCAPE_SEQUENCES[9] = "\\t";
ESCAPE_SEQUENCES[10] = "\\n";
ESCAPE_SEQUENCES[11] = "\\v";
ESCAPE_SEQUENCES[12] = "\\f";
ESCAPE_SEQUENCES[13] = "\\r";
ESCAPE_SEQUENCES[27] = "\\e";
ESCAPE_SEQUENCES[34] = '\\"';
ESCAPE_SEQUENCES[92] = "\\\\";
ESCAPE_SEQUENCES[133] = "\\N";
ESCAPE_SEQUENCES[160] = "\\_";
ESCAPE_SEQUENCES[8232] = "\\L";
ESCAPE_SEQUENCES[8233] = "\\P";
var DEPRECATED_BOOLEANS_SYNTAX = [
  "y",
  "Y",
  "yes",
  "Yes",
  "YES",
  "on",
  "On",
  "ON",
  "n",
  "N",
  "no",
  "No",
  "NO",
  "off",
  "Off",
  "OFF"
];
var DEPRECATED_BASE60_SYNTAX = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;
function compileStyleMap(schema2, map2) {
  var result, keys, index, length, tag, style, type2;
  if (map2 === null)
    return {};
  result = {};
  keys = Object.keys(map2);
  for (index = 0, length = keys.length; index < length; index += 1) {
    tag = keys[index];
    style = String(map2[tag]);
    if (tag.slice(0, 2) === "!!") {
      tag = "tag:yaml.org,2002:" + tag.slice(2);
    }
    type2 = schema2.compiledTypeMap["fallback"][tag];
    if (type2 && _hasOwnProperty.call(type2.styleAliases, style)) {
      style = type2.styleAliases[style];
    }
    result[tag] = style;
  }
  return result;
}
function encodeHex(character) {
  var string, handle, length;
  string = character.toString(16).toUpperCase();
  if (character <= 255) {
    handle = "x";
    length = 2;
  } else if (character <= 65535) {
    handle = "u";
    length = 4;
  } else if (character <= 4294967295) {
    handle = "U";
    length = 8;
  } else {
    throw new exception("code point within a string may not be greater than 0xFFFFFFFF");
  }
  return "\\" + handle + common2.repeat("0", length - string.length) + string;
}
var QUOTING_TYPE_SINGLE = 1;
var QUOTING_TYPE_DOUBLE = 2;
function State(options) {
  this.schema = options["schema"] || _default;
  this.indent = Math.max(1, options["indent"] || 2);
  this.noArrayIndent = options["noArrayIndent"] || false;
  this.skipInvalid = options["skipInvalid"] || false;
  this.flowLevel = common2.isNothing(options["flowLevel"]) ? -1 : options["flowLevel"];
  this.styleMap = compileStyleMap(this.schema, options["styles"] || null);
  this.sortKeys = options["sortKeys"] || false;
  this.lineWidth = options["lineWidth"] || 80;
  this.noRefs = options["noRefs"] || false;
  this.noCompatMode = options["noCompatMode"] || false;
  this.condenseFlow = options["condenseFlow"] || false;
  this.quotingType = options["quotingType"] === '"' ? QUOTING_TYPE_DOUBLE : QUOTING_TYPE_SINGLE;
  this.forceQuotes = options["forceQuotes"] || false;
  this.replacer = typeof options["replacer"] === "function" ? options["replacer"] : null;
  this.implicitTypes = this.schema.compiledImplicit;
  this.explicitTypes = this.schema.compiledExplicit;
  this.tag = null;
  this.result = "";
  this.duplicates = [];
  this.usedDuplicates = null;
}
function indentString(string, spaces) {
  var ind = common2.repeat(" ", spaces), position = 0, next = -1, result = "", line, length = string.length;
  while (position < length) {
    next = string.indexOf("\n", position);
    if (next === -1) {
      line = string.slice(position);
      position = length;
    } else {
      line = string.slice(position, next + 1);
      position = next + 1;
    }
    if (line.length && line !== "\n")
      result += ind;
    result += line;
  }
  return result;
}
function generateNextLine(state, level) {
  return "\n" + common2.repeat(" ", state.indent * level);
}
function testImplicitResolving(state, str2) {
  var index, length, type2;
  for (index = 0, length = state.implicitTypes.length; index < length; index += 1) {
    type2 = state.implicitTypes[index];
    if (type2.resolve(str2)) {
      return true;
    }
  }
  return false;
}
function isWhitespace(c) {
  return c === CHAR_SPACE || c === CHAR_TAB;
}
function isPrintable(c) {
  return 32 <= c && c <= 126 || 161 <= c && c <= 55295 && c !== 8232 && c !== 8233 || 57344 <= c && c <= 65533 && c !== CHAR_BOM || 65536 <= c && c <= 1114111;
}
function isNsCharOrWhitespace(c) {
  return isPrintable(c) && c !== CHAR_BOM && c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
}
function isPlainSafe(c, prev, inblock) {
  var cIsNsCharOrWhitespace = isNsCharOrWhitespace(c);
  var cIsNsChar = cIsNsCharOrWhitespace && !isWhitespace(c);
  return (
    // ns-plain-safe
    (inblock ? (
      // c = flow-in
      cIsNsCharOrWhitespace
    ) : cIsNsCharOrWhitespace && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET) && c !== CHAR_SHARP && !(prev === CHAR_COLON && !cIsNsChar) || isNsCharOrWhitespace(prev) && !isWhitespace(prev) && c === CHAR_SHARP || prev === CHAR_COLON && cIsNsChar
  );
}
function isPlainSafeFirst(c) {
  return isPrintable(c) && c !== CHAR_BOM && !isWhitespace(c) && c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE && c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
}
function isPlainSafeLast(c) {
  return !isWhitespace(c) && c !== CHAR_COLON;
}
function codePointAt(string, pos) {
  var first = string.charCodeAt(pos), second;
  if (first >= 55296 && first <= 56319 && pos + 1 < string.length) {
    second = string.charCodeAt(pos + 1);
    if (second >= 56320 && second <= 57343) {
      return (first - 55296) * 1024 + second - 56320 + 65536;
    }
  }
  return first;
}
function needIndentIndicator(string) {
  var leadingSpaceRe = /^\n* /;
  return leadingSpaceRe.test(string);
}
var STYLE_PLAIN = 1;
var STYLE_SINGLE = 2;
var STYLE_LITERAL = 3;
var STYLE_FOLDED = 4;
var STYLE_DOUBLE = 5;
function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType, quotingType, forceQuotes, inblock) {
  var i;
  var char = 0;
  var prevChar = null;
  var hasLineBreak = false;
  var hasFoldableLine = false;
  var shouldTrackWidth = lineWidth !== -1;
  var previousLineBreak = -1;
  var plain = isPlainSafeFirst(codePointAt(string, 0)) && isPlainSafeLast(codePointAt(string, string.length - 1));
  if (singleLineOnly || forceQuotes) {
    for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
      char = codePointAt(string, i);
      if (!isPrintable(char)) {
        return STYLE_DOUBLE;
      }
      plain = plain && isPlainSafe(char, prevChar, inblock);
      prevChar = char;
    }
  } else {
    for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
      char = codePointAt(string, i);
      if (char === CHAR_LINE_FEED) {
        hasLineBreak = true;
        if (shouldTrackWidth) {
          hasFoldableLine = hasFoldableLine || // Foldable line = too long, and not more-indented.
          i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
          previousLineBreak = i;
        }
      } else if (!isPrintable(char)) {
        return STYLE_DOUBLE;
      }
      plain = plain && isPlainSafe(char, prevChar, inblock);
      prevChar = char;
    }
    hasFoldableLine = hasFoldableLine || shouldTrackWidth && (i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ");
  }
  if (!hasLineBreak && !hasFoldableLine) {
    if (plain && !forceQuotes && !testAmbiguousType(string)) {
      return STYLE_PLAIN;
    }
    return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
  }
  if (indentPerLevel > 9 && needIndentIndicator(string)) {
    return STYLE_DOUBLE;
  }
  if (!forceQuotes) {
    return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
  }
  return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
}
function writeScalar(state, string, level, iskey, inblock) {
  state.dump = function() {
    if (string.length === 0) {
      return state.quotingType === QUOTING_TYPE_DOUBLE ? '""' : "''";
    }
    if (!state.noCompatMode) {
      if (DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1 || DEPRECATED_BASE60_SYNTAX.test(string)) {
        return state.quotingType === QUOTING_TYPE_DOUBLE ? '"' + string + '"' : "'" + string + "'";
      }
    }
    var indent = state.indent * Math.max(1, level);
    var lineWidth = state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
    var singleLineOnly = iskey || state.flowLevel > -1 && level >= state.flowLevel;
    function testAmbiguity(string2) {
      return testImplicitResolving(state, string2);
    }
    switch (chooseScalarStyle(
      string,
      singleLineOnly,
      state.indent,
      lineWidth,
      testAmbiguity,
      state.quotingType,
      state.forceQuotes && !iskey,
      inblock
    )) {
      case STYLE_PLAIN:
        return string;
      case STYLE_SINGLE:
        return "'" + string.replace(/'/g, "''") + "'";
      case STYLE_LITERAL:
        return "|" + blockHeader(string, state.indent) + dropEndingNewline(indentString(string, indent));
      case STYLE_FOLDED:
        return ">" + blockHeader(string, state.indent) + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
      case STYLE_DOUBLE:
        return '"' + escapeString(string) + '"';
      default:
        throw new exception("impossible error: invalid scalar style");
    }
  }();
}
function blockHeader(string, indentPerLevel) {
  var indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : "";
  var clip = string[string.length - 1] === "\n";
  var keep = clip && (string[string.length - 2] === "\n" || string === "\n");
  var chomp = keep ? "+" : clip ? "" : "-";
  return indentIndicator + chomp + "\n";
}
function dropEndingNewline(string) {
  return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
}
function foldString(string, width) {
  var lineRe = /(\n+)([^\n]*)/g;
  var result = function() {
    var nextLF = string.indexOf("\n");
    nextLF = nextLF !== -1 ? nextLF : string.length;
    lineRe.lastIndex = nextLF;
    return foldLine(string.slice(0, nextLF), width);
  }();
  var prevMoreIndented = string[0] === "\n" || string[0] === " ";
  var moreIndented;
  var match;
  while (match = lineRe.exec(string)) {
    var prefix = match[1], line = match[2];
    moreIndented = line[0] === " ";
    result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") + foldLine(line, width);
    prevMoreIndented = moreIndented;
  }
  return result;
}
function foldLine(line, width) {
  if (line === "" || line[0] === " ")
    return line;
  var breakRe = / [^ ]/g;
  var match;
  var start = 0, end, curr = 0, next = 0;
  var result = "";
  while (match = breakRe.exec(line)) {
    next = match.index;
    if (next - start > width) {
      end = curr > start ? curr : next;
      result += "\n" + line.slice(start, end);
      start = end + 1;
    }
    curr = next;
  }
  result += "\n";
  if (line.length - start > width && curr > start) {
    result += line.slice(start, curr) + "\n" + line.slice(curr + 1);
  } else {
    result += line.slice(start);
  }
  return result.slice(1);
}
function escapeString(string) {
  var result = "";
  var char = 0;
  var escapeSeq;
  for (var i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
    char = codePointAt(string, i);
    escapeSeq = ESCAPE_SEQUENCES[char];
    if (!escapeSeq && isPrintable(char)) {
      result += string[i];
      if (char >= 65536)
        result += string[i + 1];
    } else {
      result += escapeSeq || encodeHex(char);
    }
  }
  return result;
}
function writeFlowSequence(state, level, object) {
  var _result = "", _tag = state.tag, index, length, value;
  for (index = 0, length = object.length; index < length; index += 1) {
    value = object[index];
    if (state.replacer) {
      value = state.replacer.call(object, String(index), value);
    }
    if (writeNode(state, level, value, false, false) || typeof value === "undefined" && writeNode(state, level, null, false, false)) {
      if (_result !== "")
        _result += "," + (!state.condenseFlow ? " " : "");
      _result += state.dump;
    }
  }
  state.tag = _tag;
  state.dump = "[" + _result + "]";
}
function writeBlockSequence(state, level, object, compact) {
  var _result = "", _tag = state.tag, index, length, value;
  for (index = 0, length = object.length; index < length; index += 1) {
    value = object[index];
    if (state.replacer) {
      value = state.replacer.call(object, String(index), value);
    }
    if (writeNode(state, level + 1, value, true, true, false, true) || typeof value === "undefined" && writeNode(state, level + 1, null, true, true, false, true)) {
      if (!compact || _result !== "") {
        _result += generateNextLine(state, level);
      }
      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        _result += "-";
      } else {
        _result += "- ";
      }
      _result += state.dump;
    }
  }
  state.tag = _tag;
  state.dump = _result || "[]";
}
function writeFlowMapping(state, level, object) {
  var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, pairBuffer;
  for (index = 0, length = objectKeyList.length; index < length; index += 1) {
    pairBuffer = "";
    if (_result !== "")
      pairBuffer += ", ";
    if (state.condenseFlow)
      pairBuffer += '"';
    objectKey = objectKeyList[index];
    objectValue = object[objectKey];
    if (state.replacer) {
      objectValue = state.replacer.call(object, objectKey, objectValue);
    }
    if (!writeNode(state, level, objectKey, false, false)) {
      continue;
    }
    if (state.dump.length > 1024)
      pairBuffer += "? ";
    pairBuffer += state.dump + (state.condenseFlow ? '"' : "") + ":" + (state.condenseFlow ? "" : " ");
    if (!writeNode(state, level, objectValue, false, false)) {
      continue;
    }
    pairBuffer += state.dump;
    _result += pairBuffer;
  }
  state.tag = _tag;
  state.dump = "{" + _result + "}";
}
function writeBlockMapping(state, level, object, compact) {
  var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, explicitPair, pairBuffer;
  if (state.sortKeys === true) {
    objectKeyList.sort();
  } else if (typeof state.sortKeys === "function") {
    objectKeyList.sort(state.sortKeys);
  } else if (state.sortKeys) {
    throw new exception("sortKeys must be a boolean or a function");
  }
  for (index = 0, length = objectKeyList.length; index < length; index += 1) {
    pairBuffer = "";
    if (!compact || _result !== "") {
      pairBuffer += generateNextLine(state, level);
    }
    objectKey = objectKeyList[index];
    objectValue = object[objectKey];
    if (state.replacer) {
      objectValue = state.replacer.call(object, objectKey, objectValue);
    }
    if (!writeNode(state, level + 1, objectKey, true, true, true)) {
      continue;
    }
    explicitPair = state.tag !== null && state.tag !== "?" || state.dump && state.dump.length > 1024;
    if (explicitPair) {
      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        pairBuffer += "?";
      } else {
        pairBuffer += "? ";
      }
    }
    pairBuffer += state.dump;
    if (explicitPair) {
      pairBuffer += generateNextLine(state, level);
    }
    if (!writeNode(state, level + 1, objectValue, true, explicitPair)) {
      continue;
    }
    if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
      pairBuffer += ":";
    } else {
      pairBuffer += ": ";
    }
    pairBuffer += state.dump;
    _result += pairBuffer;
  }
  state.tag = _tag;
  state.dump = _result || "{}";
}
function detectType(state, object, explicit) {
  var _result, typeList, index, length, type2, style;
  typeList = explicit ? state.explicitTypes : state.implicitTypes;
  for (index = 0, length = typeList.length; index < length; index += 1) {
    type2 = typeList[index];
    if ((type2.instanceOf || type2.predicate) && (!type2.instanceOf || typeof object === "object" && object instanceof type2.instanceOf) && (!type2.predicate || type2.predicate(object))) {
      if (explicit) {
        if (type2.multi && type2.representName) {
          state.tag = type2.representName(object);
        } else {
          state.tag = type2.tag;
        }
      } else {
        state.tag = "?";
      }
      if (type2.represent) {
        style = state.styleMap[type2.tag] || type2.defaultStyle;
        if (_toString.call(type2.represent) === "[object Function]") {
          _result = type2.represent(object, style);
        } else if (_hasOwnProperty.call(type2.represent, style)) {
          _result = type2.represent[style](object, style);
        } else {
          throw new exception("!<" + type2.tag + '> tag resolver accepts not "' + style + '" style');
        }
        state.dump = _result;
      }
      return true;
    }
  }
  return false;
}
function writeNode(state, level, object, block, compact, iskey, isblockseq) {
  state.tag = null;
  state.dump = object;
  if (!detectType(state, object, false)) {
    detectType(state, object, true);
  }
  var type2 = _toString.call(state.dump);
  var inblock = block;
  var tagStr;
  if (block) {
    block = state.flowLevel < 0 || state.flowLevel > level;
  }
  var objectOrArray = type2 === "[object Object]" || type2 === "[object Array]", duplicateIndex, duplicate;
  if (objectOrArray) {
    duplicateIndex = state.duplicates.indexOf(object);
    duplicate = duplicateIndex !== -1;
  }
  if (state.tag !== null && state.tag !== "?" || duplicate || state.indent !== 2 && level > 0) {
    compact = false;
  }
  if (duplicate && state.usedDuplicates[duplicateIndex]) {
    state.dump = "*ref_" + duplicateIndex;
  } else {
    if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) {
      state.usedDuplicates[duplicateIndex] = true;
    }
    if (type2 === "[object Object]") {
      if (block && Object.keys(state.dump).length !== 0) {
        writeBlockMapping(state, level, state.dump, compact);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + state.dump;
        }
      } else {
        writeFlowMapping(state, level, state.dump);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + " " + state.dump;
        }
      }
    } else if (type2 === "[object Array]") {
      if (block && state.dump.length !== 0) {
        if (state.noArrayIndent && !isblockseq && level > 0) {
          writeBlockSequence(state, level - 1, state.dump, compact);
        } else {
          writeBlockSequence(state, level, state.dump, compact);
        }
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + state.dump;
        }
      } else {
        writeFlowSequence(state, level, state.dump);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + " " + state.dump;
        }
      }
    } else if (type2 === "[object String]") {
      if (state.tag !== "?") {
        writeScalar(state, state.dump, level, iskey, inblock);
      }
    } else if (type2 === "[object Undefined]") {
      return false;
    } else {
      if (state.skipInvalid)
        return false;
      throw new exception("unacceptable kind of an object to dump " + type2);
    }
    if (state.tag !== null && state.tag !== "?") {
      tagStr = encodeURI(
        state.tag[0] === "!" ? state.tag.slice(1) : state.tag
      ).replace(/!/g, "%21");
      if (state.tag[0] === "!") {
        tagStr = "!" + tagStr;
      } else if (tagStr.slice(0, 18) === "tag:yaml.org,2002:") {
        tagStr = "!!" + tagStr.slice(18);
      } else {
        tagStr = "!<" + tagStr + ">";
      }
      state.dump = tagStr + " " + state.dump;
    }
  }
  return true;
}
function getDuplicateReferences(object, state) {
  var objects = [], duplicatesIndexes = [], index, length;
  inspectNode(object, objects, duplicatesIndexes);
  for (index = 0, length = duplicatesIndexes.length; index < length; index += 1) {
    state.duplicates.push(objects[duplicatesIndexes[index]]);
  }
  state.usedDuplicates = new Array(length);
}
function inspectNode(object, objects, duplicatesIndexes) {
  var objectKeyList, index, length;
  if (object !== null && typeof object === "object") {
    index = objects.indexOf(object);
    if (index !== -1) {
      if (duplicatesIndexes.indexOf(index) === -1) {
        duplicatesIndexes.push(index);
      }
    } else {
      objects.push(object);
      if (Array.isArray(object)) {
        for (index = 0, length = object.length; index < length; index += 1) {
          inspectNode(object[index], objects, duplicatesIndexes);
        }
      } else {
        objectKeyList = Object.keys(object);
        for (index = 0, length = objectKeyList.length; index < length; index += 1) {
          inspectNode(object[objectKeyList[index]], objects, duplicatesIndexes);
        }
      }
    }
  }
}
function dump$1(input, options) {
  options = options || {};
  var state = new State(options);
  if (!state.noRefs)
    getDuplicateReferences(input, state);
  var value = input;
  if (state.replacer) {
    value = state.replacer.call({ "": value }, "", value);
  }
  if (writeNode(state, 0, value, true, true))
    return state.dump + "\n";
  return "";
}
var dump_1 = dump$1;
var dumper = {
  dump: dump_1
};
function renamed(from, to) {
  return function() {
    throw new Error("Function yaml." + from + " is removed in js-yaml 4. Use yaml." + to + " instead, which is now safe by default.");
  };
}
var Type = type;
var Schema = schema;
var FAILSAFE_SCHEMA = failsafe;
var JSON_SCHEMA = json;
var CORE_SCHEMA = core;
var DEFAULT_SCHEMA = _default;
var load = loader.load;
var loadAll = loader.loadAll;
var dump = dumper.dump;
var YAMLException = exception;
var types = {
  binary,
  float,
  map,
  null: _null,
  pairs,
  set,
  timestamp,
  bool,
  int,
  merge,
  omap,
  seq,
  str
};
var safeLoad = renamed("safeLoad", "load");
var safeLoadAll = renamed("safeLoadAll", "loadAll");
var safeDump = renamed("safeDump", "dump");
var jsYaml = {
  Type,
  Schema,
  FAILSAFE_SCHEMA,
  JSON_SCHEMA,
  CORE_SCHEMA,
  DEFAULT_SCHEMA,
  load,
  loadAll,
  dump,
  YAMLException,
  types,
  safeLoad,
  safeLoadAll,
  safeDump
};
var js_yaml_default = jsYaml;

// src/pandoc.ts
var baseUrl = "/";
var cdnUrl = `https://cdn.jsdelivr.net/npm/pandoc-wasm@${"0.0.2"}/dist/`;
async function fallbackCdnFetch(input, init) {
  console.log("fallbackCdnFetch", 1)
  // const baseHeaders = await fetch(`${baseUrl}${input}`, { method: "HEAD" });
  // console.log(baseHeaders)
  // let baseResponse;
  // if (baseHeaders.ok)
  //   baseResponse = await fetch(`${baseUrl}${input}`, init);
  // debugger;

  // if (baseResponse.ok)
  //   return baseResponse;
  // debugger;
  const cdnResponse = await fetch(`${cdnUrl}${input}`, init);
  console.log("fallbackCdnFetch", 2)
  if (cdnResponse.ok)
    return cdnResponse;
  console.log("fallbackCdnFetch", 3)
  throw new Error("Can't download pandoc assets from either base or CDN URL.");
}
var _runQueue, _downloadData, downloadData_fn, _installErrorHandler, installErrorHandler_fn;
var _Pandoc = class _Pandoc {
  constructor() {
    __privateAdd(this, _downloadData);
    /*
     * Asterius's GC is a little fragile, so we try to avoid it. Here we detect if
     * we're out of memory and reject with an error message.
     */
    __privateAdd(this, _installErrorHandler);
    __privateAdd(this, _runQueue, []);
    this.dataFiles = {};
    this.wasm = fallbackCdnFetch(`pandoc-wasm.wasm.gz`).then((response) => {console.log(1);return response.arrayBuffer()}).then((gz) => {console.log(2); return _Pandoc.pako.ungzip(gz)}).then((buf) => {console.log(3); return WebAssembly.compile(buf)});
    // debugger;
    __privateMethod(this, _downloadData, downloadData_fn).call(this);
    __privateMethod(this, _installErrorHandler, installErrorHandler_fn).call(this);
  }
  async init() {
    await this.wasm;
    console.log("init", 1)
    await __privateMethod(this, _downloadData, downloadData_fn).call(this);
    console.log("init", 2)
    return this;
  }
  run(_params) {
    const params = {
      text: _params.text,
      options: _params.options,
      citeproc: _params.citeproc,
      files: Object.fromEntries(
        Object.entries(__spreadValues(__spreadValues({}, _params.files), this.dataFiles)).map(([k, v]) => [
          k,
          typeof v === "string" ? v : arrayBufferToBase64(v)
        ])
      )
    };
    let q;
    return new Promise((resolve, reject) => {
      q = { params, resolve, reject };
      __privateGet(this, _runQueue).push(q);
      this.wasm.then(
        (module) => newAsteriusInstance(Object.assign(pandoc_wasm_req_default, { module }))
      ).then((instance) => instance.exports.runPandoc(params)).then((ret) => {
        if ("error" in ret) {
          reject(ret.error);
        } else {
          resolve(ret.output);
        }
      }).catch((err2) => reject(err2));
    }).finally(() => __privateSet(this, _runQueue, __privateGet(this, _runQueue).filter((x) => x !== q)));
  }
  async getVersion() {
    const module = await this.wasm;
    const instance = await newAsteriusInstance(
      Object.assign(pandoc_wasm_req_default, { module })
    );
    return await instance.exports.getVersion();
  }
};
_runQueue = new WeakMap();
_downloadData = new WeakSet();
downloadData_fn = async function() {
  if (Object.keys(this.dataFiles).length > 0) {
    return this.dataFiles;
  }
  const gz = await fallbackCdnFetch(`pandoc-data.data.gz`);
  const data = _Pandoc.pako.ungzip(await gz.arrayBuffer());
  const metaFile = await fallbackCdnFetch(`pandoc-data.metadata`);
  const metadata = await metaFile.json();
  if (metadata.remote_package_size != data.byteLength) {
    throw new Error(
      "Unexpected content when downloading Pandoc support data."
    );
  }
  metadata.files.forEach(
    (f) => {
      this.dataFiles[`data/${f.filename}`] = data.subarray(f.start, f.end);
    }
  );
  return this.dataFiles;
};
_installErrorHandler = new WeakSet();
installErrorHandler_fn = function() {
  globalThis.onerror = (event, source, lineno, colno, error) => {
    if (!error)
      return;
    if (error.name === "RangeError" || error.name === "RuntimeError") {
      const message = error.name === "RangeError" ? "RangeError: Out of memory in Wasm heap." : `${error.name}: ${error.message}`;
      __privateGet(this, _runQueue).forEach((q) => q.reject(message));
    } else {
      throw error;
    }
  };
};
_Pandoc.pako = pako_esm_exports;
_Pandoc.digest = { crc32: crc322, crc32c, adler32: import_adler_32.default };
_Pandoc.yaml = js_yaml_default;
var Pandoc2 = _Pandoc;
globalThis.Pandoc = Pandoc2;
var pandoc_default = Pandoc2;
export {
  Pandoc2 as Pandoc,
  pandoc_default as default
};
/*! Bundled license information:

crc-32/crc32.js:
  (*! crc32.js (C) 2014-present SheetJS -- http://sheetjs.com *)

crc-32/crc32c.js:
  (*! crc32.js (C) 2014-present SheetJS -- http://sheetjs.com *)

pako/dist/pako.esm.mjs:
  (*! pako 2.1.0 https://github.com/nodeca/pako @license (MIT AND Zlib) *)

js-yaml/dist/js-yaml.mjs:
  (*! js-yaml 4.1.0 https://github.com/nodeca/js-yaml @license MIT *)
*/
