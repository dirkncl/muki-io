var TimidityModule = (function () {
  var Module;
  if (!Module) Module = (typeof Module !== "undefined" ? Module : null) || {};
  var moduleOverrides = {};
  for (var key in Module) {
    if (Module.hasOwnProperty(key)) {
      moduleOverrides[key] = Module[key]
    }
  }
  var ENVIRONMENT_IS_WEB = typeof window === "object";
  var ENVIRONMENT_IS_NODE = typeof process === "object" && typeof require === "function" && !ENVIRONMENT_IS_WEB;
  var ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
  var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
  if (ENVIRONMENT_IS_NODE) {
    if (!Module["print"]) Module["print"] = function print(x) {
      process["stdout"].write(x + "\n")
    };
    if (!Module["printErr"]) Module["printErr"] = function printErr(x) {
      process["stderr"].write(x + "\n")
    };
    var nodeFS = require("fs");
    var nodePath = require("path");
    Module["read"] = function read(filename, binary) {
      filename = nodePath["normalize"](filename);
      var ret = nodeFS["readFileSync"](filename);
      if (!ret && filename != nodePath["resolve"](filename)) {
        filename = path.join(__dirname, "..", "src", filename);
        ret = nodeFS["readFileSync"](filename)
      }
      if (ret && !binary) ret = ret.toString();
      return ret
    };
    Module["readBinary"] = function readBinary(filename) {
      return Module["read"](filename, true)
    };
    Module["load"] = function load(f) {
      globalEval(read(f))
    };
    if (!Module["thisProgram"]) {
      if (process["argv"].length > 1) {
        Module["thisProgram"] = process["argv"][1].replace(/\\/g, "/")
      } else {
        Module["thisProgram"] = "unknown-program"
      }
    }
    Module["arguments"] = process["argv"].slice(2);
    if (typeof module !== "undefined") {
      module["exports"] = Module
    }
    process["on"]("uncaughtException", (function (ex) {
      if (!(ex instanceof ExitStatus)) {
        throw ex
      }
    }));
    Module["inspect"] = (function () {
      return "[Emscripten Module object]"
    })
  } 
  else if (ENVIRONMENT_IS_SHELL) {
    if (!Module["print"]) Module["print"] = print;
    if (typeof printErr != "undefined") Module["printErr"] = printErr;
    if (typeof read != "undefined") {
      Module["read"] = read
    } else {
      Module["read"] = function read() {
        throw "no read() available (jsc?)"
      }
    }
    Module["readBinary"] = function readBinary(f) {
      if (typeof readbuffer === "function") {
        return new Uint8Array(readbuffer(f))
      }
      var data = read(f, "binary");
      assert(typeof data === "object");
      return data
    };
    if (typeof scriptArgs != "undefined") {
      Module["arguments"] = scriptArgs
    } else if (typeof arguments != "undefined") {
      Module["arguments"] = arguments
    }
  } 
  else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    Module["read"] = function read(url) {
      var xhr = new XMLHttpRequest;
      xhr.open("GET", url, false);
      xhr.send(null);
      return xhr.responseText
    };
    if (typeof arguments != "undefined") {
      Module["arguments"] = arguments
    }
    if (typeof console !== "undefined") {
      if (!Module["print"]) Module["print"] = function print(x) {
        console.log(x)
      };
      if (!Module["printErr"]) Module["printErr"] = function printErr(x) {
        console.log(x)
      }
    } else {
      var TRY_USE_DUMP = false;
      if (!Module["print"]) Module["print"] = TRY_USE_DUMP && typeof dump !== "undefined" ? (function (x) {
        dump(x)
      }) : (function (x) {})
    }
    if (ENVIRONMENT_IS_WORKER) {
      Module["load"] = importScripts
    }
    if (typeof Module["setWindowTitle"] === "undefined") {
      Module["setWindowTitle"] = (function (title) {
        document.title = title
      })
    }
  } 
  else {
    throw "Unknown runtime environment. Where are we?"
  }

  function globalEval(x) {
    eval.call(null, x)
  }
  if (!Module["load"] && Module["read"]) {
    Module["load"] = function load(f) {
      globalEval(Module["read"](f))
    }
  }
  if (!Module["print"]) {
    Module["print"] = (function () {})
  }
  if (!Module["printErr"]) {
    Module["printErr"] = Module["print"]
  }
  if (!Module["arguments"]) {
    Module["arguments"] = []
  }
  if (!Module["thisProgram"]) {
    Module["thisProgram"] = "./this.program"
  }
  Module.print = Module["print"];
  Module.printErr = Module["printErr"];
  Module["preRun"] = [];
  Module["postRun"] = [];
  for (var key in moduleOverrides) {
    if (moduleOverrides.hasOwnProperty(key)) {
      Module[key] = moduleOverrides[key]
    }
  }
  var Runtime = {
    setTempRet0: (function (value) {
      tempRet0 = value
    }),
    getTempRet0: (function () {
      return tempRet0
    }),
    stackSave: (function () {
      return STACKTOP
    }),
    stackRestore: (function (stackTop) {
      STACKTOP = stackTop
    }),
    getNativeTypeSize: (function (type) {
      switch (type) {
      case "i1":
      case "i8":
        return 1;
      case "i16":
        return 2;
      case "i32":
        return 4;
      case "i64":
        return 8;
      case "float":
        return 4;
      case "double":
        return 8;
      default:
        {
          if (type[type.length - 1] === "*") {
            return Runtime.QUANTUM_SIZE
          } else if (type[0] === "i") {
            var bits = parseInt(type.substr(1));
            assert(bits % 8 === 0);
            return bits / 8
          } else {
            return 0
          }
        }
      }
    }),
    getNativeFieldSize: (function (type) {
      return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE)
    }),
    STACK_ALIGN: 16,
    prepVararg: (function (ptr, type) {
      if (type === "double" || type === "i64") {
        if (ptr & 7) {
          assert((ptr & 7) === 4);
          ptr += 4
        }
      } else {
        assert((ptr & 3) === 0)
      }
      return ptr
    }),
    getAlignSize: (function (type, size, vararg) {
      if (!vararg && (type == "i64" || type == "double")) return 8;
      if (!type) return Math.min(size, 8);
      return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE)
    }),
    dynCall: (function (sig, ptr, args) {
      if (args && args.length) {
        assert(args.length == sig.length - 1);
        if (!args.splice) args = Array.prototype.slice.call(args);
        args.splice(0, 0, ptr);
        assert("dynCall_" + sig in Module, "bad function pointer type - no table for sig '" + sig + "'");
        return Module["dynCall_" + sig].apply(null, args)
      } else {
        assert(sig.length == 1);
        assert("dynCall_" + sig in Module, "bad function pointer type - no table for sig '" + sig + "'");
        return Module["dynCall_" + sig].call(null, ptr)
      }
    }),
    functionPointers: [],
    addFunction: (function (func) {
      for (var i = 0; i < Runtime.functionPointers.length; i++) {
        if (!Runtime.functionPointers[i]) {
          Runtime.functionPointers[i] = func;
          return 2 * (1 + i)
        }
      }
      throw "Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS."
    }),
    removeFunction: (function (index) {
      Runtime.functionPointers[(index - 2) / 2] = null
    }),
    warnOnce: (function (text) {
      if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
      if (!Runtime.warnOnce.shown[text]) {
        Runtime.warnOnce.shown[text] = 1;
        Module.printErr(text)
      }
    }),
    funcWrappers: {},
    getFuncWrapper: (function (func, sig) {
      assert(sig);
      if (!Runtime.funcWrappers[sig]) {
        Runtime.funcWrappers[sig] = {}
      }
      var sigCache = Runtime.funcWrappers[sig];
      if (!sigCache[func]) {
        sigCache[func] = function dynCall_wrapper() {
          return Runtime.dynCall(sig, func, arguments)
        }
      }
      return sigCache[func]
    }),
    getCompilerSetting: (function (name) {
      throw "You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work"
    }),
    stackAlloc: (function (size) {
      var ret = STACKTOP;
      STACKTOP = STACKTOP + size | 0;
      STACKTOP = STACKTOP + 15 & -16;
      assert((STACKTOP | 0) < (STACK_MAX | 0) | 0) | 0;
      return ret
    }),
    staticAlloc: (function (size) {
      var ret = STATICTOP;
      STATICTOP = STATICTOP + (assert(!staticSealed), size) | 0;
      STATICTOP = STATICTOP + 15 & -16;
      return ret
    }),
    dynamicAlloc: (function (size) {
      var ret = DYNAMICTOP;
      DYNAMICTOP = DYNAMICTOP + (assert(DYNAMICTOP > 0), size) | 0;
      DYNAMICTOP = DYNAMICTOP + 15 & -16;
      if (DYNAMICTOP >= TOTAL_MEMORY) {
        var success = enlargeMemory();
        if (!success) {
          DYNAMICTOP = ret;
          return 0
        }
      }
      return ret
    }),
    alignMemory: (function (size, quantum) {
      var ret = size = Math.ceil(size / (quantum ? quantum : 16)) * (quantum ? quantum : 16);
      return ret
    }),
    makeBigInt: (function (low, high, unsigned) {
      var ret = unsigned ? +(low >>> 0) + +(high >>> 0) * +4294967296 : +(low >>> 0) + +(high | 0) * +4294967296;
      return ret
    }),
    GLOBAL_BASE: 8,
    QUANTUM_SIZE: 4,
    __dummy__: 0
  };
  Module["Runtime"] = Runtime;
  var __THREW__ = 0;
  var ABORT = false;
  var EXITSTATUS = 0;
  var undef = 0;
  var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempDouble, tempFloat;
  var tempI64, tempI64b;
  var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;

  function assert(condition, text) {
    if (!condition) {
      abort("Assertion failed: " + text)
    }
  }
  var globalScope = this;

  function getCFunc(ident) {
    var func = Module["_" + ident];
    if (!func) {
      try {
        func = eval("_" + ident)
      } catch (e) {}
    }
    assert(func, "Cannot call unknown function " + ident + " (perhaps LLVM optimizations or closure removed it?)");
    return func
  }
  var cwrap, ccall;
  ((function () {
    var JSfuncs = {
      "stackSave": (function () {
        Runtime.stackSave()
      }),
      "stackRestore": (function () {
        Runtime.stackRestore()
      }),
      "arrayToC": (function (arr) {
        var ret = Runtime.stackAlloc(arr.length);
        writeArrayToMemory(arr, ret);
        return ret
      }),
      "stringToC": (function (str) {
        var ret = 0;
        if (str !== null && str !== undefined && str !== 0) {
          ret = Runtime.stackAlloc((str.length << 2) + 1);
          writeStringToMemory(str, ret)
        }
        return ret
      })
    };
    var toC = {
      "string": JSfuncs["stringToC"],
      "array": JSfuncs["arrayToC"]
    };
    ccall = function ccallFunc(ident, returnType, argTypes, args, opts) {
      var func = getCFunc(ident);
      var cArgs = [];
      var stack = 0;
      assert(returnType !== "array", 'Return type should not be "array".');
      if (args) {
        for (var i = 0; i < args.length; i++) {
          var converter = toC[argTypes[i]];
          if (converter) {
            if (stack === 0) stack = Runtime.stackSave();
            cArgs[i] = converter(args[i])
          } 
          else {
            cArgs[i] = args[i]
          }
        }
      }
      var ret = func.apply(null, cArgs);
      if ((!opts || !opts.async) && typeof EmterpreterAsync === "object") {
        assert(!EmterpreterAsync.state, "cannot start async op with normal JS calling ccall")
      }
      if (opts && opts.async) assert(!returnType, "async ccalls cannot return values");
      if (returnType === "string") ret = Pointer_stringify(ret);
      if (stack !== 0) {
        if (opts && opts.async) {
          EmterpreterAsync.asyncFinalizers.push((function () {
            Runtime.stackRestore(stack)
          }));
          return
        }
        Runtime.stackRestore(stack)
      }
      return ret
    };
    var sourceRegex = /^function\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/;

    function parseJSFunc(jsfunc) {
      var parsed = jsfunc.toString().match(sourceRegex).slice(1);
      return {
        arguments: parsed[0],
        body: parsed[1],
        returnValue: parsed[2]
      }
    }
    var JSsource = {};
    for (var fun in JSfuncs) {
      if (JSfuncs.hasOwnProperty(fun)) {
        JSsource[fun] = parseJSFunc(JSfuncs[fun])
      }
    }
    cwrap = function cwrap(ident, returnType, argTypes) {
      argTypes = argTypes || [];
      var cfunc = getCFunc(ident);
      var numericArgs = argTypes.every((function (type) {
        return type === "number"
      }));
      var numericRet = returnType !== "string";
      if (numericRet && numericArgs) {
        return cfunc
      }
      var argNames = argTypes.map((function (x, i) {
        return "$" + i
      }));
      var funcstr = "(function(" + argNames.join(",") + ") {";
      var nargs = argTypes.length;
      if (!numericArgs) {
        funcstr += "var stack = " + JSsource["stackSave"].body + ";";
        for (var i = 0; i < nargs; i++) {
          var arg = argNames[i],
            type = argTypes[i];
          if (type === "number") continue;
          var convertCode = JSsource[type + "ToC"];
          funcstr += "var " + convertCode.arguments + " = " + arg + ";";
          funcstr += convertCode.body + ";";
          funcstr += arg + "=" + convertCode.returnValue + ";"
        }
      }
      var cfuncname = parseJSFunc((function () {
        return cfunc
      })).returnValue;
      funcstr += "var ret = " + cfuncname + "(" + argNames.join(",") + ");";
      if (!numericRet) {
        var strgfy = parseJSFunc((function () {
          return Pointer_stringify
        })).returnValue;
        funcstr += "ret = " + strgfy + "(ret);"
      }
      funcstr += "if (typeof EmterpreterAsync === 'object') { assert(!EmterpreterAsync.state, 'cannot start async op with normal JS calling cwrap') }";
      if (!numericArgs) {
        funcstr += JSsource["stackRestore"].body.replace("()", "(stack)") + ";"
      }
      funcstr += "return ret})";
      return eval(funcstr)
    }
  }))();
  Module["cwrap"] = cwrap;
  Module["ccall"] = ccall;

  function setValue(ptr, value, type, noSafe) {
    type = type || "i8";
    if (type.charAt(type.length - 1) === "*") type = "i32";
    switch (type) {
    case "i1":
      HEAP8[ptr >> 0] = value;
      break;
    case "i8":
      HEAP8[ptr >> 0] = value;
      break;
    case "i16":
      HEAP16[ptr >> 1] = value;
      break;
    case "i32":
      HEAP32[ptr >> 2] = value;
      break;
    case "i64":
      tempI64 = [value >>> 0, (tempDouble = value, +Math_abs(tempDouble) >= +1 ? tempDouble > +0 ? (Math_min(+Math_floor(tempDouble / +4294967296), +4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / +4294967296) >>> 0 : 0)], HEAP32[ptr >> 2] = tempI64[0], HEAP32[ptr + 4 >> 2] = tempI64[1];
      break;
    case "float":
      HEAPF32[ptr >> 2] = value;
      break;
    case "double":
      HEAPF64[ptr >> 3] = value;
      break;
    default:
      abort("invalid type for setValue: " + type)
    }
  }
  Module["setValue"] = setValue;

  function getValue(ptr, type, noSafe) {
    type = type || "i8";
    if (type.charAt(type.length - 1) === "*") type = "i32";
    switch (type) {
    case "i1":
      return HEAP8[ptr >> 0];
    case "i8":
      return HEAP8[ptr >> 0];
    case "i16":
      return HEAP16[ptr >> 1];
    case "i32":
      return HEAP32[ptr >> 2];
    case "i64":
      return HEAP32[ptr >> 2];
    case "float":
      return HEAPF32[ptr >> 2];
    case "double":
      return HEAPF64[ptr >> 3];
    default:
      abort("invalid type for setValue: " + type)
    }
    return null
  }
  Module["getValue"] = getValue;
  var ALLOC_NORMAL = 0;
  var ALLOC_STACK = 1;
  var ALLOC_STATIC = 2;
  var ALLOC_DYNAMIC = 3;
  var ALLOC_NONE = 4;
  Module["ALLOC_NORMAL"] = ALLOC_NORMAL;
  Module["ALLOC_STACK"] = ALLOC_STACK;
  Module["ALLOC_STATIC"] = ALLOC_STATIC;
  Module["ALLOC_DYNAMIC"] = ALLOC_DYNAMIC;
  Module["ALLOC_NONE"] = ALLOC_NONE;

  function allocate(slab, types, allocator, ptr) {
    var zeroinit, size;
    if (typeof slab === "number") {
      zeroinit = true;
      size = slab
    } else {
      zeroinit = false;
      size = slab.length
    }
    var singleType = typeof types === "string" ? types : null;
    var ret;
    if (allocator == ALLOC_NONE) {
      ret = ptr
    } else {
      ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length))
    }
    if (zeroinit) {
      var ptr = ret,
        stop;
      assert((ret & 3) == 0);
      stop = ret + (size & ~3);
      for (; ptr < stop; ptr += 4) {
        HEAP32[ptr >> 2] = 0
      }
      stop = ret + size;
      while (ptr < stop) {
        HEAP8[ptr++ >> 0] = 0
      }
      return ret
    }
    if (singleType === "i8") {
      if (slab.subarray || slab.slice) {
        HEAPU8.set(slab, ret)
      } else {
        HEAPU8.set(new Uint8Array(slab), ret)
      }
      return ret
    }
    var i = 0,
      type, typeSize, previousType;
    while (i < size) {
      var curr = slab[i];
      if (typeof curr === "function") {
        curr = Runtime.getFunctionIndex(curr)
      }
      type = singleType || types[i];
      if (type === 0) {
        i++;
        continue
      }
      assert(type, "Must know what type to store in allocate!");
      if (type == "i64") type = "i32";
      setValue(ret + i, curr, type);
      if (previousType !== type) {
        typeSize = Runtime.getNativeTypeSize(type);
        previousType = type
      }
      i += typeSize
    }
    return ret
  }
  Module["allocate"] = allocate;

  function getMemory(size) {
    if (!staticSealed) return Runtime.staticAlloc(size);
    if (typeof _sbrk !== "undefined" && !_sbrk.called) return Runtime.dynamicAlloc(size);
    return _malloc(size)
  }

  function Pointer_stringify(ptr, length) {
    if (length === 0 || !ptr) return "";
    var hasUtf = 0;
    var t;
    var i = 0;
    while (1) {
      assert(ptr + i < TOTAL_MEMORY);
      t = HEAPU8[ptr + i >> 0];
      hasUtf |= t;
      if (t == 0 && !length) break;
      i++;
      if (length && i == length) break
    }
    if (!length) length = i;
    var ret = "";
    if (hasUtf < 128) {
      var MAX_CHUNK = 1024;
      var curr;
      while (length > 0) {
        curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
        ret = ret ? ret + curr : curr;
        ptr += MAX_CHUNK;
        length -= MAX_CHUNK
      }
      return ret
    }
    return Module["UTF8ToString"](ptr)
  }
  Module["Pointer_stringify"] = Pointer_stringify;

  function AsciiToString(ptr) {
    var str = "";
    while (1) {
      var ch = HEAP8[ptr++ >> 0];
      if (!ch) return str;
      str += String.fromCharCode(ch)
    }
  }
  Module["AsciiToString"] = AsciiToString;

  function stringToAscii(str, outPtr) {
    return writeAsciiToMemory(str, outPtr, false)
  }
  Module["stringToAscii"] = stringToAscii;

  function UTF8ArrayToString(u8Array, idx) {
    var u0, u1, u2, u3, u4, u5;
    var str = "";
    while (1) {
      u0 = u8Array[idx++];
      if (!u0) return str;
      if (!(u0 & 128)) {
        str += String.fromCharCode(u0);
        continue
      }
      u1 = u8Array[idx++] & 63;
      if ((u0 & 224) == 192) {
        str += String.fromCharCode((u0 & 31) << 6 | u1);
        continue
      }
      u2 = u8Array[idx++] & 63;
      if ((u0 & 240) == 224) {
        u0 = (u0 & 15) << 12 | u1 << 6 | u2
      } else {
        u3 = u8Array[idx++] & 63;
        if ((u0 & 248) == 240) {
          u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | u3
        } else {
          u4 = u8Array[idx++] & 63;
          if ((u0 & 252) == 248) {
            u0 = (u0 & 3) << 24 | u1 << 18 | u2 << 12 | u3 << 6 | u4
          } else {
            u5 = u8Array[idx++] & 63;
            u0 = (u0 & 1) << 30 | u1 << 24 | u2 << 18 | u3 << 12 | u4 << 6 | u5
          }
        }
      }
      if (u0 < 65536) {
        str += String.fromCharCode(u0)
      } else {
        var ch = u0 - 65536;
        str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023)
      }
    }
  }
  Module["UTF8ArrayToString"] = UTF8ArrayToString;

  function UTF8ToString(ptr) {
    return UTF8ArrayToString(HEAPU8, ptr)
  }
  Module["UTF8ToString"] = UTF8ToString;

  function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
    if (!(maxBytesToWrite > 0)) return 0;
    var startIdx = outIdx;
    var endIdx = outIdx + maxBytesToWrite - 1;
    for (var i = 0; i < str.length; ++i) {
      var u = str.charCodeAt(i);
      if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
      if (u <= 127) {
        if (outIdx >= endIdx) break;
        outU8Array[outIdx++] = u
      } else if (u <= 2047) {
        if (outIdx + 1 >= endIdx) break;
        outU8Array[outIdx++] = 192 | u >> 6;
        outU8Array[outIdx++] = 128 | u & 63
      } else if (u <= 65535) {
        if (outIdx + 2 >= endIdx) break;
        outU8Array[outIdx++] = 224 | u >> 12;
        outU8Array[outIdx++] = 128 | u >> 6 & 63;
        outU8Array[outIdx++] = 128 | u & 63
      } else if (u <= 2097151) {
        if (outIdx + 3 >= endIdx) break;
        outU8Array[outIdx++] = 240 | u >> 18;
        outU8Array[outIdx++] = 128 | u >> 12 & 63;
        outU8Array[outIdx++] = 128 | u >> 6 & 63;
        outU8Array[outIdx++] = 128 | u & 63
      } else if (u <= 67108863) {
        if (outIdx + 4 >= endIdx) break;
        outU8Array[outIdx++] = 248 | u >> 24;
        outU8Array[outIdx++] = 128 | u >> 18 & 63;
        outU8Array[outIdx++] = 128 | u >> 12 & 63;
        outU8Array[outIdx++] = 128 | u >> 6 & 63;
        outU8Array[outIdx++] = 128 | u & 63
      } else {
        if (outIdx + 5 >= endIdx) break;
        outU8Array[outIdx++] = 252 | u >> 30;
        outU8Array[outIdx++] = 128 | u >> 24 & 63;
        outU8Array[outIdx++] = 128 | u >> 18 & 63;
        outU8Array[outIdx++] = 128 | u >> 12 & 63;
        outU8Array[outIdx++] = 128 | u >> 6 & 63;
        outU8Array[outIdx++] = 128 | u & 63
      }
    }
    outU8Array[outIdx] = 0;
    return outIdx - startIdx
  }
  Module["stringToUTF8Array"] = stringToUTF8Array;

  function stringToUTF8(str, outPtr, maxBytesToWrite) {
    assert(typeof maxBytesToWrite == "number", "stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!");
    return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite)
  }
  Module["stringToUTF8"] = stringToUTF8;

  function lengthBytesUTF8(str) {
    var len = 0;
    for (var i = 0; i < str.length; ++i) {
      var u = str.charCodeAt(i);
      if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
      if (u <= 127) {
        ++len
      } else if (u <= 2047) {
        len += 2
      } else if (u <= 65535) {
        len += 3
      } else if (u <= 2097151) {
        len += 4
      } else if (u <= 67108863) {
        len += 5
      } else {
        len += 6
      }
    }
    return len
  }
  Module["lengthBytesUTF8"] = lengthBytesUTF8;

  function UTF16ToString(ptr) {
    var i = 0;
    var str = "";
    while (1) {
      var codeUnit = HEAP16[ptr + i * 2 >> 1];
      if (codeUnit == 0) return str;
      ++i;
      str += String.fromCharCode(codeUnit)
    }
  }
  Module["UTF16ToString"] = UTF16ToString;

  function stringToUTF16(str, outPtr, maxBytesToWrite) {
    assert(typeof maxBytesToWrite == "number", "stringToUTF16(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!");
    if (maxBytesToWrite === undefined) {
      maxBytesToWrite = 2147483647
    }
    if (maxBytesToWrite < 2) return 0;
    maxBytesToWrite -= 2;
    var startPtr = outPtr;
    var numCharsToWrite = maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length;
    for (var i = 0; i < numCharsToWrite; ++i) {
      var codeUnit = str.charCodeAt(i);
      HEAP16[outPtr >> 1] = codeUnit;
      outPtr += 2
    }
    HEAP16[outPtr >> 1] = 0;
    return outPtr - startPtr
  }
  Module["stringToUTF16"] = stringToUTF16;

  function lengthBytesUTF16(str) {
    return str.length * 2
  }
  Module["lengthBytesUTF16"] = lengthBytesUTF16;

  function UTF32ToString(ptr) {
    var i = 0;
    var str = "";
    while (1) {
      var utf32 = HEAP32[ptr + i * 4 >> 2];
      if (utf32 == 0) return str;
      ++i;
      if (utf32 >= 65536) {
        var ch = utf32 - 65536;
        str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023)
      } else {
        str += String.fromCharCode(utf32)
      }
    }
  }
  Module["UTF32ToString"] = UTF32ToString;

  function stringToUTF32(str, outPtr, maxBytesToWrite) {
    assert(typeof maxBytesToWrite == "number", "stringToUTF32(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!");
    if (maxBytesToWrite === undefined) {
      maxBytesToWrite = 2147483647
    }
    if (maxBytesToWrite < 4) return 0;
    var startPtr = outPtr;
    var endPtr = startPtr + maxBytesToWrite - 4;
    for (var i = 0; i < str.length; ++i) {
      var codeUnit = str.charCodeAt(i);
      if (codeUnit >= 55296 && codeUnit <= 57343) {
        var trailSurrogate = str.charCodeAt(++i);
        codeUnit = 65536 + ((codeUnit & 1023) << 10) | trailSurrogate & 1023
      }
      HEAP32[outPtr >> 2] = codeUnit;
      outPtr += 4;
      if (outPtr + 4 > endPtr) break
    }
    HEAP32[outPtr >> 2] = 0;
    return outPtr - startPtr
  }
  Module["stringToUTF32"] = stringToUTF32;

  function lengthBytesUTF32(str) {
    var len = 0;
    for (var i = 0; i < str.length; ++i) {
      var codeUnit = str.charCodeAt(i);
      if (codeUnit >= 55296 && codeUnit <= 57343) ++i;
      len += 4
    }
    return len
  }
  Module["lengthBytesUTF32"] = lengthBytesUTF32;

  function demangle(func) {
    var hasLibcxxabi = !!Module["___cxa_demangle"];
    if (hasLibcxxabi) {
      try {
        var buf = _malloc(func.length);
        writeStringToMemory(func.substr(1), buf);
        var status = _malloc(4);
        var ret = Module["___cxa_demangle"](buf, 0, 0, status);
        if (getValue(status, "i32") === 0 && ret) {
          return Pointer_stringify(ret)
        }
      } catch (e) {} finally {
        if (buf) _free(buf);
        if (status) _free(status);
        if (ret) _free(ret)
      }
    }
    var i = 3;
    var basicTypes = {
      "v": "void",
      "b": "bool",
      "c": "char",
      "s": "short",
      "i": "int",
      "l": "long",
      "f": "float",
      "d": "double",
      "w": "wchar_t",
      "a": "signed char",
      "h": "unsigned char",
      "t": "unsigned short",
      "j": "unsigned int",
      "m": "unsigned long",
      "x": "long long",
      "y": "unsigned long long",
      "z": "..."
    };
    var subs = [];
    var first = true;

    function dump(x) {
      if (x) Module.print(x);
      Module.print(func);
      var pre = "";
      for (var a = 0; a < i; a++) pre += " ";
      Module.print(pre + "^")
    }

    function parseNested() {
      i++;
      if (func[i] === "K") i++;
      var parts = [];
      while (func[i] !== "E") {
        if (func[i] === "S") {
          i++;
          var next = func.indexOf("_", i);
          var num = func.substring(i, next) || 0;
          parts.push(subs[num] || "?");
          i = next + 1;
          continue
        }
        if (func[i] === "C") {
          parts.push(parts[parts.length - 1]);
          i += 2;
          continue
        }
        var size = parseInt(func.substr(i));
        var pre = size.toString().length;
        if (!size || !pre) {
          i--;
          break
        }
        var curr = func.substr(i + pre, size);
        parts.push(curr);
        subs.push(curr);
        i += pre + size
      }
      i++;
      return parts
    }

    function parse(rawList, limit, allowVoid) {
      limit = limit || Infinity;
      var ret = "",
        list = [];

      function flushList() {
        return "(" + list.join(", ") + ")"
      }
      var name;
      if (func[i] === "N") {
        name = parseNested().join("::");
        limit--;
        if (limit === 0) return rawList ? [name] : name
      } else {
        if (func[i] === "K" || first && func[i] === "L") i++;
        var size = parseInt(func.substr(i));
        if (size) {
          var pre = size.toString().length;
          name = func.substr(i + pre, size);
          i += pre + size
        }
      }
      first = false;
      if (func[i] === "I") {
        i++;
        var iList = parse(true);
        var iRet = parse(true, 1, true);
        ret += iRet[0] + " " + name + "<" + iList.join(", ") + ">"
      } else {
        ret = name
      }
      paramLoop: while (i < func.length && limit-- > 0) {
        var c = func[i++];
        if (c in basicTypes) {
          list.push(basicTypes[c])
        } else {
          switch (c) {
          case "P":
            list.push(parse(true, 1, true)[0] + "*");
            break;
          case "R":
            list.push(parse(true, 1, true)[0] + "&");
            break;
          case "L":
            {
              i++;
              var end = func.indexOf("E", i);
              var size = end - i;list.push(func.substr(i, size));i += size + 2;
              break
            };
          case "A":
            {
              var size = parseInt(func.substr(i));i += size.toString().length;
              if (func[i] !== "_") throw "?";i++;list.push(parse(true, 1, true)[0] + " [" + size + "]");
              break
            };
          case "E":
            break paramLoop;
          default:
            ret += "?" + c;
            break paramLoop
          }
        }
      }
      if (!allowVoid && list.length === 1 && list[0] === "void") list = [];
      if (rawList) {
        if (ret) {
          list.push(ret + "?")
        }
        return list
      } else {
        return ret + flushList()
      }
    }
    var parsed = func;
    try {
      if (func == "Object._main" || func == "_main") {
        return "main()"
      }
      if (typeof func === "number") func = Pointer_stringify(func);
      if (func[0] !== "_") return func;
      if (func[1] !== "_") return func;
      if (func[2] !== "Z") return func;
      switch (func[3]) {
      case "n":
        return "operator new()";
      case "d":
        return "operator delete()"
      }
      parsed = parse()
    } catch (e) {
      parsed += "?"
    }
    if (parsed.indexOf("?") >= 0 && !hasLibcxxabi) {
      Runtime.warnOnce("warning: a problem occurred in builtin C++ name demangling; build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling")
    }
    return parsed
  }

  function demangleAll(text) {
    return text.replace(/__Z[\w\d_]+/g, (function (x) {
      var y = demangle(x);
      return x === y ? x : x + " [" + y + "]"
    }))
  }

  function jsStackTrace() {
    var err = new Error;
    if (!err.stack) {
      try {
        throw new Error(0)
      } catch (e) {
        err = e
      }
      if (!err.stack) {
        return "(no stack trace available)"
      }
    }
    return err.stack.toString()
  }

  function stackTrace() {
    return demangleAll(jsStackTrace())
  }
  Module["stackTrace"] = stackTrace;
  var PAGE_SIZE = 4096;

  function alignMemoryPage(x) {
    if (x % 4096 > 0) {
      x += 4096 - x % 4096
    }
    return x
  }
  var HEAP;
  var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
  var STATIC_BASE = 0,
    STATICTOP = 0,
    staticSealed = false;
  var STACK_BASE = 0,
    STACKTOP = 0,
    STACK_MAX = 0;
  var DYNAMIC_BASE = 0,
    DYNAMICTOP = 0;

  function enlargeMemory() {
    abort("Cannot enlarge memory arrays. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value " + TOTAL_MEMORY + ", (2) compile with ALLOW_MEMORY_GROWTH which adjusts the size at runtime but prevents some optimizations, or (3) set Module.TOTAL_MEMORY before the program runs.")
  }
  var TOTAL_STACK = Module["TOTAL_STACK"] || 5242880;
  var TOTAL_MEMORY = Module["TOTAL_MEMORY"] || 50331648;
  var totalMemory = 64 * 1024;
  while (totalMemory < TOTAL_MEMORY || totalMemory < 2 * TOTAL_STACK) {
    if (totalMemory < 16 * 1024 * 1024) {
      totalMemory *= 2
    } else {
      totalMemory += 16 * 1024 * 1024
    }
  }
  if (totalMemory !== TOTAL_MEMORY) {
    Module.printErr("increasing TOTAL_MEMORY to " + totalMemory + " to be compliant with the asm.js spec (and given that TOTAL_STACK=" + TOTAL_STACK + ")");
    TOTAL_MEMORY = totalMemory
  }
  assert(typeof Int32Array !== "undefined" && typeof Float64Array !== "undefined" && !!(new Int32Array(1))["subarray"] && !!(new Int32Array(1))["set"], "JS engine does not provide full typed array support");
  var buffer = new ArrayBuffer(TOTAL_MEMORY);
  HEAP8 = new Int8Array(buffer);
  HEAP16 = new Int16Array(buffer);
  HEAP32 = new Int32Array(buffer);
  HEAPU8 = new Uint8Array(buffer);
  HEAPU16 = new Uint16Array(buffer);
  HEAPU32 = new Uint32Array(buffer);
  HEAPF32 = new Float32Array(buffer);
  HEAPF64 = new Float64Array(buffer);
  HEAP32[0] = 255;
  assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, "Typed arrays 2 must be run on a little-endian system");
  Module["HEAP"] = HEAP;
  Module["buffer"] = buffer;
  Module["HEAP8"] = HEAP8;
  Module["HEAP16"] = HEAP16;
  Module["HEAP32"] = HEAP32;
  Module["HEAPU8"] = HEAPU8;
  Module["HEAPU16"] = HEAPU16;
  Module["HEAPU32"] = HEAPU32;
  Module["HEAPF32"] = HEAPF32;
  Module["HEAPF64"] = HEAPF64;

  function callRuntimeCallbacks(callbacks) {
    while (callbacks.length > 0) {
      var callback = callbacks.shift();
      if (typeof callback == "function") {
        callback();
        continue
      }
      var func = callback.func;
      if (typeof func === "number") {
        if (callback.arg === undefined) {
          Runtime.dynCall("v", func)
        } else {
          Runtime.dynCall("vi", func, [callback.arg])
        }
      } else {
        func(callback.arg === undefined ? null : callback.arg)
      }
    }
  }
  var __ATPRERUN__ = [];
  var __ATINIT__ = [];
  var __ATMAIN__ = [];
  var __ATEXIT__ = [];
  var __ATPOSTRUN__ = [];
  var runtimeInitialized = false;
  var runtimeExited = false;

  function preRun() {
    if (Module["preRun"]) {
      if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
      while (Module["preRun"].length) {
        addOnPreRun(Module["preRun"].shift())
      }
    }
    callRuntimeCallbacks(__ATPRERUN__)
  }

  function ensureInitRuntime() {
    if (runtimeInitialized) return;
    runtimeInitialized = true;
    callRuntimeCallbacks(__ATINIT__)
  }

  function preMain() {
    callRuntimeCallbacks(__ATMAIN__)
  }

  function exitRuntime() {
    callRuntimeCallbacks(__ATEXIT__);
    runtimeExited = true
  }

  function postRun() {
    if (Module["postRun"]) {
      if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
      while (Module["postRun"].length) {
        addOnPostRun(Module["postRun"].shift())
      }
    }
    callRuntimeCallbacks(__ATPOSTRUN__)
  }

  function addOnPreRun(cb) {
    __ATPRERUN__.unshift(cb)
  }
  Module["addOnPreRun"] = Module.addOnPreRun = addOnPreRun;

  function addOnInit(cb) {
    __ATINIT__.unshift(cb)
  }
  Module["addOnInit"] = Module.addOnInit = addOnInit;

  function addOnPreMain(cb) {
    __ATMAIN__.unshift(cb)
  }
  Module["addOnPreMain"] = Module.addOnPreMain = addOnPreMain;

  function addOnExit(cb) {
    __ATEXIT__.unshift(cb)
  }
  Module["addOnExit"] = Module.addOnExit = addOnExit;

  function addOnPostRun(cb) {
    __ATPOSTRUN__.unshift(cb)
  }
  Module["addOnPostRun"] = Module.addOnPostRun = addOnPostRun;

  function intArrayFromString(stringy, dontAddNull, length) {
    var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
    var u8array = new Array(len);
    var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
    if (dontAddNull) u8array.length = numBytesWritten;
    return u8array
  }
  Module["intArrayFromString"] = intArrayFromString;

  function intArrayToString(array) {
    var ret = [];
    for (var i = 0; i < array.length; i++) {
      var chr = array[i];
      if (chr > 255) {
        assert(false, "Character code " + chr + " (" + String.fromCharCode(chr) + ")  at offset " + i + " not in 0x00-0xFF.");
        chr &= 255
      }
      ret.push(String.fromCharCode(chr))
    }
    return ret.join("")
  }
  Module["intArrayToString"] = intArrayToString;

  function writeStringToMemory(string, buffer, dontAddNull) {
    var array = intArrayFromString(string, dontAddNull);
    var i = 0;
    while (i < array.length) {
      var chr = array[i];
      HEAP8[buffer + i >> 0] = chr;
      i = i + 1
    }
  }
  Module["writeStringToMemory"] = writeStringToMemory;

  function writeArrayToMemory(array, buffer) {
    for (var i = 0; i < array.length; i++) {
      HEAP8[buffer++ >> 0] = array[i]
    }
  }
  Module["writeArrayToMemory"] = writeArrayToMemory;

  function writeAsciiToMemory(str, buffer, dontAddNull) {
    for (var i = 0; i < str.length; ++i) {
      assert(str.charCodeAt(i) === str.charCodeAt(i) & 255);
      HEAP8[buffer++ >> 0] = str.charCodeAt(i)
    }
    if (!dontAddNull) HEAP8[buffer >> 0] = 0
  }
  Module["writeAsciiToMemory"] = writeAsciiToMemory;

  function unSign(value, bits, ignore) {
    if (value >= 0) {
      return value
    }
    return bits <= 32 ? 2 * Math.abs(1 << bits - 1) + value : Math.pow(2, bits) + value
  }

  function reSign(value, bits, ignore) {
    if (value <= 0) {
      return value
    }
    var half = bits <= 32 ? Math.abs(1 << bits - 1) : Math.pow(2, bits - 1);
    if (value >= half && (bits <= 32 || value > half)) {
      value = -2 * half + value
    }
    return value
  }
  if (!Math["imul"] || Math["imul"](4294967295, 5) !== -5) Math["imul"] = function imul(a, b) {
    var ah = a >>> 16;
    var al = a & 65535;
    var bh = b >>> 16;
    var bl = b & 65535;
    return al * bl + (ah * bl + al * bh << 16) | 0
  };
  Math.imul = Math["imul"];
  if (!Math["clz32"]) Math["clz32"] = (function (x) {
    x = x >>> 0;
    for (var i = 0; i < 32; i++) {
      if (x & 1 << 31 - i) return i
    }
    return 32
  });
  Math.clz32 = Math["clz32"];
  var Math_abs = Math.abs;
  var Math_cos = Math.cos;
  var Math_sin = Math.sin;
  var Math_tan = Math.tan;
  var Math_acos = Math.acos;
  var Math_asin = Math.asin;
  var Math_atan = Math.atan;
  var Math_atan2 = Math.atan2;
  var Math_exp = Math.exp;
  var Math_log = Math.log;
  var Math_sqrt = Math.sqrt;
  var Math_ceil = Math.ceil;
  var Math_floor = Math.floor;
  var Math_pow = Math.pow;
  var Math_imul = Math.imul;
  var Math_fround = Math.fround;
  var Math_min = Math.min;
  var Math_clz32 = Math.clz32;
  var runDependencies = 0;
  var runDependencyWatcher = null;
  var dependenciesFulfilled = null;
  var runDependencyTracking = {};

  function getUniqueRunDependency(id) {
    var orig = id;
    while (1) {
      if (!runDependencyTracking[id]) return id;
      id = orig + Math.random()
    }
    return id
  }

  function addRunDependency(id) {
    runDependencies++;
    if (Module["monitorRunDependencies"]) {
      Module["monitorRunDependencies"](runDependencies)
    }
    if (id) {
      assert(!runDependencyTracking[id]);
      runDependencyTracking[id] = 1;
      if (runDependencyWatcher === null && typeof setInterval !== "undefined") {
        runDependencyWatcher = setInterval((function () {
          if (ABORT) {
            clearInterval(runDependencyWatcher);
            runDependencyWatcher = null;
            return
          }
          var shown = false;
          for (var dep in runDependencyTracking) {
            if (!shown) {
              shown = true;
              Module.printErr("still waiting on run dependencies:")
            }
            Module.printErr("dependency: " + dep)
          }
          if (shown) {
            Module.printErr("(end of list)")
          }
        }), 1e4)
      }
    } else {
      Module.printErr("warning: run dependency added without ID")
    }
  }
  Module["addRunDependency"] = addRunDependency;

  function removeRunDependency(id) {
    runDependencies--;
    if (Module["monitorRunDependencies"]) {
      Module["monitorRunDependencies"](runDependencies)
    }
    if (id) {
      assert(runDependencyTracking[id]);
      delete runDependencyTracking[id]
    } else {
      Module.printErr("warning: run dependency removed without ID")
    }
    if (runDependencies == 0) {
      if (runDependencyWatcher !== null) {
        clearInterval(runDependencyWatcher);
        runDependencyWatcher = null
      }
      if (dependenciesFulfilled) {
        var callback = dependenciesFulfilled;
        dependenciesFulfilled = null;
        callback()
      }
    }
  }
  Module["removeRunDependency"] = removeRunDependency;
  Module["preloadedImages"] = {};
  Module["preloadedAudios"] = {};
  var memoryInitializer = null;
  var ASM_CONSTS = [];
  STATIC_BASE = 8;
  STATICTOP = STATIC_BASE + 6944;
  __ATINIT__.push();
  allocate([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 98, 0, 0, 0, 0, 0, 0, 46, 112, 97, 116, 0, 0, 0, 0, 116, 111, 110, 101, 32, 98, 97, 110, 107, 0, 0, 0, 0, 0, 0, 0, 72, 117, 104, 46, 32, 84, 114, 105, 101, 100, 32, 116, 111, 32, 108, 111, 97, 100, 32, 105, 110, 115, 116, 114, 117, 109, 101, 110, 116, 115, 32, 105, 110, 32, 110, 111, 110, 45, 101, 120, 105, 115, 116, 101, 110, 116, 32, 37, 115, 32, 37, 100, 10, 0, 0, 0, 240, 31, 0, 0, 214, 33, 0, 0, 217, 35, 0, 0, 251, 37, 0, 0, 61, 40, 0, 0, 161, 42, 0, 0, 42, 45, 0, 0, 218, 47, 0, 0, 178, 50, 0, 0, 182, 53, 0, 0, 232, 56, 0, 0, 74, 60, 0, 0, 224, 63, 0, 0, 172, 67, 0, 0, 178, 71, 0, 0, 245, 75, 0, 0, 122, 80, 0, 0, 67, 85, 0, 0, 85, 90, 0, 0, 180, 95, 0, 0, 101, 101, 0, 0, 108, 107, 0, 0, 207, 113, 0, 0, 148, 120, 0, 0, 191, 127, 0, 0, 88, 135, 0, 0, 100, 143, 0, 0, 235, 151, 0, 0, 243, 160, 0, 0, 134, 170, 0, 0, 169, 180, 0, 0, 103, 191, 0, 0, 201, 202, 0, 0, 216, 214, 0, 0, 158, 227, 0, 0, 39, 241, 0, 0, 126, 255, 0, 0, 176, 14, 1, 0, 200, 30, 1, 0, 214, 47, 1, 0, 231, 65, 1, 0, 11, 85, 1, 0, 83, 105, 1, 0, 207, 126, 1, 0, 146, 149, 1, 0, 176, 173, 1, 0, 61, 199, 1, 0, 79, 226, 1, 0, 253, 254, 1, 0, 95, 29, 2, 0, 144, 61, 2, 0, 171, 95, 2, 0, 206, 131, 2, 0, 22, 170, 2, 0, 165, 210, 2, 0, 158, 253, 2, 0, 36, 43, 3, 0, 96, 91, 3, 0, 122, 142, 3, 0, 158, 196, 3, 0, 250, 253, 3, 0, 191, 58, 4, 0, 33, 123, 4, 0, 87, 191, 4, 0, 156, 7, 5, 0, 44, 84, 5, 0, 74, 165, 5, 0, 59, 251, 5, 0, 73, 86, 6, 0, 192, 182, 6, 0, 244, 28, 7, 0, 59, 137, 7, 0, 243, 251, 7, 0, 125, 117, 8, 0, 66, 246, 8, 0, 174, 126, 9, 0, 55, 15, 10, 0, 88, 168, 10, 0, 149, 74, 11, 0, 119, 246, 11, 0, 145, 172, 12, 0, 128, 109, 13, 0, 232, 57, 14, 0, 119, 18, 15, 0, 230, 247, 15, 0, 251, 234, 16, 0, 131, 236, 17, 0, 92, 253, 18, 0, 110, 30, 20, 0, 177, 80, 21, 0, 42, 149, 22, 0, 238, 236, 23, 0, 35, 89, 25, 0, 0, 219, 26, 0, 207, 115, 28, 0, 237, 36, 30, 0, 205, 239, 31, 0, 245, 213, 33, 0, 6, 217, 35, 0, 184, 250, 37, 0, 220, 60, 40, 0, 98, 161, 42, 0, 83, 42, 45, 0, 219, 217, 47, 0, 70, 178, 50, 0, 0, 182, 53, 0, 158, 231, 56, 0, 218, 73, 60, 0, 153, 223, 63, 0, 234, 171, 67, 0, 12, 178, 71, 0, 112, 245, 75, 0, 185, 121, 80, 0, 196, 66, 85, 0, 167, 84, 90, 0, 183, 179, 95, 0, 139, 100, 101, 0, 0, 108, 107, 0, 60, 207, 113, 0, 181, 147, 120, 0, 50, 191, 127, 0, 212, 87, 135, 0, 25, 100, 143, 0, 223, 234, 151, 0, 114, 243, 160, 0, 135, 133, 170, 0, 78, 169, 180, 0, 110, 103, 191, 0, 0, 0, 0, 0, 0, 0, 144, 63, 75, 191, 53, 65, 90, 136, 144, 63, 241, 46, 189, 130, 62, 21, 145, 63, 249, 198, 51, 115, 211, 166, 145, 63, 194, 109, 221, 10, 65, 61, 146, 63, 61, 194, 157, 150, 176, 216, 146, 63, 232, 234, 78, 195, 76, 121, 147, 63, 204, 6, 121, 169, 65, 31, 148, 63, 172, 119, 109, 217, 188, 202, 148, 63, 136, 88, 201, 103, 237, 123, 149, 63, 154, 143, 98, 250, 3, 51, 150, 63, 89, 8, 163, 213, 50, 240, 150, 63, 69, 192, 85, 234, 173, 179, 151, 63, 98, 112, 233, 227, 170, 125, 152, 63, 242, 189, 44, 55, 97, 78, 153, 63, 189, 253, 135, 49, 10, 38, 154, 63, 84, 184, 184, 8, 225, 4, 155, 63, 232, 64, 19, 235, 34, 235, 155, 63, 101, 213, 78, 16, 15, 217, 156, 63, 82, 228, 224, 202, 230, 206, 157, 63, 110, 60, 236, 153, 237, 204, 158, 63, 149, 18, 201, 59, 105, 211, 159, 63, 39, 122, 149, 224, 80, 113, 160, 63, 129, 244, 116, 208, 112, 253, 160, 63, 39, 24, 58, 230, 58, 142, 161, 63, 74, 29, 119, 226, 214, 35, 162, 63, 50, 84, 131, 216, 109, 190, 162, 63, 137, 39, 194, 57, 42, 94, 163, 63, 195, 57, 74, 225, 55, 3, 164, 63, 225, 208, 239, 31, 196, 173, 164, 63, 141, 222, 181, 200, 253, 93, 165, 63, 62, 15, 169, 61, 21, 20, 166, 63, 223, 103, 40, 125, 60, 208, 166, 63, 155, 23, 159, 47, 167, 146, 167, 63, 148, 66, 179, 181, 138, 91, 168, 63, 80, 170, 237, 54, 30, 43, 169, 63, 237, 57, 222, 176, 154, 1, 170, 63, 104, 158, 193, 6, 59, 223, 170, 63, 182, 54, 172, 17, 60, 196, 171, 63, 248, 203, 62, 177, 220, 176, 172, 63, 49, 168, 233, 220, 93, 165, 173, 63, 115, 200, 194, 181, 2, 162, 174, 63, 108, 16, 244, 152, 16, 167, 175, 63, 78, 71, 99, 153, 103, 90, 176, 63, 213, 5, 40, 73, 196, 229, 176, 63, 17, 38, 228, 158, 196, 117, 177, 63, 185, 204, 197, 35, 144, 10, 178, 63, 128, 43, 232, 177, 79, 164, 178, 63, 152, 204, 138, 127, 45, 67, 179, 63, 121, 115, 168, 42, 85, 231, 179, 63, 129, 193, 240, 196, 243, 144, 180, 63, 19, 232, 39, 224, 55, 64, 181, 63, 242, 205, 239, 154, 81, 245, 181, 63, 121, 42, 254, 173, 114, 176, 182, 63, 62, 55, 195, 121, 206, 113, 183, 63, 150, 183, 132, 20, 154, 57, 184, 63, 124, 53, 241, 88, 12, 8, 185, 63, 40, 116, 47, 245, 93, 221, 185, 63, 234, 58, 110, 122, 201, 185, 186, 63, 0, 190, 248, 108, 139, 157, 187, 63, 185, 15, 212, 84, 226, 136, 188, 63, 119, 41, 234, 206, 14, 124, 189, 63, 90, 67, 199, 158, 83, 119, 190, 63, 113, 89, 238, 192, 245, 122, 191, 63, 90, 243, 228, 62, 158, 67, 192, 63, 134, 4, 159, 190, 56, 206, 192, 63, 250, 182, 112, 109, 112, 93, 193, 63, 134, 74, 113, 157, 108, 241, 193, 63, 158, 146, 207, 239, 85, 138, 194, 63, 241, 160, 249, 95, 86, 40, 195, 63, 53, 128, 35, 79, 153, 203, 195, 63, 8, 41, 48, 144, 75, 116, 196, 63, 52, 246, 255, 115, 155, 34, 197, 63, 60, 249, 39, 214, 184, 214, 197, 63, 231, 172, 21, 42, 213, 144, 198, 63, 103, 161, 162, 136, 35, 81, 199, 63, 64, 220, 27, 190, 216, 23, 200, 63, 253, 197, 192, 88, 43, 229, 200, 63, 169, 160, 189, 183, 83, 185, 201, 63, 151, 163, 165, 26, 140, 148, 202, 63, 112, 252, 112, 177, 16, 119, 203, 63, 132, 25, 3, 173, 31, 97, 204, 63, 196, 198, 61, 80, 249, 82, 205, 63, 129, 205, 165, 1, 224, 76, 206, 63, 12, 239, 157, 93, 24, 79, 207, 63, 179, 157, 158, 164, 244, 44, 208, 63, 24, 248, 226, 2, 206, 182, 208, 63, 221, 27, 97, 34, 62, 69, 209, 63, 241, 38, 102, 30, 108, 216, 209, 63, 184, 223, 131, 95, 128, 112, 210, 63, 143, 212, 168, 166, 164, 13, 211, 63, 246, 6, 151, 24, 4, 176, 211, 63, 25, 72, 188, 73, 203, 87, 212, 63, 38, 135, 111, 74, 40, 5, 213, 63, 234, 109, 150, 179, 74, 184, 213, 63, 94, 196, 182, 179, 99, 113, 214, 63, 191, 49, 119, 28, 166, 48, 215, 63, 64, 16, 147, 112, 70, 246, 215, 63, 245, 39, 69, 242, 122, 194, 216, 63, 68, 70, 45, 178, 123, 149, 217, 63, 234, 200, 180, 158, 130, 111, 218, 63, 100, 86, 246, 147, 203, 80, 219, 63, 204, 33, 45, 108, 148, 57, 220, 63, 17, 61, 176, 16, 29, 42, 221, 63, 59, 163, 126, 139, 167, 34, 222, 63, 13, 204, 96, 25, 120, 35, 223, 63, 161, 97, 82, 158, 106, 22, 224, 63, 42, 244, 60, 232, 131, 159, 224, 63, 162, 211, 120, 142, 45, 45, 225, 63, 38, 84, 213, 117, 142, 191, 225, 63, 187, 17, 150, 206, 206, 86, 226, 63, 84, 154, 123, 31, 24, 243, 226, 63, 218, 31, 42, 81, 149, 148, 227, 63, 89, 83, 241, 185, 114, 59, 228, 63, 111, 165, 248, 41, 222, 231, 228, 63, 145, 67, 211, 247, 6, 154, 229, 63, 32, 70, 127, 13, 30, 82, 230, 63, 216, 160, 211, 245, 85, 16, 231, 63, 137, 133, 96, 234, 226, 212, 231, 63, 76, 8, 198, 225, 250, 159, 232, 63, 27, 245, 132, 158, 213, 113, 233, 63, 9, 232, 77, 190, 172, 74, 234, 63, 44, 220, 210, 201, 187, 42, 235, 63, 254, 136, 31, 69, 64, 18, 236, 63, 11, 11, 125, 192, 121, 1, 237, 63, 244, 122, 229, 233, 169, 248, 237, 63, 130, 61, 12, 159, 20, 248, 238, 63, 0, 0, 0, 0, 0, 0, 240, 63, 0, 0, 0, 0, 0, 0, 240, 63, 113, 93, 245, 158, 236, 0, 240, 63, 84, 18, 150, 75, 217, 1, 240, 63, 207, 232, 226, 5, 198, 2, 240, 63, 21, 171, 220, 205, 178, 3, 240, 63, 102, 35, 132, 163, 159, 4, 240, 63, 10, 28, 218, 134, 140, 5, 240, 63, 88, 95, 223, 119, 121, 6, 240, 63, 177, 183, 148, 118, 102, 7, 240, 63, 131, 239, 250, 130, 83, 8, 240, 63, 70, 209, 18, 157, 64, 9, 240, 63, 127, 39, 221, 196, 45, 10, 240, 63, 191, 188, 90, 250, 26, 11, 240, 63, 160, 91, 140, 61, 8, 12, 240, 63, 204, 206, 114, 142, 245, 12, 240, 63, 245, 224, 14, 237, 226, 13, 240, 63, 218, 92, 97, 89, 208, 14, 240, 63, 71, 13, 107, 211, 189, 15, 240, 63, 17, 189, 44, 91, 171, 16, 240, 63, 28, 55, 167, 240, 152, 17, 240, 63, 85, 70, 219, 147, 134, 18, 240, 63, 181, 181, 201, 68, 116, 19, 240, 63, 66, 80, 115, 3, 98, 20, 240, 63, 14, 225, 216, 207, 79, 21, 240, 63, 53, 51, 251, 169, 61, 22, 240, 63, 224, 17, 219, 145, 43, 23, 240, 63, 68, 72, 121, 135, 25, 24, 240, 63, 159, 161, 214, 138, 7, 25, 240, 63, 63, 233, 243, 155, 245, 25, 240, 63, 122, 234, 209, 186, 227, 26, 240, 63, 180, 112, 113, 231, 209, 27, 240, 63, 93, 71, 211, 33, 192, 28, 240, 63, 238, 57, 248, 105, 174, 29, 240, 63, 239, 19, 225, 191, 156, 30, 240, 63, 242, 160, 142, 35, 139, 31, 240, 63, 148, 172, 1, 149, 121, 32, 240, 63, 129, 2, 59, 20, 104, 33, 240, 63, 109, 110, 59, 161, 86, 34, 240, 63, 26, 188, 3, 60, 69, 35, 240, 63, 85, 183, 148, 228, 51, 36, 240, 63, 247, 43, 239, 154, 34, 37, 240, 63, 228, 229, 19, 95, 17, 38, 240, 63, 14, 177, 3, 49, 0, 39, 240, 63, 112, 89, 191, 16, 239, 39, 240, 63, 19, 171, 71, 254, 221, 40, 240, 63, 10, 114, 157, 249, 204, 41, 240, 63, 117, 122, 193, 2, 188, 42, 240, 63, 128, 144, 180, 25, 171, 43, 240, 63, 97, 128, 119, 62, 154, 44, 240, 63, 92, 22, 11, 113, 137, 45, 240, 63, 191, 30, 112, 177, 120, 46, 240, 63, 230, 101, 167, 255, 103, 47, 240, 63, 54, 184, 177, 91, 87, 48, 240, 63, 34, 226, 143, 197, 70, 49, 240, 63, 39, 176, 66, 61, 54, 50, 240, 63, 209, 238, 202, 194, 37, 51, 240, 63, 180, 106, 41, 86, 21, 52, 240, 63, 113, 240, 94, 247, 4, 53, 240, 63, 183, 76, 108, 166, 244, 53, 240, 63, 63, 76, 82, 99, 228, 54, 240, 63, 204, 187, 17, 46, 212, 55, 240, 63, 49, 104, 171, 6, 196, 56, 240, 63, 73, 30, 32, 237, 179, 57, 240, 63, 254, 170, 112, 225, 163, 58, 240, 63, 67, 219, 157, 227, 147, 59, 240, 63, 24, 124, 168, 243, 131, 60, 240, 63, 138, 90, 145, 17, 116, 61, 240, 63, 177, 67, 89, 61, 100, 62, 240, 63, 176, 4, 1, 119, 84, 63, 240, 63, 182, 106, 137, 190, 68, 64, 240, 63, 0, 67, 243, 19, 53, 65, 240, 63, 212, 90, 63, 119, 37, 66, 240, 63, 133, 127, 110, 232, 21, 67, 240, 63, 114, 126, 129, 103, 6, 68, 240, 63, 7, 37, 121, 244, 246, 68, 240, 63, 185, 64, 86, 143, 231, 69, 240, 63, 12, 159, 25, 56, 216, 70, 240, 63, 141, 13, 196, 238, 200, 71, 240, 63, 216, 89, 86, 179, 185, 72, 240, 63, 146, 81, 209, 133, 170, 73, 240, 63, 109, 194, 53, 102, 155, 74, 240, 63, 40, 122, 132, 84, 140, 75, 240, 63, 140, 70, 190, 80, 125, 76, 240, 63, 110, 245, 227, 90, 110, 77, 240, 63, 177, 84, 246, 114, 95, 78, 240, 63, 66, 50, 246, 152, 80, 79, 240, 63, 26, 92, 228, 204, 65, 80, 240, 63, 63, 160, 193, 14, 51, 81, 240, 63, 194, 204, 142, 94, 36, 82, 240, 63, 192, 175, 76, 188, 21, 83, 240, 63, 98, 23, 252, 39, 7, 84, 240, 63, 220, 209, 157, 161, 248, 84, 240, 63, 112, 173, 50, 41, 234, 85, 240, 63, 107, 120, 187, 190, 219, 86, 240, 63, 37, 1, 57, 98, 205, 87, 240, 63, 2, 22, 172, 19, 191, 88, 240, 63, 116, 133, 21, 211, 176, 89, 240, 63, 247, 29, 118, 160, 162, 90, 240, 63, 18, 174, 206, 123, 148, 91, 240, 63, 91, 4, 32, 101, 134, 92, 240, 63, 113, 239, 106, 92, 120, 93, 240, 63, 1, 62, 176, 97, 106, 94, 240, 63, 194, 190, 240, 116, 92, 95, 240, 63, 122, 64, 45, 150, 78, 96, 240, 63, 247, 145, 102, 197, 64, 97, 240, 63, 22, 130, 157, 2, 51, 98, 240, 63, 191, 223, 210, 77, 37, 99, 240, 63, 229, 121, 7, 167, 23, 100, 240, 63, 137, 31, 60, 14, 10, 101, 240, 63, 181, 159, 113, 131, 252, 101, 240, 63, 130, 201, 168, 6, 239, 102, 240, 63, 20, 108, 226, 151, 225, 103, 240, 63, 154, 86, 31, 55, 212, 104, 240, 63, 79, 88, 96, 228, 198, 105, 240, 63, 124, 64, 166, 159, 185, 106, 240, 63, 115, 222, 241, 104, 172, 107, 240, 63, 149, 1, 68, 64, 159, 108, 240, 63, 77, 121, 157, 37, 146, 109, 240, 63, 18, 21, 255, 24, 133, 110, 240, 63, 104, 164, 105, 26, 120, 111, 240, 63, 222, 246, 221, 41, 107, 112, 240, 63, 16, 220, 92, 71, 94, 113, 240, 63, 165, 35, 231, 114, 81, 114, 240, 63, 81, 157, 125, 172, 68, 115, 240, 63, 211, 24, 33, 244, 55, 116, 240, 63, 246, 101, 210, 73, 43, 117, 240, 63, 147, 84, 146, 173, 30, 118, 240, 63, 140, 180, 97, 31, 18, 119, 240, 63, 209, 85, 65, 159, 5, 120, 240, 63, 93, 8, 50, 45, 249, 120, 240, 63, 57, 156, 52, 201, 236, 121, 240, 63, 118, 225, 73, 115, 224, 122, 240, 63, 54, 168, 114, 43, 212, 123, 240, 63, 163, 192, 175, 241, 199, 124, 240, 63, 246, 250, 1, 198, 187, 125, 240, 63, 113, 39, 106, 168, 175, 126, 240, 63, 101, 22, 233, 152, 163, 127, 240, 63, 44, 152, 127, 151, 151, 128, 240, 63, 48, 125, 46, 164, 139, 129, 240, 63, 226, 149, 246, 190, 127, 130, 240, 63, 197, 178, 216, 231, 115, 131, 240, 63, 98, 164, 213, 30, 104, 132, 240, 63, 82, 59, 238, 99, 92, 133, 240, 63, 58, 72, 35, 183, 80, 134, 240, 63, 200, 155, 117, 24, 69, 135, 240, 63, 185, 6, 230, 135, 57, 136, 240, 63, 214, 89, 117, 5, 46, 137, 240, 63, 242, 101, 36, 145, 34, 138, 240, 63, 237, 251, 243, 42, 23, 139, 240, 63, 180, 236, 228, 210, 11, 140, 240, 63, 63, 9, 248, 136, 0, 141, 240, 63, 147, 34, 46, 77, 245, 141, 240, 63, 192, 9, 136, 31, 234, 142, 240, 63, 226, 143, 6, 0, 223, 143, 240, 63, 35, 134, 170, 238, 211, 144, 240, 63, 184, 189, 116, 235, 200, 145, 240, 63, 224, 7, 102, 246, 189, 146, 240, 63, 233, 53, 127, 15, 179, 147, 240, 63, 44, 25, 193, 54, 168, 148, 240, 63, 13, 131, 44, 108, 157, 149, 240, 63, 0, 69, 194, 175, 146, 150, 240, 63, 127, 48, 131, 1, 136, 151, 240, 63, 22, 23, 112, 97, 125, 152, 240, 63, 89, 202, 137, 207, 114, 153, 240, 63, 234, 27, 209, 75, 104, 154, 240, 63, 119, 221, 70, 214, 93, 155, 240, 63, 185, 224, 235, 110, 83, 156, 240, 63, 119, 247, 192, 21, 73, 157, 240, 63, 131, 243, 198, 202, 62, 158, 240, 63, 187, 166, 254, 141, 52, 159, 240, 63, 9, 227, 104, 95, 42, 160, 240, 63, 99, 122, 6, 63, 32, 161, 240, 63, 205, 62, 216, 44, 22, 162, 240, 63, 85, 2, 223, 40, 12, 163, 240, 63, 21, 151, 27, 51, 2, 164, 240, 63, 53, 207, 142, 75, 248, 164, 240, 63, 233, 124, 57, 114, 238, 165, 240, 63, 110, 114, 28, 167, 228, 166, 240, 63, 17, 130, 56, 234, 218, 167, 240, 63, 40, 126, 142, 59, 209, 168, 240, 63, 25, 57, 31, 155, 199, 169, 240, 63, 83, 133, 235, 8, 190, 170, 240, 63, 81, 53, 244, 132, 180, 171, 240, 63, 156, 27, 58, 15, 171, 172, 240, 63, 200, 10, 190, 167, 161, 173, 240, 63, 118, 213, 128, 78, 152, 174, 240, 63, 82, 78, 131, 3, 143, 175, 240, 63, 22, 72, 198, 198, 133, 176, 240, 63, 134, 149, 74, 152, 124, 177, 240, 63, 116, 9, 17, 120, 115, 178, 240, 63, 188, 118, 26, 102, 106, 179, 240, 63, 73, 176, 103, 98, 97, 180, 240, 63, 15, 137, 249, 108, 88, 181, 240, 63, 18, 212, 208, 133, 79, 182, 240, 63, 95, 100, 238, 172, 70, 183, 240, 63, 17, 13, 83, 226, 61, 184, 240, 63, 78, 161, 255, 37, 53, 185, 240, 63, 72, 244, 244, 119, 44, 186, 240, 63, 63, 217, 51, 216, 35, 187, 240, 63, 125, 35, 189, 70, 27, 188, 240, 63, 91, 166, 145, 195, 18, 189, 240, 63, 59, 53, 178, 78, 10, 190, 240, 63, 142, 163, 31, 232, 1, 191, 240, 63, 206, 196, 218, 143, 249, 191, 240, 63, 133, 108, 228, 69, 241, 192, 240, 63, 71, 110, 61, 10, 233, 193, 240, 63, 180, 157, 230, 220, 224, 194, 240, 63, 122, 206, 224, 189, 216, 195, 240, 63, 80, 212, 44, 173, 208, 196, 240, 63, 253, 130, 203, 170, 200, 197, 240, 63, 83, 174, 189, 182, 192, 198, 240, 63, 46, 42, 4, 209, 184, 199, 240, 63, 121, 202, 159, 249, 176, 200, 240, 63, 42, 99, 145, 48, 169, 201, 240, 63, 67, 200, 217, 117, 161, 202, 240, 63, 212, 205, 121, 201, 153, 203, 240, 63, 247, 71, 114, 43, 146, 204, 240, 63, 212, 10, 196, 155, 138, 205, 240, 63, 158, 234, 111, 26, 131, 206, 240, 63, 148, 187, 118, 167, 123, 207, 240, 63, 3, 82, 217, 66, 116, 208, 240, 63, 68, 130, 152, 236, 108, 209, 240, 63, 186, 32, 181, 164, 101, 210, 240, 63, 214, 1, 48, 107, 94, 211, 240, 63, 22, 250, 9, 64, 87, 212, 240, 63, 2, 222, 67, 35, 80, 213, 240, 63, 50, 130, 222, 20, 73, 214, 240, 63, 69, 187, 218, 20, 66, 215, 240, 63, 236, 93, 57, 35, 59, 216, 240, 63, 223, 62, 251, 63, 52, 217, 240, 63, 230, 50, 33, 107, 45, 218, 240, 63, 213, 14, 172, 164, 38, 219, 240, 63, 137, 167, 156, 236, 31, 220, 240, 63, 240, 209, 243, 66, 25, 221, 240, 63, 0, 99, 178, 167, 18, 222, 240, 63, 191, 47, 217, 26, 12, 223, 240, 63, 61, 13, 105, 156, 5, 224, 240, 63, 150, 208, 98, 44, 255, 224, 240, 63, 245, 78, 199, 202, 248, 225, 240, 63, 141, 93, 151, 119, 242, 226, 240, 63, 162, 209, 211, 50, 236, 227, 240, 63, 129, 128, 125, 252, 229, 228, 240, 63, 133, 63, 149, 212, 223, 229, 240, 63, 21, 228, 27, 187, 217, 230, 240, 63, 163, 67, 18, 176, 211, 231, 240, 63, 176, 51, 121, 179, 205, 232, 240, 63, 198, 137, 81, 197, 199, 233, 240, 63, 127, 27, 156, 229, 193, 234, 240, 63, 126, 190, 89, 20, 188, 235, 240, 63, 116, 72, 139, 81, 182, 236, 240, 63, 31, 143, 49, 157, 176, 237, 240, 63, 72, 104, 77, 247, 170, 238, 240, 63, 197, 169, 223, 95, 165, 239, 240, 63, 119, 41, 233, 214, 159, 240, 240, 63, 79, 189, 106, 92, 154, 241, 240, 63, 69, 59, 101, 240, 148, 242, 240, 63, 0, 0, 0, 0, 0, 0, 240, 63, 99, 121, 217, 146, 143, 243, 240, 63, 192, 214, 199, 195, 154, 245, 241, 63, 21, 183, 49, 10, 254, 6, 243, 63, 139, 114, 141, 249, 162, 40, 244, 63, 94, 236, 240, 8, 129, 91, 245, 63, 205, 59, 127, 102, 158, 160, 246, 63, 176, 207, 104, 215, 16, 249, 247, 63, 60, 110, 61, 165, 254, 101, 249, 63, 173, 211, 90, 153, 159, 232, 250, 63, 41, 193, 78, 7, 62, 130, 252, 63, 67, 19, 16, 231, 55, 52, 254, 63, 0, 0, 0, 0, 0, 0, 0, 64, 99, 121, 217, 146, 143, 243, 0, 64, 192, 214, 199, 195, 154, 245, 1, 64, 21, 183, 49, 10, 254, 6, 3, 64, 139, 114, 141, 249, 162, 40, 4, 64, 94, 236, 240, 8, 129, 91, 5, 64, 205, 59, 127, 102, 158, 160, 6, 64, 176, 207, 104, 215, 16, 249, 7, 64, 61, 110, 61, 165, 254, 101, 9, 64, 173, 211, 90, 153, 159, 232, 10, 64, 41, 193, 78, 7, 62, 130, 12, 64, 68, 19, 16, 231, 55, 52, 14, 64, 0, 0, 0, 0, 0, 0, 16, 64, 99, 121, 217, 146, 143, 243, 16, 64, 191, 214, 199, 195, 154, 245, 17, 64, 21, 183, 49, 10, 254, 6, 19, 64, 139, 114, 141, 249, 162, 40, 20, 64, 93, 236, 240, 8, 129, 91, 21, 64, 205, 59, 127, 102, 158, 160, 22, 64, 177, 207, 104, 215, 16, 249, 23, 64, 60, 110, 61, 165, 254, 101, 25, 64, 173, 211, 90, 153, 159, 232, 26, 64, 42, 193, 78, 7, 62, 130, 28, 64, 67, 19, 16, 231, 55, 52, 30, 64, 0, 0, 0, 0, 0, 0, 32, 64, 99, 121, 217, 146, 143, 243, 32, 64, 191, 214, 199, 195, 154, 245, 33, 64, 21, 183, 49, 10, 254, 6, 35, 64, 139, 114, 141, 249, 162, 40, 36, 64, 93, 236, 240, 8, 129, 91, 37, 64, 205, 59, 127, 102, 158, 160, 38, 64, 177, 207, 104, 215, 16, 249, 39, 64, 60, 110, 61, 165, 254, 101, 41, 64, 173, 211, 90, 153, 159, 232, 42, 64, 42, 193, 78, 7, 62, 130, 44, 64, 67, 19, 16, 231, 55, 52, 46, 64, 0, 0, 0, 0, 0, 0, 48, 64, 98, 121, 217, 146, 143, 243, 48, 64, 193, 214, 199, 195, 154, 245, 49, 64, 21, 183, 49, 10, 254, 6, 51, 64, 138, 114, 141, 249, 162, 40, 52, 64, 95, 236, 240, 8, 129, 91, 53, 64, 205, 59, 127, 102, 158, 160, 54, 64, 175, 207, 104, 215, 16, 249, 55, 64, 62, 110, 61, 165, 254, 101, 57, 64, 173, 211, 90, 153, 159, 232, 58, 64, 40, 193, 78, 7, 62, 130, 60, 64, 69, 19, 16, 231, 55, 52, 62, 64, 0, 0, 0, 0, 0, 0, 64, 64, 98, 121, 217, 146, 143, 243, 64, 64, 193, 214, 199, 195, 154, 245, 65, 64, 21, 183, 49, 10, 254, 6, 67, 64, 138, 114, 141, 249, 162, 40, 68, 64, 95, 236, 240, 8, 129, 91, 69, 64, 205, 59, 127, 102, 158, 160, 70, 64, 175, 207, 104, 215, 16, 249, 71, 64, 62, 110, 61, 165, 254, 101, 73, 64, 173, 211, 90, 153, 159, 232, 74, 64, 40, 193, 78, 7, 62, 130, 76, 64, 69, 19, 16, 231, 55, 52, 78, 64, 0, 0, 0, 0, 0, 0, 80, 64, 98, 121, 217, 146, 143, 243, 80, 64, 193, 214, 199, 195, 154, 245, 81, 64, 21, 183, 49, 10, 254, 6, 83, 64, 138, 114, 141, 249, 162, 40, 84, 64, 95, 236, 240, 8, 129, 91, 85, 64, 205, 59, 127, 102, 158, 160, 86, 64, 175, 207, 104, 215, 16, 249, 87, 64, 62, 110, 61, 165, 254, 101, 89, 64, 173, 211, 90, 153, 159, 232, 90, 64, 40, 193, 78, 7, 62, 130, 92, 64, 69, 19, 16, 231, 55, 52, 94, 64, 0, 0, 0, 0, 0, 0, 96, 64, 98, 121, 217, 146, 143, 243, 96, 64, 193, 214, 199, 195, 154, 245, 97, 64, 21, 183, 49, 10, 254, 6, 99, 64, 138, 114, 141, 249, 162, 40, 100, 64, 95, 236, 240, 8, 129, 91, 101, 64, 205, 59, 127, 102, 158, 160, 102, 64, 175, 207, 104, 215, 16, 249, 103, 64, 62, 110, 61, 165, 254, 101, 105, 64, 173, 211, 90, 153, 159, 232, 106, 64, 40, 193, 78, 7, 62, 130, 108, 64, 69, 19, 16, 231, 55, 52, 110, 64, 0, 0, 0, 0, 0, 0, 112, 64, 101, 121, 217, 146, 143, 243, 112, 64, 190, 214, 199, 195, 154, 245, 113, 64, 21, 183, 49, 10, 254, 6, 115, 64, 141, 114, 141, 249, 162, 40, 116, 64, 92, 236, 240, 8, 129, 91, 117, 64, 205, 59, 127, 102, 158, 160, 118, 64, 179, 207, 104, 215, 16, 249, 119, 64, 58, 110, 61, 165, 254, 101, 121, 64, 173, 211, 90, 153, 159, 232, 122, 64, 45, 193, 78, 7, 62, 130, 124, 64, 64, 19, 16, 231, 55, 52, 126, 64, 0, 0, 0, 0, 0, 0, 128, 64, 101, 121, 217, 146, 143, 243, 128, 64, 190, 214, 199, 195, 154, 245, 129, 64, 21, 183, 49, 10, 254, 6, 131, 64, 141, 114, 141, 249, 162, 40, 132, 64, 92, 236, 240, 8, 129, 91, 133, 64, 205, 59, 127, 102, 158, 160, 134, 64, 179, 207, 104, 215, 16, 249, 135, 64, 58, 110, 61, 165, 254, 101, 137, 64, 173, 211, 90, 153, 159, 232, 138, 64, 45, 193, 78, 7, 62, 130, 140, 64, 64, 19, 16, 231, 55, 52, 142, 64, 0, 0, 0, 0, 0, 0, 144, 64, 101, 121, 217, 146, 143, 243, 144, 64, 190, 214, 199, 195, 154, 245, 145, 64, 21, 183, 49, 10, 254, 6, 147, 64, 141, 114, 141, 249, 162, 40, 148, 64, 92, 236, 240, 8, 129, 91, 149, 64, 205, 59, 127, 102, 158, 160, 150, 64, 179, 207, 104, 215, 16, 249, 151, 64, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 105, 109, 105, 100, 105, 116, 121, 46, 99, 102, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 77, 105, 115, 115, 105, 110, 103, 32, 105, 110, 115, 116, 114, 117, 109, 101, 110, 116, 115, 58, 32, 37, 100, 10, 0, 0, 0, 0, 0, 0, 0, 0, 32, 9, 160, 0, 0, 0, 0, 0, 35, 101, 120, 116, 101, 110, 115, 105, 111, 110, 0, 0, 0, 0, 0, 0, 99, 111, 109, 109, 0, 0, 0, 0, 72, 84, 84, 80, 112, 114, 111, 120, 121, 0, 0, 0, 0, 0, 0, 0, 70, 84, 80, 112, 114, 111, 120, 121, 0, 0, 0, 0, 0, 0, 0, 0, 109, 97, 105, 108, 97, 100, 100, 114, 0, 0, 0, 0, 0, 0, 0, 0, 111, 112, 116, 0, 0, 0, 0, 0, 116, 105, 109, 101, 111, 117, 116, 0, 99, 111, 112, 121, 100, 114, 117, 109, 115, 101, 116, 0, 0, 0, 0, 0, 99, 111, 112, 121, 98, 97, 110, 107, 0, 0, 0, 0, 0, 0, 0, 0, 117, 110, 100, 101, 102, 0, 0, 0, 97, 108, 116, 97, 115, 115, 105, 103, 110, 0, 0, 0, 0, 0, 0, 0, 115, 111, 117, 110, 100, 102, 111, 110, 116, 0, 0, 0, 0, 0, 0, 0, 102, 111, 110, 116, 0, 0, 0, 0, 112, 114, 111, 103, 98, 97, 115, 101, 0, 0, 0, 0, 0, 0, 0, 0, 109, 97, 112, 0, 0, 0, 0, 0, 100, 105, 114, 0, 0, 0, 0, 0, 115, 111, 117, 114, 99, 101, 0, 0, 100, 101, 102, 97, 117, 108, 116, 0, 100, 114, 117, 109, 115, 101, 116, 0, 98, 97, 110, 107, 0, 0, 0, 0, 97, 109, 112, 0, 0, 0, 0, 0, 110, 111, 116, 101, 0, 0, 0, 0, 112, 97, 110, 0, 0, 0, 0, 0, 99, 101, 110, 116, 101, 114, 0, 0, 108, 101, 102, 116, 0, 0, 0, 0, 114, 105, 103, 104, 116, 0, 0, 0, 107, 101, 101, 112, 0, 0, 0, 0, 101, 110, 118, 0, 0, 0, 0, 0, 108, 111, 111, 112, 0, 0, 0, 0, 115, 116, 114, 105, 112, 0, 0, 0, 116, 97, 105, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE);
  var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);
  assert(tempDoublePtr % 8 == 0);

  function copyTempFloat(ptr) {
    HEAP8[tempDoublePtr] = HEAP8[ptr];
    HEAP8[tempDoublePtr + 1] = HEAP8[ptr + 1];
    HEAP8[tempDoublePtr + 2] = HEAP8[ptr + 2];
    HEAP8[tempDoublePtr + 3] = HEAP8[ptr + 3]
  }

  function copyTempDouble(ptr) {
    HEAP8[tempDoublePtr] = HEAP8[ptr];
    HEAP8[tempDoublePtr + 1] = HEAP8[ptr + 1];
    HEAP8[tempDoublePtr + 2] = HEAP8[ptr + 2];
    HEAP8[tempDoublePtr + 3] = HEAP8[ptr + 3];
    HEAP8[tempDoublePtr + 4] = HEAP8[ptr + 4];
    HEAP8[tempDoublePtr + 5] = HEAP8[ptr + 5];
    HEAP8[tempDoublePtr + 6] = HEAP8[ptr + 6];
    HEAP8[tempDoublePtr + 7] = HEAP8[ptr + 7]
  }
  Module["_memset"] = _memset;
  Module["_i64Add"] = _i64Add;
  var ERRNO_CODES = {
    EPERM: 1,
    ENOENT: 2,
    ESRCH: 3,
    EINTR: 4,
    EIO: 5,
    ENXIO: 6,
    E2BIG: 7,
    ENOEXEC: 8,
    EBADF: 9,
    ECHILD: 10,
    EAGAIN: 11,
    EWOULDBLOCK: 11,
    ENOMEM: 12,
    EACCES: 13,
    EFAULT: 14,
    ENOTBLK: 15,
    EBUSY: 16,
    EEXIST: 17,
    EXDEV: 18,
    ENODEV: 19,
    ENOTDIR: 20,
    EISDIR: 21,
    EINVAL: 22,
    ENFILE: 23,
    EMFILE: 24,
    ENOTTY: 25,
    ETXTBSY: 26,
    EFBIG: 27,
    ENOSPC: 28,
    ESPIPE: 29,
    EROFS: 30,
    EMLINK: 31,
    EPIPE: 32,
    EDOM: 33,
    ERANGE: 34,
    ENOMSG: 42,
    EIDRM: 43,
    ECHRNG: 44,
    EL2NSYNC: 45,
    EL3HLT: 46,
    EL3RST: 47,
    ELNRNG: 48,
    EUNATCH: 49,
    ENOCSI: 50,
    EL2HLT: 51,
    EDEADLK: 35,
    ENOLCK: 37,
    EBADE: 52,
    EBADR: 53,
    EXFULL: 54,
    ENOANO: 55,
    EBADRQC: 56,
    EBADSLT: 57,
    EDEADLOCK: 35,
    EBFONT: 59,
    ENOSTR: 60,
    ENODATA: 61,
    ETIME: 62,
    ENOSR: 63,
    ENONET: 64,
    ENOPKG: 65,
    EREMOTE: 66,
    ENOLINK: 67,
    EADV: 68,
    ESRMNT: 69,
    ECOMM: 70,
    EPROTO: 71,
    EMULTIHOP: 72,
    EDOTDOT: 73,
    EBADMSG: 74,
    ENOTUNIQ: 76,
    EBADFD: 77,
    EREMCHG: 78,
    ELIBACC: 79,
    ELIBBAD: 80,
    ELIBSCN: 81,
    ELIBMAX: 82,
    ELIBEXEC: 83,
    ENOSYS: 38,
    ENOTEMPTY: 39,
    ENAMETOOLONG: 36,
    ELOOP: 40,
    EOPNOTSUPP: 95,
    EPFNOSUPPORT: 96,
    ECONNRESET: 104,
    ENOBUFS: 105,
    EAFNOSUPPORT: 97,
    EPROTOTYPE: 91,
    ENOTSOCK: 88,
    ENOPROTOOPT: 92,
    ESHUTDOWN: 108,
    ECONNREFUSED: 111,
    EADDRINUSE: 98,
    ECONNABORTED: 103,
    ENETUNREACH: 101,
    ENETDOWN: 100,
    ETIMEDOUT: 110,
    EHOSTDOWN: 112,
    EHOSTUNREACH: 113,
    EINPROGRESS: 115,
    EALREADY: 114,
    EDESTADDRREQ: 89,
    EMSGSIZE: 90,
    EPROTONOSUPPORT: 93,
    ESOCKTNOSUPPORT: 94,
    EADDRNOTAVAIL: 99,
    ENETRESET: 102,
    EISCONN: 106,
    ENOTCONN: 107,
    ETOOMANYREFS: 109,
    EUSERS: 87,
    EDQUOT: 122,
    ESTALE: 116,
    ENOTSUP: 95,
    ENOMEDIUM: 123,
    EILSEQ: 84,
    EOVERFLOW: 75,
    ECANCELED: 125,
    ENOTRECOVERABLE: 131,
    EOWNERDEAD: 130,
    ESTRPIPE: 86
  };
  var ERRNO_MESSAGES = {
    0: "Success",
    1: "Not super-user",
    2: "No such file or directory",
    3: "No such process",
    4: "Interrupted system call",
    5: "I/O error",
    6: "No such device or address",
    7: "Arg list too long",
    8: "Exec format error",
    9: "Bad file number",
    10: "No children",
    11: "No more processes",
    12: "Not enough core",
    13: "Permission denied",
    14: "Bad address",
    15: "Block device required",
    16: "Mount device busy",
    17: "File exists",
    18: "Cross-device link",
    19: "No such device",
    20: "Not a directory",
    21: "Is a directory",
    22: "Invalid argument",
    23: "Too many open files in system",
    24: "Too many open files",
    25: "Not a typewriter",
    26: "Text file busy",
    27: "File too large",
    28: "No space left on device",
    29: "Illegal seek",
    30: "Read only file system",
    31: "Too many links",
    32: "Broken pipe",
    33: "Math arg out of domain of func",
    34: "Math result not representable",
    35: "File locking deadlock error",
    36: "File or path name too long",
    37: "No record locks available",
    38: "Function not implemented",
    39: "Directory not empty",
    40: "Too many symbolic links",
    42: "No message of desired type",
    43: "Identifier removed",
    44: "Channel number out of range",
    45: "Level 2 not synchronized",
    46: "Level 3 halted",
    47: "Level 3 reset",
    48: "Link number out of range",
    49: "Protocol driver not attached",
    50: "No CSI structure available",
    51: "Level 2 halted",
    52: "Invalid exchange",
    53: "Invalid request descriptor",
    54: "Exchange full",
    55: "No anode",
    56: "Invalid request code",
    57: "Invalid slot",
    59: "Bad font file fmt",
    60: "Device not a stream",
    61: "No data (for no delay io)",
    62: "Timer expired",
    63: "Out of streams resources",
    64: "Machine is not on the network",
    65: "Package not installed",
    66: "The object is remote",
    67: "The link has been severed",
    68: "Advertise error",
    69: "Srmount error",
    70: "Communication error on send",
    71: "Protocol error",
    72: "Multihop attempted",
    73: "Cross mount point (not really error)",
    74: "Trying to read unreadable message",
    75: "Value too large for defined data type",
    76: "Given log. name not unique",
    77: "f.d. invalid for this operation",
    78: "Remote address changed",
    79: "Can   access a needed shared lib",
    80: "Accessing a corrupted shared lib",
    81: ".lib section in a.out corrupted",
    82: "Attempting to link in too many libs",
    83: "Attempting to exec a shared library",
    84: "Illegal byte sequence",
    86: "Streams pipe error",
    87: "Too many users",
    88: "Socket operation on non-socket",
    89: "Destination address required",
    90: "Message too long",
    91: "Protocol wrong type for socket",
    92: "Protocol not available",
    93: "Unknown protocol",
    94: "Socket type not supported",
    95: "Not supported",
    96: "Protocol family not supported",
    97: "Address family not supported by protocol family",
    98: "Address already in use",
    99: "Address not available",
    100: "Network interface is not configured",
    101: "Network is unreachable",
    102: "Connection reset by network",
    103: "Connection aborted",
    104: "Connection reset by peer",
    105: "No buffer space available",
    106: "Socket is already connected",
    107: "Socket is not connected",
    108: "Can't send after socket shutdown",
    109: "Too many references",
    110: "Connection timed out",
    111: "Connection refused",
    112: "Host is down",
    113: "Host is unreachable",
    114: "Socket already connected",
    115: "Connection already in progress",
    116: "Stale file handle",
    122: "Quota exceeded",
    123: "No medium (in tape drive)",
    125: "Operation canceled",
    130: "Previous owner died",
    131: "State not recoverable"
  };
  var ___errno_state = 0;

  function ___setErrNo(value) {
    HEAP32[___errno_state >> 2] = value;
    return value
  }
  var PATH = {
    splitPath: (function (filename) {
      var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
      return splitPathRe.exec(filename).slice(1)
    }),
    normalizeArray: (function (parts, allowAboveRoot) {
      var up = 0;
      for (var i = parts.length - 1; i >= 0; i--) {
        var last = parts[i];
        if (last === ".") {
          parts.splice(i, 1)
        } else if (last === "..") {
          parts.splice(i, 1);
          up++
        } else if (up) {
          parts.splice(i, 1);
          up--
        }
      }
      if (allowAboveRoot) {
        for (; up--; up) {
          parts.unshift("..")
        }
      }
      return parts
    }),
    normalize: (function (path) {
      var isAbsolute = path.charAt(0) === "/",
        trailingSlash = path.substr(-1) === "/";
      path = PATH.normalizeArray(path.split("/").filter((function (p) {
        return !!p
      })), !isAbsolute).join("/");
      if (!path && !isAbsolute) {
        path = "."
      }
      if (path && trailingSlash) {
        path += "/"
      }
      return (isAbsolute ? "/" : "") + path
    }),
    dirname: (function (path) {
      var result = PATH.splitPath(path),
        root = result[0],
        dir = result[1];
      if (!root && !dir) {
        return "."
      }
      if (dir) {
        dir = dir.substr(0, dir.length - 1)
      }
      return root + dir
    }),
    basename: (function (path) {
      if (path === "/") return "/";
      var lastSlash = path.lastIndexOf("/");
      if (lastSlash === -1) return path;
      return path.substr(lastSlash + 1)
    }),
    extname: (function (path) {
      return PATH.splitPath(path)[3]
    }),
    join: (function () {
      var paths = Array.prototype.slice.call(arguments, 0);
      return PATH.normalize(paths.join("/"))
    }),
    join2: (function (l, r) {
      return PATH.normalize(l + "/" + r)
    }),
    resolve: (function () {
      var resolvedPath = "",
        resolvedAbsolute = false;
      for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
        var path = i >= 0 ? arguments[i] : FS.cwd();
        if (typeof path !== "string") {
          throw new TypeError("Arguments to path.resolve must be strings")
        } else if (!path) {
          return ""
        }
        resolvedPath = path + "/" + resolvedPath;
        resolvedAbsolute = path.charAt(0) === "/"
      }
      resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter((function (p) {
        return !!p
      })), !resolvedAbsolute).join("/");
      return (resolvedAbsolute ? "/" : "") + resolvedPath || "."
    }),
    relative: (function (from, to) {
      from = PATH.resolve(from).substr(1);
      to = PATH.resolve(to).substr(1);

      function trim(arr) {
        var start = 0;
        for (; start < arr.length; start++) {
          if (arr[start] !== "") break
        }
        var end = arr.length - 1;
        for (; end >= 0; end--) {
          if (arr[end] !== "") break
        }
        if (start > end) return [];
        return arr.slice(start, end - start + 1)
      }
      var fromParts = trim(from.split("/"));
      var toParts = trim(to.split("/"));
      var length = Math.min(fromParts.length, toParts.length);
      var samePartsLength = length;
      for (var i = 0; i < length; i++) {
        if (fromParts[i] !== toParts[i]) {
          samePartsLength = i;
          break
        }
      }
      var outputParts = [];
      for (var i = samePartsLength; i < fromParts.length; i++) {
        outputParts.push("..")
      }
      outputParts = outputParts.concat(toParts.slice(samePartsLength));
      return outputParts.join("/")
    })
  };
  var TTY = {
    ttys: [],
    init: (function () {}),
    shutdown: (function () {}),
    register: (function (dev, ops) {
      TTY.ttys[dev] = {
        input: [],
        output: [],
        ops: ops
      };
      FS.registerDevice(dev, TTY.stream_ops)
    }),
    stream_ops: {
      open: (function (stream) {
        var tty = TTY.ttys[stream.node.rdev];
        if (!tty) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
        }
        stream.tty = tty;
        stream.seekable = false
      }),
      close: (function (stream) {
        stream.tty.ops.flush(stream.tty)
      }),
      flush: (function (stream) {
        stream.tty.ops.flush(stream.tty)
      }),
      read: (function (stream, buffer, offset, length, pos) {
        if (!stream.tty || !stream.tty.ops.get_char) {
          throw new FS.ErrnoError(ERRNO_CODES.ENXIO)
        }
        var bytesRead = 0;
        for (var i = 0; i < length; i++) {
          var result;
          try {
            result = stream.tty.ops.get_char(stream.tty)
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO)
          }
          if (result === undefined && bytesRead === 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)
          }
          if (result === null || result === undefined) break;
          bytesRead++;
          buffer[offset + i] = result
        }
        if (bytesRead) {
          stream.node.timestamp = Date.now()
        }
        return bytesRead
      }),
      write: (function (stream, buffer, offset, length, pos) {
        if (!stream.tty || !stream.tty.ops.put_char) {
          throw new FS.ErrnoError(ERRNO_CODES.ENXIO)
        }
        for (var i = 0; i < length; i++) {
          try {
            stream.tty.ops.put_char(stream.tty, buffer[offset + i])
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO)
          }
        }
        if (length) {
          stream.node.timestamp = Date.now()
        }
        return i
      })
    },
    default_tty_ops: {
      get_char: (function (tty) {
        if (!tty.input.length) {
          var result = null;
          if (ENVIRONMENT_IS_NODE) {
            var BUFSIZE = 256;
            var buf = new Buffer(BUFSIZE);
            var bytesRead = 0;
            var fd = process.stdin.fd;
            var usingDevice = false;
            try {
              fd = fs.openSync("/dev/stdin", "r");
              usingDevice = true
            } catch (e) {}
            bytesRead = fs.readSync(fd, buf, 0, BUFSIZE, null);
            if (usingDevice) {
              fs.closeSync(fd)
            }
            if (bytesRead > 0) {
              result = buf.slice(0, bytesRead).toString("utf-8")
            } else {
              result = null
            }
          } else if (typeof window != "undefined" && typeof window.prompt == "function") {
            result = window.prompt("Input: ");
            if (result !== null) {
              result += "\n"
            }
          } else if (typeof readline == "function") {
            result = readline();
            if (result !== null) {
              result += "\n"
            }
          }
          if (!result) {
            return null
          }
          tty.input = intArrayFromString(result, true)
        }
        return tty.input.shift()
      }),
      put_char: (function (tty, val) {
        if (val === null || val === 10) {
          Module["print"](UTF8ArrayToString(tty.output, 0));
          tty.output = []
        } else {
          if (val != 0) tty.output.push(val)
        }
      }),
      flush: (function (tty) {
        if (tty.output && tty.output.length > 0) {
          Module["print"](UTF8ArrayToString(tty.output, 0));
          tty.output = []
        }
      })
    },
    default_tty1_ops: {
      put_char: (function (tty, val) {
        if (val === null || val === 10) {
          Module["printErr"](UTF8ArrayToString(tty.output, 0));
          tty.output = []
        } else {
          if (val != 0) tty.output.push(val)
        }
      }),
      flush: (function (tty) {
        if (tty.output && tty.output.length > 0) {
          Module["printErr"](UTF8ArrayToString(tty.output, 0));
          tty.output = []
        }
      })
    }
  };
  var MEMFS = {
    ops_table: null,
    mount: (function (mount) {
      return MEMFS.createNode(null, "/", 16384 | 511, 0)
    }),
    createNode: (function (parent, name, mode, dev) {
      if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
        throw new FS.ErrnoError(ERRNO_CODES.EPERM)
      }
      if (!MEMFS.ops_table) {
        MEMFS.ops_table = {
          dir: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr,
              lookup: MEMFS.node_ops.lookup,
              mknod: MEMFS.node_ops.mknod,
              rename: MEMFS.node_ops.rename,
              unlink: MEMFS.node_ops.unlink,
              rmdir: MEMFS.node_ops.rmdir,
              readdir: MEMFS.node_ops.readdir,
              symlink: MEMFS.node_ops.symlink
            },
            stream: {
              llseek: MEMFS.stream_ops.llseek
            }
          },
          file: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr
            },
            stream: {
              llseek: MEMFS.stream_ops.llseek,
              read: MEMFS.stream_ops.read,
              write: MEMFS.stream_ops.write,
              allocate: MEMFS.stream_ops.allocate,
              mmap: MEMFS.stream_ops.mmap,
              msync: MEMFS.stream_ops.msync
            }
          },
          link: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr,
              readlink: MEMFS.node_ops.readlink
            },
            stream: {}
          },
          chrdev: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr
            },
            stream: FS.chrdev_stream_ops
          }
        }
      }
      var node = FS.createNode(parent, name, mode, dev);
      if (FS.isDir(node.mode)) {
        node.node_ops = MEMFS.ops_table.dir.node;
        node.stream_ops = MEMFS.ops_table.dir.stream;
        node.contents = {}
      } else if (FS.isFile(node.mode)) {
        node.node_ops = MEMFS.ops_table.file.node;
        node.stream_ops = MEMFS.ops_table.file.stream;
        node.usedBytes = 0;
        node.contents = null
      } else if (FS.isLink(node.mode)) {
        node.node_ops = MEMFS.ops_table.link.node;
        node.stream_ops = MEMFS.ops_table.link.stream
      } else if (FS.isChrdev(node.mode)) {
        node.node_ops = MEMFS.ops_table.chrdev.node;
        node.stream_ops = MEMFS.ops_table.chrdev.stream
      }
      node.timestamp = Date.now();
      if (parent) {
        parent.contents[name] = node
      }
      return node
    }),
    getFileDataAsRegularArray: (function (node) {
      if (node.contents && node.contents.subarray) {
        var arr = [];
        for (var i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i]);
        return arr
      }
      return node.contents
    }),
    getFileDataAsTypedArray: (function (node) {
      if (!node.contents) return new Uint8Array;
      if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
      return new Uint8Array(node.contents)
    }),
    expandFileStorage: (function (node, newCapacity) {
      if (node.contents && node.contents.subarray && newCapacity > node.contents.length) {
        node.contents = MEMFS.getFileDataAsRegularArray(node);
        node.usedBytes = node.contents.length
      }
      if (!node.contents || node.contents.subarray) {
        var prevCapacity = node.contents ? node.contents.buffer.byteLength : 0;
        if (prevCapacity >= newCapacity) return;
        var CAPACITY_DOUBLING_MAX = 1024 * 1024;
        newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) | 0);
        if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
        var oldContents = node.contents;
        node.contents = new Uint8Array(newCapacity);
        if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
        return
      }
      if (!node.contents && newCapacity > 0) node.contents = [];
      while (node.contents.length < newCapacity) node.contents.push(0)
    }),
    resizeFileStorage: (function (node, newSize) {
      if (node.usedBytes == newSize) return;
      if (newSize == 0) {
        node.contents = null;
        node.usedBytes = 0;
        return
      }
      if (!node.contents || node.contents.subarray) {
        var oldContents = node.contents;
        node.contents = new Uint8Array(new ArrayBuffer(newSize));
        if (oldContents) {
          node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)))
        }
        node.usedBytes = newSize;
        return
      }
      if (!node.contents) node.contents = [];
      if (node.contents.length > newSize) node.contents.length = newSize;
      else
        while (node.contents.length < newSize) node.contents.push(0);
      node.usedBytes = newSize
    }),
    node_ops: {
      getattr: (function (node) {
        var attr = {};
        attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
        attr.ino = node.id;
        attr.mode = node.mode;
        attr.nlink = 1;
        attr.uid = 0;
        attr.gid = 0;
        attr.rdev = node.rdev;
        if (FS.isDir(node.mode)) {
          attr.size = 4096
        } else if (FS.isFile(node.mode)) {
          attr.size = node.usedBytes
        } else if (FS.isLink(node.mode)) {
          attr.size = node.link.length
        } else {
          attr.size = 0
        }
        attr.atime = new Date(node.timestamp);
        attr.mtime = new Date(node.timestamp);
        attr.ctime = new Date(node.timestamp);
        attr.blksize = 4096;
        attr.blocks = Math.ceil(attr.size / attr.blksize);
        return attr
      }),
      setattr: (function (node, attr) {
        if (attr.mode !== undefined) {
          node.mode = attr.mode
        }
        if (attr.timestamp !== undefined) {
          node.timestamp = attr.timestamp
        }
        if (attr.size !== undefined) {
          MEMFS.resizeFileStorage(node, attr.size)
        }
      }),
      lookup: (function (parent, name) {
        throw FS.genericErrors[ERRNO_CODES.ENOENT]
      }),
      mknod: (function (parent, name, mode, dev) {
        return MEMFS.createNode(parent, name, mode, dev)
      }),
      rename: (function (old_node, new_dir, new_name) {
        if (FS.isDir(old_node.mode)) {
          var new_node;
          try {
            new_node = FS.lookupNode(new_dir, new_name)
          } catch (e) {}
          if (new_node) {
            for (var i in new_node.contents) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY)
            }
          }
        }
        delete old_node.parent.contents[old_node.name];
        old_node.name = new_name;
        new_dir.contents[new_name] = old_node;
        old_node.parent = new_dir
      }),
      unlink: (function (parent, name) {
        delete parent.contents[name]
      }),
      rmdir: (function (parent, name) {
        var node = FS.lookupNode(parent, name);
        for (var i in node.contents) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY)
        }
        delete parent.contents[name]
      }),
      readdir: (function (node) {
        var entries = [".", ".."];
        for (var key in node.contents) {
          if (!node.contents.hasOwnProperty(key)) {
            continue
          }
          entries.push(key)
        }
        return entries
      }),
      symlink: (function (parent, newname, oldpath) {
        var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
        node.link = oldpath;
        return node
      }),
      readlink: (function (node) {
        if (!FS.isLink(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        return node.link
      })
    },
    stream_ops: {
      read: (function (stream, buffer, offset, length, position) {
        var contents = stream.node.contents;
        if (position >= stream.node.usedBytes) return 0;
        var size = Math.min(stream.node.usedBytes - position, length);
        assert(size >= 0);
        if (size > 8 && contents.subarray) {
          buffer.set(contents.subarray(position, position + size), offset)
        } else {
          for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i]
        }
        return size
      }),
      write: (function (stream, buffer, offset, length, position, canOwn) {
        if (!length) return 0;
        var node = stream.node;
        node.timestamp = Date.now();
        if (buffer.subarray && (!node.contents || node.contents.subarray)) {
          if (canOwn) {
            assert(position === 0, "canOwn must imply no weird position inside the file");
            node.contents = buffer.subarray(offset, offset + length);
            node.usedBytes = length;
            return length
          } else if (node.usedBytes === 0 && position === 0) {
            node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
            node.usedBytes = length;
            return length
          } else if (position + length <= node.usedBytes) {
            node.contents.set(buffer.subarray(offset, offset + length), position);
            return length
          }
        }
        MEMFS.expandFileStorage(node, position + length);
        if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position);
        else {
          for (var i = 0; i < length; i++) {
            node.contents[position + i] = buffer[offset + i]
          }
        }
        node.usedBytes = Math.max(node.usedBytes, position + length);
        return length
      }),
      llseek: (function (stream, offset, whence) {
        var position = offset;
        if (whence === 1) {
          position += stream.position
        } else if (whence === 2) {
          if (FS.isFile(stream.node.mode)) {
            position += stream.node.usedBytes
          }
        }
        if (position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        return position
      }),
      allocate: (function (stream, offset, length) {
        MEMFS.expandFileStorage(stream.node, offset + length);
        stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length)
      }),
      mmap: (function (stream, buffer, offset, length, position, prot, flags) {
        if (!FS.isFile(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
        }
        var ptr;
        var allocated;
        var contents = stream.node.contents;
        if (!(flags & 2) && (contents.buffer === buffer || contents.buffer === buffer.buffer)) {
          allocated = false;
          ptr = contents.byteOffset
        } else {
          if (position > 0 || position + length < stream.node.usedBytes) {
            if (contents.subarray) {
              contents = contents.subarray(position, position + length)
            } else {
              contents = Array.prototype.slice.call(contents, position, position + length)
            }
          }
          allocated = true;
          ptr = _malloc(length);
          if (!ptr) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOMEM)
          }
          buffer.set(contents, ptr)
        }
        return {
          ptr: ptr,
          allocated: allocated
        }
      }),
      msync: (function (stream, buffer, offset, length, mmapFlags) {
        if (!FS.isFile(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
        }
        if (mmapFlags & 2) {
          return 0
        }
        var bytesWritten = MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
        return 0
      })
    }
  };
  var IDBFS = {
    dbs: {},
    indexedDB: (function () {
      if (typeof indexedDB !== "undefined") return indexedDB;
      var ret = null;
      if (typeof window === "object") ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      assert(ret, "IDBFS used, but indexedDB not supported");
      return ret
    }),
    DB_VERSION: 21,
    DB_STORE_NAME: "FILE_DATA",
    mount: (function (mount) {
      return MEMFS.mount.apply(null, arguments)
    }),
    syncfs: (function (mount, populate, callback) {
      IDBFS.getLocalSet(mount, (function (err, local) {
        if (err) return callback(err);
        IDBFS.getRemoteSet(mount, (function (err, remote) {
          if (err) return callback(err);
          var src = populate ? remote : local;
          var dst = populate ? local : remote;
          IDBFS.reconcile(src, dst, callback)
        }))
      }))
    }),
    getDB: (function (name, callback) {
      var db = IDBFS.dbs[name];
      if (db) {
        return callback(null, db)
      }
      var req;
      try {
        req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION)
      } catch (e) {
        return callback(e)
      }
      req.onupgradeneeded = (function (e) {
        var db = e.target.result;
        var transaction = e.target.transaction;
        var fileStore;
        if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
          fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME)
        } else {
          fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME)
        }
        if (!fileStore.indexNames.contains("timestamp")) {
          fileStore.createIndex("timestamp", "timestamp", {
            unique: false
          })
        }
      });
      req.onsuccess = (function () {
        db = req.result;
        IDBFS.dbs[name] = db;
        callback(null, db)
      });
      req.onerror = (function (e) {
        callback(this.error);
        e.preventDefault()
      })
    }),
    getLocalSet: (function (mount, callback) {
      var entries = {};

      function isRealDir(p) {
        return p !== "." && p !== ".."
      }

      function toAbsolute(root) {
        return (function (p) {
          return PATH.join2(root, p)
        })
      }
      var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
      while (check.length) {
        var path = check.pop();
        var stat;
        try {
          stat = FS.stat(path)
        } catch (e) {
          return callback(e)
        }
        if (FS.isDir(stat.mode)) {
          check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)))
        }
        entries[path] = {
          timestamp: stat.mtime
        }
      }
      return callback(null, {
        type: "local",
        entries: entries
      })
    }),
    getRemoteSet: (function (mount, callback) {
      var entries = {};
      IDBFS.getDB(mount.mountpoint, (function (err, db) {
        if (err) return callback(err);
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], "readonly");
        transaction.onerror = (function (e) {
          callback(this.error);
          e.preventDefault()
        });
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
        var index = store.index("timestamp");
        index.openKeyCursor().onsuccess = (function (event) {
          var cursor = event.target.result;
          if (!cursor) {
            return callback(null, {
              type: "remote",
              db: db,
              entries: entries
            })
          }
          entries[cursor.primaryKey] = {
            timestamp: cursor.key
          };
          cursor.continue()
        })
      }))
    }),
    loadLocalEntry: (function (path, callback) {
      var stat, node;
      try {
        var lookup = FS.lookupPath(path);
        node = lookup.node;
        stat = FS.stat(path)
      } catch (e) {
        return callback(e)
      }
      if (FS.isDir(stat.mode)) {
        return callback(null, {
          timestamp: stat.mtime,
          mode: stat.mode
        })
      } else if (FS.isFile(stat.mode)) {
        node.contents = MEMFS.getFileDataAsTypedArray(node);
        return callback(null, {
          timestamp: stat.mtime,
          mode: stat.mode,
          contents: node.contents
        })
      } else {
        return callback(new Error("node type not supported"))
      }
    }),
    storeLocalEntry: (function (path, entry, callback) {
      try {
        if (FS.isDir(entry.mode)) {
          FS.mkdir(path, entry.mode)
        } else if (FS.isFile(entry.mode)) {
          FS.writeFile(path, entry.contents, {
            encoding: "binary",
            canOwn: true
          })
        } else {
          return callback(new Error("node type not supported"))
        }
        FS.chmod(path, entry.mode);
        FS.utime(path, entry.timestamp, entry.timestamp)
      } catch (e) {
        return callback(e)
      }
      callback(null)
    }),
    removeLocalEntry: (function (path, callback) {
      try {
        var lookup = FS.lookupPath(path);
        var stat = FS.stat(path);
        if (FS.isDir(stat.mode)) {
          FS.rmdir(path)
        } else if (FS.isFile(stat.mode)) {
          FS.unlink(path)
        }
      } catch (e) {
        return callback(e)
      }
      callback(null)
    }),
    loadRemoteEntry: (function (store, path, callback) {
      var req = store.get(path);
      req.onsuccess = (function (event) {
        callback(null, event.target.result)
      });
      req.onerror = (function (e) {
        callback(this.error);
        e.preventDefault()
      })
    }),
    storeRemoteEntry: (function (store, path, entry, callback) {
      var req = store.put(entry, path);
      req.onsuccess = (function () {
        callback(null)
      });
      req.onerror = (function (e) {
        callback(this.error);
        e.preventDefault()
      })
    }),
    removeRemoteEntry: (function (store, path, callback) {
      var req = store.delete(path);
      req.onsuccess = (function () {
        callback(null)
      });
      req.onerror = (function (e) {
        callback(this.error);
        e.preventDefault()
      })
    }),
    reconcile: (function (src, dst, callback) {
      var total = 0;
      var create = [];
      Object.keys(src.entries).forEach((function (key) {
        var e = src.entries[key];
        var e2 = dst.entries[key];
        if (!e2 || e.timestamp > e2.timestamp) {
          create.push(key);
          total++
        }
      }));
      var remove = [];
      Object.keys(dst.entries).forEach((function (key) {
        var e = dst.entries[key];
        var e2 = src.entries[key];
        if (!e2) {
          remove.push(key);
          total++
        }
      }));
      if (!total) {
        return callback(null)
      }
      var errored = false;
      var completed = 0;
      var db = src.type === "remote" ? src.db : dst.db;
      var transaction = db.transaction([IDBFS.DB_STORE_NAME], "readwrite");
      var store = transaction.objectStore(IDBFS.DB_STORE_NAME);

      function done(err) {
        if (err) {
          if (!done.errored) {
            done.errored = true;
            return callback(err)
          }
          return
        }
        if (++completed >= total) {
          return callback(null)
        }
      }
      transaction.onerror = (function (e) {
        done(this.error);
        e.preventDefault()
      });
      create.sort().forEach((function (path) {
        if (dst.type === "local") {
          IDBFS.loadRemoteEntry(store, path, (function (err, entry) {
            if (err) return done(err);
            IDBFS.storeLocalEntry(path, entry, done)
          }))
        } else {
          IDBFS.loadLocalEntry(path, (function (err, entry) {
            if (err) return done(err);
            IDBFS.storeRemoteEntry(store, path, entry, done)
          }))
        }
      }));
      remove.sort().reverse().forEach((function (path) {
        if (dst.type === "local") {
          IDBFS.removeLocalEntry(path, done)
        } else {
          IDBFS.removeRemoteEntry(store, path, done)
        }
      }))
    })
  };
  var NODEFS = {
    isWindows: false,
    staticInit: (function () {
      NODEFS.isWindows = !!process.platform.match(/^win/)
    }),
    mount: (function (mount) {
      assert(ENVIRONMENT_IS_NODE);
      return NODEFS.createNode(null, "/", NODEFS.getMode(mount.opts.root), 0)
    }),
    createNode: (function (parent, name, mode, dev) {
      if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
      }
      var node = FS.createNode(parent, name, mode);
      node.node_ops = NODEFS.node_ops;
      node.stream_ops = NODEFS.stream_ops;
      return node
    }),
    getMode: (function (path) {
      var stat;
      try {
        stat = fs.lstatSync(path);
        if (NODEFS.isWindows) {
          stat.mode = stat.mode | (stat.mode & 146) >> 1
        }
      } catch (e) {
        if (!e.code) throw e;
        throw new FS.ErrnoError(ERRNO_CODES[e.code])
      }
      return stat.mode
    }),
    realPath: (function (node) {
      var parts = [];
      while (node.parent !== node) {
        parts.push(node.name);
        node = node.parent
      }
      parts.push(node.mount.opts.root);
      parts.reverse();
      return PATH.join.apply(null, parts)
    }),
    flagsToPermissionStringMap: {
      0: "r",
      1: "r+",
      2: "r+",
      64: "r",
      65: "r+",
      66: "r+",
      129: "rx+",
      193: "rx+",
      514: "w+",
      577: "w",
      578: "w+",
      705: "wx",
      706: "wx+",
      1024: "a",
      1025: "a",
      1026: "a+",
      1089: "a",
      1090: "a+",
      1153: "ax",
      1154: "ax+",
      1217: "ax",
      1218: "ax+",
      4096: "rs",
      4098: "rs+"
    },
    flagsToPermissionString: (function (flags) {
      if (flags in NODEFS.flagsToPermissionStringMap) {
        return NODEFS.flagsToPermissionStringMap[flags]
      } else {
        return flags
      }
    }),
    node_ops: {
      getattr: (function (node) {
        var path = NODEFS.realPath(node);
        var stat;
        try {
          stat = fs.lstatSync(path)
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code])
        }
        if (NODEFS.isWindows && !stat.blksize) {
          stat.blksize = 4096
        }
        if (NODEFS.isWindows && !stat.blocks) {
          stat.blocks = (stat.size + stat.blksize - 1) / stat.blksize | 0
        }
        return {
          dev: stat.dev,
          ino: stat.ino,
          mode: stat.mode,
          nlink: stat.nlink,
          uid: stat.uid,
          gid: stat.gid,
          rdev: stat.rdev,
          size: stat.size,
          atime: stat.atime,
          mtime: stat.mtime,
          ctime: stat.ctime,
          blksize: stat.blksize,
          blocks: stat.blocks
        }
      }),
      setattr: (function (node, attr) {
        var path = NODEFS.realPath(node);
        try {
          if (attr.mode !== undefined) {
            fs.chmodSync(path, attr.mode);
            node.mode = attr.mode
          }
          if (attr.timestamp !== undefined) {
            var date = new Date(attr.timestamp);
            fs.utimesSync(path, date, date)
          }
          if (attr.size !== undefined) {
            fs.truncateSync(path, attr.size)
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code])
        }
      }),
      lookup: (function (parent, name) {
        var path = PATH.join2(NODEFS.realPath(parent), name);
        var mode = NODEFS.getMode(path);
        return NODEFS.createNode(parent, name, mode)
      }),
      mknod: (function (parent, name, mode, dev) {
        var node = NODEFS.createNode(parent, name, mode, dev);
        var path = NODEFS.realPath(node);
        try {
          if (FS.isDir(node.mode)) {
            fs.mkdirSync(path, node.mode)
          } else {
            fs.writeFileSync(path, "", {
              mode: node.mode
            })
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code])
        }
        return node
      }),
      rename: (function (oldNode, newDir, newName) {
        var oldPath = NODEFS.realPath(oldNode);
        var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
        try {
          fs.renameSync(oldPath, newPath)
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code])
        }
      }),
      unlink: (function (parent, name) {
        var path = PATH.join2(NODEFS.realPath(parent), name);
        try {
          fs.unlinkSync(path)
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code])
        }
      }),
      rmdir: (function (parent, name) {
        var path = PATH.join2(NODEFS.realPath(parent), name);
        try {
          fs.rmdirSync(path)
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code])
        }
      }),
      readdir: (function (node) {
        var path = NODEFS.realPath(node);
        try {
          return fs.readdirSync(path)
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code])
        }
      }),
      symlink: (function (parent, newName, oldPath) {
        var newPath = PATH.join2(NODEFS.realPath(parent), newName);
        try {
          fs.symlinkSync(oldPath, newPath)
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code])
        }
      }),
      readlink: (function (node) {
        var path = NODEFS.realPath(node);
        try {
          path = fs.readlinkSync(path);
          path = NODEJS_PATH.relative(NODEJS_PATH.resolve(node.mount.opts.root), path);
          return path
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code])
        }
      })
    },
    stream_ops: {
      open: (function (stream) {
        var path = NODEFS.realPath(stream.node);
        try {
          if (FS.isFile(stream.node.mode)) {
            stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags))
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code])
        }
      }),
      close: (function (stream) {
        try {
          if (FS.isFile(stream.node.mode) && stream.nfd) {
            fs.closeSync(stream.nfd)
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code])
        }
      }),
      read: (function (stream, buffer, offset, length, position) {
        if (length === 0) return 0;
        var nbuffer = new Buffer(length);
        var res;
        try {
          res = fs.readSync(stream.nfd, nbuffer, 0, length, position)
        } catch (e) {
          throw new FS.ErrnoError(ERRNO_CODES[e.code])
        }
        if (res > 0) {
          for (var i = 0; i < res; i++) {
            buffer[offset + i] = nbuffer[i]
          }
        }
        return res
      }),
      write: (function (stream, buffer, offset, length, position) {
        var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
        var res;
        try {
          res = fs.writeSync(stream.nfd, nbuffer, 0, length, position)
        } catch (e) {
          throw new FS.ErrnoError(ERRNO_CODES[e.code])
        }
        return res
      }),
      llseek: (function (stream, offset, whence) {
        var position = offset;
        if (whence === 1) {
          position += stream.position
        } else if (whence === 2) {
          if (FS.isFile(stream.node.mode)) {
            try {
              var stat = fs.fstatSync(stream.nfd);
              position += stat.size
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
          }
        }
        if (position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        return position
      })
    }
  };
  var _stdin = allocate(1, "i32*", ALLOC_STATIC);
  var _stdout = allocate(1, "i32*", ALLOC_STATIC);
  var _stderr = allocate(1, "i32*", ALLOC_STATIC);

  function _fflush(stream) {}
  var FS = {
    root: null,
    mounts: [],
    devices: [null],
    streams: [],
    nextInode: 1,
    nameTable: null,
    currentPath: "/",
    initialized: false,
    ignorePermissions: true,
    trackingDelegate: {},
    tracking: {
      openFlags: {
        READ: 1,
        WRITE: 2
      }
    },
    ErrnoError: null,
    genericErrors: {},
    handleFSError: (function (e) {
      if (!(e instanceof FS.ErrnoError)) throw e + " : " + stackTrace();
      return ___setErrNo(e.errno)
    }),
    lookupPath: (function (path, opts) {
      path = PATH.resolve(FS.cwd(), path);
      opts = opts || {};
      if (!path) return {
        path: "",
        node: null
      };
      var defaults = {
        follow_mount: true,
        recurse_count: 0
      };
      for (var key in defaults) {
        if (opts[key] === undefined) {
          opts[key] = defaults[key]
        }
      }
      if (opts.recurse_count > 8) {
        throw new FS.ErrnoError(ERRNO_CODES.ELOOP)
      }
      var parts = PATH.normalizeArray(path.split("/").filter((function (p) {
        return !!p
      })), false);
      var current = FS.root;
      var current_path = "/";
      for (var i = 0; i < parts.length; i++) {
        var islast = i === parts.length - 1;
        if (islast && opts.parent) {
          break
        }
        current = FS.lookupNode(current, parts[i]);
        current_path = PATH.join2(current_path, parts[i]);
        if (FS.isMountpoint(current)) {
          if (!islast || islast && opts.follow_mount) {
            current = current.mounted.root
          }
        }
        if (!islast || opts.follow) {
          var count = 0;
          while (FS.isLink(current.mode)) {
            var link = FS.readlink(current_path);
            current_path = PATH.resolve(PATH.dirname(current_path), link);
            var lookup = FS.lookupPath(current_path, {
              recurse_count: opts.recurse_count
            });
            current = lookup.node;
            if (count++ > 40) {
              throw new FS.ErrnoError(ERRNO_CODES.ELOOP)
            }
          }
        }
      }
      return {
        path: current_path,
        node: current
      }
    }),
    getPath: (function (node) {
      var path;
      while (true) {
        if (FS.isRoot(node)) {
          var mount = node.mount.mountpoint;
          if (!path) return mount;
          return mount[mount.length - 1] !== "/" ? mount + "/" + path : mount + path
        }
        path = path ? node.name + "/" + path : node.name;
        node = node.parent
      }
    }),
    hashName: (function (parentid, name) {
      var hash = 0;
      for (var i = 0; i < name.length; i++) {
        hash = (hash << 5) - hash + name.charCodeAt(i) | 0
      }
      return (parentid + hash >>> 0) % FS.nameTable.length
    }),
    hashAddNode: (function (node) {
      var hash = FS.hashName(node.parent.id, node.name);
      node.name_next = FS.nameTable[hash];
      FS.nameTable[hash] = node
    }),
    hashRemoveNode: (function (node) {
      var hash = FS.hashName(node.parent.id, node.name);
      if (FS.nameTable[hash] === node) {
        FS.nameTable[hash] = node.name_next
      } else {
        var current = FS.nameTable[hash];
        while (current) {
          if (current.name_next === node) {
            current.name_next = node.name_next;
            break
          }
          current = current.name_next
        }
      }
    }),
    lookupNode: (function (parent, name) {
      var err = FS.mayLookup(parent);
      if (err) {
        throw new FS.ErrnoError(err, parent)
      }
      var hash = FS.hashName(parent.id, name);
      for (var node = FS.nameTable[hash]; node; node = node.name_next) {
        var nodeName = node.name;
        if (node.parent.id === parent.id && nodeName === name) {
          return node
        }
      }
      return FS.lookup(parent, name)
    }),
    createNode: (function (parent, name, mode, rdev) {
      if (!FS.FSNode) {
        FS.FSNode = (function (parent, name, mode, rdev) {
          if (!parent) {
            parent = this
          }
          this.parent = parent;
          this.mount = parent.mount;
          this.mounted = null;
          this.id = FS.nextInode++;
          this.name = name;
          this.mode = mode;
          this.node_ops = {};
          this.stream_ops = {};
          this.rdev = rdev
        });
        FS.FSNode.prototype = {};
        var readMode = 292 | 73;
        var writeMode = 146;
        Object.defineProperties(FS.FSNode.prototype, {
          read: {
            get: (function () {
              return (this.mode & readMode) === readMode
            }),
            set: (function (val) {
              val ? this.mode |= readMode : this.mode &= ~readMode
            })
          },
          write: {
            get: (function () {
              return (this.mode & writeMode) === writeMode
            }),
            set: (function (val) {
              val ? this.mode |= writeMode : this.mode &= ~writeMode
            })
          },
          isFolder: {
            get: (function () {
              return FS.isDir(this.mode)
            })
          },
          isDevice: {
            get: (function () {
              return FS.isChrdev(this.mode)
            })
          }
        })
      }
      var node = new FS.FSNode(parent, name, mode, rdev);
      FS.hashAddNode(node);
      return node
    }),
    destroyNode: (function (node) {
      FS.hashRemoveNode(node)
    }),
    isRoot: (function (node) {
      return node === node.parent
    }),
    isMountpoint: (function (node) {
      return !!node.mounted
    }),
    isFile: (function (mode) {
      return (mode & 61440) === 32768
    }),
    isDir: (function (mode) {
      return (mode & 61440) === 16384
    }),
    isLink: (function (mode) {
      return (mode & 61440) === 40960
    }),
    isChrdev: (function (mode) {
      return (mode & 61440) === 8192
    }),
    isBlkdev: (function (mode) {
      return (mode & 61440) === 24576
    }),
    isFIFO: (function (mode) {
      return (mode & 61440) === 4096
    }),
    isSocket: (function (mode) {
      return (mode & 49152) === 49152
    }),
    flagModes: {
      "r": 0,
      "rs": 1052672,
      "r+": 2,
      "w": 577,
      "wx": 705,
      "xw": 705,
      "w+": 578,
      "wx+": 706,
      "xw+": 706,
      "a": 1089,
      "ax": 1217,
      "xa": 1217,
      "a+": 1090,
      "ax+": 1218,
      "xa+": 1218
    },
    modeStringToFlags: (function (str) {
      var flags = FS.flagModes[str];
      if (typeof flags === "undefined") {
        throw new Error("Unknown file open mode: " + str)
      }
      return flags
    }),
    flagsToPermissionString: (function (flag) {
      var accmode = flag & 2097155;
      var perms = ["r", "w", "rw"][accmode];
      if (flag & 512) {
        perms += "w"
      }
      return perms
    }),
    nodePermissions: (function (node, perms) {
      if (FS.ignorePermissions) {
        return 0
      }
      if (perms.indexOf("r") !== -1 && !(node.mode & 292)) {
        return ERRNO_CODES.EACCES
      } else if (perms.indexOf("w") !== -1 && !(node.mode & 146)) {
        return ERRNO_CODES.EACCES
      } else if (perms.indexOf("x") !== -1 && !(node.mode & 73)) {
        return ERRNO_CODES.EACCES
      }
      return 0
    }),
    mayLookup: (function (dir) {
      var err = FS.nodePermissions(dir, "x");
      if (err) return err;
      if (!dir.node_ops.lookup) return ERRNO_CODES.EACCES;
      return 0
    }),
    mayCreate: (function (dir, name) {
      try {
        var node = FS.lookupNode(dir, name);
        return ERRNO_CODES.EEXIST
      } catch (e) {}
      return FS.nodePermissions(dir, "wx")
    }),
    mayDelete: (function (dir, name, isdir) {
      var node;
      try {
        node = FS.lookupNode(dir, name)
      } catch (e) {
        return e.errno
      }
      var err = FS.nodePermissions(dir, "wx");
      if (err) {
        return err
      }
      if (isdir) {
        if (!FS.isDir(node.mode)) {
          return ERRNO_CODES.ENOTDIR
        }
        if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
          return ERRNO_CODES.EBUSY
        }
      } else {
        if (FS.isDir(node.mode)) {
          return ERRNO_CODES.EISDIR
        }
      }
      return 0
    }),
    mayOpen: (function (node, flags) {
      if (!node) {
        return ERRNO_CODES.ENOENT
      }
      if (FS.isLink(node.mode)) {
        return ERRNO_CODES.ELOOP
      } else if (FS.isDir(node.mode)) {
        if ((flags & 2097155) !== 0 || flags & 512) {
          return ERRNO_CODES.EISDIR
        }
      }
      return FS.nodePermissions(node, FS.flagsToPermissionString(flags))
    }),
    MAX_OPEN_FDS: 4096,
    nextfd: (function (fd_start, fd_end) {
      fd_start = fd_start || 0;
      fd_end = fd_end || FS.MAX_OPEN_FDS;
      for (var fd = fd_start; fd <= fd_end; fd++) {
        if (!FS.streams[fd]) {
          return fd
        }
      }
      throw new FS.ErrnoError(ERRNO_CODES.EMFILE)
    }),
    getStream: (function (fd) {
      return FS.streams[fd]
    }),
    createStream: (function (stream, fd_start, fd_end) {
      if (!FS.FSStream) {
        FS.FSStream = (function () {});
        FS.FSStream.prototype = {};
        Object.defineProperties(FS.FSStream.prototype, {
          object: {
            get: (function () {
              return this.node
            }),
            set: (function (val) {
              this.node = val
            })
          },
          isRead: {
            get: (function () {
              return (this.flags & 2097155) !== 1
            })
          },
          isWrite: {
            get: (function () {
              return (this.flags & 2097155) !== 0
            })
          },
          isAppend: {
            get: (function () {
              return this.flags & 1024
            })
          }
        })
      }
      var newStream = new FS.FSStream;
      for (var p in stream) {
        newStream[p] = stream[p]
      }
      stream = newStream;
      var fd = FS.nextfd(fd_start, fd_end);
      stream.fd = fd;
      FS.streams[fd] = stream;
      return stream
    }),
    closeStream: (function (fd) {
      FS.streams[fd] = null
    }),
    getStreamFromPtr: (function (ptr) {
      return FS.streams[ptr - 1]
    }),
    getPtrForStream: (function (stream) {
      return stream ? stream.fd + 1 : 0
    }),
    chrdev_stream_ops: {
      open: (function (stream) {
        var device = FS.getDevice(stream.node.rdev);
        stream.stream_ops = device.stream_ops;
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream)
        }
      }),
      llseek: (function () {
        throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)
      })
    },
    major: (function (dev) {
      return dev >> 8
    }),
    minor: (function (dev) {
      return dev & 255
    }),
    makedev: (function (ma, mi) {
      return ma << 8 | mi
    }),
    registerDevice: (function (dev, ops) {
      FS.devices[dev] = {
        stream_ops: ops
      }
    }),
    getDevice: (function (dev) {
      return FS.devices[dev]
    }),
    getMounts: (function (mount) {
      var mounts = [];
      var check = [mount];
      while (check.length) {
        var m = check.pop();
        mounts.push(m);
        check.push.apply(check, m.mounts)
      }
      return mounts
    }),
    syncfs: (function (populate, callback) {
      if (typeof populate === "function") {
        callback = populate;
        populate = false
      }
      var mounts = FS.getMounts(FS.root.mount);
      var completed = 0;

      function done(err) {
        if (err) {
          if (!done.errored) {
            done.errored = true;
            return callback(err)
          }
          return
        }
        if (++completed >= mounts.length) {
          callback(null)
        }
      }
      mounts.forEach((function (mount) {
        if (!mount.type.syncfs) {
          return done(null)
        }
        mount.type.syncfs(mount, populate, done)
      }))
    }),
    mount: (function (type, opts, mountpoint) {
      var root = mountpoint === "/";
      var pseudo = !mountpoint;
      var node;
      if (root && FS.root) {
        throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
      } else if (!root && !pseudo) {
        var lookup = FS.lookupPath(mountpoint, {
          follow_mount: false
        });
        mountpoint = lookup.path;
        node = lookup.node;
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
        }
        if (!FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR)
        }
      }
      var mount = {
        type: type,
        opts: opts,
        mountpoint: mountpoint,
        mounts: []
      };
      var mountRoot = type.mount(mount);
      mountRoot.mount = mount;
      mount.root = mountRoot;
      if (root) {
        FS.root = mountRoot
      } else if (node) {
        node.mounted = mount;
        if (node.mount) {
          node.mount.mounts.push(mount)
        }
      }
      return mountRoot
    }),
    unmount: (function (mountpoint) {
      var lookup = FS.lookupPath(mountpoint, {
        follow_mount: false
      });
      if (!FS.isMountpoint(lookup.node)) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
      }
      var node = lookup.node;
      var mount = node.mounted;
      var mounts = FS.getMounts(mount);
      Object.keys(FS.nameTable).forEach((function (hash) {
        var current = FS.nameTable[hash];
        while (current) {
          var next = current.name_next;
          if (mounts.indexOf(current.mount) !== -1) {
            FS.destroyNode(current)
          }
          current = next
        }
      }));
      node.mounted = null;
      var idx = node.mount.mounts.indexOf(mount);
      assert(idx !== -1);
      node.mount.mounts.splice(idx, 1)
    }),
    lookup: (function (parent, name) {
      return parent.node_ops.lookup(parent, name)
    }),
    mknod: (function (path, mode, dev) {
      var lookup = FS.lookupPath(path, {
        parent: true
      });
      var parent = lookup.node;
      var name = PATH.basename(path);
      if (!name || name === "." || name === "..") {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
      }
      var err = FS.mayCreate(parent, name);
      if (err) {
        throw new FS.ErrnoError(err)
      }
      if (!parent.node_ops.mknod) {
        throw new FS.ErrnoError(ERRNO_CODES.EPERM)
      }
      return parent.node_ops.mknod(parent, name, mode, dev)
    }),
    create: (function (path, mode) {
      mode = mode !== undefined ? mode : 438;
      mode &= 4095;
      mode |= 32768;
      return FS.mknod(path, mode, 0)
    }),
    mkdir: (function (path, mode) {
      mode = mode !== undefined ? mode : 511;
      mode &= 511 | 512;
      mode |= 16384;
      return FS.mknod(path, mode, 0)
    }),
    mkdev: (function (path, mode, dev) {
      if (typeof dev === "undefined") {
        dev = mode;
        mode = 438
      }
      mode |= 8192;
      return FS.mknod(path, mode, dev)
    }),
    symlink: (function (oldpath, newpath) {
      if (!PATH.resolve(oldpath)) {
        throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
      }
      var lookup = FS.lookupPath(newpath, {
        parent: true
      });
      var parent = lookup.node;
      if (!parent) {
        throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
      }
      var newname = PATH.basename(newpath);
      var err = FS.mayCreate(parent, newname);
      if (err) {
        throw new FS.ErrnoError(err)
      }
      if (!parent.node_ops.symlink) {
        throw new FS.ErrnoError(ERRNO_CODES.EPERM)
      }
      return parent.node_ops.symlink(parent, newname, oldpath)
    }),
    rename: (function (old_path, new_path) {
      var old_dirname = PATH.dirname(old_path);
      var new_dirname = PATH.dirname(new_path);
      var old_name = PATH.basename(old_path);
      var new_name = PATH.basename(new_path);
      var lookup, old_dir, new_dir;
      try {
        lookup = FS.lookupPath(old_path, {
          parent: true
        });
        old_dir = lookup.node;
        lookup = FS.lookupPath(new_path, {
          parent: true
        });
        new_dir = lookup.node
      } catch (e) {
        throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
      }
      if (!old_dir || !new_dir) throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
      if (old_dir.mount !== new_dir.mount) {
        throw new FS.ErrnoError(ERRNO_CODES.EXDEV)
      }
      var old_node = FS.lookupNode(old_dir, old_name);
      var relative = PATH.relative(old_path, new_dirname);
      if (relative.charAt(0) !== ".") {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
      }
      relative = PATH.relative(new_path, old_dirname);
      if (relative.charAt(0) !== ".") {
        throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY)
      }
      var new_node;
      try {
        new_node = FS.lookupNode(new_dir, new_name)
      } catch (e) {}
      if (old_node === new_node) {
        return
      }
      var isdir = FS.isDir(old_node.mode);
      var err = FS.mayDelete(old_dir, old_name, isdir);
      if (err) {
        throw new FS.ErrnoError(err)
      }
      err = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
      if (err) {
        throw new FS.ErrnoError(err)
      }
      if (!old_dir.node_ops.rename) {
        throw new FS.ErrnoError(ERRNO_CODES.EPERM)
      }
      if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
        throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
      }
      if (new_dir !== old_dir) {
        err = FS.nodePermissions(old_dir, "w");
        if (err) {
          throw new FS.ErrnoError(err)
        }
      }
      try {
        if (FS.trackingDelegate["willMovePath"]) {
          FS.trackingDelegate["willMovePath"](old_path, new_path)
        }
      } catch (e) {
        console.log("FS.trackingDelegate['willMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message)
      }
      FS.hashRemoveNode(old_node);
      try {
        old_dir.node_ops.rename(old_node, new_dir, new_name)
      } catch (e) {
        throw e
      } finally {
        FS.hashAddNode(old_node)
      }
      try {
        if (FS.trackingDelegate["onMovePath"]) FS.trackingDelegate["onMovePath"](old_path, new_path)
      } catch (e) {
        console.log("FS.trackingDelegate['onMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message)
      }
    }),
    rmdir: (function (path) {
      var lookup = FS.lookupPath(path, {
        parent: true
      });
      var parent = lookup.node;
      var name = PATH.basename(path);
      var node = FS.lookupNode(parent, name);
      var err = FS.mayDelete(parent, name, true);
      if (err) {
        throw new FS.ErrnoError(err)
      }
      if (!parent.node_ops.rmdir) {
        throw new FS.ErrnoError(ERRNO_CODES.EPERM)
      }
      if (FS.isMountpoint(node)) {
        throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
      }
      try {
        if (FS.trackingDelegate["willDeletePath"]) {
          FS.trackingDelegate["willDeletePath"](path)
        }
      } catch (e) {
        console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message)
      }
      parent.node_ops.rmdir(parent, name);
      FS.destroyNode(node);
      try {
        if (FS.trackingDelegate["onDeletePath"]) FS.trackingDelegate["onDeletePath"](path)
      } catch (e) {
        console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message)
      }
    }),
    readdir: (function (path) {
      var lookup = FS.lookupPath(path, {
        follow: true
      });
      var node = lookup.node;
      if (!node.node_ops.readdir) {
        throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR)
      }
      return node.node_ops.readdir(node)
    }),
    unlink: (function (path) {
      var lookup = FS.lookupPath(path, {
        parent: true
      });
      var parent = lookup.node;
      var name = PATH.basename(path);
      var node = FS.lookupNode(parent, name);
      var err = FS.mayDelete(parent, name, false);
      if (err) {
        if (err === ERRNO_CODES.EISDIR) err = ERRNO_CODES.EPERM;
        throw new FS.ErrnoError(err)
      }
      if (!parent.node_ops.unlink) {
        throw new FS.ErrnoError(ERRNO_CODES.EPERM)
      }
      if (FS.isMountpoint(node)) {
        throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
      }
      try {
        if (FS.trackingDelegate["willDeletePath"]) {
          FS.trackingDelegate["willDeletePath"](path)
        }
      } catch (e) {
        console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message)
      }
      parent.node_ops.unlink(parent, name);
      FS.destroyNode(node);
      try {
        if (FS.trackingDelegate["onDeletePath"]) FS.trackingDelegate["onDeletePath"](path)
      } catch (e) {
        console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message)
      }
    }),
    readlink: (function (path) {
      var lookup = FS.lookupPath(path);
      var link = lookup.node;
      if (!link) {
        throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
      }
      if (!link.node_ops.readlink) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
      }
      return PATH.resolve(FS.getPath(lookup.node.parent), link.node_ops.readlink(link))
    }),
    stat: (function (path, dontFollow) {
      var lookup = FS.lookupPath(path, {
        follow: !dontFollow
      });
      var node = lookup.node;
      if (!node) {
        throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
      }
      if (!node.node_ops.getattr) {
        throw new FS.ErrnoError(ERRNO_CODES.EPERM)
      }
      return node.node_ops.getattr(node)
    }),
    lstat: (function (path) {
      return FS.stat(path, true)
    }),
    chmod: (function (path, mode, dontFollow) {
      var node;
      if (typeof path === "string") {
        var lookup = FS.lookupPath(path, {
          follow: !dontFollow
        });
        node = lookup.node
      } else {
        node = path
      }
      if (!node.node_ops.setattr) {
        throw new FS.ErrnoError(ERRNO_CODES.EPERM)
      }
      node.node_ops.setattr(node, {
        mode: mode & 4095 | node.mode & ~4095,
        timestamp: Date.now()
      })
    }),
    lchmod: (function (path, mode) {
      FS.chmod(path, mode, true)
    }),
    fchmod: (function (fd, mode) {
      var stream = FS.getStream(fd);
      if (!stream) {
        throw new FS.ErrnoError(ERRNO_CODES.EBADF)
      }
      FS.chmod(stream.node, mode)
    }),
    chown: (function (path, uid, gid, dontFollow) {
      var node;
      if (typeof path === "string") {
        var lookup = FS.lookupPath(path, {
          follow: !dontFollow
        });
        node = lookup.node
      } else {
        node = path
      }
      if (!node.node_ops.setattr) {
        throw new FS.ErrnoError(ERRNO_CODES.EPERM)
      }
      node.node_ops.setattr(node, {
        timestamp: Date.now()
      })
    }),
    lchown: (function (path, uid, gid) {
      FS.chown(path, uid, gid, true)
    }),
    fchown: (function (fd, uid, gid) {
      var stream = FS.getStream(fd);
      if (!stream) {
        throw new FS.ErrnoError(ERRNO_CODES.EBADF)
      }
      FS.chown(stream.node, uid, gid)
    }),
    truncate: (function (path, len) {
      if (len < 0) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
      }
      var node;
      if (typeof path === "string") {
        var lookup = FS.lookupPath(path, {
          follow: true
        });
        node = lookup.node
      } else {
        node = path
      }
      if (!node.node_ops.setattr) {
        throw new FS.ErrnoError(ERRNO_CODES.EPERM)
      }
      if (FS.isDir(node.mode)) {
        throw new FS.ErrnoError(ERRNO_CODES.EISDIR)
      }
      if (!FS.isFile(node.mode)) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
      }
      var err = FS.nodePermissions(node, "w");
      if (err) {
        throw new FS.ErrnoError(err)
      }
      node.node_ops.setattr(node, {
        size: len,
        timestamp: Date.now()
      })
    }),
    ftruncate: (function (fd, len) {
      var stream = FS.getStream(fd);
      if (!stream) {
        throw new FS.ErrnoError(ERRNO_CODES.EBADF)
      }
      if ((stream.flags & 2097155) === 0) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
      }
      FS.truncate(stream.node, len)
    }),
    utime: (function (path, atime, mtime) {
      var lookup = FS.lookupPath(path, {
        follow: true
      });
      var node = lookup.node;
      node.node_ops.setattr(node, {
        timestamp: Math.max(atime, mtime)
      })
    }),
    open: (function (path, flags, mode, fd_start, fd_end) {
      if (path === "") {
        throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
      }
      flags = typeof flags === "string" ? FS.modeStringToFlags(flags) : flags;
      mode = typeof mode === "undefined" ? 438 : mode;
      if (flags & 64) {
        mode = mode & 4095 | 32768
      } else {
        mode = 0
      }
      var node;
      if (typeof path === "object") {
        node = path
      } else {
        path = PATH.normalize(path);
        try {
          var lookup = FS.lookupPath(path, {
            follow: !(flags & 131072)
          });
          node = lookup.node
        } catch (e) {}
      }
      var created = false;
      if (flags & 64) {
        if (node) {
          if (flags & 128) {
            throw new FS.ErrnoError(ERRNO_CODES.EEXIST)
          }
        } else {
          node = FS.mknod(path, mode, 0);
          created = true
        }
      }
      if (!node) {
        throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
      }
      if (FS.isChrdev(node.mode)) {
        flags &= ~512
      }
      if (!created) {
        var err = FS.mayOpen(node, flags);
        if (err) {
          throw new FS.ErrnoError(err)
        }
      }
      if (flags & 512) {
        FS.truncate(node, 0)
      }
      flags &= ~(128 | 512);
      var stream = FS.createStream({
        node: node,
        path: FS.getPath(node),
        flags: flags,
        seekable: true,
        position: 0,
        stream_ops: node.stream_ops,
        ungotten: [],
        error: false
      }, fd_start, fd_end);
      if (stream.stream_ops.open) {
        stream.stream_ops.open(stream)
      }
      if (Module["logReadFiles"] && !(flags & 1)) {
        if (!FS.readFiles) FS.readFiles = {};
        if (!(path in FS.readFiles)) {
          FS.readFiles[path] = 1;
          Module["printErr"]("read file: " + path)
        }
      }
      try {
        if (FS.trackingDelegate["onOpenFile"]) {
          var trackingFlags = 0;
          if ((flags & 2097155) !== 1) {
            trackingFlags |= FS.tracking.openFlags.READ
          }
          if ((flags & 2097155) !== 0) {
            trackingFlags |= FS.tracking.openFlags.WRITE
          }
          FS.trackingDelegate["onOpenFile"](path, trackingFlags)
        }
      } catch (e) {
        console.log("FS.trackingDelegate['onOpenFile']('" + path + "', flags) threw an exception: " + e.message)
      }
      return stream
    }),
    close: (function (stream) {
      try {
        if (stream.stream_ops.close) {
          stream.stream_ops.close(stream)
        }
      } catch (e) {
        throw e
      } finally {
        FS.closeStream(stream.fd)
      }
    }),
    llseek: (function (stream, offset, whence) {
      if (!stream.seekable || !stream.stream_ops.llseek) {
        throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)
      }
      stream.position = stream.stream_ops.llseek(stream, offset, whence);
      stream.ungotten = [];
      return stream.position
    }),
    read: (function (stream, buffer, offset, length, position) {
      if (length < 0 || position < 0) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
      }
      if ((stream.flags & 2097155) === 1) {
        throw new FS.ErrnoError(ERRNO_CODES.EBADF)
      }
      if (FS.isDir(stream.node.mode)) {
        throw new FS.ErrnoError(ERRNO_CODES.EISDIR)
      }
      if (!stream.stream_ops.read) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
      }
      var seeking = true;
      if (typeof position === "undefined") {
        position = stream.position;
        seeking = false
      } else if (!stream.seekable) {
        throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)
      }
      var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
      if (!seeking) stream.position += bytesRead;
      return bytesRead
    }),
    write: (function (stream, buffer, offset, length, position, canOwn) {
      if (length < 0 || position < 0) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
      }
      if ((stream.flags & 2097155) === 0) {
        throw new FS.ErrnoError(ERRNO_CODES.EBADF)
      }
      if (FS.isDir(stream.node.mode)) {
        throw new FS.ErrnoError(ERRNO_CODES.EISDIR)
      }
      if (!stream.stream_ops.write) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
      }
      if (stream.flags & 1024) {
        FS.llseek(stream, 0, 2)
      }
      var seeking = true;
      if (typeof position === "undefined") {
        position = stream.position;
        seeking = false
      } else if (!stream.seekable) {
        throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)
      }
      var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
      if (!seeking) stream.position += bytesWritten;
      try {
        if (stream.path && FS.trackingDelegate["onWriteToFile"]) FS.trackingDelegate["onWriteToFile"](stream.path)
      } catch (e) {
        console.log("FS.trackingDelegate['onWriteToFile']('" + path + "') threw an exception: " + e.message)
      }
      return bytesWritten
    }),
    allocate: (function (stream, offset, length) {
      if (offset < 0 || length <= 0) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
      }
      if ((stream.flags & 2097155) === 0) {
        throw new FS.ErrnoError(ERRNO_CODES.EBADF)
      }
      if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) {
        throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
      }
      if (!stream.stream_ops.allocate) {
        throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP)
      }
      stream.stream_ops.allocate(stream, offset, length)
    }),
    mmap: (function (stream, buffer, offset, length, position, prot, flags) {
      if ((stream.flags & 2097155) === 1) {
        throw new FS.ErrnoError(ERRNO_CODES.EACCES)
      }
      if (!stream.stream_ops.mmap) {
        throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
      }
      return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags)
    }),
    msync: (function (stream, buffer, offset, length, mmapFlags) {
      if (!stream || !stream.stream_ops.msync) {
        return 0
      }
      return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags)
    }),
    munmap: (function (stream) {
      return 0
    }),
    ioctl: (function (stream, cmd, arg) {
      if (!stream.stream_ops.ioctl) {
        throw new FS.ErrnoError(ERRNO_CODES.ENOTTY)
      }
      return stream.stream_ops.ioctl(stream, cmd, arg)
    }),
    readFile: (function (path, opts) {
      opts = opts || {};
      opts.flags = opts.flags || "r";
      opts.encoding = opts.encoding || "binary";
      if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
        throw new Error('Invalid encoding type "' + opts.encoding + '"')
      }
      var ret;
      var stream = FS.open(path, opts.flags);
      var stat = FS.stat(path);
      var length = stat.size;
      var buf = new Uint8Array(length);
      FS.read(stream, buf, 0, length, 0);
      if (opts.encoding === "utf8") {
        ret = UTF8ArrayToString(buf, 0)
      } else if (opts.encoding === "binary") {
        ret = buf
      }
      FS.close(stream);
      return ret
    }),
    writeFile: (function (path, data, opts) {
      opts = opts || {};
      opts.flags = opts.flags || "w";
      opts.encoding = opts.encoding || "utf8";
      if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
        throw new Error('Invalid encoding type "' + opts.encoding + '"')
      }
      var stream = FS.open(path, opts.flags, opts.mode);
      if (opts.encoding === "utf8") {
        var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
        var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
        FS.write(stream, buf, 0, actualNumBytes, 0, opts.canOwn)
      } else if (opts.encoding === "binary") {
        FS.write(stream, data, 0, data.length, 0, opts.canOwn)
      }
      FS.close(stream)
    }),
    cwd: (function () {
      return FS.currentPath
    }),
    chdir: (function (path) {
      var lookup = FS.lookupPath(path, {
        follow: true
      });
      if (!FS.isDir(lookup.node.mode)) {
        throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR)
      }
      var err = FS.nodePermissions(lookup.node, "x");
      if (err) {
        throw new FS.ErrnoError(err)
      }
      FS.currentPath = lookup.path
    }),
    createDefaultDirectories: (function () {
      FS.mkdir("/tmp");
      FS.mkdir("/home");
      FS.mkdir("/home/web_user")
    }),
    createDefaultDevices: (function () {
      FS.mkdir("/dev");
      FS.registerDevice(FS.makedev(1, 3), {
        read: (function () {
          return 0
        }),
        write: (function (stream, buffer, offset, length, pos) {
          return length
        })
      });
      FS.mkdev("/dev/null", FS.makedev(1, 3));
      TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
      TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
      FS.mkdev("/dev/tty", FS.makedev(5, 0));
      FS.mkdev("/dev/tty1", FS.makedev(6, 0));
      var random_device;
      if (typeof crypto !== "undefined") {
        var randomBuffer = new Uint8Array(1);
        random_device = (function () {
          crypto.getRandomValues(randomBuffer);
          return randomBuffer[0]
        })
      } else if (ENVIRONMENT_IS_NODE) {
        random_device = (function () {
          return require("crypto").randomBytes(1)[0]
        })
      } else {
        random_device = (function () {
          return Math.random() * 256 | 0
        })
      }
      FS.createDevice("/dev", "random", random_device);
      FS.createDevice("/dev", "urandom", random_device);
      FS.mkdir("/dev/shm");
      FS.mkdir("/dev/shm/tmp")
    }),
    createStandardStreams: (function () {
      if (Module["stdin"]) {
        FS.createDevice("/dev", "stdin", Module["stdin"])
      } else {
        FS.symlink("/dev/tty", "/dev/stdin")
      }
      if (Module["stdout"]) {
        FS.createDevice("/dev", "stdout", null, Module["stdout"])
      } else {
        FS.symlink("/dev/tty", "/dev/stdout")
      }
      if (Module["stderr"]) {
        FS.createDevice("/dev", "stderr", null, Module["stderr"])
      } else {
        FS.symlink("/dev/tty1", "/dev/stderr")
      }
      var stdin = FS.open("/dev/stdin", "r");
      HEAP32[_stdin >> 2] = FS.getPtrForStream(stdin);
      assert(stdin.fd === 0, "invalid handle for stdin (" + stdin.fd + ")");
      var stdout = FS.open("/dev/stdout", "w");
      HEAP32[_stdout >> 2] = FS.getPtrForStream(stdout);
      assert(stdout.fd === 1, "invalid handle for stdout (" + stdout.fd + ")");
      var stderr = FS.open("/dev/stderr", "w");
      HEAP32[_stderr >> 2] = FS.getPtrForStream(stderr);
      assert(stderr.fd === 2, "invalid handle for stderr (" + stderr.fd + ")")
    }),
    ensureErrnoError: (function () {
      if (FS.ErrnoError) return;
      FS.ErrnoError = function ErrnoError(errno, node) {
        this.node = node;
        this.setErrno = (function (errno) {
          this.errno = errno;
          for (var key in ERRNO_CODES) {
            if (ERRNO_CODES[key] === errno) {
              this.code = key;
              break
            }
          }
        });
        this.setErrno(errno);
        this.message = ERRNO_MESSAGES[errno];
        if (this.stack) this.stack = demangleAll(this.stack)
      };
      FS.ErrnoError.prototype = new Error;
      FS.ErrnoError.prototype.constructor = FS.ErrnoError;
      [ERRNO_CODES.ENOENT].forEach((function (code) {
        FS.genericErrors[code] = new FS.ErrnoError(code);
        FS.genericErrors[code].stack = "<generic error, no stack>"
      }))
    }),
    staticInit: (function () {
      FS.ensureErrnoError();
      FS.nameTable = new Array(4096);
      FS.mount(MEMFS, {}, "/");
      FS.createDefaultDirectories();
      FS.createDefaultDevices()
    }),
    init: (function (input, output, error) {
      assert(!FS.init.initialized, "FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)");
      FS.init.initialized = true;
      FS.ensureErrnoError();
      Module["stdin"] = input || Module["stdin"];
      Module["stdout"] = output || Module["stdout"];
      Module["stderr"] = error || Module["stderr"];
      FS.createStandardStreams()
    }),
    quit: (function () {
      FS.init.initialized = false;
      for (var i = 0; i < FS.streams.length; i++) {
        var stream = FS.streams[i];
        if (!stream) {
          continue
        }
        FS.close(stream)
      }
    }),
    getMode: (function (canRead, canWrite) {
      var mode = 0;
      if (canRead) mode |= 292 | 73;
      if (canWrite) mode |= 146;
      return mode
    }),
    joinPath: (function (parts, forceRelative) {
      var path = PATH.join.apply(null, parts);
      if (forceRelative && path[0] == "/") path = path.substr(1);
      return path
    }),
    absolutePath: (function (relative, base) {
      return PATH.resolve(base, relative)
    }),
    standardizePath: (function (path) {
      return PATH.normalize(path)
    }),
    findObject: (function (path, dontResolveLastLink) {
      var ret = FS.analyzePath(path, dontResolveLastLink);
      if (ret.exists) {
        return ret.object
      } else {
        ___setErrNo(ret.error);
        return null
      }
    }),
    analyzePath: (function (path, dontResolveLastLink) {
      try {
        var lookup = FS.lookupPath(path, {
          follow: !dontResolveLastLink
        });
        path = lookup.path
      } catch (e) {}
      var ret = {
        isRoot: false,
        exists: false,
        error: 0,
        name: null,
        path: null,
        object: null,
        parentExists: false,
        parentPath: null,
        parentObject: null
      };
      try {
        var lookup = FS.lookupPath(path, {
          parent: true
        });
        ret.parentExists = true;
        ret.parentPath = lookup.path;
        ret.parentObject = lookup.node;
        ret.name = PATH.basename(path);
        lookup = FS.lookupPath(path, {
          follow: !dontResolveLastLink
        });
        ret.exists = true;
        ret.path = lookup.path;
        ret.object = lookup.node;
        ret.name = lookup.node.name;
        ret.isRoot = lookup.path === "/"
      } catch (e) {
        ret.error = e.errno
      }
      return ret
    }),
    createFolder: (function (parent, name, canRead, canWrite) {
      var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
      var mode = FS.getMode(canRead, canWrite);
      return FS.mkdir(path, mode)
    }),
    createPath: (function (parent, path, canRead, canWrite) {
      parent = typeof parent === "string" ? parent : FS.getPath(parent);
      var parts = path.split("/").reverse();
      while (parts.length) {
        var part = parts.pop();
        if (!part) continue;
        var current = PATH.join2(parent, part);
        try {
          FS.mkdir(current)
        } catch (e) {}
        parent = current
      }
      return current
    }),
    createFile: (function (parent, name, properties, canRead, canWrite) {
      var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
      var mode = FS.getMode(canRead, canWrite);
      return FS.create(path, mode)
    }),
    createDataFile: (function (parent, name, data, canRead, canWrite, canOwn) {
      var path = name ? PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name) : parent;
      var mode = FS.getMode(canRead, canWrite);
      var node = FS.create(path, mode);
      if (data) {
        if (typeof data === "string") {
          var arr = new Array(data.length);
          for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
          data = arr
        }
        FS.chmod(node, mode | 146);
        var stream = FS.open(node, "w");
        FS.write(stream, data, 0, data.length, 0, canOwn);
        FS.close(stream);
        FS.chmod(node, mode)
      }
      return node
    }),
    createDevice: (function (parent, name, input, output) {
      var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
      var mode = FS.getMode(!!input, !!output);
      if (!FS.createDevice.major) FS.createDevice.major = 64;
      var dev = FS.makedev(FS.createDevice.major++, 0);
      FS.registerDevice(dev, {
        open: (function (stream) {
          stream.seekable = false
        }),
        close: (function (stream) {
          if (output && output.buffer && output.buffer.length) {
            output(10)
          }
        }),
        read: (function (stream, buffer, offset, length, pos) {
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = input()
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO)
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset + i] = result
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now()
          }
          return bytesRead
        }),
        write: (function (stream, buffer, offset, length, pos) {
          for (var i = 0; i < length; i++) {
            try {
              output(buffer[offset + i])
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO)
            }
          }
          if (length) {
            stream.node.timestamp = Date.now()
          }
          return i
        })
      });
      return FS.mkdev(path, mode, dev)
    }),
    createLink: (function (parent, name, target, canRead, canWrite) {
      var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
      return FS.symlink(target, path)
    }),
    forceLoadFile: (function (obj) {
      if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
      var success = true;
      if (typeof XMLHttpRequest !== "undefined") {
        throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.")
      } else if (Module["read"]) {
        try {
          obj.contents = intArrayFromString(Module["read"](obj.url), true);
          obj.usedBytes = obj.contents.length
        } catch (e) {
          success = false
        }
      } else {
        throw new Error("Cannot load without read() or XMLHttpRequest.")
      }
      if (!success) ___setErrNo(ERRNO_CODES.EIO);
      return success
    }),
    createLazyFile: (function (parent, name, url, canRead, canWrite) {
      function LazyUint8Array() {
        this.lengthKnown = false;
        this.chunks = []
      }
      LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
        if (idx > this.length - 1 || idx < 0) {
          return undefined
        }
        var chunkOffset = idx % this.chunkSize;
        var chunkNum = idx / this.chunkSize | 0;
        return this.getter(chunkNum)[chunkOffset]
      };
      LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
        this.getter = getter
      };
      LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
        var xhr = new XMLHttpRequest;
        xhr.open("HEAD", url, false);
        xhr.send(null);
        if (!(xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
        var datalength = Number(xhr.getResponseHeader("Content-length"));
        var header;
        var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
        var chunkSize = 1024 * 1024;
        if (!hasByteServing) chunkSize = datalength;
        var doXHR = (function (from, to) {
          if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
          if (to > datalength - 1) throw new Error("only " + datalength + " bytes available! programmer error!");
          var xhr = new XMLHttpRequest;
          xhr.open("GET", url, false);
          if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
          if (typeof Uint8Array != "undefined") xhr.responseType = "arraybuffer";
          if (xhr.overrideMimeType) {
            xhr.overrideMimeType("text/plain; charset=x-user-defined")
          }
          xhr.send(null);
          if (!(xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
          if (xhr.response !== undefined) {
            return new Uint8Array(xhr.response || [])
          } else {
            return intArrayFromString(xhr.responseText || "", true)
          }
        });
        var lazyArray = this;
        lazyArray.setDataGetter((function (chunkNum) {
          var start = chunkNum * chunkSize;
          var end = (chunkNum + 1) * chunkSize - 1;
          end = Math.min(end, datalength - 1);
          if (typeof lazyArray.chunks[chunkNum] === "undefined") {
            lazyArray.chunks[chunkNum] = doXHR(start, end)
          }
          if (typeof lazyArray.chunks[chunkNum] === "undefined") throw new Error("doXHR failed!");
          return lazyArray.chunks[chunkNum]
        }));
        this._length = datalength;
        this._chunkSize = chunkSize;
        this.lengthKnown = true
      };
      if (typeof XMLHttpRequest !== "undefined") {
        if (!ENVIRONMENT_IS_WORKER) throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
        var lazyArray = new LazyUint8Array;
        Object.defineProperty(lazyArray, "length", {
          get: (function () {
            if (!this.lengthKnown) {
              this.cacheLength()
            }
            return this._length
          })
        });
        Object.defineProperty(lazyArray, "chunkSize", {
          get: (function () {
            if (!this.lengthKnown) {
              this.cacheLength()
            }
            return this._chunkSize
          })
        });
        var properties = {
          isDevice: false,
          contents: lazyArray
        }
      } else {
        var properties = {
          isDevice: false,
          url: url
        }
      }
      var node = FS.createFile(parent, name, properties, canRead, canWrite);
      if (properties.contents) {
        node.contents = properties.contents
      } else if (properties.url) {
        node.contents = null;
        node.url = properties.url
      }
      Object.defineProperty(node, "usedBytes", {
        get: (function () {
          return this.contents.length
        })
      });
      var stream_ops = {};
      var keys = Object.keys(node.stream_ops);
      keys.forEach((function (key) {
        var fn = node.stream_ops[key];
        stream_ops[key] = function forceLoadLazyFile() {
          if (!FS.forceLoadFile(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO)
          }
          return fn.apply(null, arguments)
        }
      }));
      stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
        if (!FS.forceLoadFile(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EIO)
        }
        var contents = stream.node.contents;
        if (position >= contents.length) return 0;
        var size = Math.min(contents.length - position, length);
        assert(size >= 0);
        if (contents.slice) {
          for (var i = 0; i < size; i++) {
            buffer[offset + i] = contents[position + i]
          }
        } else {
          for (var i = 0; i < size; i++) {
            buffer[offset + i] = contents.get(position + i)
          }
        }
        return size
      };
      node.stream_ops = stream_ops;
      return node
    }),
    createPreloadedFile: (function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) {
      Browser.init();
      var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
      var dep = getUniqueRunDependency("cp " + fullname);

      function processData(byteArray) {
        function finish(byteArray) {
          if (preFinish) preFinish();
          if (!dontCreateFile) {
            FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn)
          }
          if (onload) onload();
          removeRunDependency(dep)
        }
        var handled = false;
        Module["preloadPlugins"].forEach((function (plugin) {
          if (handled) return;
          if (plugin["canHandle"](fullname)) {
            plugin["handle"](byteArray, fullname, finish, (function () {
              if (onerror) onerror();
              removeRunDependency(dep)
            }));
            handled = true
          }
        }));
        if (!handled) finish(byteArray)
      }
      addRunDependency(dep);
      if (typeof url == "string") {
        Browser.asyncLoad(url, (function (byteArray) {
          processData(byteArray)
        }), onerror)
      } else {
        processData(url)
      }
    }),
    indexedDB: (function () {
      return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB
    }),
    DB_NAME: (function () {
      return "EM_FS_" + window.location.pathname
    }),
    DB_VERSION: 20,
    DB_STORE_NAME: "FILE_DATA",
    saveFilesToDB: (function (paths, onload, onerror) {
      onload = onload || (function () {});
      onerror = onerror || (function () {});
      var indexedDB = FS.indexedDB();
      try {
        var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)
      } catch (e) {
        return onerror(e)
      }
      openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
        console.log("creating db");
        var db = openRequest.result;
        db.createObjectStore(FS.DB_STORE_NAME)
      };
      openRequest.onsuccess = function openRequest_onsuccess() {
        var db = openRequest.result;
        var transaction = db.transaction([FS.DB_STORE_NAME], "readwrite");
        var files = transaction.objectStore(FS.DB_STORE_NAME);
        var ok = 0,
          fail = 0,
          total = paths.length;

        function finish() {
          if (fail == 0) onload();
          else onerror()
        }
        paths.forEach((function (path) {
          var putRequest = files.put(FS.analyzePath(path).object.contents, path);
          putRequest.onsuccess = function putRequest_onsuccess() {
            ok++;
            if (ok + fail == total) finish()
          };
          putRequest.onerror = function putRequest_onerror() {
            fail++;
            if (ok + fail == total) finish()
          }
        }));
        transaction.onerror = onerror
      };
      openRequest.onerror = onerror
    }),
    loadFilesFromDB: (function (paths, onload, onerror) {
      onload = onload || (function () {});
      onerror = onerror || (function () {});
      var indexedDB = FS.indexedDB();
      try {
        var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)
      } catch (e) {
        return onerror(e)
      }
      openRequest.onupgradeneeded = onerror;
      openRequest.onsuccess = function openRequest_onsuccess() {
        var db = openRequest.result;
        try {
          var transaction = db.transaction([FS.DB_STORE_NAME], "readonly")
        } catch (e) {
          onerror(e);
          return
        }
        var files = transaction.objectStore(FS.DB_STORE_NAME);
        var ok = 0,
          fail = 0,
          total = paths.length;

        function finish() {
          if (fail == 0) onload();
          else onerror()
        }
        paths.forEach((function (path) {
          var getRequest = files.get(path);
          getRequest.onsuccess = function getRequest_onsuccess() {
            if (FS.analyzePath(path).exists) {
              FS.unlink(path)
            }
            FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
            ok++;
            if (ok + fail == total) finish()
          };
          getRequest.onerror = function getRequest_onerror() {
            fail++;
            if (ok + fail == total) finish()
          }
        }));
        transaction.onerror = onerror
      };
      openRequest.onerror = onerror
    })
  };

  function _mkport() {
    throw "TODO"
  }
  var SOCKFS = {
    mount: (function (mount) {
      Module["websocket"] = Module["websocket"] && "object" === typeof Module["websocket"] ? Module["websocket"] : {};
      Module["websocket"]._callbacks = {};
      Module["websocket"]["on"] = (function (event, callback) {
        if ("function" === typeof callback) {
          this._callbacks[event] = callback
        }
        return this
      });
      Module["websocket"].emit = (function (event, param) {
        if ("function" === typeof this._callbacks[event]) {
          this._callbacks[event].call(this, param)
        }
      });
      return FS.createNode(null, "/", 16384 | 511, 0)
    }),
    createSocket: (function (family, type, protocol) {
      var streaming = type == 1;
      if (protocol) {
        assert(streaming == (protocol == 6))
      }
      var sock = {
        family: family,
        type: type,
        protocol: protocol,
        server: null,
        error: null,
        peers: {},
        pending: [],
        recv_queue: [],
        sock_ops: SOCKFS.websocket_sock_ops
      };
      var name = SOCKFS.nextname();
      var node = FS.createNode(SOCKFS.root, name, 49152, 0);
      node.sock = sock;
      var stream = FS.createStream({
        path: name,
        node: node,
        flags: FS.modeStringToFlags("r+"),
        seekable: false,
        stream_ops: SOCKFS.stream_ops
      });
      sock.stream = stream;
      return sock
    }),
    getSocket: (function (fd) {
      var stream = FS.getStream(fd);
      if (!stream || !FS.isSocket(stream.node.mode)) {
        return null
      }
      return stream.node.sock
    }),
    stream_ops: {
      poll: (function (stream) {
        var sock = stream.node.sock;
        return sock.sock_ops.poll(sock)
      }),
      ioctl: (function (stream, request, varargs) {
        var sock = stream.node.sock;
        return sock.sock_ops.ioctl(sock, request, varargs)
      }),
      read: (function (stream, buffer, offset, length, position) {
        var sock = stream.node.sock;
        var msg = sock.sock_ops.recvmsg(sock, length);
        if (!msg) {
          return 0
        }
        buffer.set(msg.buffer, offset);
        return msg.buffer.length
      }),
      write: (function (stream, buffer, offset, length, position) {
        var sock = stream.node.sock;
        return sock.sock_ops.sendmsg(sock, buffer, offset, length)
      }),
      close: (function (stream) {
        var sock = stream.node.sock;
        sock.sock_ops.close(sock)
      })
    },
    nextname: (function () {
      if (!SOCKFS.nextname.current) {
        SOCKFS.nextname.current = 0
      }
      return "socket[" + SOCKFS.nextname.current++ + "]"
    }),
    websocket_sock_ops: {
      createPeer: (function (sock, addr, port) {
        var ws;
        if (typeof addr === "object") {
          ws = addr;
          addr = null;
          port = null
        }
        if (ws) {
          if (ws._socket) {
            addr = ws._socket.remoteAddress;
            port = ws._socket.remotePort
          } else {
            var result = /ws[s]?:\/\/([^:]+):(\d+)/.exec(ws.url);
            if (!result) {
              throw new Error("WebSocket URL must be in the format ws(s)://address:port")
            }
            addr = result[1];
            port = parseInt(result[2], 10)
          }
        } else {
          try {
            var runtimeConfig = Module["websocket"] && "object" === typeof Module["websocket"];
            var url = "ws:#".replace("#", "//");
            if (runtimeConfig) {
              if ("string" === typeof Module["websocket"]["url"]) {
                url = Module["websocket"]["url"]
              }
            }
            if (url === "ws://" || url === "wss://") {
              var parts = addr.split("/");
              url = url + parts[0] + ":" + port + "/" + parts.slice(1).join("/")
            }
            var subProtocols = "binary";
            if (runtimeConfig) {
              if ("string" === typeof Module["websocket"]["subprotocol"]) {
                subProtocols = Module["websocket"]["subprotocol"]
              }
            }
            subProtocols = subProtocols.replace(/^ +| +$/g, "").split(/ *, */);
            var opts = ENVIRONMENT_IS_NODE ? {
              "protocol": subProtocols.toString()
            } : subProtocols;
            var WebSocket = ENVIRONMENT_IS_NODE ? require("ws") : window["WebSocket"];
            ws = new WebSocket(url, opts);
            ws.binaryType = "arraybuffer"
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES.EHOSTUNREACH)
          }
        }
        var peer = {
          addr: addr,
          port: port,
          socket: ws,
          dgram_send_queue: []
        };
        SOCKFS.websocket_sock_ops.addPeer(sock, peer);
        SOCKFS.websocket_sock_ops.handlePeerEvents(sock, peer);
        if (sock.type === 2 && typeof sock.sport !== "undefined") {
          peer.dgram_send_queue.push(new Uint8Array([255, 255, 255, 255, "p".charCodeAt(0), "o".charCodeAt(0), "r".charCodeAt(0), "t".charCodeAt(0), (sock.sport & 65280) >> 8, sock.sport & 255]))
        }
        return peer
      }),
      getPeer: (function (sock, addr, port) {
        return sock.peers[addr + ":" + port]
      }),
      addPeer: (function (sock, peer) {
        sock.peers[peer.addr + ":" + peer.port] = peer
      }),
      removePeer: (function (sock, peer) {
        delete sock.peers[peer.addr + ":" + peer.port]
      }),
      handlePeerEvents: (function (sock, peer) {
        var first = true;
        var handleOpen = (function () {
          Module["websocket"].emit("open", sock.stream.fd);
          try {
            var queued = peer.dgram_send_queue.shift();
            while (queued) {
              peer.socket.send(queued);
              queued = peer.dgram_send_queue.shift()
            }
          } catch (e) {
            peer.socket.close()
          }
        });

        function handleMessage(data) {
          assert(typeof data !== "string" && data.byteLength !== undefined);
          data = new Uint8Array(data);
          var wasfirst = first;
          first = false;
          if (wasfirst && data.length === 10 && data[0] === 255 && data[1] === 255 && data[2] === 255 && data[3] === 255 && data[4] === "p".charCodeAt(0) && data[5] === "o".charCodeAt(0) && data[6] === "r".charCodeAt(0) && data[7] === "t".charCodeAt(0)) {
            var newport = data[8] << 8 | data[9];
            SOCKFS.websocket_sock_ops.removePeer(sock, peer);
            peer.port = newport;
            SOCKFS.websocket_sock_ops.addPeer(sock, peer);
            return
          }
          sock.recv_queue.push({
            addr: peer.addr,
            port: peer.port,
            data: data
          });
          Module["websocket"].emit("message", sock.stream.fd)
        }
        if (ENVIRONMENT_IS_NODE) {
          peer.socket.on("open", handleOpen);
          peer.socket.on("message", (function (data, flags) {
            if (!flags.binary) {
              return
            }
            handleMessage((new Uint8Array(data)).buffer)
          }));
          peer.socket.on("close", (function () {
            Module["websocket"].emit("close", sock.stream.fd)
          }));
          peer.socket.on("error", (function (error) {
            sock.error = ERRNO_CODES.ECONNREFUSED;
            Module["websocket"].emit("error", [sock.stream.fd, sock.error, "ECONNREFUSED: Connection refused"])
          }))
        } else {
          peer.socket.onopen = handleOpen;
          peer.socket.onclose = (function () {
            Module["websocket"].emit("close", sock.stream.fd)
          });
          peer.socket.onmessage = function peer_socket_onmessage(event) {
            handleMessage(event.data)
          };
          peer.socket.onerror = (function (error) {
            sock.error = ERRNO_CODES.ECONNREFUSED;
            Module["websocket"].emit("error", [sock.stream.fd, sock.error, "ECONNREFUSED: Connection refused"])
          })
        }
      }),
      poll: (function (sock) {
        if (sock.type === 1 && sock.server) {
          return sock.pending.length ? 64 | 1 : 0
        }
        var mask = 0;
        var dest = sock.type === 1 ? SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport) : null;
        if (sock.recv_queue.length || !dest || dest && dest.socket.readyState === dest.socket.CLOSING || dest && dest.socket.readyState === dest.socket.CLOSED) {
          mask |= 64 | 1
        }
        if (!dest || dest && dest.socket.readyState === dest.socket.OPEN) {
          mask |= 4
        }
        if (dest && dest.socket.readyState === dest.socket.CLOSING || dest && dest.socket.readyState === dest.socket.CLOSED) {
          mask |= 16
        }
        return mask
      }),
      ioctl: (function (sock, request, arg) {
        switch (request) {
        case 21531:
          var bytes = 0;
          if (sock.recv_queue.length) {
            bytes = sock.recv_queue[0].data.length
          }
          HEAP32[arg >> 2] = bytes;
          return 0;
        default:
          return ERRNO_CODES.EINVAL
        }
      }),
      close: (function (sock) {
        if (sock.server) {
          try {
            sock.server.close()
          } catch (e) {}
          sock.server = null
        }
        var peers = Object.keys(sock.peers);
        for (var i = 0; i < peers.length; i++) {
          var peer = sock.peers[peers[i]];
          try {
            peer.socket.close()
          } catch (e) {}
          SOCKFS.websocket_sock_ops.removePeer(sock, peer)
        }
        return 0
      }),
      bind: (function (sock, addr, port) {
        if (typeof sock.saddr !== "undefined" || typeof sock.sport !== "undefined") {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        sock.saddr = addr;
        sock.sport = port || _mkport();
        if (sock.type === 2) {
          if (sock.server) {
            sock.server.close();
            sock.server = null
          }
          try {
            sock.sock_ops.listen(sock, 0)
          } catch (e) {
            if (!(e instanceof FS.ErrnoError)) throw e;
            if (e.errno !== ERRNO_CODES.EOPNOTSUPP) throw e
          }
        }
      }),
      connect: (function (sock, addr, port) {
        if (sock.server) {
          throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP)
        }
        if (typeof sock.daddr !== "undefined" && typeof sock.dport !== "undefined") {
          var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
          if (dest) {
            if (dest.socket.readyState === dest.socket.CONNECTING) {
              throw new FS.ErrnoError(ERRNO_CODES.EALREADY)
            } else {
              throw new FS.ErrnoError(ERRNO_CODES.EISCONN)
            }
          }
        }
        var peer = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
        sock.daddr = peer.addr;
        sock.dport = peer.port;
        throw new FS.ErrnoError(ERRNO_CODES.EINPROGRESS)
      }),
      listen: (function (sock, backlog) {
        if (!ENVIRONMENT_IS_NODE) {
          throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP)
        }
        if (sock.server) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        var WebSocketServer = require("ws").Server;
        var host = sock.saddr;
        sock.server = new WebSocketServer({
          host: host,
          port: sock.sport
        });
        Module["websocket"].emit("listen", sock.stream.fd);
        sock.server.on("connection", (function (ws) {
          if (sock.type === 1) {
            var newsock = SOCKFS.createSocket(sock.family, sock.type, sock.protocol);
            var peer = SOCKFS.websocket_sock_ops.createPeer(newsock, ws);
            newsock.daddr = peer.addr;
            newsock.dport = peer.port;
            sock.pending.push(newsock);
            Module["websocket"].emit("connection", newsock.stream.fd)
          } else {
            SOCKFS.websocket_sock_ops.createPeer(sock, ws);
            Module["websocket"].emit("connection", sock.stream.fd)
          }
        }));
        sock.server.on("closed", (function () {
          Module["websocket"].emit("close", sock.stream.fd);
          sock.server = null
        }));
        sock.server.on("error", (function (error) {
          sock.error = ERRNO_CODES.EHOSTUNREACH;
          Module["websocket"].emit("error", [sock.stream.fd, sock.error, "EHOSTUNREACH: Host is unreachable"])
        }))
      }),
      accept: (function (listensock) {
        if (!listensock.server) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        var newsock = listensock.pending.shift();
        newsock.stream.flags = listensock.stream.flags;
        return newsock
      }),
      getname: (function (sock, peer) {
        var addr, port;
        if (peer) {
          if (sock.daddr === undefined || sock.dport === undefined) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN)
          }
          addr = sock.daddr;
          port = sock.dport
        } else {
          addr = sock.saddr || 0;
          port = sock.sport || 0
        }
        return {
          addr: addr,
          port: port
        }
      }),
      sendmsg: (function (sock, buffer, offset, length, addr, port) {
        if (sock.type === 2) {
          if (addr === undefined || port === undefined) {
            addr = sock.daddr;
            port = sock.dport
          }
          if (addr === undefined || port === undefined) {
            throw new FS.ErrnoError(ERRNO_CODES.EDESTADDRREQ)
          }
        } else {
          addr = sock.daddr;
          port = sock.dport
        }
        var dest = SOCKFS.websocket_sock_ops.getPeer(sock, addr, port);
        if (sock.type === 1) {
          if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN)
          } else if (dest.socket.readyState === dest.socket.CONNECTING) {
            throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)
          }
        }
        var data;
        if (buffer instanceof Array || buffer instanceof ArrayBuffer) {
          data = buffer.slice(offset, offset + length)
        } else {
          data = buffer.buffer.slice(buffer.byteOffset + offset, buffer.byteOffset + offset + length)
        }
        if (sock.type === 2) {
          if (!dest || dest.socket.readyState !== dest.socket.OPEN) {
            if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
              dest = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port)
            }
            dest.dgram_send_queue.push(data);
            return length
          }
        }
        try {
          dest.socket.send(data);
          return length
        } catch (e) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
      }),
      recvmsg: (function (sock, length) {
        if (sock.type === 1 && sock.server) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN)
        }
        var queued = sock.recv_queue.shift();
        if (!queued) {
          if (sock.type === 1) {
            var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
            if (!dest) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN)
            } else if (dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
              return null
            } else {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)
            }
          } else {
            throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)
          }
        }
        var queuedLength = queued.data.byteLength || queued.data.length;
        var queuedOffset = queued.data.byteOffset || 0;
        var queuedBuffer = queued.data.buffer || queued.data;
        var bytesRead = Math.min(length, queuedLength);
        var res = {
          buffer: new Uint8Array(queuedBuffer, queuedOffset, bytesRead),
          addr: queued.addr,
          port: queued.port
        };
        if (sock.type === 1 && bytesRead < queuedLength) {
          var bytesRemaining = queuedLength - bytesRead;
          queued.data = new Uint8Array(queuedBuffer, queuedOffset + bytesRead, bytesRemaining);
          sock.recv_queue.unshift(queued)
        }
        return res
      })
    }
  };

  function _recv(fd, buf, len, flags) {
    var sock = SOCKFS.getSocket(fd);
    if (!sock) {
      ___setErrNo(ERRNO_CODES.EBADF);
      return -1
    }
    return _read(fd, buf, len)
  }

  function _pread(fildes, buf, nbyte, offset) {
    var stream = FS.getStream(fildes);
    if (!stream) {
      ___setErrNo(ERRNO_CODES.EBADF);
      return -1
    }
    try {
      var slab = HEAP8;
      return FS.read(stream, slab, buf, nbyte, offset)
    } catch (e) {
      FS.handleFSError(e);
      return -1
    }
  }

  function _read(fildes, buf, nbyte) {
    var stream = FS.getStream(fildes);
    if (!stream) {
      ___setErrNo(ERRNO_CODES.EBADF);
      return -1
    }
    try {
      var slab = HEAP8;
      return FS.read(stream, slab, buf, nbyte)
    } catch (e) {
      FS.handleFSError(e);
      return -1
    }
  }

  function _fread(ptr, size, nitems, stream) {
    var bytesToRead = nitems * size;
    if (bytesToRead == 0) {
      return 0
    }
    var bytesRead = 0;
    var streamObj = FS.getStreamFromPtr(stream);
    if (!streamObj) {
      ___setErrNo(ERRNO_CODES.EBADF);
      return 0
    }
    while (streamObj.ungotten.length && bytesToRead > 0) {
      HEAP8[ptr++ >> 0] = streamObj.ungotten.pop();
      bytesToRead--;
      bytesRead++
    }
    var err = _read(streamObj.fd, ptr, bytesToRead);
    if (err == -1) {
      if (streamObj) streamObj.error = true;
      return 0
    }
    bytesRead += err;
    if (bytesRead < bytesToRead) streamObj.eof = true;
    return bytesRead / size | 0
  }

  function _close(fildes) {
    var stream = FS.getStream(fildes);
    if (!stream) {
      ___setErrNo(ERRNO_CODES.EBADF);
      return -1
    }
    try {
      FS.close(stream);
      return 0
    } catch (e) {
      FS.handleFSError(e);
      return -1
    }
  }

  function _fileno(stream) {
    stream = FS.getStreamFromPtr(stream);
    if (!stream) return -1;
    return stream.fd
  }

  function _fclose(stream) {
    var fd = _fileno(stream);
    return _close(fd)
  }
  Module["_strlen"] = _strlen;
  Module["_strcat"] = _strcat;

  function _abort() {
    Module["abort"]()
  }

  function _send(fd, buf, len, flags) {
    var sock = SOCKFS.getSocket(fd);
    if (!sock) {
      ___setErrNo(ERRNO_CODES.EBADF);
      return -1
    }
    return _write(fd, buf, len)
  }

  function _pwrite(fildes, buf, nbyte, offset) {
    var stream = FS.getStream(fildes);
    if (!stream) {
      ___setErrNo(ERRNO_CODES.EBADF);
      return -1
    }
    try {
      var slab = HEAP8;
      return FS.write(stream, slab, buf, nbyte, offset)
    } catch (e) {
      FS.handleFSError(e);
      return -1
    }
  }

  function _write(fildes, buf, nbyte) {
    var stream = FS.getStream(fildes);
    if (!stream) {
      ___setErrNo(ERRNO_CODES.EBADF);
      return -1
    }
    try {
      var slab = HEAP8;
      return FS.write(stream, slab, buf, nbyte)
    } catch (e) {
      FS.handleFSError(e);
      return -1
    }
  }

  function _fwrite(ptr, size, nitems, stream) {
    var bytesToWrite = nitems * size;
    if (bytesToWrite == 0) return 0;
    var fd = _fileno(stream);
    var bytesWritten = _write(fd, ptr, bytesToWrite);
    if (bytesWritten == -1) {
      var streamObj = FS.getStreamFromPtr(stream);
      if (streamObj) streamObj.error = true;
      return 0
    } else {
      return bytesWritten / size | 0
    }
  }

  function __reallyNegative(x) {
    return x < 0 || x === 0 && 1 / x === -Infinity
  }

  function __formatString(format, varargs) {
    assert((varargs & 7) === 0);
    var textIndex = format;
    var argIndex = 0;

    function getNextArg(type) {
      var ret;
      argIndex = Runtime.prepVararg(argIndex, type);
      if (type === "double") {
        ret = (HEAP32[tempDoublePtr >> 2] = HEAP32[varargs + argIndex >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[varargs + (argIndex + 4) >> 2], +HEAPF64[tempDoublePtr >> 3]);
        argIndex += 8
      } else if (type == "i64") {
        ret = [HEAP32[varargs + argIndex >> 2], HEAP32[varargs + (argIndex + 4) >> 2]];
        argIndex += 8
      } else {
        assert((argIndex & 3) === 0);
        type = "i32";
        ret = HEAP32[varargs + argIndex >> 2];
        argIndex += 4
      }
      return ret
    }
    var ret = [];
    var curr, next, currArg;
    while (1) {
      var startTextIndex = textIndex;
      curr = HEAP8[textIndex >> 0];
      if (curr === 0) break;
      next = HEAP8[textIndex + 1 >> 0];
      if (curr == 37) {
        var flagAlwaysSigned = false;
        var flagLeftAlign = false;
        var flagAlternative = false;
        var flagZeroPad = false;
        var flagPadSign = false;
        flagsLoop: while (1) {
          switch (next) {
          case 43:
            flagAlwaysSigned = true;
            break;
          case 45:
            flagLeftAlign = true;
            break;
          case 35:
            flagAlternative = true;
            break;
          case 48:
            if (flagZeroPad) {
              break flagsLoop
            } else {
              flagZeroPad = true;
              break
            };
          case 32:
            flagPadSign = true;
            break;
          default:
            break flagsLoop
          }
          textIndex++;
          next = HEAP8[textIndex + 1 >> 0]
        }
        var width = 0;
        if (next == 42) {
          width = getNextArg("i32");
          textIndex++;
          next = HEAP8[textIndex + 1 >> 0]
        } else {
          while (next >= 48 && next <= 57) {
            width = width * 10 + (next - 48);
            textIndex++;
            next = HEAP8[textIndex + 1 >> 0]
          }
        }
        var precisionSet = false,
          precision = -1;
        if (next == 46) {
          precision = 0;
          precisionSet = true;
          textIndex++;
          next = HEAP8[textIndex + 1 >> 0];
          if (next == 42) {
            precision = getNextArg("i32");
            textIndex++
          } else {
            while (1) {
              var precisionChr = HEAP8[textIndex + 1 >> 0];
              if (precisionChr < 48 || precisionChr > 57) break;
              precision = precision * 10 + (precisionChr - 48);
              textIndex++
            }
          }
          next = HEAP8[textIndex + 1 >> 0]
        }
        if (precision < 0) {
          precision = 6;
          precisionSet = false
        }
        var argSize;
        switch (String.fromCharCode(next)) {
        case "h":
          var nextNext = HEAP8[textIndex + 2 >> 0];
          if (nextNext == 104) {
            textIndex++;
            argSize = 1
          } else {
            argSize = 2
          }
          break;
        case "l":
          var nextNext = HEAP8[textIndex + 2 >> 0];
          if (nextNext == 108) {
            textIndex++;
            argSize = 8
          } else {
            argSize = 4
          }
          break;
        case "L":
        case "q":
        case "j":
          argSize = 8;
          break;
        case "z":
        case "t":
        case "I":
          argSize = 4;
          break;
        default:
          argSize = null
        }
        if (argSize) textIndex++;
        next = HEAP8[textIndex + 1 >> 0];
        switch (String.fromCharCode(next)) {
        case "d":
        case "i":
        case "u":
        case "o":
        case "x":
        case "X":
        case "p":
          {
            var signed = next == 100 || next == 105;argSize = argSize || 4;
            var currArg = getNextArg("i" + argSize * 8);
            var origArg = currArg;
            var argText;
            if (argSize == 8) {
              currArg = Runtime.makeBigInt(currArg[0], currArg[1], next == 117)
            }
            if (argSize <= 4) {
              var limit = Math.pow(256, argSize) - 1;
              currArg = (signed ? reSign : unSign)(currArg & limit, argSize * 8)
            }
            var currAbsArg = Math.abs(currArg);
            var prefix = "";
            if (next == 100 || next == 105) {
              if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], null);
              else argText = reSign(currArg, 8 * argSize, 1).toString(10)
            } else if (next == 117) {
              if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], true);
              else argText = unSign(currArg, 8 * argSize, 1).toString(10);
              currArg = Math.abs(currArg)
            } else if (next == 111) {
              argText = (flagAlternative ? "0" : "") + currAbsArg.toString(8)
            } else if (next == 120 || next == 88) {
              prefix = flagAlternative && currArg != 0 ? "0x" : "";
              if (argSize == 8 && i64Math) {
                if (origArg[1]) {
                  argText = (origArg[1] >>> 0).toString(16);
                  var lower = (origArg[0] >>> 0).toString(16);
                  while (lower.length < 8) lower = "0" + lower;
                  argText += lower
                } else {
                  argText = (origArg[0] >>> 0).toString(16)
                }
              } else if (currArg < 0) {
                currArg = -currArg;
                argText = (currAbsArg - 1).toString(16);
                var buffer = [];
                for (var i = 0; i < argText.length; i++) {
                  buffer.push((15 - parseInt(argText[i], 16)).toString(16))
                }
                argText = buffer.join("");
                while (argText.length < argSize * 2) argText = "f" + argText
              } else {
                argText = currAbsArg.toString(16)
              }
              if (next == 88) {
                prefix = prefix.toUpperCase();
                argText = argText.toUpperCase()
              }
            } else if (next == 112) {
              if (currAbsArg === 0) {
                argText = "(nil)"
              } else {
                prefix = "0x";
                argText = currAbsArg.toString(16)
              }
            }
            if (precisionSet) {
              while (argText.length < precision) {
                argText = "0" + argText
              }
            }
            if (currArg >= 0) {
              if (flagAlwaysSigned) {
                prefix = "+" + prefix
              } else if (flagPadSign) {
                prefix = " " + prefix
              }
            }
            if (argText.charAt(0) == "-") {
              prefix = "-" + prefix;
              argText = argText.substr(1)
            }
            while (prefix.length + argText.length < width) {
              if (flagLeftAlign) {
                argText += " "
              } else {
                if (flagZeroPad) {
                  argText = "0" + argText
                } else {
                  prefix = " " + prefix
                }
              }
            }
            argText = prefix + argText;argText.split("").forEach((function (chr) {
              ret.push(chr.charCodeAt(0))
            }));
            break
          };
        case "f":
        case "F":
        case "e":
        case "E":
        case "g":
        case "G":
          {
            var currArg = getNextArg("double");
            var argText;
            if (isNaN(currArg)) {
              argText = "nan";
              flagZeroPad = false
            } else if (!isFinite(currArg)) {
              argText = (currArg < 0 ? "-" : "") + "inf";
              flagZeroPad = false
            } else {
              var isGeneral = false;
              var effectivePrecision = Math.min(precision, 20);
              if (next == 103 || next == 71) {
                isGeneral = true;
                precision = precision || 1;
                var exponent = parseInt(currArg.toExponential(effectivePrecision).split("e")[1], 10);
                if (precision > exponent && exponent >= -4) {
                  next = (next == 103 ? "f" : "F").charCodeAt(0);
                  precision -= exponent + 1
                } else {
                  next = (next == 103 ? "e" : "E").charCodeAt(0);
                  precision--
                }
                effectivePrecision = Math.min(precision, 20)
              }
              if (next == 101 || next == 69) {
                argText = currArg.toExponential(effectivePrecision);
                if (/[eE][-+]\d$/.test(argText)) {
                  argText = argText.slice(0, -1) + "0" + argText.slice(-1)
                }
              } else if (next == 102 || next == 70) {
                argText = currArg.toFixed(effectivePrecision);
                if (currArg === 0 && __reallyNegative(currArg)) {
                  argText = "-" + argText
                }
              }
              var parts = argText.split("e");
              if (isGeneral && !flagAlternative) {
                while (parts[0].length > 1 && parts[0].indexOf(".") != -1 && (parts[0].slice(-1) == "0" || parts[0].slice(-1) == ".")) {
                  parts[0] = parts[0].slice(0, -1)
                }
              } else {
                if (flagAlternative && argText.indexOf(".") == -1) parts[0] += ".";
                while (precision > effectivePrecision++) parts[0] += "0"
              }
              argText = parts[0] + (parts.length > 1 ? "e" + parts[1] : "");
              if (next == 69) argText = argText.toUpperCase();
              if (currArg >= 0) {
                if (flagAlwaysSigned) {
                  argText = "+" + argText
                } else if (flagPadSign) {
                  argText = " " + argText
                }
              }
            }
            while (argText.length < width) {
              if (flagLeftAlign) {
                argText += " "
              } else {
                if (flagZeroPad && (argText[0] == "-" || argText[0] == "+")) {
                  argText = argText[0] + "0" + argText.slice(1)
                } else {
                  argText = (flagZeroPad ? "0" : " ") + argText
                }
              }
            }
            if (next < 97) argText = argText.toUpperCase();argText.split("").forEach((function (chr) {
              ret.push(chr.charCodeAt(0))
            }));
            break
          };
        case "s":
          {
            var arg = getNextArg("i8*");
            var argLength = arg ? _strlen(arg) : "(null)".length;
            if (precisionSet) argLength = Math.min(argLength, precision);
            if (!flagLeftAlign) {
              while (argLength < width--) {
                ret.push(32)
              }
            }
            if (arg) {
              for (var i = 0; i < argLength; i++) {
                ret.push(HEAPU8[arg++ >> 0])
              }
            } else {
              ret = ret.concat(intArrayFromString("(null)".substr(0, argLength), true))
            }
            if (flagLeftAlign) {
              while (argLength < width--) {
                ret.push(32)
              }
            }
            break
          };
        case "c":
          {
            if (flagLeftAlign) ret.push(getNextArg("i8"));
            while (--width > 0) {
              ret.push(32)
            }
            if (!flagLeftAlign) ret.push(getNextArg("i8"));
            break
          };
        case "n":
          {
            var ptr = getNextArg("i32*");HEAP32[ptr >> 2] = ret.length;
            break
          };
        case "%":
          {
            ret.push(curr);
            break
          };
        default:
          {
            for (var i = startTextIndex; i < textIndex + 2; i++) {
              ret.push(HEAP8[i >> 0])
            }
          }
        }
        textIndex += 2
      } else {
        ret.push(curr);
        textIndex += 1
      }
    }
    return ret
  }

  function _fprintf(stream, format, varargs) {
    var result = __formatString(format, varargs);
    var stack = Runtime.stackSave();
    var ret = _fwrite(allocate(result, "i8", ALLOC_STACK), 1, result.length, stream);
    Runtime.stackRestore(stack);
    return ret
  }

  function _printf(format, varargs) {
    var stdout = HEAP32[_stdout >> 2];
    return _fprintf(stdout, format, varargs)
  }

  function _open(path, oflag, varargs) {
    var mode = HEAP32[varargs >> 2];
    path = Pointer_stringify(path);
    try {
      var stream = FS.open(path, oflag, mode);
      return stream.fd
    } catch (e) {
      FS.handleFSError(e);
      return -1
    }
  }

  function _fopen(filename, mode) {
    var flags;
    mode = Pointer_stringify(mode);
    if (mode[0] == "r") {
      if (mode.indexOf("+") != -1) {
        flags = 2
      } else {
        flags = 0
      }
    } else if (mode[0] == "w") {
      if (mode.indexOf("+") != -1) {
        flags = 2
      } else {
        flags = 1
      }
      flags |= 64;
      flags |= 512
    } else if (mode[0] == "a") {
      if (mode.indexOf("+") != -1) {
        flags = 2
      } else {
        flags = 1
      }
      flags |= 64;
      flags |= 1024
    } else {
      ___setErrNo(ERRNO_CODES.EINVAL);
      return 0
    }
    var fd = _open(filename, flags, allocate([511, 0, 0, 0], "i32", ALLOC_STACK));
    return fd === -1 ? 0 : FS.getPtrForStream(FS.getStream(fd))
  }

  function _emscripten_memcpy_big(dest, src, num) {
    HEAPU8.set(HEAPU8.subarray(src, src + num), dest);
    return dest
  }
  Module["_memcpy"] = _memcpy;
  Module["_strncpy"] = _strncpy;

  function _sysconf(name) {
    switch (name) {
    case 30:
      return PAGE_SIZE;
    case 85:
      return totalMemory / PAGE_SIZE;
    case 132:
    case 133:
    case 12:
    case 137:
    case 138:
    case 15:
    case 235:
    case 16:
    case 17:
    case 18:
    case 19:
    case 20:
    case 149:
    case 13:
    case 10:
    case 236:
    case 153:
    case 9:
    case 21:
    case 22:
    case 159:
    case 154:
    case 14:
    case 77:
    case 78:
    case 139:
    case 80:
    case 81:
    case 79:
    case 82:
    case 68:
    case 67:
    case 164:
    case 11:
    case 29:
    case 47:
    case 48:
    case 95:
    case 52:
    case 51:
    case 46:
      return 200809;
    case 27:
    case 246:
    case 127:
    case 128:
    case 23:
    case 24:
    case 160:
    case 161:
    case 181:
    case 182:
    case 242:
    case 183:
    case 184:
    case 243:
    case 244:
    case 245:
    case 165:
    case 178:
    case 179:
    case 49:
    case 50:
    case 168:
    case 169:
    case 175:
    case 170:
    case 171:
    case 172:
    case 97:
    case 76:
    case 32:
    case 173:
    case 35:
      return -1;
    case 176:
    case 177:
    case 7:
    case 155:
    case 8:
    case 157:
    case 125:
    case 126:
    case 92:
    case 93:
    case 129:
    case 130:
    case 131:
    case 94:
    case 91:
      return 1;
    case 74:
    case 60:
    case 69:
    case 70:
    case 4:
      return 1024;
    case 31:
    case 42:
    case 72:
      return 32;
    case 87:
    case 26:
    case 33:
      return 2147483647;
    case 34:
    case 1:
      return 47839;
    case 38:
    case 36:
      return 99;
    case 43:
    case 37:
      return 2048;
    case 0:
      return 2097152;
    case 3:
      return 65536;
    case 28:
      return 32768;
    case 44:
      return 32767;
    case 75:
      return 16384;
    case 39:
      return 1e3;
    case 89:
      return 700;
    case 71:
      return 256;
    case 40:
      return 255;
    case 2:
      return 100;
    case 180:
      return 64;
    case 25:
      return 20;
    case 5:
      return 16;
    case 6:
      return 6;
    case 73:
      return 4;
    case 84:
      {
        if (typeof navigator === "object") return navigator["hardwareConcurrency"] || 1;
        return 1
      }
    }
    ___setErrNo(ERRNO_CODES.EINVAL);
    return -1
  }

  function _sbrk(bytes) {
    var self = _sbrk;
    if (!self.called) {
      DYNAMICTOP = alignMemoryPage(DYNAMICTOP);
      self.called = true;
      assert(Runtime.dynamicAlloc);
      self.alloc = Runtime.dynamicAlloc;
      Runtime.dynamicAlloc = (function () {
        abort("cannot dynamically allocate, sbrk now has control")
      })
    }
    var ret = DYNAMICTOP;
    if (bytes != 0) {
      var success = self.alloc(bytes);
      if (!success) return -1 >>> 0
    }
    return ret
  }

  function _lseek(fildes, offset, whence) {
    var stream = FS.getStream(fildes);
    if (!stream) {
      ___setErrNo(ERRNO_CODES.EBADF);
      return -1
    }
    try {
      return FS.llseek(stream, offset, whence)
    } catch (e) {
      FS.handleFSError(e);
      return -1
    }
  }

  function _fseek(stream, offset, whence) {
    var fd = _fileno(stream);
    var ret = _lseek(fd, offset, whence);
    if (ret == -1) {
      return -1
    }
    stream = FS.getStreamFromPtr(stream);
    stream.eof = false;
    return 0
  }

  function ___errno_location() {
    return ___errno_state
  }
  Module["_strcpy"] = _strcpy;

  function _time(ptr) {
    var ret = Date.now() / 1e3 | 0;
    if (ptr) {
      HEAP32[ptr >> 2] = ret
    }
    return ret
  }
  Module["_llvm_bswap_i32"] = _llvm_bswap_i32;
  var _sin = Math_sin;
  FS.staticInit();
  __ATINIT__.unshift((function () {
    if (!Module["noFSInit"] && !FS.init.initialized) FS.init()
  }));
  __ATMAIN__.push((function () {
    FS.ignorePermissions = false
  }));
  __ATEXIT__.push((function () {
    FS.quit()
  }));
  Module["FS_createFolder"] = FS.createFolder;
  Module["FS_createPath"] = FS.createPath;
  Module["FS_createDataFile"] = FS.createDataFile;
  Module["FS_createPreloadedFile"] = FS.createPreloadedFile;
  Module["FS_createLazyFile"] = FS.createLazyFile;
  Module["FS_createLink"] = FS.createLink;
  Module["FS_createDevice"] = FS.createDevice;
  Module["FS_unlink"] = FS.unlink;
  ___errno_state = Runtime.staticAlloc(4);
  HEAP32[___errno_state >> 2] = 0;
  __ATINIT__.unshift((function () {
    TTY.init()
  }));
  __ATEXIT__.push((function () {
    TTY.shutdown()
  }));
  if (ENVIRONMENT_IS_NODE) {
    var fs = require("fs");
    var NODEJS_PATH = require("path");
    NODEFS.staticInit()
  }
  __ATINIT__.push((function () {
    SOCKFS.root = FS.mount(SOCKFS, {}, null)
  }));
  STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);
  staticSealed = true;
  STACK_MAX = STACK_BASE + TOTAL_STACK;
  DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);
  assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");
  var cttz_i8 = allocate([8, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 6, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 7, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 6, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0], "i8", ALLOC_DYNAMIC);

  function nullFunc_ii(x) {
    Module["printErr"]("Invalid function pointer called with signature 'ii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");
    Module["printErr"]("Build with ASSERTIONS=2 for more info.");
    abort(x)
  }

  function nullFunc_iiii(x) {
    Module["printErr"]("Invalid function pointer called with signature 'iiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");
    Module["printErr"]("Build with ASSERTIONS=2 for more info.");
    abort(x)
  }

  function nullFunc_iiiii(x) {
    Module["printErr"]("Invalid function pointer called with signature 'iiiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");
    Module["printErr"]("Build with ASSERTIONS=2 for more info.");
    abort(x)
  }

  function nullFunc_viii(x) {
    Module["printErr"]("Invalid function pointer called with signature 'viii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");
    Module["printErr"]("Build with ASSERTIONS=2 for more info.");
    abort(x)
  }

  function invoke_ii(index, a1) {
    try {
      return Module["dynCall_ii"](index, a1)
    } catch (e) {
      if (typeof e !== "number" && e !== "longjmp") throw e;
      asm["setThrew"](1, 0)
    }
  }

  function invoke_iiii(index, a1, a2, a3) {
    try {
      return Module["dynCall_iiii"](index, a1, a2, a3)
    } catch (e) {
      if (typeof e !== "number" && e !== "longjmp") throw e;
      asm["setThrew"](1, 0)
    }
  }

  function invoke_iiiii(index, a1, a2, a3, a4) {
    try {
      return Module["dynCall_iiiii"](index, a1, a2, a3, a4)
    } catch (e) {
      if (typeof e !== "number" && e !== "longjmp") throw e;
      asm["setThrew"](1, 0)
    }
  }

  function invoke_viii(index, a1, a2, a3) {
    try {
      Module["dynCall_viii"](index, a1, a2, a3)
    } catch (e) {
      if (typeof e !== "number" && e !== "longjmp") throw e;
      asm["setThrew"](1, 0)
    }
  }
  Module.asmGlobalArg = {
    "Math": Math,
    "Int8Array": Int8Array,
    "Int16Array": Int16Array,
    "Int32Array": Int32Array,
    "Uint8Array": Uint8Array,
    "Uint16Array": Uint16Array,
    "Uint32Array": Uint32Array,
    "Float32Array": Float32Array,
    "Float64Array": Float64Array,
    "NaN": NaN,
    "Infinity": Infinity
  };
  Module.asmLibraryArg = {
    "abort": abort,
    "assert": assert,
    "nullFunc_ii": nullFunc_ii,
    "nullFunc_iiii": nullFunc_iiii,
    "nullFunc_iiiii": nullFunc_iiiii,
    "nullFunc_viii": nullFunc_viii,
    "invoke_ii": invoke_ii,
    "invoke_iiii": invoke_iiii,
    "invoke_iiiii": invoke_iiiii,
    "invoke_viii": invoke_viii,
    "_sin": _sin,
    "_send": _send,
    "_fread": _fread,
    "_lseek": _lseek,
    "__reallyNegative": __reallyNegative,
    "_fflush": _fflush,
    "_pwrite": _pwrite,
    "_open": _open,
    "_sbrk": _sbrk,
    "_emscripten_memcpy_big": _emscripten_memcpy_big,
    "_fileno": _fileno,
    "_sysconf": _sysconf,
    "___setErrNo": ___setErrNo,
    "_fseek": _fseek,
    "_pread": _pread,
    "_mkport": _mkport,
    "_fclose": _fclose,
    "_write": _write,
    "___errno_location": ___errno_location,
    "_recv": _recv,
    "_printf": _printf,
    "_read": _read,
    "_abort": _abort,
    "_fwrite": _fwrite,
    "_time": _time,
    "_fprintf": _fprintf,
    "__formatString": __formatString,
    "_fopen": _fopen,
    "_close": _close,
    "STACKTOP": STACKTOP,
    "STACK_MAX": STACK_MAX,
    "tempDoublePtr": tempDoublePtr,
    "ABORT": ABORT,
    "cttz_i8": cttz_i8
  }; // EMSCRIPTEN_START_ASM
  var asm = (function (global, env, buffer) {
    "use asm";
    var a = new global.Int8Array(buffer);
    var b = new global.Int16Array(buffer);
    var c = new global.Int32Array(buffer);
    var d = new global.Uint8Array(buffer);
    var e = new global.Uint16Array(buffer);
    var f = new global.Uint32Array(buffer);
    var g = new global.Float32Array(buffer);
    var h = new global.Float64Array(buffer);
    var i = env.STACKTOP | 0;
    var j = env.STACK_MAX | 0;
    var k = env.tempDoublePtr | 0;
    var l = env.ABORT | 0;
    var m = env.cttz_i8 | 0;
    var n = 0;
    var o = 0;
    var p = 0;
    var q = 0;
    var r = global.NaN,
      s = global.Infinity;
    var t = 0,
      u = 0,
      v = 0,
      w = 0,
      x = 0.0,
      y = 0,
      z = 0,
      A = 0,
      B = 0.0;
    var C = 0;
    var D = 0;
    var E = 0;
    var F = 0;
    var G = 0;
    var H = 0;
    var I = 0;
    var J = 0;
    var K = 0;
    var L = 0;
    var M = global.Math.floor;
    var N = global.Math.abs;
    var O = global.Math.sqrt;
    var P = global.Math.pow;
    var Q = global.Math.cos;
    var R = global.Math.sin;
    var S = global.Math.tan;
    var T = global.Math.acos;
    var U = global.Math.asin;
    var V = global.Math.atan;
    var W = global.Math.atan2;
    var X = global.Math.exp;
    var Y = global.Math.log;
    var Z = global.Math.ceil;
    var _ = global.Math.imul;
    var $ = global.Math.min;
    var aa = global.Math.clz32;
    var ba = env.abort;
    var ca = env.assert;
    var da = env.nullFunc_ii;
    var ea = env.nullFunc_iiii;
    var fa = env.nullFunc_iiiii;
    var ga = env.nullFunc_viii;
    var ha = env.invoke_ii;
    var ia = env.invoke_iiii;
    var ja = env.invoke_iiiii;
    var ka = env.invoke_viii;
    var la = env._sin;
    var ma = env._send;
    var na = env._fread;
    var oa = env._lseek;
    var pa = env.__reallyNegative;
    var qa = env._fflush;
    var ra = env._pwrite;
    var sa = env._open;
    var ta = env._sbrk;
    var ua = env._emscripten_memcpy_big;
    var va = env._fileno;
    var wa = env._sysconf;
    var xa = env.___setErrNo;
    var ya = env._fseek;
    var za = env._pread;
    var Aa = env._mkport;
    var Ba = env._fclose;
    var Ca = env._write;
    var Da = env.___errno_location;
    var Ea = env._recv;
    var Fa = env._printf;
    var Ga = env._read;
    var Ha = env._abort;
    var Ia = env._fwrite;
    var Ja = env._time;
    var Ka = env._fprintf;
    var La = env.__formatString;
    var Ma = env._fopen;
    var Na = env._close;
    var Oa = 0.0;
    // EMSCRIPTEN_START_FUNCS
    function Ta(a) {
      a = a | 0;
      var b = 0;
      b = i;
      i = i + a | 0;
      i = i + 15 & -16;
      if ((i | 0) >= (j | 0)) ba();
      return b | 0
    }

    function Ua() {
      return i | 0
    }

    function Va(a) {
      a = a | 0;
      i = a
    }

    function Wa(a, b) {
      a = a | 0;
      b = b | 0;
      if (!n) {
        n = a;
        o = b
      }
    }

    function Xa(b) {
      b = b | 0;
      a[k >> 0] = a[b >> 0];
      a[k + 1 >> 0] = a[b + 1 >> 0];
      a[k + 2 >> 0] = a[b + 2 >> 0];
      a[k + 3 >> 0] = a[b + 3 >> 0]
    }

    function Ya(b) {
      b = b | 0;
      a[k >> 0] = a[b >> 0];
      a[k + 1 >> 0] = a[b + 1 >> 0];
      a[k + 2 >> 0] = a[b + 2 >> 0];
      a[k + 3 >> 0] = a[b + 3 >> 0];
      a[k + 4 >> 0] = a[b + 4 >> 0];
      a[k + 5 >> 0] = a[b + 5 >> 0];
      a[k + 6 >> 0] = a[b + 6 >> 0];
      a[k + 7 >> 0] = a[b + 7 >> 0]
    }

    function Za(a) {
      a = a | 0;
      C = a
    }

    function _a() {
      return C | 0
    }

    function $a(e, f, g, h, k) {
      e = e | 0;
      f = f | 0;
      g = g | 0;
      h = h | 0;
      k = k | 0;
      var l = 0,
        m = 0,
        n = 0,
        o = 0,
        p = 0,
        q = 0,
        r = 0,
        s = 0,
        t = 0,
        u = 0,
        v = 0.0,
        w = 0,
        x = 0;
      x = i;
      i = i + 224 | 0;
      if ((i | 0) >= (j | 0)) ba();
      if ((g | 0) == 16) g = -32752;
      else g = (g | 0) == 8 ? -32760 : g & 65535;
      if (!e) {
        q = 0;
        i = x;
        return q | 0
      }
      w = Mb(13144) | 0;
      if (!w) {
        q = 0;
        i = x;
        return q | 0
      }
      Pb(w | 0, 0, 13144) | 0;
      l = 0;
      while (1) {
        m = 4768 + (l << 2) | 0;
        if (c[m >> 2] | 0) {
          n = Mb(516) | 0;
          if (!n) {
            n = 8;
            break
          }
          Pb(n | 0, 0, 516) | 0;
          c[w + 32 + (l << 2) >> 2] = n;
          c[n >> 2] = c[c[m >> 2] >> 2]
        }
        n = 5280 + (l << 2) | 0;
        if (c[n >> 2] | 0) {
          m = Mb(516) | 0;
          if (!m) {
            n = 12;
            break
          }
          Pb(m | 0, 0, 516) | 0;
          c[w + 544 + (l << 2) >> 2] = m;
          c[m >> 2] = c[c[n >> 2] >> 2]
        }
        l = l + 1 | 0;
        if ((l | 0) >= 128) {
          n = 15;
          break
        }
      }
      do
        if ((n | 0) == 8) c[w + 32 + (l << 2) >> 2] = 0;
        else if ((n | 0) == 12) c[w + 544 + (l << 2) >> 2] = 0;
      else if ((n | 0) == 15) {
        c[w + 24 >> 2] = 70;
        c[w + 13060 >> 2] = 32;
        c[w + 13064 >> 2] = 512;
        c[w + 8 >> 2] = f;
        q = (g & 255) == 16 ? 4 : 0;
        q = g << 16 >> 16 < 0 ? q | 2 : q;
        c[w + 12 >> 2] = h << 24 >> 24 == 1 ? q | 1 : q;
        g = g & 65535;
        if ((g | 0) == 32776) c[w + 1068 >> 2] = 1;
        else if ((g | 0) == 8) c[w + 1068 >> 2] = 2;
        else if ((g | 0) == 32784) c[w + 1068 >> 2] = 3;
        else if ((g | 0) == 36880) c[w + 1068 >> 2] = 4;
        else if ((g | 0) == 16) c[w + 1068 >> 2] = 5;
        else c[w + 1068 >> 2] = 5;
        c[w + 1072 >> 2] = k & 65535;
        g = Mb((k & 65535) << 1) | 0;
        if (!g) {
          c[w + 1076 >> 2] = 0;
          break
        }
        Pb(g | 0, 0, (k & 65535) << 1 | 0) | 0;
        c[w + 1076 >> 2] = g;
        g = Mb((k & 65535) << 3) | 0;
        if (!g) {
          c[w + 1080 >> 2] = 0;
          break
        }
        Pb(g | 0, 0, (k & 65535) << 3 | 0) | 0;
        c[w + 1080 >> 2] = g;
        q = c[w + 12 >> 2] | 0;
        c[w + 16 >> 2] = _((q >>> 2 & 1) + 1 | 0, 2 - (q & 1) | 0) | 0;
        c[w + 13068 >> 2] = (f | 0) / 1e3 | 0;
        if ((f | 0) >= 1e3) {
          if ((f | 0) > 255999) c[w + 13068 >> 2] = 255
        } else c[w + 13068 >> 2] = 1;
        c[w + 13072 >> 2] = 0;
        c[w + 13076 >> 2] = 0;
        c[w + 13100 >> 2] = 0;
        c[w + 13104 >> 2] = 0;
        c[w + 13092 >> 2] = 0;
        a: do
          if ((Ra[c[e >> 2] & 1](c[e + 16 >> 2] | 0, x + 208 | 0, 1, 4) | 0) == 4 ? (Ra[c[e >> 2] & 1](c[e + 16 >> 2] | 0, x + 4 | 0, 4, 1) | 0) == 1 : 0) {
            h = a[x + 208 >> 0] | 0;
            do
              if (h << 24 >> 24 == 82) {
                if (((a[x + 208 + 1 >> 0] | 0) == 73 ? (a[x + 208 + 2 >> 0] | 0) == 70 : 0) ? (a[x + 208 + 3 >> 0] | 0) == 70 : 0) {
                  q = (Ra[c[e >> 2] & 1](c[e + 16 >> 2] | 0, x + 208 | 0, 1, 4) | 0) == 4;
                  if (!(q & (a[x + 208 >> 0] | 0) == 82 & (a[x + 208 + 1 >> 0] | 0) == 77 & (a[x + 208 + 2 >> 0] | 0) == 73 & (a[x + 208 + 3 >> 0] | 0) == 68)) {
                    h = 0;
                    break a
                  }
                  q = (Ra[c[e >> 2] & 1](c[e + 16 >> 2] | 0, x + 208 | 0, 1, 4) | 0) == 4;
                  if (!(q & (a[x + 208 >> 0] | 0) == 100 & (a[x + 208 + 1 >> 0] | 0) == 97 & (a[x + 208 + 2 >> 0] | 0) == 116 & (a[x + 208 + 3 >> 0] | 0) == 97)) {
                    h = 0;
                    break a
                  }
                  if ((Ra[c[e >> 2] & 1](c[e + 16 >> 2] | 0, x + 208 | 0, 1, 4) | 0) != 4) {
                    h = 0;
                    break a
                  }
                  if ((Ra[c[e >> 2] & 1](c[e + 16 >> 2] | 0, x + 208 | 0, 1, 4) | 0) != 4) {
                    h = 0;
                    break a
                  }
                  if ((Ra[c[e >> 2] & 1](c[e + 16 >> 2] | 0, x + 4 | 0, 4, 1) | 0) != 1) {
                    h = 0;
                    break a
                  }
                  h = a[x + 208 >> 0] | 0;
                  n = 41;
                  break
                }
                g = Wb(c[x + 4 >> 2] | 0) | 0;
                c[x + 4 >> 2] = g;
                h = 82;
                l = 77;
                n = 43
              } else n = 41; while (0);
            if ((n | 0) == 41) {
              g = Wb(c[x + 4 >> 2] | 0) | 0;
              c[x + 4 >> 2] = g;
              if (h << 24 >> 24 == 77) {
                h = a[x + 208 + 1 >> 0] | 0;
                if (h << 24 >> 24 == 84) {
                  h = a[x + 208 + 2 >> 0] | 0;
                  if (h << 24 >> 24 == 104) {
                    h = a[x + 208 + 3 >> 0] | 0;
                    if (h << 24 >> 24 == 100) l = 0;
                    else {
                      l = 100;
                      n = 43
                    }
                  } else {
                    l = 104;
                    n = 43
                  }
                } else {
                  l = 84;
                  n = 43
                }
              } else {
                l = 77;
                n = 43
              }
            }
            if ((n | 0) == 43) l = (h & 255) - l | 0;
            if (!((g | 0) < 6 | (l | 0) != 0)) {
              Ra[c[e >> 2] & 1](c[e + 16 >> 2] | 0, x + 204 | 0, 2, 1) | 0;
              Ra[c[e >> 2] & 1](c[e + 16 >> 2] | 0, x + 202 | 0, 2, 1) | 0;
              Ra[c[e >> 2] & 1](c[e + 16 >> 2] | 0, x + 200 | 0, 2, 1) | 0;
              l = b[x + 204 >> 1] | 0;
              b[x + 204 >> 1] = l >>> 8 & 255 | l << 8;
              q = b[x + 202 >> 1] | 0;
              b[x + 202 >> 1] = q >>> 8 & 255 | q << 8;
              q = b[x + 200 >> 1] | 0;
              b[x + 200 >> 1] = q >>> 8 & 255 | q << 8;
              h = (q >>> 8 & 255 | q << 8) << 16 >> 16;
              if (((q >>> 8 & 255 | q << 8) << 16 | 0) < 0) h = _((h | 0) / -256 | 0, h & 255) | 0;
              g = c[x + 4 >> 2] | 0;
              if ((g | 0) > 6) {
                Qa[c[e + 4 >> 2] & 1](c[e + 16 >> 2] | 0, g + -6 | 0, 1) | 0;
                g = b[x + 204 >> 1] | 0
              } else g = (l >>> 8 & 255 | l << 8) & 65535;
              if ((g & 65535) <= 2) {
                l = Mb(12) | 0;
                if (!l) {
                  c[w + 13092 >> 2] = 0;
                  c[w >> 2] = 1;
                  h = 0;
                  break
                }
                m = l;
                n = m + 12 | 0;
                do {
                  a[m >> 0] = 0;
                  m = m + 1 | 0
                } while ((m | 0) < (n | 0));
                c[w + 13092 >> 2] = l;
                a[l + 5 >> 0] = 0;
                c[w + 13100 >> 2] = (c[w + 13100 >> 2] | 0) + 1;
                g = b[x + 204 >> 1] | 0;
                b: do
                    if ((g | 0) == 2) {
                      if ((b[x + 202 >> 1] | 0) > 0) {
                        g = 0;
                        while (1) {
                          g = g + 1 | 0;
                          if (db(e, w, 1) | 0) break;
                          if ((g | 0) >= (b[x + 202 >> 1] | 0)) break b
                        }
                        h = c[w + 13092 >> 2] | 0;
                        if (h)
                          do {
                            q = h;
                            h = c[h + 8 >> 2] | 0;
                            Nb(q)
                          } while ((h | 0) != 0);
                        c[w + 13092 >> 2] = 0;
                        h = 0;
                        break a
                      }
                    } else
                  if ((g | 0) == 1) {
                    if ((b[x + 202 >> 1] | 0) > 0) {
                      g = 0;
                      while (1) {
                        g = g + 1 | 0;
                        if (db(e, w, 0) | 0) break;
                        if ((g | 0) >= (b[x + 202 >> 1] | 0)) break b
                      }
                      h = c[w + 13092 >> 2] | 0;
                      if (h)
                        do {
                          q = h;
                          h = c[h + 8 >> 2] | 0;
                          Nb(q)
                        } while ((h | 0) != 0);
                      c[w + 13092 >> 2] = 0;
                      h = 0;
                      break a
                    }
                  } else
                if ((g | 0) == 0 ? (db(e, w, 0) | 0) != 0 : 0) {
                  h = c[w + 13092 >> 2] | 0;
                  if (h)
                    do {
                      q = h;
                      h = c[h + 8 >> 2] | 0;
                      Nb(q)
                    } while ((h | 0) != 0);
                  c[w + 13092 >> 2] = 0;
                  h = 0;
                  break a
                }
                while (0);
                g = c[w + 1064 >> 2] | 0;
                m = x + 136 | 0;
                n = m + 64 | 0;
                do {
                  c[m >> 2] = 0;
                  m = m + 4 | 0
                } while ((m | 0) < (n | 0));
                m = x + 72 | 0;
                n = m + 64 | 0;
                do {
                  c[m >> 2] = 0;
                  m = m + 4 | 0
                } while ((m | 0) < (n | 0));
                c[x + 8 >> 2] = g;
                c[x + 8 + 4 >> 2] = g;
                c[x + 8 + 8 >> 2] = g;
                c[x + 8 + 12 >> 2] = g;
                c[x + 8 + 16 >> 2] = g;
                c[x + 8 + 20 >> 2] = g;
                c[x + 8 + 24 >> 2] = g;
                c[x + 8 + 28 >> 2] = g;
                c[x + 8 + 32 >> 2] = g;
                c[x + 8 + 36 >> 2] = g;
                c[x + 8 + 40 >> 2] = g;
                c[x + 8 + 44 >> 2] = g;
                c[x + 8 + 48 >> 2] = g;
                c[x + 8 + 52 >> 2] = g;
                c[x + 8 + 56 >> 2] = g;
                c[x + 8 + 60 >> 2] = g;
                v = +(h | 0);
                g = ~~(+(c[w + 8 >> 2] | 0) * 5.0e5 * .065536 / v);
                c[w + 1088 >> 2] = g & 65535;
                c[w + 1084 >> 2] = g >> 16;
                g = (c[w + 13100 >> 2] << 3) + 8 | 0;
                h = Mb(g) | 0;
                if (!h) {
                  c[w >> 2] = 1;
                  h = c[w + 13092 >> 2] | 0;
                  if (h)
                    do {
                      q = h;
                      h = c[h + 8 >> 2] | 0;
                      Nb(q)
                    } while ((h | 0) != 0);
                  c[w + 13092 >> 2] = 0;
                  h = 0
                } else {
                  Pb(h | 0, 0, g | 0) | 0;
                  g = c[w + 13100 >> 2] | 0;
                  if ((g | 0) > 0) {
                    r = 0;
                    k = 2;
                    u = 0;
                    t = h;
                    f = w + 13092 | 0;
                    l = 0;
                    o = 0;
                    n = 0;
                    while (1) {
                      e = c[f >> 2] | 0;
                      s = a[e + 5 >> 0] | 0;
                      do
                        if (s << 24 >> 24 != 10)
                          if ((s & 255 | 0) == 9) {
                            f = d[e + 4 >> 0] | 0;
                            m = d[e + 6 >> 0] | 0;
                            if (!(1 << f & c[w + 13064 >> 2])) {
                              q = c[x + 8 + (f << 2) >> 2] | 0;
                              if ((q | 0) == -1 | (q | 0) == (m | 0)) {
                                f = k;
                                p = 1;
                                break
                              }
                              c[x + 8 + (f << 2) >> 2] = m;
                              f = k;
                              p = 0;
                              break
                            }
                            if (!(c[w + 544 + (m << 2) >> 2] | 0)) {
                              a[e + 6 >> 0] = 0;
                              m = 0
                            }
                            if ((c[x + 72 + (f << 2) >> 2] | 0) == (m | 0)) {
                              f = k;
                              p = 1;
                              break
                            }
                            c[x + 72 + (f << 2) >> 2] = m;
                            f = k;
                            p = 0;
                            break
                          } else if ((s & 255 | 0) == 1) {
                        k = (k | 0) != 0 & 1;
                        m = d[e + 4 >> 0] | 0;
                        if (1 << m & c[w + 13064 >> 2]) {
                          m = (c[w + 544 + (c[x + 72 + (m << 2) >> 2] << 2) >> 2] | 0) + 4 + (d[e + 6 >> 0] << 2) | 0;
                          if (c[m >> 2] | 0) {
                            f = k;
                            p = 0;
                            break
                          }
                          c[m >> 2] = -1;
                          f = k;
                          p = 0;
                          break
                        }
                        f = c[x + 8 + (m << 2) >> 2] | 0;
                        if ((f | 0) == -1) {
                          f = k;
                          p = 0;
                          break
                        }
                        m = (c[w + 32 + (c[x + 136 + (m << 2) >> 2] << 2) >> 2] | 0) + 4 + (f << 2) | 0;
                        if (c[m >> 2] | 0) {
                          f = k;
                          p = 0;
                          break
                        }
                        c[m >> 2] = -1;
                        f = k;
                        p = 0;
                        break
                      } else if ((s & 255 | 0) == 15) {
                        m = d[e + 4 >> 0] | 0;
                        if (1 << m & c[w + 13064 >> 2]) {
                          f = k;
                          p = 1;
                          break
                        }
                        f = d[e + 6 >> 0] | 0;
                        if (!(c[w + 32 + (f << 2) >> 2] | 0)) {
                          a[e + 6 >> 0] = 0;
                          f = 0
                        }
                        if ((c[x + 136 + (m << 2) >> 2] | 0) == (f | 0)) {
                          f = k;
                          p = 1;
                          break
                        }
                        c[x + 136 + (m << 2) >> 2] = f;
                        f = k;
                        p = 0;
                        break
                      } else {
                        f = k;
                        p = 0;
                        break
                      } else {
                        f = k;
                        p = 1
                      }
                      while (0);
                      q = c[e >> 2] | 0;
                      m = q - r | 0;
                      if ((f | 0) != 0 | (q | 0) == (r | 0)) k = (f | 0) == 1 ? 0 : f;
                      else {
                        k = _(c[w + 1084 >> 2] | 0, m) | 0;
                        f = (_(c[w + 1088 >> 2] | 0, m) | 0) + o | 0;
                        if (f >>> 0 > 65535) {
                          m = f & 65535;
                          f = (f >>> 16) + k | 0
                        } else {
                          m = f;
                          f = k
                        }
                        k = 0;
                        o = m;
                        n = f + n | 0
                      }
                      if (s << 24 >> 24 == 10) {
                        f = ~~(+(c[w + 8 >> 2] | 0) * +(d[e + 7 >> 0] << 8 | d[e + 4 >> 0] | d[e + 6 >> 0] << 16 | 0) * .065536 / v);
                        c[w + 1088 >> 2] = f & 65535;
                        c[w + 1084 >> 2] = f >> 16
                      }
                      if (!p) {
                        f = c[e + 4 >> 2] | 0;
                        g = t;
                        c[g >> 2] = c[e >> 2];
                        c[g + 4 >> 2] = f;
                        c[t >> 2] = n;
                        g = c[w + 13100 >> 2] | 0;
                        f = c[e >> 2] | 0;
                        m = t + 8 | 0;
                        l = l + 1 | 0
                      } else {
                        f = q;
                        m = t
                      }
                      u = u + 1 | 0;
                      if ((u | 0) >= (g | 0)) {
                        g = m;
                        break
                      } else {
                        r = f;
                        t = m;
                        f = e + 8 | 0
                      }
                    }
                  } else {
                    g = h;
                    l = 0;
                    n = 0
                  }
                  c[g >> 2] = n;
                  a[g + 5 >> 0] = 99;
                  l = l + 1 | 0;
                  g = c[w + 13092 >> 2] | 0;
                  if (g)
                    do {
                      q = g;
                      g = c[g + 8 >> 2] | 0;
                      Nb(q)
                    } while ((g | 0) != 0);
                  c[w + 13092 >> 2] = 0;
                  c[w + 13108 >> 2] = l;
                  c[w + 13080 >> 2] = n
                }
              } else h = 0
            } else h = 0
          } else h = 0; while (0);
        c[w + 13084 >> 2] = h;
        if (h) {
          c[w + 1060 >> 2] = 0;
          c[w + 1064 >> 2] = 0;
          if ((a[5816] | 0) != 0 ? (Db(w, 5816, w + 1060 | 0, -1, -1, -1, 0, 0, 0), (c[w + 1060 >> 2] | 0) != 0) : 0) {
            c[w + 1064 >> 2] = -1;
            g = 127;
            h = 0
          } else {
            g = 127;
            h = 0
          }
          while (1) {
            if (c[w + 32 + (g << 2) >> 2] | 0) h = (Cb(w, 0, g) | 0) + h | 0;
            if (c[w + 544 + (g << 2) >> 2] | 0) h = (Cb(w, 1, g) | 0) + h | 0;
            if (!g) break;
            else g = g + -1 | 0
          }
          c[x >> 2] = h;
          Fa(6072, x | 0) | 0;
          if (!(c[w >> 2] | 0)) {
            q = w;
            i = x;
            return q | 0
          }
        }
      }
      while (0);
      Hb(w);
      q = 0;
      i = x;
      return q | 0
    }

    function ab(a) {
      a = a | 0;
      var b = 0,
        d = 0,
        e = 0,
        f = 0,
        g = 0,
        h = 0;
      h = 127;
      b = 0;
      while (1) {
        e = c[a + 32 + (h << 2) >> 2] | 0;
        if (e) {
          f = 0;
          g = 0;
          do {
            if ((c[e + 4 + (g << 2) >> 2] | 0) == (-1 | 0)) d = c[(c[e >> 2] | 0) + (g * 28 | 0) >> 2] | 0;
            else d = 0;
            f = ((d | 0) != 0 & 1) + f | 0;
            g = g + 1 | 0
          } while ((g | 0) != 128);
          b = f + b | 0
        }
        e = c[a + 544 + (h << 2) >> 2] | 0;
        if (e) {
          f = 0;
          g = 0;
          do {
            if ((c[e + 4 + (g << 2) >> 2] | 0) == (-1 | 0)) d = c[(c[e >> 2] | 0) + (g * 28 | 0) >> 2] | 0;
            else d = 0;
            f = ((d | 0) != 0 & 1) + f | 0;
            g = g + 1 | 0
          } while ((g | 0) != 128);
          b = f + b | 0
        }
        if (!h) break;
        else h = h + -1 | 0
      }
      return b | 0
    }

    function bb(a, b) {
      a = a | 0;
      b = b | 0;
      var d = 0,
        e = 0,
        f = 0,
        g = 0,
        h = 0,
        i = 0;
      d = 0;
      i = 128;
      e = -1;
      while (1) {
        if (!i) {
          e = 19;
          break
        }
        i = i + -1 | 0;
        g = c[a + 32 + (i << 2) >> 2] | 0;
        if (g) {
          h = 0;
          do {
            if ((e | 0) == (b | 0)) e = b;
            else {
              if ((c[g + 4 + (h << 2) >> 2] | 0) == (-1 | 0)) f = c[(c[g >> 2] | 0) + (h * 28 | 0) >> 2] | 0;
              else f = 0;
              d = f;
              e = ((f | 0) != 0 & 1) + e | 0
            }
            h = h + 1 | 0
          } while ((h | 0) != 128)
        }
        if ((e | 0) == (b | 0)) {
          e = 19;
          break
        }
        g = c[a + 544 + (i << 2) >> 2] | 0;
        if (g) {
          h = 0;
          do {
            if ((e | 0) == (b | 0)) e = b;
            else {
              if ((c[g + 4 + (h << 2) >> 2] | 0) == (-1 | 0)) f = c[(c[g >> 2] | 0) + (h * 28 | 0) >> 2] | 0;
              else f = 0;
              d = f;
              e = ((f | 0) != 0 & 1) + e | 0
            }
            h = h + 1 | 0
          } while ((h | 0) != 128)
        }
        if ((e | 0) == (b | 0)) {
          e = 19;
          break
        }
      }
      if ((e | 0) == 19) return d | 0;
      return 0
    }

    function cb(b) {
      b = b | 0;
      var d = 0,
        e = 0,
        f = 0,
        g = 0;
      g = i;
      i = i + 1024 | 0;
      if ((i | 0) >= (j | 0)) ba();
      if (!b) {
        d = 0;
        i = g;
        return d | 0
      }
      if (!(a[b >> 0] | 0)) {
        d = 0;
        i = g;
        return d | 0
      }
      d = Ma(b | 0, 72) | 0;
      if (d) {
        i = g;
        return d | 0
      }
      if ((a[b >> 0] | 0) == 47) {
        d = 0;
        i = g;
        return d | 0
      }
      d = c[2] | 0;
      a: do
          if (d) {
            while (1) {
              a[g >> 0] = 0;
              e = c[d >> 2] | 0;
              f = Rb(e | 0) | 0;
              if ((f | 0) != 0 ? (Vb(g | 0, e | 0) | 0, (a[g + (f + -1) >> 0] | 0) != 47) : 0) {
                a[g + f >> 0] = 47;
                a[g + (f + 1) >> 0] = 0
              }
              Sb(g | 0, b | 0) | 0;
              e = Ma(g | 0, 72) | 0;
              if (e) break;
              d = c[d + 4 >> 2] | 0;
              if (!d) break a
            }
            d = e;
            i = g;
            return d | 0
          }
        while (0);
      d = 0;
      i = g;
      return d | 0
    }

    function db(b, e, f) {
      b = b | 0;
      e = e | 0;
      f = f | 0;
      var g = 0,
        h = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0,
        o = 0;
      o = i;
      i = i + 16 | 0;
      if ((i | 0) >= (j | 0)) ba();
      g = c[e + 13092 >> 2] | 0;
      if ((f | 0) != 0 & (g | 0) != 0) {
        while (1) {
          f = c[g + 8 >> 2] | 0;
          if (!f) break;
          else g = f
        }
        c[e + 13104 >> 2] = c[g >> 2]
      } else c[e + 13104 >> 2] = 0;
      if ((Ra[c[b >> 2] & 1](c[b + 16 >> 2] | 0, o + 4 | 0, 1, 4) | 0) != 4) {
        g = -1;
        i = o;
        return g | 0
      }
      if ((Ra[c[b >> 2] & 1](c[b + 16 >> 2] | 0, o, 4, 1) | 0) != 1) {
        g = -1;
        i = o;
        return g | 0
      }
      c[o >> 2] = Wb(c[o >> 2] | 0) | 0;
      m = Pa[c[b + 8 >> 2] & 3](c[b + 16 >> 2] | 0) | 0;
      m = (c[o >> 2] | 0) + m | 0;
      if ((a[o + 4 >> 0] | 0) != 77) {
        g = -2;
        i = o;
        return g | 0
      }
      if ((a[o + 4 + 1 >> 0] | 0) != 84) {
        g = -2;
        i = o;
        return g | 0
      }
      if ((a[o + 4 + 2 >> 0] | 0) != 114) {
        g = -2;
        i = o;
        return g | 0
      }
      if ((a[o + 4 + 3 >> 0] | 0) != 107) {
        g = -2;
        i = o;
        return g | 0
      }
      while (1) {
        a: while (1) {
          f = 0;
          while (1) {
            Ra[c[b >> 2] & 1](c[b + 16 >> 2] | 0, o + 13 | 0, 1, 1) | 0;
            h = d[o + 13 >> 0] | 0;
            f = h & 127 | f;
            if (!(h & 128)) break;
            else f = f << 7
          }
          c[e + 13104 >> 2] = (c[e + 13104 >> 2] | 0) + f;
          if ((Ra[c[b >> 2] & 1](c[b + 16 >> 2] | 0, o + 12 | 0, 1, 1) | 0) != 1) {
            h = 0;
            break
          }
          f = a[o + 12 >> 0] | 0;
          if (f << 24 >> 24 == -1) {
            Ra[c[b >> 2] & 1](c[b + 16 >> 2] | 0, o + 11 | 0, 1, 1) | 0;
            f = 0;
            while (1) {
              Ra[c[b >> 2] & 1](c[b + 16 >> 2] | 0, o + 13 | 0, 1, 1) | 0;
              h = d[o + 13 >> 0] | 0;
              f = h & 127 | f;
              if (!(h & 128)) break;
              else f = f << 7
            }
            k = a[o + 11 >> 0] | 0;
            if ((k + -1 & 255) >= 15) {
              if ((k & 255 | 0) == 47) {
                h = -1;
                break
              } else if ((k & 255 | 0) == 81) {
                n = 34;
                break
              }
              Qa[c[b + 4 >> 2] & 1](c[b + 16 >> 2] | 0, f, 1) | 0;
              continue
            }
            l = Mb(f + 1 | 0) | 0;
            if (!l) {
              Qa[c[b + 4 >> 2] & 1](c[b + 16 >> 2] | 0, f, 1) | 0;
              continue
            }
            Pb(l | 0, 0, f + 1 | 0) | 0;
            if ((Ra[c[b >> 2] & 1](c[b + 16 >> 2] | 0, l, 1, f) | 0) != (f | 0)) {
              Nb(l);
              continue
            }
            a[l + f >> 0] = 0;
            if (f)
              do {
                f = f + -1 | 0;
                h = l + f | 0;
                if ((d[h >> 0] | 0) < 32) a[h >> 0] = 46
              } while ((f | 0) != 0);
            if ((k & 255 | 0) == 2) f = 1;
            else if ((k & 255 | 0) == 1) f = 0;
            else {
              Nb(l);
              continue
            }
            f = e + 13112 + (f << 2) | 0;
            Nb(c[f >> 2] | 0);
            c[f >> 2] = l;
            continue
          } else if (f << 24 >> 24 == -9 | f << 24 >> 24 == -16) {
            f = 0;
            while (1) {
              Ra[c[b >> 2] & 1](c[b + 16 >> 2] | 0, o + 13 | 0, 1, 1) | 0;
              h = d[o + 13 >> 0] | 0;
              f = h & 127 | f;
              if (!(h & 128)) break;
              else f = f << 7
            }
            Qa[c[b + 4 >> 2] & 1](c[b + 16 >> 2] | 0, f, 1) | 0;
            continue
          } else {
            a[o + 10 >> 0] = f;
            if (f & 128) {
              a[16] = f & 15;
              a[24] = (f & 255) >>> 4 & 7;
              Ra[c[b >> 2] & 1](c[b + 16 >> 2] | 0, o + 10 | 0, 1, 1) | 0;
              f = d[o + 10 >> 0] & 127;
              a[o + 10 >> 0] = f
            }
            switch (d[24] | 0) {
            case 4:
              {
                n = 70;
                break a
              }
            case 0:
              {
                n = 41;
                break a
              }
            case 2:
              {
                n = 47;
                break a
              }
            case 3:
              break;
            case 6:
              {
                n = 73;
                break a
              }
            case 1:
              {
                n = 44;
                break a
              }
            default:
              continue a
            }
            Ra[c[b >> 2] & 1](c[b + 16 >> 2] | 0, o + 9 | 0, 1, 1) | 0;
            f = d[o + 9 >> 0] & 127;
            a[o + 9 >> 0] = f;
            switch (d[o + 10 >> 0] | 0) {
            case 100:
              {
                a[32] = 0;a[40 + (d[16] | 0) >> 0] = f;
                continue a
              }
            case 101:
              {
                a[32] = 0;a[56 + (d[16] | 0) >> 0] = f;
                continue a
              }
            case 99:
              {
                a[32] = 1;a[40 + (d[16] | 0) >> 0] = f;
                continue a
              }
            case 98:
              {
                a[32] = 1;a[56 + (d[16] | 0) >> 0] = f;
                continue a
              }
            case 11:
              {
                n = 65;
                break a
              }
            case 120:
              {
                n = 66;
                break a
              }
            case 121:
              {
                f = 13;n = 67;
                break a
              }
            case 64:
              {
                n = 51;
                break a
              }
            case 6:
              {
                if (a[32] | 0) continue a;f = d[16] | 0;f = d[40 + f >> 0] << 8 | d[56 + f >> 0];
                if ((f | 0) == 32639) {
                  n = 58;
                  break a
                } else if (!f) {
                  f = 11;
                  n = 63;
                  break a
                } else continue a
              }
            case 123:
              {
                n = 61;
                break a
              }
            case 0:
              {
                n = 62;
                break a
              }
            case 7:
              {
                f = 4;n = 63;
                break a
              }
            case 10:
              {
                n = 64;
                break a
              }
            default:
              continue a
            }
          }
        }
        switch (n | 0) {
        case 34:
          {
            n = 0;Ra[c[b >> 2] & 1](c[b + 16 >> 2] | 0, o + 10 | 0, 1, 1) | 0;Ra[c[b >> 2] & 1](c[b + 16 >> 2] | 0, o + 9 | 0, 1, 1) | 0;Ra[c[b >> 2] & 1](c[b + 16 >> 2] | 0, o + 8 | 0, 1, 1) | 0;f = Mb(12) | 0;
            if (!f) {
              c[e >> 2] = 1;
              h = 0;
              break
            } else {
              l = f;
              k = l + 12 | 0;
              do {
                a[l >> 0] = 0;
                l = l + 1 | 0
              } while ((l | 0) < (k | 0));
              c[f >> 2] = c[e + 13104 >> 2];
              a[f + 5 >> 0] = 10;
              a[f + 4 >> 0] = a[o + 8 >> 0] | 0;
              a[f + 6 >> 0] = a[o + 10 >> 0] | 0;
              a[f + 7 >> 0] = a[o + 9 >> 0] | 0;
              h = f;
              break
            }
          }
        case 41:
          {
            n = 0;Ra[c[b >> 2] & 1](c[b + 16 >> 2] | 0, o + 9 | 0, 1, 1) | 0;a[o + 9 >> 0] = d[o + 9 >> 0] & 127;f = Mb(12) | 0;
            if (!f) {
              c[e >> 2] = 1;
              h = 0;
              break
            } else {
              l = f;
              k = l + 12 | 0;
              do {
                a[l >> 0] = 0;
                l = l + 1 | 0
              } while ((l | 0) < (k | 0));
              c[f >> 2] = c[e + 13104 >> 2];
              a[f + 5 >> 0] = 2;
              a[f + 4 >> 0] = a[16] | 0;
              a[f + 6 >> 0] = a[o + 10 >> 0] | 0;
              a[f + 7 >> 0] = a[o + 9 >> 0] | 0;
              h = f;
              break
            }
          }
        case 44:
          {
            n = 0;Ra[c[b >> 2] & 1](c[b + 16 >> 2] | 0, o + 9 | 0, 1, 1) | 0;a[o + 9 >> 0] = d[o + 9 >> 0] & 127;f = Mb(12) | 0;
            if (!f) {
              c[e >> 2] = 1;
              h = 0;
              break
            } else {
              l = f;
              k = l + 12 | 0;
              do {
                a[l >> 0] = 0;
                l = l + 1 | 0
              } while ((l | 0) < (k | 0));
              c[f >> 2] = c[e + 13104 >> 2];
              a[f + 5 >> 0] = 1;
              a[f + 4 >> 0] = a[16] | 0;
              a[f + 6 >> 0] = a[o + 10 >> 0] | 0;
              a[f + 7 >> 0] = a[o + 9 >> 0] | 0;
              h = f;
              break
            }
          }
        case 47:
          {
            n = 0;Ra[c[b >> 2] & 1](c[b + 16 >> 2] | 0, o + 9 | 0, 1, 1) | 0;a[o + 9 >> 0] = d[o + 9 >> 0] & 127;f = Mb(12) | 0;
            if (!f) {
              c[e >> 2] = 1;
              h = 0;
              break
            } else {
              l = f;
              k = l + 12 | 0;
              do {
                a[l >> 0] = 0;
                l = l + 1 | 0
              } while ((l | 0) < (k | 0));
              c[f >> 2] = c[e + 13104 >> 2];
              a[f + 5 >> 0] = 3;
              a[f + 4 >> 0] = a[16] | 0;
              a[f + 6 >> 0] = a[o + 10 >> 0] | 0;
              a[f + 7 >> 0] = a[o + 9 >> 0] | 0;
              h = f;
              break
            }
          }
        case 51:
          {
            a[o + 9 >> 0] = f >>> 0 > 63 & 1;f = 6;n = 67;
            break
          }
        case 58:
          {
            n = 0;f = Mb(12) | 0;
            if (!f) {
              c[e >> 2] = 1;
              h = 0;
              break
            } else {
              l = f;
              k = l + 12 | 0;
              do {
                a[l >> 0] = 0;
                l = l + 1 | 0
              } while ((l | 0) < (k | 0));
              c[f >> 2] = c[e + 13104 >> 2];
              a[f + 5 >> 0] = 11;
              a[f + 4 >> 0] = a[16] | 0;
              a[f + 6 >> 0] = 2;
              a[f + 7 >> 0] = 0;
              h = f;
              break
            }
          }
        case 61:
          {
            f = 14;n = 67;
            break
          }
        case 62:
          {
            f = 15;n = 67;
            break
          }
        case 63:
          {
            n = 67;
            break
          }
        case 64:
          {
            f = 5;n = 67;
            break
          }
        case 65:
          {
            f = 7;n = 67;
            break
          }
        case 66:
          {
            f = 12;n = 67;
            break
          }
        case 70:
          {
            n = 0;a[o + 10 >> 0] = f & 127;f = Mb(12) | 0;
            if (!f) {
              c[e >> 2] = 1;
              h = 0;
              break
            } else {
              l = f;
              k = l + 12 | 0;
              do {
                a[l >> 0] = 0;
                l = l + 1 | 0
              } while ((l | 0) < (k | 0));
              c[f >> 2] = c[e + 13104 >> 2];
              a[f + 5 >> 0] = 9;
              a[f + 4 >> 0] = a[16] | 0;
              a[f + 6 >> 0] = a[o + 10 >> 0] | 0;
              a[f + 7 >> 0] = 0;
              h = f;
              break
            }
          }
        case 73:
          {
            n = 0;Ra[c[b >> 2] & 1](c[b + 16 >> 2] | 0, o + 9 | 0, 1, 1) | 0;a[o + 9 >> 0] = d[o + 9 >> 0] & 127;f = Mb(12) | 0;
            if (!f) {
              c[e >> 2] = 1;
              h = 0;
              break
            } else {
              l = f;
              k = l + 12 | 0;
              do {
                a[l >> 0] = 0;
                l = l + 1 | 0
              } while ((l | 0) < (k | 0));
              c[f >> 2] = c[e + 13104 >> 2];
              a[f + 5 >> 0] = 8;
              a[f + 4 >> 0] = a[16] | 0;
              a[f + 6 >> 0] = a[o + 10 >> 0] | 0;
              a[f + 7 >> 0] = a[o + 9 >> 0] | 0;
              h = f;
              break
            }
          }
        }
        do
          if ((n | 0) == 67) {
            n = 0;
            h = Mb(12) | 0;
            if (!h) {
              c[e >> 2] = 1;
              h = 0;
              break
            } else {
              l = h;
              k = l + 12 | 0;
              do {
                a[l >> 0] = 0;
                l = l + 1 | 0
              } while ((l | 0) < (k | 0));
              c[h >> 2] = c[e + 13104 >> 2];
              a[h + 5 >> 0] = f;
              a[h + 4 >> 0] = a[16] | 0;
              a[h + 6 >> 0] = a[o + 9 >> 0] | 0;
              a[h + 7 >> 0] = 0;
              break
            }
          }
        while (0);
        f = h;
        if ((f | 0) == -1) break;
        else if (!f) {
          g = -2;
          n = 83;
          break
        }
        do {
          f = g + 8 | 0;
          g = c[f >> 2] | 0;
          if (!g) {
            g = 0;
            break
          }
        } while ((c[g >> 2] | 0) < (c[h >> 2] | 0));c[h + 8 >> 2] = g;c[f >> 2] = h;c[e + 13100 >> 2] = (c[e + 13100 >> 2] | 0) + 1;g = h
      }
      if ((n | 0) == 83) {
        i = o;
        return g | 0
      }
      g = Pa[c[b + 8 >> 2] & 3](c[b + 16 >> 2] | 0) | 0;
      if ((m | 0) <= (g | 0)) {
        g = 0;
        i = o;
        return g | 0
      }
      Qa[c[b + 4 >> 2] & 1](c[b + 16 >> 2] | 0, m - g | 0, 1) | 0;
      g = 0;
      i = o;
      return g | 0
    }

    function eb(a, b) {
      a = a | 0;
      b = b | 0;
      var d = 0,
        e = 0;
      d = Mb(20) | 0;
      if (!d) {
        d = 0;
        return d | 0
      }
      e = Mb(12) | 0;
      if (!e) {
        Nb(d);
        d = 0;
        return d | 0
      } else {
        c[e >> 2] = a;
        c[e + 4 >> 2] = a;
        c[e + 8 >> 2] = a + b;
        c[d + 16 >> 2] = e;
        c[d >> 2] = 1;
        c[d + 4 >> 2] = 1;
        c[d + 8 >> 2] = 1;
        c[d + 12 >> 2] = 2;
        return d | 0
      }
      return 0
    }

    function fb(a) {
      a = a | 0;
      var b = 0;
      b = Pa[c[a + 12 >> 2] & 3](c[a + 16 >> 2] | 0) | 0;
      Nb(a);
      return b | 0
    }

    function gb(a, b, d, e) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0,
        g = 0,
        h = 0;
      g = c[a + 4 >> 2] | 0;
      h = g + (_(e, d) | 0) | 0;
      f = c[a + 8 >> 2] | 0;
      if (h >>> 0 > f >>> 0) e = ((f - g | 0) >>> 0) / (d >>> 0) | 0;
      if (!e) {
        e = 0;
        return e | 0
      }
      f = _(e, d) | 0;
      Tb(b | 0, g | 0, f | 0) | 0;
      c[a + 4 >> 2] = (c[a + 4 >> 2] | 0) + f;
      return e | 0
    }

    function hb(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0;
      if ((d | 0) == 2) b = (c[a + 8 >> 2] | 0) + b - (c[a >> 2] | 0) | 0;
      else if (d)
        if ((d | 0) == 1) b = (c[a + 4 >> 2] | 0) + b - (c[a >> 2] | 0) | 0;
        else {
          b = -1;
          return b | 0
        }
      if ((b | 0) < 0) {
        b = -1;
        return b | 0
      }
      e = c[a >> 2] | 0;
      d = (c[a + 8 >> 2] | 0) - e | 0;
      c[a + 4 >> 2] = e + ((b | 0) > (d | 0) ? d : b);
      b = 0;
      return b | 0
    }

    function ib(a) {
      a = a | 0;
      return (c[a + 4 >> 2] | 0) - (c[a >> 2] | 0) | 0
    }

    function jb(a) {
      a = a | 0;
      Nb(a);
      return 0
    }

    function kb(b, d, e) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0;
      if (!e) return;
      while (1) {
        e = e + -1 | 0;
        f = c[d >> 2] >> 21;
        a[b >> 0] = (f | 0) > 127 ? 127 : (f | 0) < -128 ? -128 : f & 255;
        if (!e) break;
        else {
          d = d + 4 | 0;
          b = b + 1 | 0
        }
      }
      return
    }

    function lb(b, d, e) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0;
      if (!e) return;
      while (1) {
        e = e + -1 | 0;
        f = c[d >> 2] >> 21;
        a[b >> 0] = (f | 0) > 127 ? -1 : (f | 0) < -128 ? 0 : (f ^ 128) & 255;
        if (!e) break;
        else {
          d = d + 4 | 0;
          b = b + 1 | 0
        }
      }
      return
    }

    function mb(a, d, e) {
      a = a | 0;
      d = d | 0;
      e = e | 0;
      var f = 0;
      if (!e) return;
      while (1) {
        e = e + -1 | 0;
        f = c[d >> 2] >> 13;
        b[a >> 1] = (f | 0) > 32767 ? 32767 : (f | 0) < -32768 ? -32768 : f & 65535;
        if (!e) break;
        else {
          d = d + 4 | 0;
          a = a + 2 | 0
        }
      }
      return
    }

    function nb(a, d, e) {
      a = a | 0;
      d = d | 0;
      e = e | 0;
      var f = 0;
      if (!e) return;
      while (1) {
        e = e + -1 | 0;
        f = c[d >> 2] >> 13;
        b[a >> 1] = (f | 0) > 32767 ? -1 : (f | 0) < -32768 ? 0 : (f ^ 32768) & 65535;
        if (!e) break;
        else {
          d = d + 4 | 0;
          a = a + 2 | 0
        }
      }
      return
    }

    function ob(a, d, e) {
      a = a | 0;
      d = d | 0;
      e = e | 0;
      var f = 0;
      if (!e) return;
      while (1) {
        e = e + -1 | 0;
        f = c[d >> 2] >> 13;
        f = (f | 0) > 32767 ? 32767 : (f | 0) < -32768 ? -32768 : f;
        b[a >> 1] = f >>> 8 & 255 | f << 8;
        if (!e) break;
        else {
          d = d + 4 | 0;
          a = a + 2 | 0
        }
      }
      return
    }

    function pb(a) {
      a = a | 0;
      c[a + 4 >> 2] = 1;
      g[a + 20 >> 2] = +(c[a + 24 >> 2] | 0) / 100.0;
      tb(a, 0);
      return
    }

    function qb(a, b) {
      a = a | 0;
      b = b | 0;
      tb(a, ((_((c[a + 8 >> 2] | 0) / 100 | 0, b) | 0) >>> 0) / 10 | 0);
      return
    }

    function rb(a) {
      a = a | 0;
      var b = 0;
      b = c[(c[a + 13084 >> 2] | 0) + ((c[a + 13108 >> 2] | 0) + -1 << 3) >> 2] | 0;
      a = c[a + 8 >> 2] | 0;
      return (((b | 0) / (a | 0) | 0) * 1e3 | 0) + 3e3 + ((((b | 0) % (a | 0) | 0) * 1e3 | 0) / (a | 0) | 0) | 0
    }

    function sb(b, e, f) {
      b = b | 0;
      e = e | 0;
      f = f | 0;
      var h = 0,
        i = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0,
        o = 0,
        p = 0,
        q = 0,
        r = 0,
        s = 0,
        t = 0,
        u = 0,
        v = 0,
        w = 0;
      if (!(c[b + 4 >> 2] | 0)) {
        p = 0;
        return p | 0
      }
      w = c[b + 16 >> 2] | 0;
      h = c[b + 13096 >> 2] | 0;
      u = h + ((f >>> 0) / (w >>> 0) | 0) | 0;
      a: do
        if (((f >>> 0) / (w >>> 0) | 0 | 0) > 0) {
          i = h;
          o = e;
          b: while (1) {
            n = c[b + 13088 >> 2] | 0;
            e = c[n >> 2] | 0;
            h = i;
            i = n;
            while (1) {
              c: do
                if ((e | 0) > (h | 0)) j = i;
                else {
                  n = i;
                  while (1) {
                    d: do switch (d[n + 5 >> 0] | 0) {
                      case 6:
                        {
                          c[b + 1092 + ((d[n + 4 >> 0] | 0) * 40 | 0) + 12 >> 2] = d[n + 6 >> 0];h = c[b + 13088 >> 2] | 0;
                          if ((a[h + 6 >> 0] | 0) == 0 ? (q = c[b + 13060 >> 2] | 0, r = a[h + 4 >> 0] | 0, (q | 0) != 0) : 0) {
                            h = q;
                            do {
                              h = h + -1 | 0;
                              do
                                if ((a[b + 1732 + (h * 236 | 0) >> 0] | 0) == 2 ? (a[b + 1732 + (h * 236 | 0) + 1 >> 0] | 0) == r << 24 >> 24 : 0) {
                                  e = b + 1732 + (h * 236 | 0) | 0;
                                  if (!(a[(c[b + 1732 + (h * 236 | 0) + 4 >> 2] | 0) + 110 >> 0] & 64)) {
                                    a[e >> 0] = 3;
                                    break
                                  } else {
                                    c[b + 1732 + (h * 236 | 0) + 220 >> 2] = 3;
                                    a[e >> 0] = 3;
                                    xb(b, h) | 0;
                                    yb(b, h);
                                    break
                                  }
                                }
                              while (0)
                            } while ((h | 0) != 0)
                          }
                          break
                        }
                      case 15:
                        {
                          c[b + 1092 + ((d[n + 4 >> 0] | 0) * 40 | 0) >> 2] = d[n + 6 >> 0];
                          break
                        }
                      case 99:
                        {
                          n = ((c[b + 8 >> 2] | 0) * 3 | 0) / ((f >>> 0) / (w >>> 0) | 0 | 0) | 0;c[b + 4 >> 2] = ((n | 0) > -1 ? n : 0 - n | 0) + 1;
                          break
                        }
                      case 13:
                        {
                          n = d[n + 4 >> 0] | 0;c[b + 1092 + (n * 40 | 0) + 8 >> 2] = 90;c[b + 1092 + (n * 40 | 0) + 24 >> 2] = 127;c[b + 1092 + (n * 40 | 0) + 12 >> 2] = 0;c[b + 1092 + (n * 40 | 0) + 20 >> 2] = 8192;g[b + 1092 + (n * 40 | 0) + 36 >> 2] = 0.0;
                          break
                        }
                      case 14:
                        {
                          e = c[b + 13060 >> 2] | 0;i = a[n + 4 >> 0] | 0;
                          if (e)
                            do {
                              e = e + -1 | 0;
                              h = b + 1732 + (e * 236 | 0) | 0;
                              do
                                if ((a[h >> 0] | 0) == 1 ? (a[b + 1732 + (e * 236 | 0) + 1 >> 0] | 0) == i << 24 >> 24 : 0) {
                                  if (c[b + 1092 + ((i & 255) * 40 | 0) + 12 >> 2] | 0) {
                                    a[h >> 0] = 2;
                                    break
                                  }
                                  h = b + 1732 + (e * 236 | 0) | 0;
                                  if (!(a[(c[b + 1732 + (e * 236 | 0) + 4 >> 2] | 0) + 110 >> 0] & 64)) {
                                    a[h >> 0] = 3;
                                    break
                                  } else {
                                    c[b + 1732 + (e * 236 | 0) + 220 >> 2] = 3;
                                    a[h >> 0] = 3;
                                    xb(b, e) | 0;
                                    yb(b, e);
                                    break
                                  }
                                }
                              while (0)
                            } while ((e | 0) != 0);
                          break
                        }
                      case 3:
                        {
                          e = c[b + 13060 >> 2] | 0;
                          if (e) {
                            i = n + 4 | 0;
                            h = n + 6 | 0;
                            while (1) {
                              e = e + -1 | 0;
                              if (((a[b + 1732 + (e * 236 | 0) >> 0] | 0) == 1 ? (a[b + 1732 + (e * 236 | 0) + 1 >> 0] | 0) == (a[i >> 0] | 0) : 0) ? (a[b + 1732 + (e * 236 | 0) + 2 >> 0] | 0) == (a[h >> 0] | 0) : 0) break;
                              if (!e) break d
                            }
                            a[b + 1732 + (e * 236 | 0) + 3 >> 0] = a[n + 7 >> 0] | 0;
                            vb(b, e);
                            yb(b, e)
                          }
                          break
                        }
                      case 4:
                        {
                          e = a[n + 4 >> 0] | 0;c[b + 1092 + ((e & 255) * 40 | 0) + 8 >> 2] = d[n + 6 >> 0];h = c[b + 13060 >> 2] | 0;
                          if (h)
                            do {
                              h = h + -1 | 0;
                              if ((a[b + 1732 + (h * 236 | 0) + 1 >> 0] | 0) == e << 24 >> 24 ? ((a[b + 1732 + (h * 236 | 0) >> 0] | 0) + -1 & 255) < 2 : 0) {
                                vb(b, h);
                                yb(b, h)
                              }
                            } while ((h | 0) != 0);
                          break
                        }
                      case 2:
                        {
                          e = c[b + 13060 >> 2] | 0;
                          if (e) {
                            j = n + 4 | 0;
                            i = n + 6 | 0;
                            while (1) {
                              e = e + -1 | 0;
                              h = b + 1732 + (e * 236 | 0) | 0;
                              if (((a[h >> 0] | 0) == 1 ? (p = a[b + 1732 + (e * 236 | 0) + 1 >> 0] | 0, p << 24 >> 24 == (a[j >> 0] | 0)) : 0) ? (a[b + 1732 + (e * 236 | 0) + 2 >> 0] | 0) == (a[i >> 0] | 0) : 0) break;
                              if (!e) break d
                            }
                            if (c[b + 1092 + ((p & 255) * 40 | 0) + 12 >> 2] | 0) {
                              a[h >> 0] = 2;
                              break d
                            }
                            h = b + 1732 + (e * 236 | 0) | 0;
                            if (!(a[(c[b + 1732 + (e * 236 | 0) + 4 >> 2] | 0) + 110 >> 0] & 64)) {
                              a[h >> 0] = 3;
                              break d
                            } else {
                              c[b + 1732 + (e * 236 | 0) + 220 >> 2] = 3;
                              a[h >> 0] = 3;
                              xb(b, e) | 0;
                              yb(b, e);
                              break d
                            }
                          }
                          break
                        }
                      case 1:
                        {
                          h = c[b + 13060 >> 2] | 0;
                          if (!(a[n + 7 >> 0] | 0)) {
                            if (!h) break d;
                            j = n + 4 | 0;
                            e = n + 6 | 0;
                            while (1) {
                              h = h + -1 | 0;
                              i = b + 1732 + (h * 236 | 0) | 0;
                              if (((a[i >> 0] | 0) == 1 ? (t = a[b + 1732 + (h * 236 | 0) + 1 >> 0] | 0, t << 24 >> 24 == (a[j >> 0] | 0)) : 0) ? (a[b + 1732 + (h * 236 | 0) + 2 >> 0] | 0) == (a[e >> 0] | 0) : 0) break;
                              if (!h) break d
                            }
                            if (c[b + 1092 + ((t & 255) * 40 | 0) + 12 >> 2] | 0) {
                              a[i >> 0] = 2;
                              break d
                            }
                            e = b + 1732 + (h * 236 | 0) | 0;
                            if (!(a[(c[b + 1732 + (h * 236 | 0) + 4 >> 2] | 0) + 110 >> 0] & 64)) {
                              a[e >> 0] = 3;
                              break d
                            } else {
                              c[b + 1732 + (h * 236 | 0) + 220 >> 2] = 3;
                              a[e >> 0] = 3;
                              xb(b, h) | 0;
                              yb(b, h);
                              break d
                            }
                          }
                          do
                            if (h) {
                              l = n + 4 | 0;
                              m = n + 6 | 0;
                              e = -1;
                              e: while (1) {
                                k = h;
                                while (1) {
                                  k = k + -1 | 0;
                                  j = b + 1732 + (k * 236 | 0) | 0;
                                  if (!(a[j >> 0] | 0)) break;
                                  i = a[b + 1732 + (k * 236 | 0) + 1 >> 0] | 0;
                                  do
                                    if (i << 24 >> 24 == (a[l >> 0] | 0)) {
                                      if ((a[b + 1732 + (k * 236 | 0) + 2 >> 0] | 0) != (a[m >> 0] | 0) ? (c[b + 1092 + ((i & 255) * 40 | 0) + 28 >> 2] | 0) == 0 : 0) break;
                                      a[j >> 0] = 4
                                    }
                                  while (0);
                                  if (!k) {
                                    v = 30;
                                    break e
                                  }
                                }
                                if (!k) {
                                  e = 0;
                                  break
                                } else {
                                  h = k;
                                  e = k
                                }
                              }
                              if ((v | 0) == 30) {
                                v = 0;
                                if ((e | 0) == -1) {
                                  h = c[b + 13060 >> 2] | 0;
                                  if (!h) break;
                                  else {
                                    e = -1;
                                    m = 2147483647
                                  }
                                  f: while (1) {
                                    while (1) {
                                      h = h + -1 | 0;
                                      l = a[b + 1732 + (h * 236 | 0) >> 0] | 0;
                                      if (!(l << 24 >> 24 == 4 | l << 24 >> 24 == 1)) break;
                                      if (!h) break f
                                    }
                                    i = c[b + 1732 + (h * 236 | 0) + 60 >> 2] | 0;
                                    if (!(c[b + 1732 + (h * 236 | 0) + 232 >> 2] | 0)) {
                                      l = c[b + 1732 + (h * 236 | 0) + 64 >> 2] | 0;
                                      i = (l | 0) > (i | 0) ? l : i
                                    }
                                    k = (i | 0) < (m | 0);
                                    e = k ? h : e;
                                    if (!h) break;
                                    else m = k ? i : m
                                  }
                                  if ((e | 0) == -1) break;
                                  c[b + 13076 >> 2] = (c[b + 13076 >> 2] | 0) + 1;
                                  a[b + 1732 + (e * 236 | 0) >> 0] = 0;
                                  ub(b, n, e);
                                  break d
                                }
                              }
                              ub(b, n, e);
                              break d
                            }
                          while (0);
                          c[b + 13072 >> 2] = (c[b + 13072 >> 2] | 0) + 1;
                          break
                        }
                      case 5:
                        {
                          c[b + 1092 + ((d[n + 4 >> 0] | 0) * 40 | 0) + 16 >> 2] = d[n + 6 >> 0];
                          break
                        }
                      case 7:
                        {
                          e = a[n + 4 >> 0] | 0;c[b + 1092 + ((e & 255) * 40 | 0) + 24 >> 2] = d[n + 6 >> 0];h = c[b + 13060 >> 2] | 0;
                          if (h)
                            do {
                              h = h + -1 | 0;
                              if ((a[b + 1732 + (h * 236 | 0) + 1 >> 0] | 0) == e << 24 >> 24 ? ((a[b + 1732 + (h * 236 | 0) >> 0] | 0) + -1 & 255) < 2 : 0) {
                                vb(b, h);
                                yb(b, h)
                              }
                            } while ((h | 0) != 0);
                          break
                        }
                      case 9:
                        {
                          e = d[n + 4 >> 0] | 0;h = d[n + 6 >> 0] | 0;
                          if (!(1 << e & c[b + 13064 >> 2])) {
                            c[b + 1092 + (e * 40 | 0) + 4 >> 2] = h;
                            break d
                          } else {
                            c[b + 1092 + (e * 40 | 0) >> 2] = h;
                            break d
                          }
                        }
                      case 11:
                        {
                          m = d[n + 4 >> 0] | 0;c[b + 1092 + (m * 40 | 0) + 32 >> 2] = d[n + 6 >> 0];g[b + 1092 + (m * 40 | 0) + 36 >> 2] = 0.0;
                          break
                        }
                      case 8:
                        {
                          c[b + 1092 + ((d[n + 4 >> 0] | 0) * 40 | 0) + 20 >> 2] = (d[n + 7 >> 0] << 7) + (d[n + 6 >> 0] | 0);g[b + 1092 + ((d[(c[b + 13088 >> 2] | 0) + 4 >> 0] | 0) * 40 | 0) + 36 >> 2] = 0.0;e = a[(c[b + 13088 >> 2] | 0) + 4 >> 0] | 0;h = c[b + 13060 >> 2] | 0;
                          if (h)
                            do {
                              h = h + -1 | 0;
                              if ((a[b + 1732 + (h * 236 | 0) >> 0] | 0) != 0 ? (a[b + 1732 + (h * 236 | 0) + 1 >> 0] | 0) == e << 24 >> 24 : 0) wb(b, h)
                            } while ((h | 0) != 0);
                          break
                        }
                      case 12:
                        {
                          h = c[b + 13060 >> 2] | 0;e = a[n + 4 >> 0] | 0;
                          if (h)
                            do {
                              h = h + -1 | 0;
                              if ((a[b + 1732 + (h * 236 | 0) + 1 >> 0] | 0) == e << 24 >> 24 ? (s = b + 1732 + (h * 236 | 0) | 0, n = a[s >> 0] | 0, !(n << 24 >> 24 == 4 | n << 24 >> 24 == 0)) : 0) a[s >> 0] = 4
                            } while ((h | 0) != 0);
                          break
                        }
                      default:
                        {}
                      }
                      while (0);
                    i = (c[b + 13088 >> 2] | 0) + 8 | 0;c[b + 13088 >> 2] = i;e = c[i >> 2] | 0;h = c[b + 13096 >> 2] | 0;
                    if ((e | 0) > (h | 0)) {
                      j = i;
                      break c
                    } else n = i
                  }
                }while (0);i = c[b + 4 >> 2] | 0;
              if ((i | 0) > 1 ? (c[b + 4 >> 2] = i + -1, (i | 0) == 2) : 0) break b;k = c[b + 12 >> 2] | 0;
              if ((e | 0) > (u | 0)) {
                if ((u | 0) != (h | 0)) {
                  v = 113;
                  break
                }
              } else if ((e | 0) != (h | 0)) {
                v = 121;
                break
              }
              if ((u | 0) > (h | 0)) i = j;
              else {
                v = 128;
                break b
              }
            }
            g: do
                if ((v | 0) == 113) {
                  v = 0;
                  l = u - h | 0;
                  j = k;
                  e = o;
                  while (1) {
                    m = c[b + 1072 >> 2] | 0;
                    m = (l | 0) > (m | 0) ? m : l;
                    Pb(c[b + 1080 >> 2] | 0, 0, m << (j & 1 ^ 3) | 0) | 0;
                    i = c[b + 13060 >> 2] | 0;
                    if ((i | 0) > 0) {
                      j = 0;
                      do {
                        if (a[b + 1732 + (j * 236 | 0) >> 0] | 0) {
                          zb(b, c[b + 1080 >> 2] | 0, j, m);
                          i = c[b + 13060 >> 2] | 0
                        }
                        j = j + 1 | 0
                      } while ((j | 0) < (i | 0))
                    }
                    c[b + 13096 >> 2] = (c[b + 13096 >> 2] | 0) + m;
                    h = _(m, 2 - (k & 1) | 0) | 0;
                    Sa[c[b + 1068 >> 2] & 7](e, c[b + 1080 >> 2] | 0, h);
                    h = c[b + 16 >> 2] | 0;
                    e = e + (_(h, m) | 0) | 0;
                    if ((l | 0) == (m | 0)) break g;
                    l = l - m | 0;
                    j = c[b + 12 >> 2] | 0
                  }
                } else
              if ((v | 0) == 121) {
                v = 0;
                l = e - h | 0;
                j = k;
                e = o;
                while (1) {
                  m = c[b + 1072 >> 2] | 0;
                  m = (l | 0) > (m | 0) ? m : l;
                  Pb(c[b + 1080 >> 2] | 0, 0, m << (j & 1 ^ 3) | 0) | 0;
                  i = c[b + 13060 >> 2] | 0;
                  if ((i | 0) > 0) {
                    j = 0;
                    do {
                      if (a[b + 1732 + (j * 236 | 0) >> 0] | 0) {
                        zb(b, c[b + 1080 >> 2] | 0, j, m);
                        i = c[b + 13060 >> 2] | 0
                      }
                      j = j + 1 | 0
                    } while ((j | 0) < (i | 0))
                  }
                  c[b + 13096 >> 2] = (c[b + 13096 >> 2] | 0) + m;
                  h = _(m, 2 - (k & 1) | 0) | 0;
                  Sa[c[b + 1068 >> 2] & 7](e, c[b + 1080 >> 2] | 0, h);
                  h = c[b + 16 >> 2] | 0;
                  e = e + (_(h, m) | 0) | 0;
                  if ((l | 0) == (m | 0)) break g;
                  l = l - m | 0;
                  j = c[b + 12 >> 2] | 0
                }
              }
            while (0);
            i = c[b + 13096 >> 2] | 0;
            if ((i | 0) >= (u | 0)) break a;
            else o = e
          }
          if ((v | 0) == 128) {
            h = c[b + 16 >> 2] | 0;
            break
          }
          c[b + 4 >> 2] = 0;
          p = 0;
          return p | 0
        } else h = w; while (0);
      p = _(h, (f >>> 0) / (w >>> 0) | 0) | 0;
      return p | 0
    }

    function tb(b, e) {
      b = b | 0;
      e = e | 0;
      var f = 0,
        h = 0,
        i = 0,
        j = 0;
      if ((c[b + 13096 >> 2] | 0) > (e | 0)) c[b + 13096 >> 2] = 0;
      f = 0;
      do {
        c[b + 1092 + (f * 40 | 0) + 8 >> 2] = 90;
        c[b + 1092 + (f * 40 | 0) + 24 >> 2] = 127;
        c[b + 1092 + (f * 40 | 0) + 12 >> 2] = 0;
        c[b + 1092 + (f * 40 | 0) + 20 >> 2] = 8192;
        g[b + 1092 + (f * 40 | 0) + 36 >> 2] = 0.0;
        c[b + 1092 + (f * 40 | 0) + 4 >> 2] = c[b + 1064 >> 2];
        c[b + 1092 + (f * 40 | 0) + 16 >> 2] = -1;
        c[b + 1092 + (f * 40 | 0) + 32 >> 2] = 2;
        c[b + 1092 + (f * 40 | 0) >> 2] = 0;
        f = f + 1 | 0
      } while ((f | 0) != 16);
      a[b + 1732 >> 0] = 0;
      a[b + 1968 >> 0] = 0;
      a[b + 2204 >> 0] = 0;
      a[b + 2440 >> 0] = 0;
      a[b + 2676 >> 0] = 0;
      a[b + 2912 >> 0] = 0;
      a[b + 3148 >> 0] = 0;
      a[b + 3384 >> 0] = 0;
      a[b + 3620 >> 0] = 0;
      a[b + 3856 >> 0] = 0;
      a[b + 4092 >> 0] = 0;
      a[b + 4328 >> 0] = 0;
      a[b + 4564 >> 0] = 0;
      a[b + 4800 >> 0] = 0;
      a[b + 5036 >> 0] = 0;
      a[b + 5272 >> 0] = 0;
      a[b + 5508 >> 0] = 0;
      a[b + 5744 >> 0] = 0;
      a[b + 5980 >> 0] = 0;
      a[b + 6216 >> 0] = 0;
      a[b + 6452 >> 0] = 0;
      a[b + 6688 >> 0] = 0;
      a[b + 6924 >> 0] = 0;
      a[b + 7160 >> 0] = 0;
      a[b + 7396 >> 0] = 0;
      a[b + 7632 >> 0] = 0;
      a[b + 7868 >> 0] = 0;
      a[b + 8104 >> 0] = 0;
      a[b + 8340 >> 0] = 0;
      a[b + 8576 >> 0] = 0;
      a[b + 8812 >> 0] = 0;
      a[b + 9048 >> 0] = 0;
      a[b + 9284 >> 0] = 0;
      a[b + 9520 >> 0] = 0;
      a[b + 9756 >> 0] = 0;
      a[b + 9992 >> 0] = 0;
      a[b + 10228 >> 0] = 0;
      a[b + 10464 >> 0] = 0;
      a[b + 10700 >> 0] = 0;
      a[b + 10936 >> 0] = 0;
      a[b + 11172 >> 0] = 0;
      a[b + 11408 >> 0] = 0;
      a[b + 11644 >> 0] = 0;
      a[b + 11880 >> 0] = 0;
      a[b + 12116 >> 0] = 0;
      a[b + 12352 >> 0] = 0;
      a[b + 12588 >> 0] = 0;
      a[b + 12824 >> 0] = 0;
      h = c[b + 13084 >> 2] | 0;
      c[b + 13088 >> 2] = h;
      if (!e) return;
      a[b + 1732 >> 0] = 0;
      a[b + 1968 >> 0] = 0;
      a[b + 2204 >> 0] = 0;
      a[b + 2440 >> 0] = 0;
      a[b + 2676 >> 0] = 0;
      a[b + 2912 >> 0] = 0;
      a[b + 3148 >> 0] = 0;
      a[b + 3384 >> 0] = 0;
      a[b + 3620 >> 0] = 0;
      a[b + 3856 >> 0] = 0;
      a[b + 4092 >> 0] = 0;
      a[b + 4328 >> 0] = 0;
      a[b + 4564 >> 0] = 0;
      a[b + 4800 >> 0] = 0;
      a[b + 5036 >> 0] = 0;
      a[b + 5272 >> 0] = 0;
      a[b + 5508 >> 0] = 0;
      a[b + 5744 >> 0] = 0;
      a[b + 5980 >> 0] = 0;
      a[b + 6216 >> 0] = 0;
      a[b + 6452 >> 0] = 0;
      a[b + 6688 >> 0] = 0;
      a[b + 6924 >> 0] = 0;
      a[b + 7160 >> 0] = 0;
      a[b + 7396 >> 0] = 0;
      a[b + 7632 >> 0] = 0;
      a[b + 7868 >> 0] = 0;
      a[b + 8104 >> 0] = 0;
      a[b + 8340 >> 0] = 0;
      a[b + 8576 >> 0] = 0;
      a[b + 8812 >> 0] = 0;
      a[b + 9048 >> 0] = 0;
      a[b + 9284 >> 0] = 0;
      a[b + 9520 >> 0] = 0;
      a[b + 9756 >> 0] = 0;
      a[b + 9992 >> 0] = 0;
      a[b + 10228 >> 0] = 0;
      a[b + 10464 >> 0] = 0;
      a[b + 10700 >> 0] = 0;
      a[b + 10936 >> 0] = 0;
      a[b + 11172 >> 0] = 0;
      a[b + 11408 >> 0] = 0;
      a[b + 11644 >> 0] = 0;
      a[b + 11880 >> 0] = 0;
      a[b + 12116 >> 0] = 0;
      a[b + 12352 >> 0] = 0;
      a[b + 12588 >> 0] = 0;
      a[b + 12824 >> 0] = 0;
      f = c[h >> 2] | 0;
      do
        if ((f | 0) < (e | 0)) {
          j = h;
          a: while (1) {
            b: do switch (d[j + 5 >> 0] | 0 | 0) {
              case 11:
                {
                  f = d[j + 4 >> 0] | 0;c[b + 1092 + (f * 40 | 0) + 32 >> 2] = d[j + 6 >> 0];g[b + 1092 + (f * 40 | 0) + 36 >> 2] = 0.0;
                  break
                }
              case 4:
                {
                  c[b + 1092 + ((d[j + 4 >> 0] | 0) * 40 | 0) + 8 >> 2] = d[j + 6 >> 0];
                  break
                }
              case 99:
                {
                  i = 20;
                  break a
                }
              case 15:
                {
                  c[b + 1092 + ((d[j + 4 >> 0] | 0) * 40 | 0) >> 2] = d[j + 6 >> 0];
                  break
                }
              case 8:
                {
                  c[b + 1092 + ((d[j + 4 >> 0] | 0) * 40 | 0) + 20 >> 2] = ((d[j + 7 >> 0] | 0) << 7) + (d[j + 6 >> 0] | 0);g[b + 1092 + ((d[(c[b + 13088 >> 2] | 0) + 4 >> 0] | 0) * 40 | 0) + 36 >> 2] = 0.0;
                  break
                }
              case 5:
                {
                  c[b + 1092 + ((d[j + 4 >> 0] | 0) * 40 | 0) + 16 >> 2] = d[j + 6 >> 0];
                  break
                }
              case 7:
                {
                  c[b + 1092 + ((d[j + 4 >> 0] | 0) * 40 | 0) + 24 >> 2] = d[j + 6 >> 0];
                  break
                }
              case 13:
                {
                  f = d[j + 4 >> 0] | 0;c[b + 1092 + (f * 40 | 0) + 8 >> 2] = 90;c[b + 1092 + (f * 40 | 0) + 24 >> 2] = 127;c[b + 1092 + (f * 40 | 0) + 12 >> 2] = 0;c[b + 1092 + (f * 40 | 0) + 20 >> 2] = 8192;g[b + 1092 + (f * 40 | 0) + 36 >> 2] = 0.0;
                  break
                }
              case 9:
                {
                  h = d[j + 4 >> 0] | 0;f = d[j + 6 >> 0] | 0;
                  if (!(1 << h & c[b + 13064 >> 2])) {
                    c[b + 1092 + (h * 40 | 0) + 4 >> 2] = f;
                    break b
                  } else {
                    c[b + 1092 + (h * 40 | 0) >> 2] = f;
                    break b
                  }
                }
              case 6:
                {
                  c[b + 1092 + ((d[j + 4 >> 0] | 0) * 40 | 0) + 12 >> 2] = d[j + 6 >> 0];
                  break
                }
              default:
                {}
              }
              while (0);
            h = c[b + 13088 >> 2] | 0;j = h + 8 | 0;c[b + 13088 >> 2] = j;f = c[j >> 2] | 0;
            if ((f | 0) >= (e | 0)) {
              i = 22;
              break
            }
          }
          if ((i | 0) == 20) {
            c[b + 13096 >> 2] = f;
            return
          } else if ((i | 0) == 22) {
            if ((j | 0) == (c[b + 13084 >> 2] | 0)) break;
            c[b + 13088 >> 2] = h;
            break
          }
        }
      while (0);
      c[b + 13096 >> 2] = e;
      return
    }

    function ub(b, e, f) {
      b = b | 0;
      e = e | 0;
      f = f | 0;
      var g = 0,
        h = 0,
        i = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0,
        o = 0;
      g = d[e + 4 >> 0] | 0;
      do
        if (!(1 << g & c[b + 13064 >> 2])) {
          h = c[b + 1092 + (g * 40 | 0) + 4 >> 2] | 0;
          if ((h | 0) != -1) {
            g = c[(c[b + 32 + (c[b + 1092 + (g * 40 | 0) >> 2] << 2) >> 2] | 0) + 4 + (h << 2) >> 2] | 0;
            if (!g) {
              g = c[(c[b + 32 >> 2] | 0) + 4 + (h << 2) >> 2] | 0;
              if (!g) return
            }
          } else g = c[b + 1060 >> 2] | 0;
          i = g + 4 | 0;
          h = a[(c[i >> 2] | 0) + 112 >> 0] | 0;
          if (!(h << 24 >> 24)) h = d[e + 6 >> 0] & 127;
          else h = h << 24 >> 24;
          n = c[160 + (h << 2) >> 2] | 0;
          c[b + 1732 + (f * 236 | 0) + 8 >> 2] = n;
          o = a[e + 7 >> 0] | 0;
          m = c[g >> 2] | 0;
          k = c[i >> 2] | 0;
          if ((m | 0) == 1) {
            c[b + 1732 + (f * 236 | 0) + 4 >> 2] = k;
            j = b + 1732 + (f * 236 | 0) + 4 | 0;
            g = o;
            i = k;
            break
          }
          if ((m | 0) > 0) {
            h = 0;
            i = k;
            while (1) {
              if ((((c[i + 16 >> 2] | 0) <= (o & 255 | 0) ? (c[i + 20 >> 2] | 0) >= (o & 255 | 0) : 0) ? (c[i + 24 >> 2] | 0) <= (n | 0) : 0) ? (c[i + 28 >> 2] | 0) >= (n | 0) : 0) {
                g = 19;
                break
              }
              h = h + 1 | 0;
              if ((h | 0) >= (m | 0)) {
                j = 2147483647;
                h = k;
                l = 0;
                g = 21;
                break
              } else i = i + 116 | 0
            }
            if ((g | 0) == 19) {
              c[b + 1732 + (f * 236 | 0) + 4 >> 2] = i;
              j = b + 1732 + (f * 236 | 0) + 4 | 0;
              g = o;
              break
            } else if ((g | 0) == 21)
              while (1) {
                i = (c[k + 32 >> 2] | 0) - n | 0;
                i = (i | 0) < 0 ? 0 - i | 0 : i;
                g = (i | 0) < (j | 0);
                h = g ? k : h;
                l = l + 1 | 0;
                if ((l | 0) == (m | 0)) break;
                else {
                  j = g ? i : j;
                  k = k + 116 | 0;
                  g = 21
                }
              }
          } else h = k;
          c[b + 1732 + (f * 236 | 0) + 4 >> 2] = h;
          j = b + 1732 + (f * 236 | 0) + 4 | 0;
          g = o;
          i = h
        } else {
          h = d[e + 6 >> 0] | 0;
          g = c[(c[b + 544 + (c[b + 1092 + (g * 40 | 0) >> 2] << 2) >> 2] | 0) + 4 + (h << 2) >> 2] | 0;
          if (!g) {
            g = c[(c[b + 544 >> 2] | 0) + 4 + (h << 2) >> 2] | 0;
            if (!g) return
          }
          i = g + 4 | 0;
          j = a[(c[i >> 2] | 0) + 112 >> 0] | 0;
          c[b + 1732 + (f * 236 | 0) + 8 >> 2] = c[160 + ((j << 24 >> 24 == 0 ? h & 127 : j << 24 >> 24) << 2) >> 2];
          i = c[i >> 2] | 0;
          c[b + 1732 + (f * 236 | 0) + 4 >> 2] = i;
          j = b + 1732 + (f * 236 | 0) + 4 | 0;
          g = a[e + 7 >> 0] | 0
        }
      while (0);
      a[b + 1732 + (f * 236 | 0) >> 0] = 1;
      a[b + 1732 + (f * 236 | 0) + 1 >> 0] = a[e + 4 >> 0] | 0;
      a[b + 1732 + (f * 236 | 0) + 2 >> 0] = a[e + 6 >> 0] | 0;
      a[b + 1732 + (f * 236 | 0) + 3 >> 0] = g;
      c[b + 1732 + (f * 236 | 0) + 16 >> 2] = 0;
      c[b + 1732 + (f * 236 | 0) + 20 >> 2] = 0;
      c[b + 1732 + (f * 236 | 0) + 44 >> 2] = 0;
      c[b + 1732 + (f * 236 | 0) + 48 >> 2] = c[i + 96 >> 2];
      c[b + 1732 + (f * 236 | 0) + 36 >> 2] = c[i + 92 >> 2];
      c[b + 1732 + (f * 236 | 0) + 40 >> 2] = 0;
      c[b + 1732 + (f * 236 | 0) + 52 >> 2] = c[i + 100 >> 2];
      c[b + 1732 + (f * 236 | 0) + 56 >> 2] = 0;
      c[b + 1732 + (f * 236 | 0) + 212 >> 2] = c[i + 104 >> 2];
      c[b + 1732 + (f * 236 | 0) + 208 >> 2] = 0;
      c[b + 1732 + (f * 236 | 0) + 216 >> 2] = 0;
      h = b + ((f * 236 | 0) + 1812) | 0;
      g = h + 128 | 0;
      do {
        c[h >> 2] = 0;
        h = h + 4 | 0
      } while ((h | 0) < (g | 0));
      g = c[b + 1092 + ((d[e + 4 >> 0] | 0) * 40 | 0) + 16 >> 2] | 0;
      if ((g | 0) == -1) g = a[i + 111 >> 0] | 0;
      c[b + 1732 + (f * 236 | 0) + 228 >> 2] = g;
      wb(b, f);
      vb(b, f);
      if (!(a[(c[j >> 2] | 0) + 110 >> 0] & 64)) {
        c[b + 1732 + (f * 236 | 0) + 32 >> 2] = 0;
        yb(b, f);
        return
      } else {
        c[b + 1732 + (f * 236 | 0) + 220 >> 2] = 0;
        c[b + 1732 + (f * 236 | 0) + 24 >> 2] = 0;
        c[b + 1732 + (f * 236 | 0) + 224 >> 2] = 0;
        xb(b, f) | 0;
        yb(b, f);
        return
      }
    }

    function vb(a, b) {
      a = a | 0;
      b = b | 0;
      var e = 0,
        f = 0,
        h = 0.0;
      e = d[a + 1732 + (b * 236 | 0) + 1 >> 0] | 0;
      f = _(c[a + 1092 + (e * 40 | 0) + 8 >> 2] | 0, d[a + 1732 + (b * 236 | 0) + 3 >> 0] | 0) | 0;
      e = _(f, c[a + 1092 + (e * 40 | 0) + 24 >> 2] | 0) | 0;
      if (c[a + 12 >> 2] & 1) {
        c[a + 1732 + (b * 236 | 0) + 232 >> 2] = 3;
        g[a + 1732 + (b * 236 | 0) + 68 >> 2] = +(e | 0) * +g[(c[a + 1732 + (b * 236 | 0) + 4 >> 2] | 0) + 84 >> 2] * +g[a + 20 >> 2] * 4.76837158203125e-07;
        return
      }
      f = c[a + 1732 + (b * 236 | 0) + 228 >> 2] | 0;
      if ((f + -61 | 0) >>> 0 < 7) {
        c[a + 1732 + (b * 236 | 0) + 232 >> 2] = 3;
        g[a + 1732 + (b * 236 | 0) + 68 >> 2] = +(e | 0) * +g[(c[a + 1732 + (b * 236 | 0) + 4 >> 2] | 0) + 84 >> 2] * +g[a + 20 >> 2] * 4.76837158203125e-07;
        return
      }
      if ((f | 0) < 5) {
        c[a + 1732 + (b * 236 | 0) + 232 >> 2] = 1;
        g[a + 1732 + (b * 236 | 0) + 68 >> 2] = +(e | 0) * +g[(c[a + 1732 + (b * 236 | 0) + 4 >> 2] | 0) + 84 >> 2] * +g[a + 20 >> 2] * 9.5367431640625e-07;
        return
      }
      h = +g[(c[a + 1732 + (b * 236 | 0) + 4 >> 2] | 0) + 84 >> 2];
      if ((f | 0) > 123) {
        c[a + 1732 + (b * 236 | 0) + 232 >> 2] = 2;
        g[a + 1732 + (b * 236 | 0) + 68 >> 2] = +(e | 0) * h * +g[a + 20 >> 2] * 9.5367431640625e-07;
        return
      } else {
        c[a + 1732 + (b * 236 | 0) + 232 >> 2] = 0;
        h = +(e | 0) * h * +g[a + 20 >> 2] * 7.450580596923828e-09;
        g[a + 1732 + (b * 236 | 0) + 72 >> 2] = +(f | 0) * h;
        g[a + 1732 + (b * 236 | 0) + 68 >> 2] = +(127 - f | 0) * h;
        return
      }
    }

    function wb(a, b) {
      a = a | 0;
      b = b | 0;
      var e = 0,
        f = 0,
        i = 0,
        j = 0,
        k = 0,
        l = 0.0;
      k = (c[a + 1732 + (b * 236 | 0) + 20 >> 2] | 0) < 0;
      e = d[a + 1732 + (b * 236 | 0) + 1 >> 0] | 0;
      f = c[a + 1092 + (e * 40 | 0) + 20 >> 2] | 0;
      if (!(c[(c[a + 1732 + (b * 236 | 0) + 4 >> 2] | 0) + 12 >> 2] | 0)) return;
      if (c[a + 1732 + (b * 236 | 0) + 212 >> 2] | 0) {
        i = a + 1732 + (b * 236 | 0) + 80 | 0;
        j = i + 128 | 0;
        do {
          c[i >> 2] = 0;
          i = i + 4 | 0
        } while ((i | 0) < (j | 0))
      }
      do
        if (!(f >>> 0 > 16383 | (f | 0) == 8192)) {
          if (!(+g[a + 1092 + (e * 40 | 0) + 36 >> 2] != 0.0)) {
            i = _(c[a + 1092 + (e * 40 | 0) + 32 >> 2] | 0, f + -8192 | 0) | 0;
            i = (f | 0) < 8192 ? 0 - i | 0 : i;
            g[a + 1092 + (e * 40 | 0) + 36 >> 2] = +h[1696 + ((i >>> 5 & 255) << 3) >> 3] * +h[3744 + (i >> 13 << 3) >> 3]
          }
          if ((f | 0) > 8192) {
            e = ~~(+g[a + 1092 + ((d[a + 1732 + (b * 236 | 0) + 1 >> 0] | 0) * 40 | 0) + 36 >> 2] * +(c[a + 1732 + (b * 236 | 0) + 8 >> 2] | 0));
            c[a + 1732 + (b * 236 | 0) + 12 >> 2] = e;
            break
          } else {
            e = ~~(+(c[a + 1732 + (b * 236 | 0) + 8 >> 2] | 0) / +g[a + 1092 + ((d[a + 1732 + (b * 236 | 0) + 1 >> 0] | 0) * 40 | 0) + 36 >> 2]);
            c[a + 1732 + (b * 236 | 0) + 12 >> 2] = e;
            break
          }
        } else {
          e = c[a + 1732 + (b * 236 | 0) + 8 >> 2] | 0;
          c[a + 1732 + (b * 236 | 0) + 12 >> 2] = e
        }
      while (0);
      f = c[a + 1732 + (b * 236 | 0) + 4 >> 2] | 0;
      l = +(e | 0) * +(c[f + 12 >> 2] | 0) / (+(c[f + 32 >> 2] | 0) * +(c[a + 8 >> 2] | 0)) * 4096.0;
      c[a + 1732 + (b * 236 | 0) + 20 >> 2] = ~~(k ? -l : l);
      return
    }

    function xb(b, d) {
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0,
        h = 0,
        i = 0,
        j = 0,
        k = 0;
      e = c[b + 1732 + (d * 236 | 0) + 220 >> 2] | 0;
      a: do
          if ((e | 0) > 5) e = b + 1732 + (d * 236 | 0) | 0;
          else {
            k = c[b + 1732 + (d * 236 | 0) + 4 >> 2] | 0;
            b: do
                if (!(a[k + 110 >> 0] & 64)) {
                  g = c[b + 1732 + (d * 236 | 0) + 24 >> 2] | 0;
                  while (1) {
                    h = e;
                    e = e + 1 | 0;
                    c[b + 1732 + (d * 236 | 0) + 220 >> 2] = e;
                    f = c[k + 60 + (h << 2) >> 2] | 0;
                    if ((g | 0) != (f | 0) ? !((h | 0) > 2 & (g | 0) < (f | 0)) : 0) {
                      e = h;
                      break b
                    }
                    if ((h | 0) > 4) {
                      e = b + 1732 + (d * 236 | 0) | 0;
                      break a
                    }
                  }
                } else {
                  i = a[b + 1732 + (d * 236 | 0) >> 0] | 0;
                  while (1) {
                    h = (e | 0) > 2;
                    if (i << 24 >> 24 == 1) {
                      if (h) break
                    } else if (i << 24 >> 24 == 2 & h) break;
                    j = e;
                    e = e + 1 | 0;
                    c[b + 1732 + (d * 236 | 0) + 220 >> 2] = e;
                    g = c[b + 1732 + (d * 236 | 0) + 24 >> 2] | 0;
                    f = c[k + 60 + (j << 2) >> 2] | 0;
                    if (!((g | 0) == (f | 0) | h & (g | 0) < (f | 0))) {
                      e = j;
                      break b
                    }
                    if ((j | 0) > 4) {
                      e = b + 1732 + (d * 236 | 0) | 0;
                      break a
                    }
                  }
                  c[b + 1732 + (d * 236 | 0) + 32 >> 2] = 0;
                  e = 0;
                  return e | 0
                }
              while (0);
            c[b + 1732 + (d * 236 | 0) + 28 >> 2] = f;
            e = c[k + 36 + (e << 2) >> 2] | 0;
            c[b + 1732 + (d * 236 | 0) + 32 >> 2] = e;
            if ((f | 0) >= (g | 0)) {
              e = 0;
              return e | 0
            }
            c[b + 1732 + (d * 236 | 0) + 32 >> 2] = 0 - e;
            e = 0;
            return e | 0
          }
        while (0);
      a[e >> 0] = 0;
      e = 1;
      return e | 0
    }

    function yb(b, d) {
      b = b | 0;
      d = d | 0;
      var e = 0.0,
        f = 0.0,
        i = 0.0,
        j = 0,
        k = 0;
      e = +g[b + 1732 + (d * 236 | 0) + 68 >> 2];
      if (!(c[b + 1732 + (d * 236 | 0) + 232 >> 2] | 0)) {
        f = +g[b + 1732 + (d * 236 | 0) + 72 >> 2];
        if (c[b + 1732 + (d * 236 | 0) + 48 >> 2] | 0) {
          i = +g[b + 1732 + (d * 236 | 0) + 76 >> 2];
          e = e * i;
          f = f * i
        }
        if (a[(c[b + 1732 + (d * 236 | 0) + 4 >> 2] | 0) + 110 >> 0] & 64) {
          i = +h[672 + (c[b + 1732 + (d * 236 | 0) + 24 >> 2] >> 23 << 3) >> 3];
          e = e * i;
          f = f * i
        }
        k = ~~(e * 4096.0);
        j = ~~(f * 4096.0);
        c[b + 1732 + (d * 236 | 0) + 60 >> 2] = (k | 0) > 8191 ? 8191 : k;
        c[b + 1732 + (d * 236 | 0) + 64 >> 2] = (j | 0) > 8191 ? 8191 : j;
        return
      } else {
        if (c[b + 1732 + (d * 236 | 0) + 48 >> 2] | 0) e = e * +g[b + 1732 + (d * 236 | 0) + 76 >> 2];
        if (a[(c[b + 1732 + (d * 236 | 0) + 4 >> 2] | 0) + 110 >> 0] & 64) e = e * +h[672 + (c[b + 1732 + (d * 236 | 0) + 24 >> 2] >> 23 << 3) >> 3];
        j = ~~(e * 4096.0);
        c[b + 1732 + (d * 236 | 0) + 60 >> 2] = (j | 0) > 8191 ? 8191 : j;
        return
      }
    }

    function zb(d, e, f, g) {
      d = d | 0;
      e = e | 0;
      f = f | 0;
      g = g | 0;
      var h = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0,
        o = 0,
        p = 0,
        q = 0,
        r = 0,
        s = 0,
        t = 0,
        u = 0,
        v = 0,
        w = 0;
      t = i;
      i = i + 16 | 0;
      if ((i | 0) >= (j | 0)) ba();
      c[t >> 2] = g;
      if ((a[d + 1732 + (f * 236 | 0) >> 0] | 0) == 4) {
        if ((g | 0) > 19) c[t >> 2] = 20;
        p = Eb(d, f, t) | 0;
        g = c[t >> 2] | 0;
        a: do
            if ((g | 0) > 0) {
              l = c[d + 1732 + (f * 236 | 0) + 60 >> 2] | 0;
              s = ((l | 0) / (g | 0) | 0 | 0) != 0 ? 0 - ((l | 0) / (g | 0) | 0) | 0 : -1;
              if (c[d + 12 >> 2] & 1) {
                h = e;
                k = p;
                while (1) {
                  g = g + -1 | 0;
                  l = l + s | 0;
                  if ((l | 0) < 0) break a;
                  q = _(b[k >> 1] | 0, l) | 0;
                  c[h >> 2] = q + (c[h >> 2] | 0);
                  if (!g) break a;
                  else {
                    h = h + 4 | 0;
                    k = k + 2 | 0
                  }
                }
              }
              k = c[d + 1732 + (f * 236 | 0) + 232 >> 2] | 0;
              if ((k | 0) == 1) {
                h = e;
                k = p;
                while (1) {
                  g = g + -1 | 0;
                  l = l + s | 0;
                  if ((l | 0) < 0) break a;
                  q = _(b[k >> 1] | 0, l) | 0;
                  c[h >> 2] = q + (c[h >> 2] | 0);
                  if (!g) break;
                  else {
                    h = h + 8 | 0;
                    k = k + 2 | 0
                  }
                }
              } else if ((k | 0) == 2) {
                h = e;
                k = p;
                while (1) {
                  g = g + -1 | 0;
                  l = l + s | 0;
                  if ((l | 0) < 0) break a;
                  q = h + 4 | 0;
                  p = _(b[k >> 1] | 0, l) | 0;
                  c[q >> 2] = p + (c[q >> 2] | 0);
                  if (!g) break;
                  else {
                    h = h + 8 | 0;
                    k = k + 2 | 0
                  }
                }
              } else if (!k) {
                o = c[d + 1732 + (f * 236 | 0) + 64 >> 2] | 0;
                k = p;
                h = g;
                m = o;
                while (1) {
                  h = h + -1 | 0;
                  p = l + s | 0;
                  l = (p | 0) < 0 ? 0 : p;
                  p = m - ((o | 0) / (g | 0) | 0) | 0;
                  m = (p | 0) < 0 ? 0 : p;
                  p = b[k >> 1] | 0;
                  n = _(p, l) | 0;
                  q = e + 4 | 0;
                  c[e >> 2] = n + (c[e >> 2] | 0);
                  p = _(p, m) | 0;
                  c[q >> 2] = (c[q >> 2] | 0) + p;
                  if (!h) break;
                  else {
                    e = e + 8 | 0;
                    k = k + 2 | 0
                  }
                }
              } else if ((k | 0) == 3) {
                h = e;
                k = p;
                while (1) {
                  g = g + -1 | 0;
                  l = l + s | 0;
                  if ((l | 0) < 0) break a;
                  p = _(b[k >> 1] | 0, l) | 0;
                  q = h + 4 | 0;
                  c[h >> 2] = p + (c[h >> 2] | 0);
                  c[q >> 2] = (c[q >> 2] | 0) + p;
                  if (!g) break;
                  else {
                    h = h + 8 | 0;
                    k = k + 2 | 0
                  }
                }
              } else break
            }
          while (0);
        a[d + 1732 + (f * 236 | 0) >> 0] = 0;
        i = t;
        return
      }
      h = Eb(d, f, t) | 0;
      if (c[d + 12 >> 2] & 1) {
        if ((c[d + 1732 + (f * 236 | 0) + 32 >> 2] | 0) == 0 ? (c[d + 1732 + (f * 236 | 0) + 48 >> 2] | 0) == 0 : 0) {
          g = c[t >> 2] | 0;
          l = c[d + 1732 + (f * 236 | 0) + 60 >> 2] | 0;
          if (!g) {
            i = t;
            return
          } else k = e;
          while (1) {
            g = g + -1 | 0;
            q = _(b[h >> 1] | 0, l) | 0;
            c[k >> 2] = q + (c[k >> 2] | 0);
            if (!g) break;
            else {
              k = k + 4 | 0;
              h = h + 2 | 0
            }
          }
          i = t;
          return
        }
        l = c[t >> 2] | 0;
        m = c[d + 1732 + (f * 236 | 0) + 224 >> 2] | 0;
        if (!m) {
          m = c[d + 13068 >> 2] | 0;
          if (!(Ab(d, f) | 0)) {
            g = h;
            s = e
          } else {
            i = t;
            return
          }
        } else {
          g = h;
          s = e
        }
        while (1) {
          r = c[d + 1732 + (f * 236 | 0) + 60 >> 2] | 0;
          if (!l) {
            o = 77;
            break
          }
          if ((l | 0) <= (m | 0)) {
            o = 29;
            break
          }
          q = l - m | 0;
          if (!m) {
            p = g;
            o = s
          } else {
            p = g;
            o = s;
            n = m;
            while (1) {
              n = n + -1 | 0;
              u = _(b[p >> 1] | 0, r) | 0;
              c[o >> 2] = u + (c[o >> 2] | 0);
              if (!n) break;
              else {
                p = p + 2 | 0;
                o = o + 4 | 0
              }
            }
            p = g + (m << 1) | 0;
            o = s + (m << 2) | 0
          }
          n = c[d + 13068 >> 2] | 0;
          if (!(Ab(d, f) | 0)) {
            g = p;
            l = q;
            s = o;
            m = n
          } else {
            o = 77;
            break
          }
        }
        if ((o | 0) == 29) {
          c[d + 1732 + (f * 236 | 0) + 224 >> 2] = m - l;
          h = l;
          k = s;
          while (1) {
            h = h + -1 | 0;
            q = _(b[g >> 1] | 0, r) | 0;
            c[k >> 2] = q + (c[k >> 2] | 0);
            if (!h) break;
            else {
              g = g + 2 | 0;
              k = k + 4 | 0
            }
          }
          i = t;
          return
        } else if ((o | 0) == 77) {
          i = t;
          return
        }
      }
      g = c[d + 1732 + (f * 236 | 0) + 232 >> 2] | 0;
      if (!g) {
        if ((c[d + 1732 + (f * 236 | 0) + 32 >> 2] | 0) == 0 ? (c[d + 1732 + (f * 236 | 0) + 48 >> 2] | 0) == 0 : 0) {
          g = c[t >> 2] | 0;
          m = c[d + 1732 + (f * 236 | 0) + 60 >> 2] | 0;
          l = c[d + 1732 + (f * 236 | 0) + 64 >> 2] | 0;
          if (!g) {
            i = t;
            return
          } else k = e;
          while (1) {
            g = g + -1 | 0;
            p = b[h >> 1] | 0;
            o = _(p, m) | 0;
            q = k + 4 | 0;
            c[k >> 2] = o + (c[k >> 2] | 0);
            p = _(p, l) | 0;
            c[q >> 2] = (c[q >> 2] | 0) + p;
            if (!g) break;
            else {
              k = k + 8 | 0;
              h = h + 2 | 0
            }
          }
          i = t;
          return
        }
        l = c[t >> 2] | 0;
        m = c[d + 1732 + (f * 236 | 0) + 224 >> 2] | 0;
        if (!m) {
          m = c[d + 13068 >> 2] | 0;
          if (!(Ab(d, f) | 0)) {
            s = h;
            g = e
          } else {
            i = t;
            return
          }
        } else {
          s = h;
          g = e
        }
        while (1) {
          n = c[d + 1732 + (f * 236 | 0) + 64 >> 2] | 0;
          r = c[d + 1732 + (f * 236 | 0) + 60 >> 2] | 0;
          if (!l) {
            o = 77;
            break
          }
          if ((l | 0) <= (m | 0)) {
            o = 44;
            break
          }
          q = l - m | 0;
          if (!m) {
            p = s;
            o = g
          } else {
            p = s;
            o = g;
            e = m;
            while (1) {
              e = e + -1 | 0;
              v = b[p >> 1] | 0;
              w = _(v, r) | 0;
              u = o + 4 | 0;
              c[o >> 2] = w + (c[o >> 2] | 0);
              v = _(v, n) | 0;
              c[u >> 2] = (c[u >> 2] | 0) + v;
              if (!e) break;
              else {
                p = p + 2 | 0;
                o = o + 8 | 0
              }
            }
            p = s + (m << 1) | 0;
            o = g + (m << 1 << 2) | 0
          }
          e = c[d + 13068 >> 2] | 0;
          if (!(Ab(d, f) | 0)) {
            s = p;
            l = q;
            g = o;
            m = e
          } else {
            o = 77;
            break
          }
        }
        if ((o | 0) == 44) {
          c[d + 1732 + (f * 236 | 0) + 224 >> 2] = m - l;
          h = l;
          k = s;
          while (1) {
            h = h + -1 | 0;
            p = b[k >> 1] | 0;
            o = _(p, r) | 0;
            q = g + 4 | 0;
            c[g >> 2] = o + (c[g >> 2] | 0);
            p = _(p, n) | 0;
            c[q >> 2] = (c[q >> 2] | 0) + p;
            if (!h) break;
            else {
              k = k + 2 | 0;
              g = g + 8 | 0
            }
          }
          i = t;
          return
        } else if ((o | 0) == 77) {
          i = t;
          return
        }
      } else if ((g | 0) == 2) k = e + 4 | 0;
      else if ((g | 0) == 3) {
        if ((c[d + 1732 + (f * 236 | 0) + 32 >> 2] | 0) == 0 ? (c[d + 1732 + (f * 236 | 0) + 48 >> 2] | 0) == 0 : 0) {
          g = c[t >> 2] | 0;
          l = c[d + 1732 + (f * 236 | 0) + 60 >> 2] | 0;
          if (!g) {
            i = t;
            return
          } else k = e;
          while (1) {
            g = g + -1 | 0;
            p = _(b[h >> 1] | 0, l) | 0;
            q = k + 4 | 0;
            c[k >> 2] = p + (c[k >> 2] | 0);
            c[q >> 2] = (c[q >> 2] | 0) + p;
            if (!g) break;
            else {
              k = k + 8 | 0;
              h = h + 2 | 0
            }
          }
          i = t;
          return
        }
        l = c[t >> 2] | 0;
        m = c[d + 1732 + (f * 236 | 0) + 224 >> 2] | 0;
        if (!m) {
          m = c[d + 13068 >> 2] | 0;
          if (!(Ab(d, f) | 0)) g = h;
          else {
            i = t;
            return
          }
        } else g = h;
        while (1) {
          r = c[d + 1732 + (f * 236 | 0) + 60 >> 2] | 0;
          if (!l) {
            o = 77;
            break
          }
          if ((l | 0) <= (m | 0)) {
            o = 58;
            break
          }
          q = l - m | 0;
          if (!m) {
            n = g;
            o = e
          } else {
            n = g;
            o = e;
            p = m;
            while (1) {
              p = p + -1 | 0;
              u = _(b[n >> 1] | 0, r) | 0;
              s = o + 4 | 0;
              c[o >> 2] = u + (c[o >> 2] | 0);
              c[s >> 2] = (c[s >> 2] | 0) + u;
              if (!p) break;
              else {
                n = n + 2 | 0;
                o = o + 8 | 0
              }
            }
            n = g + (m << 1) | 0;
            o = e + (m << 1 << 2) | 0
          }
          p = c[d + 13068 >> 2] | 0;
          if (!(Ab(d, f) | 0)) {
            g = n;
            l = q;
            e = o;
            m = p
          } else {
            o = 77;
            break
          }
        }
        if ((o | 0) == 58) {
          c[d + 1732 + (f * 236 | 0) + 224 >> 2] = m - l;
          h = l;
          k = e;
          while (1) {
            h = h + -1 | 0;
            p = _(b[g >> 1] | 0, r) | 0;
            q = k + 4 | 0;
            c[k >> 2] = p + (c[k >> 2] | 0);
            c[q >> 2] = (c[q >> 2] | 0) + p;
            if (!h) break;
            else {
              g = g + 2 | 0;
              k = k + 8 | 0
            }
          }
          i = t;
          return
        } else if ((o | 0) == 77) {
          i = t;
          return
        }
      } else k = e;
      if ((c[d + 1732 + (f * 236 | 0) + 32 >> 2] | 0) == 0 ? (c[d + 1732 + (f * 236 | 0) + 48 >> 2] | 0) == 0 : 0) {
        g = c[t >> 2] | 0;
        l = c[d + 1732 + (f * 236 | 0) + 60 >> 2] | 0;
        if (!g) {
          i = t;
          return
        }
        while (1) {
          g = g + -1 | 0;
          q = _(b[h >> 1] | 0, l) | 0;
          c[k >> 2] = q + (c[k >> 2] | 0);
          if (!g) break;
          else {
            k = k + 8 | 0;
            h = h + 2 | 0
          }
        }
        i = t;
        return
      }
      g = c[t >> 2] | 0;
      l = c[d + 1732 + (f * 236 | 0) + 224 >> 2] | 0;
      if (!l) {
        l = c[d + 13068 >> 2] | 0;
        if (Ab(d, f) | 0) {
          i = t;
          return
        }
      }
      while (1) {
        q = c[d + 1732 + (f * 236 | 0) + 60 >> 2] | 0;
        if (!g) {
          o = 77;
          break
        }
        if ((g | 0) <= (l | 0)) {
          o = 73;
          break
        }
        p = g - l | 0;
        if (!l) {
          m = h;
          n = k
        } else {
          m = h;
          n = k;
          e = l;
          while (1) {
            e = e + -1 | 0;
            o = _(b[m >> 1] | 0, q) | 0;
            c[n >> 2] = o + (c[n >> 2] | 0);
            if (!e) break;
            else {
              m = m + 2 | 0;
              n = n + 8 | 0
            }
          }
          m = h + (l << 1) | 0;
          n = k + (l << 1 << 2) | 0
        }
        e = c[d + 13068 >> 2] | 0;
        if (!(Ab(d, f) | 0)) {
          h = m;
          g = p;
          k = n;
          l = e
        } else {
          o = 77;
          break
        }
      }
      if ((o | 0) == 73) {
        c[d + 1732 + (f * 236 | 0) + 224 >> 2] = l - g;
        while (1) {
          g = g + -1 | 0;
          p = _(b[h >> 1] | 0, q) | 0;
          c[k >> 2] = p + (c[k >> 2] | 0);
          if (!g) break;
          else {
            h = h + 2 | 0;
            k = k + 8 | 0
          }
        }
        i = t;
        return
      } else if ((o | 0) == 77) {
        i = t;
        return
      }
    }

    function Ab(a, b) {
      a = a | 0;
      b = b | 0;
      var e = 0,
        f = 0,
        h = 0;
      e = c[a + 1732 + (b * 236 | 0) + 32 >> 2] | 0;
      do
        if (e) {
          f = (c[a + 1732 + (b * 236 | 0) + 24 >> 2] | 0) + e | 0;
          c[a + 1732 + (b * 236 | 0) + 24 >> 2] = f;
          h = c[a + 1732 + (b * 236 | 0) + 28 >> 2] | 0;
          if ((e | 0) < 0) {
            if ((f | 0) > (h | 0)) break
          } else if ((f | 0) < (h | 0)) break;
          c[a + 1732 + (b * 236 | 0) + 24 >> 2] = h;
          if (xb(a, b) | 0) {
            e = 1;
            return e | 0
          }
        }
      while (0);
      h = c[a + 1732 + (b * 236 | 0) + 48 >> 2] | 0;
      if (h) {
        e = (d[(c[a + 1732 + (b * 236 | 0) + 4 >> 2] | 0) + 108 >> 0] | 0) << 7;
        f = c[a + 1732 + (b * 236 | 0) + 36 >> 2] | 0;
        do
          if (f) {
            f = (c[a + 1732 + (b * 236 | 0) + 40 >> 2] | 0) + f | 0;
            c[a + 1732 + (b * 236 | 0) + 40 >> 2] = f;
            if ((f | 0) > 65535) {
              c[a + 1732 + (b * 236 | 0) + 36 >> 2] = 0;
              break
            } else {
              e = (_(f, e) | 0) >> 16;
              break
            }
          }
        while (0);
        f = (c[a + 1732 + (b * 236 | 0) + 44 >> 2] | 0) + h | 0;
        c[a + 1732 + (b * 236 | 0) + 44 >> 2] = f;
        g[a + 1732 + (b * 236 | 0) + 76 >> 2] = 1.0 - +(e | 0) * (+R(+(+(f >> 5 | 0) * .006135923151542565)) + 1.0) * 7.62939453125e-06
      }
      yb(a, b);
      e = 0;
      return e | 0
    }

    function Bb(a) {
      a = a | 0;
      var b = 0,
        d = 0,
        e = 0,
        f = 0,
        g = 0,
        h = 0,
        i = 0;
      i = 127;
      while (1) {
        e = c[a + 32 + (i << 2) >> 2] | 0;
        if (e) {
          h = 0;
          do {
            g = e + 4 + (h << 2) | 0;
            f = c[g >> 2] | 0;
            if ((f | 0) == -1) d = 12;
            else if (f) {
              b = c[f + 4 >> 2] | 0;
              if (b) {
                do
                  if ((c[f >> 2] | 0) > 0) {
                    d = 0;
                    while (1) {
                      Nb(c[b + (d * 116 | 0) + 88 >> 2] | 0);
                      d = d + 1 | 0;
                      if ((d | 0) >= (c[f >> 2] | 0)) {
                        d = 8;
                        break
                      }
                      b = c[f + 4 >> 2] | 0;
                      if (!(b + (d * 116 | 0) | 0)) {
                        d = 9;
                        break
                      }
                    }
                    if ((d | 0) == 8) {
                      b = c[f + 4 >> 2] | 0;
                      break
                    } else if ((d | 0) == 9) break
                  }
                while (0);
                Nb(b)
              }
              Nb(f);
              d = 12
            }
            if ((d | 0) == 12) {
              d = 0;
              c[g >> 2] = 0
            }
            h = h + 1 | 0
          } while ((h | 0) != 128)
        }
        e = c[a + 544 + (i << 2) >> 2] | 0;
        if (e) {
          h = 0;
          do {
            f = e + 4 + (h << 2) | 0;
            g = c[f >> 2] | 0;
            if ((g | 0) == -1) d = 25;
            else if (g) {
              b = c[g + 4 >> 2] | 0;
              if (b) {
                do
                  if ((c[g >> 2] | 0) > 0) {
                    d = 0;
                    while (1) {
                      Nb(c[b + (d * 116 | 0) + 88 >> 2] | 0);
                      d = d + 1 | 0;
                      if ((d | 0) >= (c[g >> 2] | 0)) {
                        d = 21;
                        break
                      }
                      b = c[g + 4 >> 2] | 0;
                      if (!(b + (d * 116 | 0) | 0)) {
                        d = 22;
                        break
                      }
                    }
                    if ((d | 0) == 21) {
                      b = c[g + 4 >> 2] | 0;
                      break
                    } else if ((d | 0) == 22) break
                  }
                while (0);
                Nb(b)
              }
              Nb(g);
              d = 25
            }
            if ((d | 0) == 25) {
              d = 0;
              c[f >> 2] = 0
            }
            h = h + 1 | 0
          } while ((h | 0) != 128)
        }
        if (!i) break;
        else i = i + -1 | 0
      }
      return
    }

    function Cb(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0,
        h = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0,
        o = 0;
      m = i;
      i = i + 16 | 0;
      if ((i | 0) >= (j | 0)) ba();
      k = c[((b | 0) != 0 ? a + 544 + (d << 2) | 0 : a + 32 + (d << 2) | 0) >> 2] | 0;
      if (!k) {
        c[m >> 2] = (b | 0) != 0 ? 6328 : 88;
        c[m + 4 >> 2] = d;
        Fa(104, m | 0) | 0;
        d = 0;
        i = m;
        return d | 0
      }
      l = (b | 0) != 0 ? 1 : -1;
      if (b) {
        if (!d) {
          d = 0;
          g = 0;
          do {
            e = k + 4 + (g << 2) | 0;
            do
              if ((c[e >> 2] | 0) == (-1 | 0)) {
                b = c[k >> 2] | 0;
                f = c[b + (g * 28 | 0) >> 2] | 0;
                if (!f) {
                  c[e >> 2] = 0;
                  d = d + 1 | 0;
                  break
                }
                o = c[b + (g * 28 | 0) + 4 >> 2] | 0;
                n = c[b + (g * 28 | 0) + 16 >> 2] | 0;
                h = c[b + (g * 28 | 0) + 20 >> 2] | 0;
                Db(a, f, e, c[b + (g * 28 | 0) + 12 >> 2] | 0, c[b + (g * 28 | 0) + 8 >> 2] | 0, (o | 0) == -1 ? g : o, (n | 0) == -1 ? l : n, (h | 0) == -1 ? l : h, c[b + (g * 28 | 0) + 24 >> 2] | 0);
                if (!(c[e >> 2] | 0)) {
                  c[e >> 2] = -1;
                  d = d + 1 | 0
                }
              }
            while (0);
            g = g + 1 | 0
          } while ((g | 0) != 128);
          i = m;
          return d | 0
        } else {
          d = 0;
          h = 0
        }
        do {
          g = k + 4 + (h << 2) | 0;
          do
            if ((c[g >> 2] | 0) == (-1 | 0)) {
              f = c[k >> 2] | 0;
              e = c[f + (h * 28 | 0) >> 2] | 0;
              if (e) {
                o = c[f + (h * 28 | 0) + 4 >> 2] | 0;
                n = c[f + (h * 28 | 0) + 16 >> 2] | 0;
                b = c[f + (h * 28 | 0) + 20 >> 2] | 0;
                Db(a, e, g, c[f + (h * 28 | 0) + 12 >> 2] | 0, c[f + (h * 28 | 0) + 8 >> 2] | 0, (o | 0) == -1 ? h : o, (n | 0) == -1 ? l : n, (b | 0) == -1 ? l : b, c[f + (h * 28 | 0) + 24 >> 2] | 0);
                if (c[g >> 2] | 0) break;
                c[g >> 2] = -1;
                d = d + 1 | 0;
                break
              }
              b = (c[a + 544 >> 2] | 0) + 4 + (h << 2) | 0;
              if (!(c[b >> 2] | 0)) c[b >> 2] = -1;
              c[g >> 2] = 0;
              d = d + 1 | 0
            }
          while (0);
          h = h + 1 | 0
        } while ((h | 0) != 128);
        i = m;
        return d | 0
      } else {
        if (!d) {
          d = 0;
          g = 0;
          do {
            f = k + 4 + (g << 2) | 0;
            do
              if ((c[f >> 2] | 0) == (-1 | 0)) {
                e = c[k >> 2] | 0;
                b = c[e + (g * 28 | 0) >> 2] | 0;
                if (!b) {
                  c[f >> 2] = 0;
                  d = d + 1 | 0;
                  break
                }
                n = c[e + (g * 28 | 0) + 16 >> 2] | 0;
                h = c[e + (g * 28 | 0) + 20 >> 2] | 0;
                Db(a, b, f, c[e + (g * 28 | 0) + 12 >> 2] | 0, c[e + (g * 28 | 0) + 8 >> 2] | 0, c[e + (g * 28 | 0) + 4 >> 2] | 0, (n | 0) == -1 ? l : n, (h | 0) == -1 ? l : h, c[e + (g * 28 | 0) + 24 >> 2] | 0);
                if (!(c[f >> 2] | 0)) {
                  c[f >> 2] = -1;
                  d = d + 1 | 0
                }
              }
            while (0);
            g = g + 1 | 0
          } while ((g | 0) != 128);
          i = m;
          return d | 0
        } else {
          d = 0;
          g = 0
        }
        do {
          f = k + 4 + (g << 2) | 0;
          do
            if ((c[f >> 2] | 0) == (-1 | 0)) {
              b = c[k >> 2] | 0;
              e = c[b + (g * 28 | 0) >> 2] | 0;
              if (e) {
                n = c[b + (g * 28 | 0) + 16 >> 2] | 0;
                h = c[b + (g * 28 | 0) + 20 >> 2] | 0;
                Db(a, e, f, c[b + (g * 28 | 0) + 12 >> 2] | 0, c[b + (g * 28 | 0) + 8 >> 2] | 0, c[b + (g * 28 | 0) + 4 >> 2] | 0, (n | 0) == -1 ? l : n, (h | 0) == -1 ? l : h, c[b + (g * 28 | 0) + 24 >> 2] | 0);
                if (c[f >> 2] | 0) break;
                c[f >> 2] = -1;
                d = d + 1 | 0;
                break
              }
              b = (c[a + 32 >> 2] | 0) + 4 + (g << 2) | 0;
              if (!(c[b >> 2] | 0)) c[b >> 2] = -1;
              c[f >> 2] = 0;
              d = d + 1 | 0
            }
          while (0);
          g = g + 1 | 0
        } while ((g | 0) != 128);
        i = m;
        return d | 0
      }
      return 0
    }

    function Db(f, h, k, l, m, n, o, p, q) {
      f = f | 0;
      h = h | 0;
      k = k | 0;
      l = l | 0;
      m = m | 0;
      n = n | 0;
      o = o | 0;
      p = p | 0;
      q = q | 0;
      var r = 0,
        s = 0,
        t = 0,
        u = 0,
        v = 0,
        w = 0,
        x = 0.0,
        y = 0,
        z = 0,
        A = 0,
        B = 0,
        D = 0,
        E = 0,
        F = 0,
        G = 0,
        H = 0,
        I = 0,
        J = 0,
        K = 0,
        L = 0,
        M = 0,
        N = 0.0;
      L = i;
      i = i + 1040 | 0;
      if ((i | 0) >= (j | 0)) ba();
      c[k >> 2] = 0;
      if (!h) {
        i = L;
        return
      }
      s = cb(h) | 0;
      c[f + 1056 >> 2] = s;
      if (!s) {
        if (((Rb(h | 0) | 0) + 4 | 0) >>> 0 >= 1024) {
          i = L;
          return
        }
        Vb(L + 8 | 0, h | 0) | 0;
        s = L + 8 + (Rb(L + 8 | 0) | 0) | 0;
        a[s >> 0] = a[80] | 0;
        a[s + 1 >> 0] = a[81] | 0;
        a[s + 2 >> 0] = a[82] | 0;
        a[s + 3 >> 0] = a[83] | 0;
        a[s + 4 >> 0] = a[84] | 0;
        s = cb(L + 8 | 0) | 0;
        c[f + 1056 >> 2] = s;
        if (!s) {
          i = L;
          return
        } else J = s
      } else J = s;
      H = (na(L + 8 | 0, 1, 239, J | 0) | 0) == 239;
      do
        if (H & (a[L + 8 >> 0] | 0) == 71 ? (a[L + 8 + 1 >> 0] | 0) == 70 : 0) {
          do
            if ((((((((((((((a[L + 8 + 2 >> 0] | 0) == 49 ? (a[L + 8 + 3 >> 0] | 0) == 80 : 0) ? (a[L + 8 + 4 >> 0] | 0) == 65 : 0) ? (a[L + 8 + 5 >> 0] | 0) == 84 : 0) ? (a[L + 8 + 6 >> 0] | 0) == 67 : 0) ? (a[L + 8 + 7 >> 0] | 0) == 72 : 0) ? (a[L + 8 + 8 >> 0] | 0) == 49 : 0) ? (a[L + 8 + 9 >> 0] | 0) == 49 : 0) ? (a[L + 8 + 10 >> 0] | 0) == 48 : 0) ? (a[L + 8 + 11 >> 0] | 0) == 0 : 0) ? (a[L + 8 + 12 >> 0] | 0) == 73 : 0) ? (a[L + 8 + 13 >> 0] | 0) == 68 : 0) ? (a[L + 8 + 14 >> 0] | 0) == 35 : 0) ? (a[L + 8 + 15 >> 0] | 0) == 48 : 0) {
              if ((a[L + 8 + 16 >> 0] | 0) != 48) {
                K = 115;
                break
              }
              if ((a[L + 8 + 17 >> 0] | 0) != 48) {
                K = 115;
                break
              }
              if ((a[L + 8 + 18 >> 0] | 0) != 48) {
                K = 115;
                break
              }
              if ((a[L + 8 + 19 >> 0] | 0) != 48) {
                K = 115;
                break
              }
              if ((a[L + 8 + 20 >> 0] | 0) != 50) {
                K = 115;
                break
              }
              if (a[L + 8 + 21 >> 0] | 0) K = 115
            } else K = 115; while (0);
          if ((K | 0) == 115) {
            if ((a[L + 8 + 2 >> 0] | 0) != 49) break;
            if ((a[L + 8 + 3 >> 0] | 0) != 80) break;
            if ((a[L + 8 + 4 >> 0] | 0) != 65) break;
            if ((a[L + 8 + 5 >> 0] | 0) != 84) break;
            if ((a[L + 8 + 6 >> 0] | 0) != 67) break;
            if ((a[L + 8 + 7 >> 0] | 0) != 72) break;
            if ((a[L + 8 + 8 >> 0] | 0) != 49) break;
            if ((a[L + 8 + 9 >> 0] | 0) != 48) break;
            if ((a[L + 8 + 10 >> 0] | 0) != 48) break;
            if (a[L + 8 + 11 >> 0] | 0) break;
            if ((a[L + 8 + 12 >> 0] | 0) != 73) break;
            if ((a[L + 8 + 13 >> 0] | 0) != 68) break;
            if ((a[L + 8 + 14 >> 0] | 0) != 35) break;
            if ((a[L + 8 + 15 >> 0] | 0) != 48) break;
            if ((a[L + 8 + 16 >> 0] | 0) != 48) break;
            if ((a[L + 8 + 17 >> 0] | 0) != 48) break;
            if ((a[L + 8 + 18 >> 0] | 0) != 48) break;
            if ((a[L + 8 + 19 >> 0] | 0) != 48) break;
            if ((a[L + 8 + 20 >> 0] | 0) != 50) break;
            if (a[L + 8 + 21 >> 0] | 0) break
          }
          if ((d[L + 8 + 82 >> 0] | 0) < 2 ? (d[L + 8 + 151 >> 0] | 0) < 2 : 0) {
            I = Mb(8) | 0;
            if (!I) {
              c[k >> 2] = 0;
              c[f >> 2] = 1;
              break
            }
            a[I >> 0] = 0;
            a[I + 1 >> 0] = 0;
            a[I + 2 >> 0] = 0;
            a[I + 3 >> 0] = 0;
            a[I + 4 >> 0] = 0;
            a[I + 4 + 1 >> 0] = 0;
            a[I + 4 + 2 >> 0] = 0;
            a[I + 4 + 3 >> 0] = 0;
            c[k >> 2] = I;
            s = a[L + 8 + 198 >> 0] | 0;
            c[I >> 2] = s;
            h = Mb(s * 116 | 0) | 0;
            a: do
                if (!h) {
                  c[I + 4 >> 2] = 0;
                  c[f >> 2] = 1;
                  h = I + 4 | 0;
                  s = I + 4 | 0
                } else {
                  Pb(h | 0, 0, s * 116 | 0) | 0;
                  c[I + 4 >> 2] = h;
                  b: do
                      if ((c[I >> 2] | 0) > 0) {
                        H = (n | 0) == -1 ? 0 : n & 255;
                        s = 0;
                        c: while (1) {
                          ya(J | 0, 7, 1) | 0;
                          if ((na(L + 7 | 0, 1, 1, J | 0) | 0) != 1) {
                            h = I + 4 | 0;
                            s = I + 4 | 0;
                            break a
                          }
                          w = c[I + 4 >> 2] | 0;
                          if ((na(L | 0, 4, 1, J | 0) | 0) != 1) {
                            h = I + 4 | 0;
                            s = I + 4 | 0;
                            break a
                          }
                          D = w + (s * 116 | 0) + 8 | 0;
                          c[D >> 2] = c[L >> 2];
                          if ((na(L | 0, 4, 1, J | 0) | 0) != 1) {
                            h = I + 4 | 0;
                            s = I + 4 | 0;
                            break a
                          }
                          E = w + (s * 116 | 0) | 0;
                          c[E >> 2] = c[L >> 2];
                          if ((na(L | 0, 4, 1, J | 0) | 0) != 1) {
                            h = I + 4 | 0;
                            s = I + 4 | 0;
                            break a
                          }
                          F = w + (s * 116 | 0) + 4 | 0;
                          c[F >> 2] = c[L >> 2];
                          if ((na(L + 4 | 0, 2, 1, J | 0) | 0) != 1) {
                            h = I + 4 | 0;
                            s = I + 4 | 0;
                            break a
                          }
                          G = w + (s * 116 | 0) + 12 | 0;
                          c[G >> 2] = e[L + 4 >> 1];
                          if ((na(L | 0, 4, 1, J | 0) | 0) != 1) {
                            h = I + 4 | 0;
                            s = I + 4 | 0;
                            break a
                          }
                          c[w + (s * 116 | 0) + 24 >> 2] = c[L >> 2];
                          if ((na(L | 0, 4, 1, J | 0) | 0) != 1) {
                            h = I + 4 | 0;
                            s = I + 4 | 0;
                            break a
                          }
                          c[w + (s * 116 | 0) + 28 >> 2] = c[L >> 2];
                          if ((na(L | 0, 4, 1, J | 0) | 0) != 1) {
                            h = I + 4 | 0;
                            s = I + 4 | 0;
                            break a
                          }
                          B = w + (s * 116 | 0) + 32 | 0;
                          c[B >> 2] = c[L >> 2];
                          c[w + (s * 116 | 0) + 16 >> 2] = 0;
                          c[w + (s * 116 | 0) + 20 >> 2] = 127;
                          ya(J | 0, 2, 1) | 0;
                          if ((na(L + 6 | 0, 1, 1, J | 0) | 0) != 1) {
                            h = I + 4 | 0;
                            s = I + 4 | 0;
                            break a
                          }
                          h = a[L + 6 >> 0] | 0;
                          a[L + 8 >> 0] = h;
                          if ((l | 0) == -1) h = h << 24 >> 24 << 3 & 120 | 4;
                          else h = l & 127;
                          a[w + (s * 116 | 0) + 111 >> 0] = h;
                          if ((na(L + 8 | 0, 1, 18, J | 0) | 0) != 18) {
                            h = I + 4 | 0;
                            s = I + 4 | 0;
                            break a
                          }
                          if ((a[L + 8 + 13 >> 0] | 0) == 0 | (a[L + 8 + 14 >> 0] | 0) == 0) {
                            a[w + (s * 116 | 0) + 108 >> 0] = 0;
                            c[w + (s * 116 | 0) + 96 >> 2] = 0;
                            c[w + (s * 116 | 0) + 92 >> 2] = 0
                          } else {
                            h = a[L + 8 + 12 >> 0] | 0;
                            if (!(h << 24 >> 24)) {
                              h = 0;
                              n = c[f + 8 >> 2] | 0;
                              r = c[f + 13068 >> 2] | 0
                            } else {
                              r = c[f + 13068 >> 2] | 0;
                              A = _(r, 2490368) | 0;
                              n = c[f + 8 >> 2] | 0;
                              h = (A | 0) / (_(n, h & 255) | 0) | 0
                            }
                            c[w + (s * 116 | 0) + 92 >> 2] = h;
                            c[w + (s * 116 | 0) + 96 >> 2] = (_(r << 15, d[L + 8 + 13 >> 0] | 0) | 0) / (n * 38 | 0) | 0;
                            a[w + (s * 116 | 0) + 108 >> 0] = a[L + 8 + 14 >> 0] | 0
                          }
                          h = a[L + 8 + 16 >> 0] | 0;
                          if (h << 24 >> 24 == 0 | (a[L + 8 + 17 >> 0] | 0) == 0) {
                            a[w + (s * 116 | 0) + 109 >> 0] = 0;
                            c[w + (s * 116 | 0) + 104 >> 2] = 0;
                            c[w + (s * 116 | 0) + 100 >> 2] = 0
                          } else {
                            r = c[f + 8 >> 2] | 0;
                            c[w + (s * 116 | 0) + 104 >> 2] = (r * 38 | 0) / ((h & 255) << 6 | 0) | 0;
                            n = a[L + 8 + 15 >> 0] | 0;
                            if (!(n << 24 >> 24)) h = 0;
                            else h = ~~(+((r * 38 | 0) / ((h & 255) << 6 | 0) | 0 | 0) * 38.0 * 65536.0 / +(_(n & 255, r) | 0));
                            c[w + (s * 116 | 0) + 100 >> 2] = h;
                            a[w + (s * 116 | 0) + 109 >> 0] = a[L + 8 + 17 >> 0] | 0
                          }
                          if ((na(L + 6 | 0, 1, 1, J | 0) | 0) != 1) {
                            h = I + 4 | 0;
                            s = I + 4 | 0;
                            break a
                          }
                          z = w + (s * 116 | 0) + 110 | 0;
                          a[z >> 0] = a[L + 6 >> 0] | 0;
                          ya(J | 0, 40, 1) | 0;
                          y = w + (s * 116 | 0) + 112 | 0;
                          a[y >> 0] = H;
                          h = a[z >> 0] | 0;
                          if (h & 4) {
                            a[z >> 0] = h & 255 | 32;
                            h = (h & 255 | 32) & 255
                          }
                          do
                            if ((o | 0) == 1) {
                              n = h & 255;
                              if (!(n & 60)) break;
                              a[z >> 0] = n & 195;
                              h = n & 195
                            }
                          while (0);
                          d: do
                              if ((p | 0) == 1) a[z >> 0] = h & 191;
                              else
                            if (p) {
                              v = h & 255;
                              if (!(v & 28)) {
                                a[z >> 0] = v & 159;
                                break
                              }
                              h = a[L + 8 >> 0] | 0;
                              do
                                if (h << 24 >> 24 == 63) {
                                  h = a[L + 8 + 1 >> 0] | 0;
                                  if (h << 24 >> 24 != 63) {
                                    K = 50;
                                    break
                                  }
                                  h = a[L + 8 + 2 >> 0] | 0;
                                  if (h << 24 >> 24 != 63) {
                                    K = 50;
                                    break
                                  }
                                  h = a[L + 8 + 3 >> 0] | 0;
                                  if (h << 24 >> 24 != 63) {
                                    K = 50;
                                    break
                                  }
                                  h = a[L + 8 + 4 >> 0] | 0;
                                  if (h << 24 >> 24 != 63) {
                                    K = 50;
                                    break
                                  }
                                  h = a[L + 8 + 5 >> 0] | 0;
                                  if (h << 24 >> 24 != 63) K = 50
                                } else K = 50; while (0);
                              do
                                if ((K | 0) == 50) {
                                  K = 0;
                                  if (h << 24 >> 24 == 63 ? 1 : (a[L + 8 + 11 >> 0] | 0) > 99) break;
                                  if (v & 32) break d;
                                  a[z >> 0] = v & 191;
                                  break d
                                }
                              while (0);
                              a[z >> 0] = v & 191
                            }
                          while (0);
                          h = d[L + 8 >> 0] | 0;
                          c[w + (s * 116 | 0) + 36 >> 2] = _(c[f + 13068 >> 2] << 10, (((h & 63) << (h >>> 6 ^ 3) * 3) * 44100 | 0) / (c[f + 8 >> 2] | 0) | 0) | 0;
                          c[w + (s * 116 | 0) + 60 >> 2] = d[L + 8 + 6 >> 0] << 22;
                          h = d[L + 8 + 1 >> 0] | 0;
                          c[w + (s * 116 | 0) + 40 >> 2] = _(c[f + 13068 >> 2] << 10, (((h & 63) << (h >>> 6 ^ 3) * 3) * 44100 | 0) / (c[f + 8 >> 2] | 0) | 0) | 0;
                          c[w + (s * 116 | 0) + 64 >> 2] = d[L + 8 + 7 >> 0] << 22;
                          h = d[L + 8 + 2 >> 0] | 0;
                          c[w + (s * 116 | 0) + 44 >> 2] = _(c[f + 13068 >> 2] << 10, (((h & 63) << (h >>> 6 ^ 3) * 3) * 44100 | 0) / (c[f + 8 >> 2] | 0) | 0) | 0;
                          c[w + (s * 116 | 0) + 68 >> 2] = d[L + 8 + 8 >> 0] << 22;
                          h = d[L + 8 + 3 >> 0] | 0;
                          c[w + (s * 116 | 0) + 48 >> 2] = _(c[f + 13068 >> 2] << 10, (((h & 63) << (h >>> 6 ^ 3) * 3) * 44100 | 0) / (c[f + 8 >> 2] | 0) | 0) | 0;
                          c[w + (s * 116 | 0) + 72 >> 2] = d[L + 8 + 9 >> 0] << 22;
                          h = d[L + 8 + 4 >> 0] | 0;
                          c[w + (s * 116 | 0) + 52 >> 2] = _(c[f + 13068 >> 2] << 10, (((h & 63) << (h >>> 6 ^ 3) * 3) * 44100 | 0) / (c[f + 8 >> 2] | 0) | 0) | 0;
                          c[w + (s * 116 | 0) + 76 >> 2] = d[L + 8 + 10 >> 0] << 22;
                          h = d[L + 8 + 5 >> 0] | 0;
                          c[w + (s * 116 | 0) + 56 >> 2] = _(c[f + 13068 >> 2] << 10, (((h & 63) << (h >>> 6 ^ 3) * 3) * 44100 | 0) / (c[f + 8 >> 2] | 0) | 0) | 0;
                          c[w + (s * 116 | 0) + 80 >> 2] = d[L + 8 + 11 >> 0] << 22;
                          h = (c[D >> 2] | 0) + 4 | 0;
                          n = Mb(h) | 0;
                          if (!n) {
                            K = 55;
                            break
                          }
                          Pb(n | 0, 0, h | 0) | 0;
                          A = w + (s * 116 | 0) + 88 | 0;
                          c[A >> 2] = n;
                          if ((na(n | 0, c[D >> 2] | 0, 1, J | 0) | 0) != 1) {
                            h = I + 4 | 0;
                            s = I + 4 | 0;
                            break a
                          }
                          h = a[z >> 0] | 0;
                          if (!(h & 1)) {
                            n = c[D >> 2] | 0;
                            h = c[A >> 2] | 0;
                            c[D >> 2] = n << 1;
                            c[E >> 2] = c[E >> 2] << 1;
                            c[F >> 2] = c[F >> 2] << 1;
                            t = Mb((n << 1) + 4 | 0) | 0;
                            if (!t) {
                              K = 100;
                              break
                            }
                            Pb(t | 0, 0, (n << 1) + 4 | 0) | 0;
                            if (n) {
                              r = t;
                              while (1) {
                                n = n + -1 | 0;
                                b[r >> 1] = d[h >> 0] << 8;
                                if (!n) break;
                                else {
                                  h = h + 1 | 0;
                                  r = r + 2 | 0
                                }
                              }
                            }
                            Nb(c[A >> 2] | 0);
                            c[A >> 2] = t;
                            h = a[z >> 0] | 0
                          }
                          do
                            if (h & 2) {
                              n = c[D >> 2] | 0;
                              if ((n + 1 | 0) >>> 0 < 3) break;
                              n = (n | 0) / 2 | 0;
                              r = c[A >> 2] | 0;
                              while (1) {
                                n = n + -1 | 0;
                                b[r >> 1] = e[r >> 1] ^ 32768;
                                if (!n) break;
                                else r = r + 2 | 0
                              }
                            }
                          while (0);
                          if (!(h & 16)) t = h;
                          else {
                            n = c[A >> 2] | 0;
                            u = c[D >> 2] | 0;
                            if ((((u | 0) / 2 | 0) + 1 | 0) >>> 0 >= 3) {
                              r = (u | 0) / 4 | 0;
                              t = n;
                              n = n + (((u | 0) / 2 | 0) << 1) | 0;
                              while (1) {
                                r = r + -1 | 0;
                                v = b[t >> 1] | 0;
                                b[t >> 1] = b[n >> 1] | 0;
                                b[n >> 1] = v;
                                if (!r) break;
                                else {
                                  t = t + 2 | 0;
                                  n = n + -2 | 0
                                }
                              }
                            }
                            t = c[E >> 2] | 0;
                            c[E >> 2] = u - (c[F >> 2] | 0);
                            c[F >> 2] = u - t;
                            t = (h & 235 | 4) & 255;
                            a[z >> 0] = t
                          }
                          if ((m | 0) == -1) {
                            h = c[D >> 2] | 0;
                            if ((h + 1 | 0) >>> 0 < 3) n = 0;
                            else {
                              v = (h | 0) / 2 | 0;
                              n = 0;
                              u = c[A >> 2] | 0;
                              while (1) {
                                v = v + -1 | 0;
                                r = b[u >> 1] | 0;
                                if (r << 16 >> 16 < 0) r = 0 - (r & 65535) & 65535;
                                n = r << 16 >> 16 > n << 16 >> 16 ? r : n;
                                if (!v) break;
                                else u = u + 2 | 0
                              }
                            }
                            g[w + (s * 116 | 0) + 84 >> 2] = 32768.0 / +(n << 16 >> 16)
                          } else {
                            g[w + (s * 116 | 0) + 84 >> 2] = +(m | 0) / 100.0;
                            h = c[D >> 2] | 0
                          }
                          n = (h | 0) / 2 | 0;
                          u = (c[E >> 2] | 0) / 2 | 0;
                          h = (c[F >> 2] | 0) / 2 | 0;
                          z = c[A >> 2] | 0;
                          b[z + (n + 1 << 1) >> 1] = 0;
                          b[z + (n << 1) >> 1] = 0;
                          c[D >> 2] = n << 12;
                          r = d[L + 7 >> 0] | 0;
                          c[E >> 2] = r << 8 & 3840 | u << 12;
                          c[F >> 2] = r >>> 4 << 8 | h << 12;
                          h = a[y >> 0] | 0;
                          if ((t & 4) == 0 & h << 24 >> 24 != 0) {
                            x = +(c[B >> 2] | 0) * +(c[f + 8 >> 2] | 0) / (+(c[G >> 2] | 0) * +(c[160 + (h << 24 >> 24 << 2) >> 2] | 0));
                            do
                              if (!(x * +(n << 12 | 0) >= 2147483647.0)) {
                                y = ~~(x * +(n << 12 | 0));
                                h = ((n << 12) + -4096 | 0) / ((y >> 12) + -1 | 0) | 0;
                                B = Qb(h | 0, ((h | 0) < 0) << 31 >> 31 | 0, y | 0, ((y | 0) < 0) << 31 >> 31 | 0) | 0;
                                r = C;
                                if (!((r | 0) < 0 | (r | 0) == 0 & B >>> 0 < 2147483647)) break;
                                w = Mb((y >> 11) + 2 | 0) | 0;
                                if (!w) {
                                  K = 84;
                                  break c
                                }
                                Pb(w | 0, 0, (y >> 11) + 2 | 0) | 0;
                                do
                                  if ((y >> 12 | 0) == 2) v = w;
                                  else {
                                    b[w >> 1] = b[z >> 1] | 0;
                                    if ((y >> 12 | 0) <= 3) {
                                      v = w + 2 | 0;
                                      break
                                    }
                                    n = w + 2 | 0;
                                    r = 0;
                                    v = h;
                                    while (1) {
                                      u = v >> 12;
                                      if ((u | 0) > 0) t = b[z + (u + -1 << 1) >> 1] | 0;
                                      else t = 0;
                                      M = b[z + (u << 1) >> 1] | 0;
                                      B = b[z + (u + 1 << 1) >> 1] | 0;
                                      u = b[z + (u + 2 << 1) >> 1] | 0;
                                      N = +((v & 4095) >>> 0) * .000244140625;
                                      B = ~~(+(M << 16 >> 16) + N * .16666666666666666 * (+(((B - ((M << 16 >> 16) - B) | 0) * 3 | 0) - (u + (t << 1)) | 0) + N * (+((t - (M << 16 >> 16) - ((M << 16 >> 16) - B) | 0) * 3 | 0) + N * +(u - t + (((M << 16 >> 16) - B | 0) * 3 | 0) | 0))));
                                      b[n >> 1] = (B | 0) > 32767 ? 32767 : (B | 0) < -32768 ? -32768 : B & 65535;
                                      r = r + 1 | 0;
                                      if ((r | 0) == ((y >> 12) + -3 | 0)) break;
                                      else {
                                        n = n + 2 | 0;
                                        v = v + h | 0
                                      }
                                    }
                                    v = w + 2 + ((y >> 12) + -3 << 1) | 0;
                                    h = _(h, (y >> 12) + -2 | 0) | 0
                                  }
                                while (0);
                                r = h & 4095;
                                n = h >> 12;
                                h = b[z + (n << 1) >> 1] | 0;
                                if (r) h = ((_((b[z + (n + 1 << 1) >> 1] | 0) - (h << 16 >> 16) | 0, r) | 0) >>> 12) + (h << 16 >> 16) & 65535;
                                b[v >> 1] = h;
                                B = h << 16 >> 16;
                                b[v + 2 >> 1] = (B | 0) / 2 | 0;
                                b[v + 4 >> 1] = (B | 0) / 4 | 0;
                                c[D >> 2] = y;
                                c[E >> 2] = ~~(x * +(c[E >> 2] | 0));
                                c[F >> 2] = ~~(x * +(c[F >> 2] | 0));
                                Nb(c[A >> 2] | 0);
                                c[A >> 2] = w;
                                c[G >> 2] = 0
                              }
                            while (0);
                            if (c[f >> 2] | 0) {
                              h = I + 4 | 0;
                              s = I + 4 | 0;
                              break a
                            }
                          }
                          if ((q | 0) == 1) c[D >> 2] = c[F >> 2];
                          s = s + 1 | 0;
                          if ((s | 0) >= (c[I >> 2] | 0)) break b
                        }
                        if ((K | 0) == 55) {
                          c[w + (s * 116 | 0) + 88 >> 2] = 0;
                          c[f >> 2] = 1;
                          h = I + 4 | 0;
                          s = I + 4 | 0;
                          break a
                        } else if ((K | 0) == 84) {
                          c[f >> 2] = 1;
                          h = I + 4 | 0;
                          s = I + 4 | 0;
                          break a
                        } else if ((K | 0) == 100) {
                          c[f >> 2] = 1;
                          h = I + 4 | 0;
                          s = I + 4 | 0;
                          break a
                        }
                      }
                    while (0);
                  Ba(J | 0) | 0;
                  c[f + 1056 >> 2] = 0;
                  i = L;
                  return
                }
              while (0);
            r = c[h >> 2] | 0;
            if (r) {
              do
                if ((c[I >> 2] | 0) > 0) {
                  n = 0;
                  while (1) {
                    Nb(c[r + (n * 116 | 0) + 88 >> 2] | 0);
                    n = n + 1 | 0;
                    if ((n | 0) >= (c[I >> 2] | 0)) {
                      K = 105;
                      break
                    }
                    r = c[h >> 2] | 0;
                    if (!(r + (n * 116 | 0) | 0)) {
                      K = 106;
                      break
                    }
                  }
                  if ((K | 0) == 105) {
                    r = c[s >> 2] | 0;
                    break
                  } else if ((K | 0) == 106) break
                }
              while (0);
              Nb(r)
            }
            Nb(I)
          }
        }
      while (0);
      Ba(J | 0) | 0;
      c[f + 1056 >> 2] = 0;
      c[k >> 2] = 0;
      i = L;
      return
    }

    function Eb(e, f, g) {
      e = e | 0;
      f = f | 0;
      g = g | 0;
      var h = 0,
        i = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0,
        o = 0,
        p = 0,
        q = 0,
        r = 0,
        s = 0,
        t = 0,
        u = 0,
        v = 0,
        w = 0,
        x = 0,
        y = 0;
      t = c[e + 1732 + (f * 236 | 0) + 4 >> 2] | 0;
      if (!(c[t + 12 >> 2] | 0)) {
        i = c[e + 1732 + (f * 236 | 0) + 16 >> 2] | 0;
        j = c[g >> 2] | 0;
        h = (c[t + 8 >> 2] >> 12) - (i >> 12) | 0;
        if ((j | 0) < (h | 0)) c[e + 1732 + (f * 236 | 0) + 16 >> 2] = (j << 12) + i;
        else {
          a[e + 1732 + (f * 236 | 0) >> 0] = 0;
          c[g >> 2] = h
        }
        q = (c[t + 88 >> 2] | 0) + (i >> 12 << 1) | 0;
        return q | 0
      }
      p = d[t + 110 >> 0] | 0;
      if (!(c[e + 1732 + (f * 236 | 0) + 212 >> 2] | 0)) {
        do
          if (p & 4) {
            if ((p & 64 | 0) == 0 ? ((a[e + 1732 + (f * 236 | 0) >> 0] | 0) + -1 & 255) >= 2 : 0) break;
            n = c[g >> 2] | 0;
            v = c[e + 1076 >> 2] | 0;
            h = c[e + 1732 + (f * 236 | 0) + 16 >> 2] | 0;
            q = c[e + 1732 + (f * 236 | 0) + 20 >> 2] | 0;
            u = c[t + 4 >> 2] | 0;
            if (!(p & 8)) {
              r = c[t + 88 >> 2] | 0;
              if (n) {
                s = (c[t >> 2] | 0) - u | 0;
                k = v;
                do {
                  if ((u | 0) <= (h | 0))
                    do h = h + s | 0; while ((u | 0) <= (h | 0));
                  i = ((u - h | 0) / (q | 0) | 0) + 1 | 0;
                  m = (n | 0) < (i | 0);
                  j = n;
                  n = m ? 0 : n - i | 0;
                  m = m ? j : i;
                  if (m) {
                    o = k;
                    l = h;
                    while (1) {
                      m = m + -1 | 0;
                      t = l >> 12;
                      p = b[r + (t << 1) >> 1] | 0;
                      b[o >> 1] = ((_((b[r + (t + 1 << 1) >> 1] | 0) - p | 0, l & 4095) | 0) >>> 12) + p;
                      if (!m) break;
                      else {
                        o = o + 2 | 0;
                        l = l + q | 0
                      }
                    }
                    p = (j | 0) > (i | 0) ? i : j;
                    k = k + (p << 1) | 0;
                    h = (_(p, q) | 0) + h | 0
                  }
                } while ((n | 0) != 0)
              }
              c[e + 1732 + (f * 236 | 0) + 16 >> 2] = h;
              q = v;
              return q | 0
            }
            r = c[t >> 2] | 0;
            g = c[t + 88 >> 2] | 0;
            if ((r | 0) >= (h | 0)) {
              i = ((r - h | 0) / (q | 0) | 0) + 1 | 0;
              p = ((r - h | 0) / (q | 0) | 0 | 0) < (n | 0);
              j = p ? n - i | 0 : 0;
              i = p ? i : n;
              if (!i) {
                n = v;
                t = q
              } else {
                m = v;
                l = i;
                k = h;
                while (1) {
                  l = l + -1 | 0;
                  o = k >> 12;
                  p = b[g + (o << 1) >> 1] | 0;
                  b[m >> 1] = ((_((b[g + (o + 1 << 1) >> 1] | 0) - p | 0, k & 4095) | 0) >>> 12) + p;
                  if (!l) break;
                  else {
                    m = m + 2 | 0;
                    k = k + q | 0
                  }
                }
                n = v + (i << 1) | 0;
                t = q;
                h = (_(i, q) | 0) + h | 0
              }
            } else {
              j = n;
              n = v;
              t = q
            }
            a: while (1) {
              s = (t | 0) > 0 ? u : r;
              while (1) {
                if (!j) break a;
                k = ((s - h | 0) / (t | 0) | 0) + 1 | 0;
                m = (j | 0) < (k | 0);
                l = j;
                j = m ? 0 : j - k | 0;
                m = m ? l : k;
                if (m) {
                  q = n;
                  o = h;
                  while (1) {
                    m = m + -1 | 0;
                    i = o >> 12;
                    p = b[g + (i << 1) >> 1] | 0;
                    b[q >> 1] = ((_((b[g + (i + 1 << 1) >> 1] | 0) - p | 0, o & 4095) | 0) >>> 12) + p;
                    if (!m) break;
                    else {
                      q = q + 2 | 0;
                      o = o + t | 0
                    }
                  }
                  q = (l | 0) > (k | 0) ? k : l;
                  n = n + (q << 1) | 0;
                  h = (_(q, t) | 0) + h | 0
                }
                if ((h | 0) >= (u | 0)) {
                  k = u;
                  break
                }
                if ((h | 0) <= (r | 0)) {
                  k = r;
                  break
                }
              }
              t = 0 - t | 0;
              h = (k << 1) - h | 0
            }
            c[e + 1732 + (f * 236 | 0) + 20 >> 2] = t;
            c[e + 1732 + (f * 236 | 0) + 16 >> 2] = h;
            q = v;
            return q | 0
          }
        while (0);
        k = c[e + 1076 >> 2] | 0;
        p = c[t + 88 >> 2] | 0;
        q = c[e + 1732 + (f * 236 | 0) + 16 >> 2] | 0;
        l = c[e + 1732 + (f * 236 | 0) + 20 >> 2] | 0;
        i = c[t + 8 >> 2] | 0;
        h = c[g >> 2] | 0;
        l = (l | 0) < 0 ? 0 - l | 0 : l;
        o = ((i - q | 0) / (l | 0) | 0) + 1 | 0;
        j = (h | 0) < (o | 0) ? h : o;
        if (!j) j = q;
        else {
          n = k;
          m = q;
          while (1) {
            j = j + -1 | 0;
            s = m >> 12;
            r = b[p + (s << 1) >> 1] | 0;
            b[n >> 1] = ((_((b[p + (s + 1 << 1) >> 1] | 0) - r | 0, m & 4095) | 0) >>> 12) + r;
            if (!j) break;
            else {
              n = n + 2 | 0;
              m = m + l | 0
            }
          }
          j = (h | 0) > (o | 0) ? o : h;
          k = k + (j << 1) | 0;
          j = (_(j, l) | 0) + q | 0
        }
        if ((j | 0) >= (i | 0)) {
          if ((j | 0) == (i | 0)) b[k >> 1] = (b[p + ((i >> 12) + -1 << 1) >> 1] | 0) / 2 | 0;
          a[e + 1732 + (f * 236 | 0) >> 0] = 0;
          c[g >> 2] = h - ((h | 0) < (o | 0) ? 1 : h + 1 + ~((i - q | 0) / (l | 0) | 0) | 0)
        }
        c[e + 1732 + (f * 236 | 0) + 16 >> 2] = j;
        q = c[e + 1076 >> 2] | 0;
        return q | 0
      }
      do
        if (p & 4) {
          if ((p & 64 | 0) == 0 ? ((a[e + 1732 + (f * 236 | 0) >> 0] | 0) + -1 & 255) >= 2 : 0) break;
          k = c[g >> 2] | 0;
          h = c[e + 1732 + (f * 236 | 0) + 16 >> 2] | 0;
          j = c[e + 1732 + (f * 236 | 0) + 20 >> 2] | 0;
          u = c[t + 4 >> 2] | 0;
          w = c[t >> 2] | 0;
          n = c[e + 1076 >> 2] | 0;
          v = c[t + 88 >> 2] | 0;
          i = c[e + 1732 + (f * 236 | 0) + 216 >> 2] | 0;
          if (!(p & 8)) {
            b: while (1) {
              while (1) {
                if (!k) break b;
                if ((u | 0) <= (h | 0))
                  do h = h + (w - u) | 0; while ((u | 0) <= (h | 0));
                p = (u - h | 0) / (j | 0) | 0;
                p = (p | 0) < (k | 0) ? p + 1 | 0 : k;
                r = (i | 0) < (p | 0);
                s = i - (r ? 0 : p) | 0;
                o = r ? i : p;
                k = k - o | 0;
                if (o) {
                  m = (i | 0) > (p | 0);
                  l = n;
                  q = h;
                  while (1) {
                    o = o + -1 | 0;
                    g = q >> 12;
                    t = b[v + (g << 1) >> 1] | 0;
                    b[l >> 1] = ((_((b[v + (g + 1 << 1) >> 1] | 0) - t | 0, q & 4095) | 0) >>> 12) + t;
                    if (!o) break;
                    else {
                      l = l + 2 | 0;
                      q = q + j | 0
                    }
                  }
                  q = m ? p : i;
                  n = n + (q << 1) | 0;
                  h = (_(q, j) | 0) + h | 0
                }
                if (r) break;
                else i = s
              }
              i = c[e + 1732 + (f * 236 | 0) + 212 >> 2] | 0;
              j = Fb(e, e + 1732 + (f * 236 | 0) | 0, 0) | 0
            }
            c[e + 1732 + (f * 236 | 0) + 216 >> 2] = i;c[e + 1732 + (f * 236 | 0) + 20 >> 2] = j;c[e + 1732 + (f * 236 | 0) + 16 >> 2] = h;q = c[e + 1076 >> 2] | 0;
            return q | 0
          }
          c: while (1) {
            p = k;
            while (1) {
              k = (p | 0) == 0;
              if ((w | 0) < (h | 0) | k) break c;
              l = (w - h | 0) / (j | 0) | 0;
              l = (l | 0) < (p | 0) ? l + 1 | 0 : p;
              s = (i | 0) < (l | 0);
              r = i - (s ? 0 : l) | 0;
              q = s ? i : l;
              k = p - q | 0;
              if (q) {
                o = (i | 0) > (l | 0);
                m = n;
                p = h;
                while (1) {
                  q = q + -1 | 0;
                  g = p >> 12;
                  t = b[v + (g << 1) >> 1] | 0;
                  b[m >> 1] = ((_((b[v + (g + 1 << 1) >> 1] | 0) - t | 0, p & 4095) | 0) >>> 12) + t;
                  if (!q) break;
                  else {
                    m = m + 2 | 0;
                    p = p + j | 0
                  }
                }
                q = o ? l : i;
                n = n + (q << 1) | 0;
                h = (_(q, j) | 0) + h | 0
              }
              if (s) break;
              else {
                p = k;
                i = r
              }
            }
            i = c[e + 1732 + (f * 236 | 0) + 212 >> 2] | 0;
            j = Fb(e, e + 1732 + (f * 236 | 0) | 0, 0) | 0
          }
          if (!k) {
            g = p;
            do {
              q = (((j | 0) > 0 ? u : w) - h | 0) / (j | 0) | 0;
              q = (q | 0) < (g | 0) ? q + 1 | 0 : g;
              s = (i | 0) < (q | 0);
              r = i - (s ? 0 : q) | 0;
              t = s ? i : q;
              k = g;
              g = g - t | 0;
              if (t) {
                p = (i | 0) > (q | 0);
                o = n;
                m = t;
                l = h;
                while (1) {
                  m = m + -1 | 0;
                  y = l >> 12;
                  x = b[v + (y << 1) >> 1] | 0;
                  b[o >> 1] = ((_((b[v + (y + 1 << 1) >> 1] | 0) - x | 0, l & 4095) | 0) >>> 12) + x;
                  if (!m) break;
                  else {
                    o = o + 2 | 0;
                    l = l + j | 0
                  }
                }
                q = p ? q : i;
                n = n + (q << 1) | 0;
                h = (_(q, j) | 0) + h | 0
              }
              if (s) {
                i = c[e + 1732 + (f * 236 | 0) + 212 >> 2] | 0;
                j = Fb(e, e + 1732 + (f * 236 | 0) | 0, j >>> 31) | 0
              } else i = r;
              if ((h | 0) < (u | 0)) {
                if ((h | 0) <= (w | 0)) {
                  j = 0 - j | 0;
                  h = (w << 1) - h | 0
                }
              } else {
                j = 0 - j | 0;
                h = (u << 1) - h | 0
              }
            } while ((k | 0) != (t | 0))
          }
          c[e + 1732 + (f * 236 | 0) + 216 >> 2] = i;
          c[e + 1732 + (f * 236 | 0) + 20 >> 2] = j;
          c[e + 1732 + (f * 236 | 0) + 16 >> 2] = h;
          q = c[e + 1076 >> 2] | 0;
          return q | 0
        }
      while (0);
      n = c[t + 88 >> 2] | 0;
      k = c[t + 8 >> 2] | 0;
      j = c[e + 1732 + (f * 236 | 0) + 20 >> 2] | 0;
      i = c[e + 1732 + (f * 236 | 0) + 216 >> 2] | 0;
      l = c[g >> 2] | 0;
      m = c[e + 1076 >> 2] | 0;
      j = (j | 0) < 0 ? 0 - j | 0 : j;
      h = c[e + 1732 + (f * 236 | 0) + 16 >> 2] | 0;
      while (1) {
        if (!l) break;
        if (!i) {
          i = c[e + 1732 + (f * 236 | 0) + 212 >> 2] | 0;
          j = Fb(e, e + 1732 + (f * 236 | 0) | 0, 0) | 0
        } else i = i + -1 | 0;
        r = h >> 12;
        o = b[n + (r << 1) >> 1] | 0;
        p = m;
        m = m + 2 | 0;
        b[p >> 1] = ((_((b[n + (r + 1 << 1) >> 1] | 0) - o | 0, h & 4095) | 0) >>> 12) + o;
        h = j + h | 0;
        if ((h | 0) >= (k | 0)) {
          q = 49;
          break
        } else l = l + -1 | 0
      }
      if ((q | 0) == 49) {
        if ((h | 0) == (k | 0)) b[m >> 1] = (b[n + ((k >> 12) + -1 << 1) >> 1] | 0) / 2 | 0;
        a[e + 1732 + (f * 236 | 0) >> 0] = 0;
        c[g >> 2] = (c[g >> 2] | 0) - l
      }
      c[e + 1732 + (f * 236 | 0) + 216 >> 2] = i;
      c[e + 1732 + (f * 236 | 0) + 20 >> 2] = j;
      c[e + 1732 + (f * 236 | 0) + 16 >> 2] = h;
      q = c[e + 1076 >> 2] | 0;
      return q | 0
    }

    function Fb(a, b, e) {
      a = a | 0;
      b = b | 0;
      e = e | 0;
      var f = 0.0,
        g = 0,
        i = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0,
        o = 0.0;
      m = c[b + 208 >> 2] | 0;
      m = (m | 0) > 62 ? 0 : m + 1 | 0;
      c[b + 208 >> 2] = m;
      do
        if ((m | 0) >= 16)
          if ((m | 0) > 47) {
            g = 79 - m | 0;
            break
          } else {
            g = m + -16 | 0;
            break
          }
      else g = 15 - m | 0;
      while (0);
      n = b + 80 + (g << 2) | 0;
      g = c[n >> 2] | 0;
      if (g) return ((e | 0) == 0 ? g : 0 - g | 0) | 0;
      k = c[b + 4 >> 2] | 0;
      i = (d[k + 109 >> 0] | 0) << 7;
      g = c[b + 52 >> 2] | 0;
      do
        if (g) {
          j = (c[b + 56 >> 2] | 0) + g | 0;
          c[b + 56 >> 2] = j;
          if ((j | 0) > 65535) {
            c[b + 52 >> 2] = 0;
            l = 0;
            g = i;
            break
          } else {
            l = g;
            g = (_(j, i) | 0) >> 16;
            break
          }
        } else {
          l = 0;
          g = i
        }
      while (0);
      f = +(c[k + 12 >> 2] | 0) * +(c[b + 12 >> 2] | 0) / (+(c[k + 32 >> 2] | 0) * +(c[a + 8 >> 2] | 0)) * 4096.0;
      g = ~~(+(g | 0) * +R(+(+(m << 4 | 0) * .006135923151542565)));
      if ((g | 0) < 0) f = f / (+h[1696 + (((0 - g | 0) >>> 5 & 255) << 3) >> 3] * +h[3744 + (0 - g >> 13 << 3) >> 3]);
      else f = f * (+h[1696 + ((g >>> 5 & 255) << 3) >> 3] * +h[3744 + (g >> 13 << 3) >> 3]);
      if (l) {
        g = (e | 0) == 0;
        o = -f;
        f = g ? f : o;
        g = ~~f;
        return g | 0
      }
      c[n >> 2] = ~~f;
      g = (e | 0) == 0;
      o = -f;
      f = g ? f : o;
      g = ~~f;
      return g | 0
    }

    function Gb(b) {
      b = b | 0;
      var d = 0;
      c[1192] = 0;
      c[1320] = 0;
      c[1448] = 0;
      d = Mb(516) | 0;
      do
        if (!d) c[1192] = 0;
        else {
          Pb(d | 0, 0, 516) | 0;
          c[1192] = d;
          d = Mb(3584) | 0;
          if (!d) {
            c[c[1192] >> 2] = 0;
            break
          }
          Pb(d | 0, 0, 3584) | 0;
          c[c[1192] >> 2] = d;
          d = Mb(516) | 0;
          if (!d) {
            c[1320] = 0;
            break
          }
          Pb(d | 0, 0, 516) | 0;
          c[1320] = d;
          d = Mb(3584) | 0;
          if (!d) {
            c[c[1320] >> 2] = 0;
            break
          }
          Pb(d | 0, 0, 3584) | 0;
          c[c[1320] >> 2] = d;
          if ((b | 0) != 0 ? (a[b >> 0] | 0) != 0 : 0) {
            d = Jb(b) | 0;
            return d | 0
          }
          d = Jb(5800) | 0;
          return d | 0
        }
      while (0);
      Ib();
      d = -2;
      return d | 0
    }

    function Hb(a) {
      a = a | 0;
      var b = 0;
      if (!a) return;
      Bb(a);
      b = c[a + 1056 >> 2] | 0;
      if (!b) b = 0;
      else {
        Ba(b | 0) | 0;
        b = 0
      }
      do {
        Nb(c[a + 32 + (b << 2) >> 2] | 0);
        Nb(c[a + 544 + (b << 2) >> 2] | 0);
        b = b + 1 | 0
      } while ((b | 0) != 128);
      Nb(c[a + 1080 >> 2] | 0);
      Nb(c[a + 1076 >> 2] | 0);
      Nb(c[a + 13084 >> 2] | 0);
      Nb(c[a + 13112 >> 2] | 0);
      Nb(c[a + 13116 >> 2] | 0);
      Nb(c[a + 13120 >> 2] | 0);
      Nb(c[a + 13124 >> 2] | 0);
      Nb(c[a + 13128 >> 2] | 0);
      Nb(c[a + 13132 >> 2] | 0);
      Nb(c[a + 13136 >> 2] | 0);
      Nb(c[a + 13140 >> 2] | 0);
      Nb(a);
      return
    }

    function Ib() {
      var a = 0,
        b = 0,
        d = 0,
        e = 0;
      a = c[1448] | 0;
      if (!a) e = 0;
      else {
        b = 0;
        while (1) {
          a = c[a + (b << 2) >> 2] | 0;
          if (a) Ba(a | 0) | 0;
          b = b + 1 | 0;
          if ((b | 0) == 50) break;
          a = c[1448] | 0
        }
        Nb(c[1448] | 0);
        c[1448] = 0;
        e = 0
      }
      do {
        d = 4768 + (e << 2) | 0;
        b = c[d >> 2] | 0;
        if (b) {
          a = c[b >> 2] | 0;
          if (a) {
            b = 0;
            do {
              Nb(c[a + (b * 28 | 0) >> 2] | 0);
              b = b + 1 | 0
            } while ((b | 0) != 128);
            Nb(a);
            b = c[d >> 2] | 0
          }
          Nb(b);
          c[d >> 2] = 0
        }
        d = 5280 + (e << 2) | 0;
        b = c[d >> 2] | 0;
        if (b) {
          a = c[b >> 2] | 0;
          if (a) {
            b = 0;
            do {
              Nb(c[a + (b * 28 | 0) >> 2] | 0);
              b = b + 1 | 0
            } while ((b | 0) != 128);
            Nb(a);
            b = c[d >> 2] | 0
          }
          Nb(b);
          c[d >> 2] = 0
        }
        e = e + 1 | 0
      } while ((e | 0) != 128);
      a = c[2] | 0;
      if (!a) {
        c[2] = 0;
        return
      }
      do {
        b = a;
        a = c[a + 4 >> 2] | 0;
        Nb(c[b >> 2] | 0);
        Nb(b)
      } while ((a | 0) != 0);
      c[2] = 0;
      return
    }

    function Jb(b) {
      b = b | 0;
      var d = 0,
        e = 0,
        f = 0;
      d = Mb(200) | 0;
      a: do
        if (d) {
          Pb(d | 0, 0, 200) | 0;
          c[1448] = d;
          d = (Rb(b | 0) | 0) + 1 | 0;
          while (1) {
            if (!d) break;
            d = d + -1 | 0;
            f = b + d | 0;
            if ((a[f >> 0] | 0) == 47) {
              e = 6;
              break
            }
          }
          do
            if ((e | 0) == 6 ? (f | 0) != 0 : 0) {
              d = Mb(8) | 0;
              if (!d) break a;
              e = Mb(f + (1 - b) + 1 | 0) | 0;
              c[d >> 2] = e;
              if (!e) {
                Nb(d);
                break a
              } else {
                c[d + 4 >> 2] = c[2];
                c[2] = d;
                Ub(e | 0, b | 0, f + (1 - b) | 0) | 0;
                a[(c[d >> 2] | 0) + (f + (1 - b)) >> 0] = 0;
                break
              }
            }
          while (0);
          d = Kb(b, 0) | 0;
          if (!d) {
            Nb(c[1448] | 0);
            c[1448] = 0;
            d = 0;
            return d | 0
          } else {
            Ib();
            return d | 0
          }
        } else c[1448] = 0; while (0);
      Ib();
      d = -2;
      return d | 0
    }

    function Kb(b, d) {
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0,
        h = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0,
        o = 0,
        p = 0,
        q = 0,
        r = 0,
        s = 0,
        t = 0;
      t = i;
      i = i + 1072 | 0;
      if ((i | 0) >= (j | 0)) ba();
      if ((d | 0) > 49) {
        o = -1;
        i = t;
        return o | 0
      }
      b = cb(b) | 0;
      c[(c[1448] | 0) + (d << 2) >> 2] = b;
      if (!b) {
        o = -1;
        i = t;
        return o | 0
      }
      e = 0;
      a: while (1) {
        f = 0;
        while (1) {
          g = t + 40 + f | 0;
          if ((na(g | 0, 1, 1, b | 0) | 0) != 1) {
            s = f;
            r = 10;
            break
          }
          o = a[g >> 0] | 0;
          if (o << 24 >> 24 == 13 | o << 24 >> 24 == 10) {
            r = 7;
            break
          }
          f = f + 1 | 0;
          if ((f | 0) >= 1024) {
            r = 9;
            break
          }
        }
        if ((r | 0) == 7) {
          a[g >> 0] = 0;
          s = f + 1 | 0;
          r = 10
        } else if ((r | 0) == 9) {
          r = 0;
          a[t + 40 + f >> 0] = 0
        }
        if ((r | 0) == 10 ? (r = 0, a[t + 40 + s >> 0] = 0, (s | 0) == 0) : 0) {
          b = 0;
          break
        }
        b = Lb(t + 40 | 0) | 0;
        c[t >> 2] = b;
        b: do
            if (b) {
              if ((a[b >> 0] | 0) == 35) {
                g = 6112;
                do {
                  b = b + 1 | 0;
                  g = g + 1 | 0;
                  f = a[b >> 0] | 0;
                  h = a[g >> 0] | 0
                } while (!(f << 24 >> 24 == 0 ? 1 : f << 24 >> 24 != h << 24 >> 24));
                if (f << 24 >> 24 != h << 24 >> 24) break;
                b = Lb(0) | 0;
                c[t >> 2] = b;
                if (!b) break;
                if ((a[b >> 0] | 0) == 35) break;
                else b = 0
              } else b = 0;
              while (1) {
                b = b + 1 | 0;
                if ((b | 0) == 10) {
                  q = 10;
                  break
                }
                f = Lb(0) | 0;
                c[t + (b << 2) >> 2] = f;
                if (!f) {
                  q = b;
                  break
                }
                if ((a[f >> 0] | 0) == 35) {
                  q = b;
                  break
                }
              }
              g = c[t >> 2] | 0;
              n = a[g >> 0] | 0;
              if (n << 24 >> 24 == 99) {
                k = g;
                h = 6128;
                do {
                  k = k + 1 | 0;
                  h = h + 1 | 0;
                  f = a[k >> 0] | 0;
                  b = a[h >> 0] | 0
                } while (!(f << 24 >> 24 == 0 ? 1 : f << 24 >> 24 != b << 24 >> 24));
                if (f << 24 >> 24 == b << 24 >> 24) break
              }
              if (n << 24 >> 24 == 72) {
                k = g;
                h = 6136;
                do {
                  k = k + 1 | 0;
                  h = h + 1 | 0;
                  f = a[k >> 0] | 0;
                  b = a[h >> 0] | 0
                } while (!(f << 24 >> 24 == 0 ? 1 : f << 24 >> 24 != b << 24 >> 24));
                if (f << 24 >> 24 == b << 24 >> 24) break
              } else if (n << 24 >> 24 == 70) {
                k = g;
                h = 6152;
                do {
                  k = k + 1 | 0;
                  h = h + 1 | 0;
                  f = a[k >> 0] | 0;
                  b = a[h >> 0] | 0
                } while (!(f << 24 >> 24 == 0 ? 1 : f << 24 >> 24 != b << 24 >> 24));
                if (f << 24 >> 24 == b << 24 >> 24) break
              }
              if (n << 24 >> 24 == 109) {
                k = g;
                h = 6168;
                do {
                  k = k + 1 | 0;
                  h = h + 1 | 0;
                  f = a[k >> 0] | 0;
                  b = a[h >> 0] | 0
                } while (!(f << 24 >> 24 == 0 ? 1 : f << 24 >> 24 != b << 24 >> 24));
                if (f << 24 >> 24 == b << 24 >> 24) break
              }
              if (n << 24 >> 24 == 111) {
                k = g;
                h = 6184;
                do {
                  k = k + 1 | 0;
                  h = h + 1 | 0;
                  f = a[k >> 0] | 0;
                  b = a[h >> 0] | 0
                } while (!(f << 24 >> 24 == 0 ? 1 : f << 24 >> 24 != b << 24 >> 24));
                if (f << 24 >> 24 == b << 24 >> 24) break
              } else if (n << 24 >> 24 == 116) {
                k = g;
                h = 6192;
                do {
                  k = k + 1 | 0;
                  h = h + 1 | 0;
                  f = a[k >> 0] | 0;
                  b = a[h >> 0] | 0
                } while (!(f << 24 >> 24 == 0 ? 1 : f << 24 >> 24 != b << 24 >> 24));
                if (f << 24 >> 24 == b << 24 >> 24) break
              }
              if (n << 24 >> 24 == 99) {
                k = g;
                h = 6200;
                do {
                  k = k + 1 | 0;
                  h = h + 1 | 0;
                  f = a[k >> 0] | 0;
                  b = a[h >> 0] | 0
                } while (!(f << 24 >> 24 == 0 ? 1 : f << 24 >> 24 != b << 24 >> 24));
                if (f << 24 >> 24 == b << 24 >> 24) break;
                else {
                  k = g;
                  h = 6216
                }
                do {
                  k = k + 1 | 0;
                  h = h + 1 | 0;
                  f = a[k >> 0] | 0;
                  b = a[h >> 0] | 0
                } while (!(f << 24 >> 24 == 0 ? 1 : f << 24 >> 24 != b << 24 >> 24));
                if (f << 24 >> 24 == b << 24 >> 24) break
              }
              if (n << 24 >> 24 == 117) {
                k = g;
                h = 6232;
                do {
                  k = k + 1 | 0;
                  h = h + 1 | 0;
                  b = a[k >> 0] | 0;
                  f = a[h >> 0] | 0
                } while (!(b << 24 >> 24 == 0 ? 1 : b << 24 >> 24 != f << 24 >> 24));
                if (b << 24 >> 24 == f << 24 >> 24) break
              } else if (n << 24 >> 24 == 97) {
                k = g;
                h = 6240;
                do {
                  k = k + 1 | 0;
                  h = h + 1 | 0;
                  f = a[k >> 0] | 0;
                  b = a[h >> 0] | 0
                } while (!(f << 24 >> 24 == 0 ? 1 : f << 24 >> 24 != b << 24 >> 24));
                if (f << 24 >> 24 == b << 24 >> 24) break
              }
              if (n << 24 >> 24 == 115) {
                k = g;
                h = 6256;
                do {
                  k = k + 1 | 0;
                  h = h + 1 | 0;
                  f = a[k >> 0] | 0;
                  b = a[h >> 0] | 0
                } while (!(f << 24 >> 24 == 0 ? 1 : f << 24 >> 24 != b << 24 >> 24));
                if (f << 24 >> 24 == b << 24 >> 24) break
              }
              if (n << 24 >> 24 == 112) {
                k = g;
                h = 6280;
                do {
                  k = k + 1 | 0;
                  h = h + 1 | 0;
                  f = a[k >> 0] | 0;
                  b = a[h >> 0] | 0
                } while (!(f << 24 >> 24 == 0 ? 1 : f << 24 >> 24 != b << 24 >> 24));
                if (f << 24 >> 24 == b << 24 >> 24) break
              } else if (n << 24 >> 24 == 102) {
                k = g;
                h = 6272;
                do {
                  k = k + 1 | 0;
                  h = h + 1 | 0;
                  f = a[k >> 0] | 0;
                  b = a[h >> 0] | 0
                } while (!(f << 24 >> 24 == 0 ? 1 : f << 24 >> 24 != b << 24 >> 24));
                if (f << 24 >> 24 == b << 24 >> 24) break
              }
              if (n << 24 >> 24 == 109) {
                k = g;
                h = 6296;
                do {
                  k = k + 1 | 0;
                  h = h + 1 | 0;
                  f = a[k >> 0] | 0;
                  b = a[h >> 0] | 0
                } while (!(f << 24 >> 24 == 0 ? 1 : f << 24 >> 24 != b << 24 >> 24));
                if (f << 24 >> 24 == b << 24 >> 24) break
              }
              if (n << 24 >> 24 == 100) {
                k = g;
                h = 6304;
                do {
                  k = k + 1 | 0;
                  h = h + 1 | 0;
                  f = a[k >> 0] | 0;
                  b = a[h >> 0] | 0
                } while (!(f << 24 >> 24 == 0 ? 1 : f << 24 >> 24 != b << 24 >> 24));
                if (f << 24 >> 24 == b << 24 >> 24) {
                  if ((q | 0) < 2) {
                    b = -1;
                    break a
                  } else k = 1;
                  while (1) {
                    f = c[t + (k << 2) >> 2] | 0;
                    b = Rb(f | 0) | 0;
                    h = Mb(8) | 0;
                    if (!h) {
                      b = -1;
                      break a
                    }
                    g = Mb(b + 1 | 0) | 0;
                    c[h >> 2] = g;
                    if (!g) {
                      r = 64;
                      break a
                    }
                    c[h + 4 >> 2] = c[2];
                    c[2] = h;
                    Ub(g | 0, f | 0, b | 0) | 0;
                    a[(c[h >> 2] | 0) + b >> 0] = 0;
                    k = k + 1 | 0;
                    if ((k | 0) >= (q | 0)) break b
                  }
                }
              }
              if (n << 24 >> 24 == 115) {
                k = g;
                h = 6312;
                do {
                  k = k + 1 | 0;
                  h = h + 1 | 0;
                  f = a[k >> 0] | 0;
                  b = a[h >> 0] | 0
                } while (!(f << 24 >> 24 == 0 ? 1 : f << 24 >> 24 != b << 24 >> 24));
                if (f << 24 >> 24 == b << 24 >> 24) {
                  if ((q | 0) < 2) {
                    b = -1;
                    break a
                  } else g = 1;
                  while (1) {
                    b = Kb(c[t + (g << 2) >> 2] | 0, d + 1 | 0) | 0;
                    g = g + 1 | 0;
                    if (b) break a;
                    if ((g | 0) >= (q | 0)) break b
                  }
                }
              }
              if (n << 24 >> 24 == 100) {
                k = g;
                h = 6320;
                do {
                  k = k + 1 | 0;
                  h = h + 1 | 0;
                  f = a[k >> 0] | 0;
                  b = a[h >> 0] | 0
                } while (!(f << 24 >> 24 == 0 ? 1 : f << 24 >> 24 != b << 24 >> 24));
                if (f << 24 >> 24 == b << 24 >> 24) {
                  if ((q | 0) != 2) {
                    b = -1;
                    break a
                  }
                  Ub(5816, c[t + 4 >> 2] | 0, 255) | 0;
                  a[6071] = 0;
                  break
                } else {
                  k = g;
                  h = 6328
                }
                do {
                  k = k + 1 | 0;
                  h = h + 1 | 0;
                  f = a[k >> 0] | 0;
                  b = a[h >> 0] | 0
                } while (!(f << 24 >> 24 == 0 ? 1 : f << 24 >> 24 != b << 24 >> 24));
                if (f << 24 >> 24 == b << 24 >> 24) {
                  if ((q | 0) < 2) {
                    b = -1;
                    break a
                  }
                  e = c[t + 4 >> 2] | 0;
                  while (1) {
                    f = a[e >> 0] | 0;
                    b = e + 1 | 0;
                    if (f << 24 >> 24 == 32 | ((f << 24 >> 24) + -9 | 0) >>> 0 < 5) e = b;
                    else break
                  }
                  if ((f << 24 >> 24 | 0) == 45) {
                    g = 1;
                    r = 83
                  } else if ((f << 24 >> 24 | 0) == 43) {
                    g = 0;
                    r = 83
                  } else k = 0;
                  if ((r | 0) == 83) {
                    r = 0;
                    e = b;
                    f = a[b >> 0] | 0;
                    k = g
                  }
                  g = (f << 24 >> 24) + -48 | 0;
                  if (g >>> 0 < 10) {
                    h = e;
                    e = 0;
                    do {
                      h = h + 1 | 0;
                      e = (e * 10 | 0) - g | 0;
                      g = (a[h >> 0] | 0) + -48 | 0
                    } while (g >>> 0 < 10)
                  } else e = 0;
                  f = (k | 0) != 0 ? e : 0 - e | 0;
                  if (f >>> 0 > 127) {
                    b = -1;
                    break a
                  }
                  b = c[5280 + (f << 2) >> 2] | 0;
                  if (b) {
                    e = b;
                    break
                  }
                  b = Mb(516) | 0;
                  if (!b) {
                    r = 89;
                    break a
                  }
                  Pb(b | 0, 0, 516) | 0;
                  c[5280 + (f << 2) >> 2] = b;
                  b = Mb(3584) | 0;
                  if (!b) {
                    r = 91;
                    break a
                  }
                  Pb(b | 0, 0, 3584) | 0;
                  e = c[5280 + (f << 2) >> 2] | 0;
                  c[e >> 2] = b;
                  break
                }
              }
              if (n << 24 >> 24 == 98) {
                f = 6336;
                do {
                  g = g + 1 | 0;
                  f = f + 1 | 0;
                  e = a[g >> 0] | 0;
                  b = a[f >> 0] | 0
                } while (!(e << 24 >> 24 == 0 ? 1 : e << 24 >> 24 != b << 24 >> 24));
                if ((q | 0) < 2 ? 1 : e << 24 >> 24 != b << 24 >> 24) {
                  b = -1;
                  break a
                }
                e = c[t + 4 >> 2] | 0;
                while (1) {
                  f = a[e >> 0] | 0;
                  b = e + 1 | 0;
                  if (f << 24 >> 24 == 32 | ((f << 24 >> 24) + -9 | 0) >>> 0 < 5) e = b;
                  else break
                }
                if ((f << 24 >> 24 | 0) == 43) {
                  g = 0;
                  r = 101
                } else if ((f << 24 >> 24 | 0) == 45) {
                  g = 1;
                  r = 101
                } else k = 0;
                if ((r | 0) == 101) {
                  r = 0;
                  e = b;
                  f = a[b >> 0] | 0;
                  k = g
                }
                g = (f << 24 >> 24) + -48 | 0;
                if (g >>> 0 < 10) {
                  h = e;
                  e = 0;
                  do {
                    h = h + 1 | 0;
                    e = (e * 10 | 0) - g | 0;
                    g = (a[h >> 0] | 0) + -48 | 0
                  } while (g >>> 0 < 10)
                } else e = 0;
                f = (k | 0) != 0 ? e : 0 - e | 0;
                if (f >>> 0 > 127) {
                  b = -1;
                  break a
                }
                b = c[4768 + (f << 2) >> 2] | 0;
                if (b) {
                  e = b;
                  break
                }
                b = Mb(516) | 0;
                if (!b) {
                  r = 107;
                  break a
                }
                Pb(b | 0, 0, 516) | 0;
                c[4768 + (f << 2) >> 2] = b;
                b = Mb(3584) | 0;
                if (!b) {
                  r = 109;
                  break a
                }
                Pb(b | 0, 0, 3584) | 0;
                e = c[4768 + (f << 2) >> 2] | 0;
                c[e >> 2] = b;
                break
              }
              if ((q | 0) < 2 | (n + -48 & 255) > 9) {
                b = -1;
                break a
              }
              if (n << 24 >> 24 == 32 | ((n << 24 >> 24) + -9 | 0) >>> 0 < 5) {
                h = g + 1 | 0;
                while (1) {
                  g = a[h >> 0] | 0;
                  f = h + 1 | 0;
                  if (g << 24 >> 24 == 32 | ((g << 24 >> 24) + -9 | 0) >>> 0 < 5) h = f;
                  else {
                    b = g;
                    k = g << 24 >> 24;
                    g = f;
                    break
                  }
                }
              } else {
                h = g;
                b = n;
                k = n << 24 >> 24;
                g = g + 1 | 0
              }
              if ((k | 0) == 43) {
                f = 0;
                r = 115
              } else if ((k | 0) == 45) {
                f = 1;
                r = 115
              } else {
                g = b;
                f = 0
              }
              if ((r | 0) == 115) {
                r = 0;
                h = g;
                g = a[g >> 0] | 0
              }
              g = (g << 24 >> 24) + -48 | 0;
              if (g >>> 0 < 10) {
                k = g;
                g = 0;
                do {
                  h = h + 1 | 0;
                  g = (g * 10 | 0) - k | 0;
                  k = (a[h >> 0] | 0) + -48 | 0
                } while (k >>> 0 < 10)
              } else g = 0;
              p = (f | 0) != 0 ? g : 0 - g | 0;
              if (!((e | 0) != 0 & p >>> 0 < 128)) {
                b = -1;
                break a
              }
              Nb(c[(c[e >> 2] | 0) + (p * 28 | 0) >> 2] | 0);
              h = c[t + 4 >> 2] | 0;
              g = (Rb(h | 0) | 0) + 1 | 0;
              f = Mb(g) | 0;
              if (!f) {
                r = 120;
                break a
              }
              Pb(f | 0, 0, g | 0) | 0;
              c[(c[e >> 2] | 0) + (p * 28 | 0) >> 2] = f;
              Vb(f | 0, h | 0) | 0;
              o = (c[e >> 2] | 0) + (p * 28 | 0) + 4 | 0;
              c[o >> 2] = -1;
              c[o + 4 >> 2] = -1;
              c[o + 8 >> 2] = -1;
              c[o + 12 >> 2] = -1;
              c[o + 16 >> 2] = -1;
              c[o + 20 >> 2] = -1;
              if ((q | 0) > 2) o = 2;
              else break;
              while (1) {
                k = c[t + (o << 2) >> 2] | 0;
                c: do
                    if (!(k & 3)) {
                      h = k;
                      r = 126
                    } else {
                      h = k;
                      while (1) {
                        g = a[h >> 0] | 0;
                        if (g << 24 >> 24 == 0 | g << 24 >> 24 == 61) break c;
                        h = h + 1 | 0;
                        if (!(h & 3)) {
                          r = 126;
                          break
                        }
                      }
                    }
                  while (0);
                if ((r | 0) == 126) {
                  r = 0;
                  g = c[h >> 2] | 0;
                  d: do
                    if (!((g & -2139062144 ^ -2139062144) & g + -16843009))
                      do {
                        if ((g & -2139062144 ^ -2139062144) & (g ^ 1027423549) + -16843009) break d;
                        h = h + 4 | 0;
                        g = c[h >> 2] | 0
                      } while (((g & -2139062144 ^ -2139062144) & g + -16843009 | 0) == 0); while (0);
                  while (1) {
                    g = a[h >> 0] | 0;
                    if (g << 24 >> 24 == 0 | g << 24 >> 24 == 61) break;
                    else h = h + 1 | 0
                  }
                }
                if (g << 24 >> 24 != 61 | (h | 0) == 0) {
                  b = -1;
                  break a
                }
                n = h + 1 | 0;
                a[h >> 0] = 0;
                m = a[k >> 0] | 0;
                e: do switch (m << 24 >> 24) {
                  case 110:
                    {
                      g = k;f = 6352;do {
                        g = g + 1 | 0;
                        f = f + 1 | 0;
                        b = a[g >> 0] | 0;
                        l = a[f >> 0] | 0
                      } while (!(b << 24 >> 24 == 0 ? 1 : b << 24 >> 24 != l << 24 >> 24));
                      if (b << 24 >> 24 != l << 24 >> 24)
                        if (m << 24 >> 24 == 112) {
                          g = k;
                          f = 6360;
                          r = 156;
                          break e
                        } else if (m << 24 >> 24 == 107) {
                        h = k;
                        g = 6392;
                        r = 178;
                        break e
                      } else if (m << 24 >> 24 == 115) {
                        h = 6416;
                        r = 188;
                        break e
                      } else {
                        b = -1;
                        break a
                      } else k = n;
                      while (1) {
                        h = a[k >> 0] | 0;
                        f = k + 1 | 0;
                        if (h << 24 >> 24 == 32 | ((h << 24 >> 24) + -9 | 0) >>> 0 < 5) k = f;
                        else break
                      }
                      if ((h << 24 >> 24 | 0) == 45) {
                        g = 1;
                        r = 149
                      } else if ((h << 24 >> 24 | 0) == 43) {
                        g = 0;
                        r = 149
                      } else g = 0;
                      if ((r | 0) == 149) {
                        r = 0;
                        k = f;
                        h = a[f >> 0] | 0
                      }
                      h = (h << 24 >> 24) + -48 | 0;
                      if (h >>> 0 < 10) {
                        f = k;
                        k = 0;
                        do {
                          f = f + 1 | 0;
                          k = (k * 10 | 0) - h | 0;
                          h = (a[f >> 0] | 0) + -48 | 0
                        } while (h >>> 0 < 10)
                      } else k = 0;h = (g | 0) != 0 ? k : 0 - k | 0;
                      if (h >>> 0 > 127) {
                        b = -1;
                        break a
                      }
                      if (((a[n >> 0] | 0) + -48 & 255) > 9) {
                        b = -1;
                        break a
                      }
                      c[(c[e >> 2] | 0) + (p * 28 | 0) + 4 >> 2] = h;
                      break
                    }
                  case 112:
                    {
                      g = k;f = 6360;r = 156;
                      break
                    }
                  case 97:
                    {
                      h = 6344;do {
                        k = k + 1 | 0;
                        h = h + 1 | 0;
                        g = a[k >> 0] | 0;
                        f = a[h >> 0] | 0
                      } while (!(g << 24 >> 24 == 0 ? 1 : g << 24 >> 24 != f << 24 >> 24));
                      if (g << 24 >> 24 == f << 24 >> 24) k = n;
                      else {
                        b = -1;
                        break a
                      }
                      while (1) {
                        h = a[k >> 0] | 0;
                        f = k + 1 | 0;
                        if (h << 24 >> 24 == 32 | ((h << 24 >> 24) + -9 | 0) >>> 0 < 5) k = f;
                        else break
                      }
                      if ((h << 24 >> 24 | 0) == 45) {
                        g = 1;
                        r = 138
                      } else if ((h << 24 >> 24 | 0) == 43) {
                        g = 0;
                        r = 138
                      } else g = 0;
                      if ((r | 0) == 138) {
                        r = 0;
                        k = f;
                        h = a[f >> 0] | 0
                      }
                      h = (h << 24 >> 24) + -48 | 0;
                      if (h >>> 0 < 10) {
                        f = k;
                        k = 0;
                        do {
                          f = f + 1 | 0;
                          k = (k * 10 | 0) - h | 0;
                          h = (a[f >> 0] | 0) + -48 | 0
                        } while (h >>> 0 < 10)
                      } else k = 0;h = (g | 0) != 0 ? k : 0 - k | 0;
                      if (h >>> 0 > 800) {
                        b = -1;
                        break a
                      }
                      if (((a[n >> 0] | 0) + -48 & 255) > 9) {
                        b = -1;
                        break a
                      }
                      c[(c[e >> 2] | 0) + (p * 28 | 0) + 8 >> 2] = h;
                      break
                    }
                  case 107:
                    {
                      h = k;g = 6392;r = 178;
                      break
                    }
                  case 115:
                    {
                      h = 6416;r = 188;
                      break
                    }
                  default:
                    {
                      b = -1;
                      break a
                    }
                  }
                  while (0);
                do
                  if ((r | 0) == 156) {
                    while (1) {
                      r = 0;
                      g = g + 1 | 0;
                      f = f + 1 | 0;
                      l = a[g >> 0] | 0;
                      b = a[f >> 0] | 0;
                      if (l << 24 >> 24 == 0 ? 1 : l << 24 >> 24 != b << 24 >> 24) break;
                      else r = 156
                    }
                    if (l << 24 >> 24 != b << 24 >> 24)
                      if (m << 24 >> 24 == 107) {
                        h = k;
                        g = 6392;
                        r = 178;
                        break
                      } else if (m << 24 >> 24 == 115) {
                      h = 6416;
                      r = 188;
                      break
                    } else {
                      b = -1;
                      break a
                    }
                    m = a[n >> 0] | 0;
                    do
                      if (m << 24 >> 24 == 99) {
                        k = n;
                        g = 6368;
                        do {
                          k = k + 1 | 0;
                          g = g + 1 | 0;
                          f = a[k >> 0] | 0;
                          b = a[g >> 0] | 0
                        } while (!(f << 24 >> 24 == 0 ? 1 : f << 24 >> 24 != b << 24 >> 24));
                        if (f << 24 >> 24 == b << 24 >> 24) h = 64;
                        else r = 166
                      } else if (m << 24 >> 24 == 108) {
                      k = n;
                      g = 6376;
                      do {
                        k = k + 1 | 0;
                        g = g + 1 | 0;
                        f = a[k >> 0] | 0;
                        b = a[g >> 0] | 0
                      } while (!(f << 24 >> 24 == 0 ? 1 : f << 24 >> 24 != b << 24 >> 24));
                      if (f << 24 >> 24 == b << 24 >> 24) {
                        r = 175;
                        break
                      }
                      if (m << 24 >> 24 == 114) {
                        k = n;
                        g = 6384;
                        r = 164
                      } else r = 166
                    } else if (m << 24 >> 24 == 114) {
                      k = n;
                      g = 6384;
                      r = 164
                    } else r = 166;
                    while (0);
                    if ((r | 0) == 164) {
                      while (1) {
                        r = 0;
                        k = k + 1 | 0;
                        g = g + 1 | 0;
                        f = a[k >> 0] | 0;
                        b = a[g >> 0] | 0;
                        if (f << 24 >> 24 == 0 ? 1 : f << 24 >> 24 != b << 24 >> 24) break;
                        else r = 164
                      }
                      if (f << 24 >> 24 == b << 24 >> 24) h = 127;
                      else r = 166
                    }
                    if ((r | 0) == 166) {
                      r = 0;
                      g = h + 2 | 0;
                      if (m << 24 >> 24 == 32 | ((m << 24 >> 24) + -9 | 0) >>> 0 < 5) {
                        k = g;
                        while (1) {
                          g = a[k >> 0] | 0;
                          b = k + 1 | 0;
                          if (g << 24 >> 24 == 32 | ((g << 24 >> 24) + -9 | 0) >>> 0 < 5) k = b;
                          else {
                            h = g;
                            f = g << 24 >> 24;
                            break
                          }
                        }
                      } else {
                        k = n;
                        h = m;
                        f = m << 24 >> 24;
                        b = g
                      }
                      if ((f | 0) == 45) {
                        g = 1;
                        r = 170
                      } else if ((f | 0) == 43) {
                        g = 0;
                        r = 170
                      } else g = 0;
                      if ((r | 0) == 170) {
                        r = 0;
                        k = b;
                        h = a[b >> 0] | 0
                      }
                      h = (h << 24 >> 24) + -48 | 0;
                      if (h >>> 0 < 10) {
                        f = k;
                        k = 0;
                        do {
                          f = f + 1 | 0;
                          k = (k * 10 | 0) - h | 0;
                          h = (a[f >> 0] | 0) + -48 | 0
                        } while (h >>> 0 < 10)
                      } else k = 0;
                      h = ((g | 0) != 0 ? k : 0 - k | 0) * 100 | 0;
                      if (((h + 1e4 | 0) / 157 | 0) >>> 0 > 127) {
                        b = -1;
                        break a
                      }
                      if ((h + 10156 | 0) >>> 0 < 313) r = 175;
                      else h = (h + 1e4 | 0) / 157 | 0
                    }
                    if ((r | 0) == 175) {
                      r = 0;
                      if (m << 24 >> 24 != 45 & (m + -48 & 255) > 9) {
                        b = -1;
                        break a
                      } else h = 0
                    }
                    c[(c[e >> 2] | 0) + (p * 28 | 0) + 12 >> 2] = h
                  }
                while (0);
                do
                  if ((r | 0) == 178) {
                    while (1) {
                      r = 0;
                      h = h + 1 | 0;
                      g = g + 1 | 0;
                      f = a[h >> 0] | 0;
                      b = a[g >> 0] | 0;
                      if (f << 24 >> 24 == 0 ? 1 : f << 24 >> 24 != b << 24 >> 24) break;
                      else r = 178
                    }
                    if (f << 24 >> 24 != b << 24 >> 24)
                      if (m << 24 >> 24 == 115) {
                        h = 6416;
                        r = 188;
                        break
                      } else {
                        b = -1;
                        break a
                      }
                    h = a[n >> 0] | 0;
                    if (h << 24 >> 24 == 101) {
                      k = n;
                      h = 6400;
                      do {
                        k = k + 1 | 0;
                        h = h + 1 | 0;
                        g = a[k >> 0] | 0;
                        f = a[h >> 0] | 0
                      } while (!(g << 24 >> 24 == 0 ? 1 : g << 24 >> 24 != f << 24 >> 24));
                      if (g << 24 >> 24 != f << 24 >> 24) {
                        b = -1;
                        break a
                      }
                      c[(c[e >> 2] | 0) + (p * 28 | 0) + 20 >> 2] = 0;
                      break
                    } else if (h << 24 >> 24 == 108) {
                      k = n;
                      h = 6408;
                      do {
                        k = k + 1 | 0;
                        h = h + 1 | 0;
                        g = a[k >> 0] | 0;
                        f = a[h >> 0] | 0
                      } while (!(g << 24 >> 24 == 0 ? 1 : g << 24 >> 24 != f << 24 >> 24));
                      if (g << 24 >> 24 != f << 24 >> 24) {
                        b = -1;
                        break a
                      }
                      c[(c[e >> 2] | 0) + (p * 28 | 0) + 16 >> 2] = 0;
                      break
                    } else {
                      b = -1;
                      break a
                    }
                  }
                while (0);
                f: do
                    if ((r | 0) == 188) {
                      while (1) {
                        r = 0;
                        k = k + 1 | 0;
                        h = h + 1 | 0;
                        g = a[k >> 0] | 0;
                        f = a[h >> 0] | 0;
                        if (g << 24 >> 24 == 0 ? 1 : g << 24 >> 24 != f << 24 >> 24) break;
                        else r = 188
                      }
                      if (g << 24 >> 24 != f << 24 >> 24) {
                        b = -1;
                        break a
                      }
                      g = a[n >> 0] | 0;
                      if (g << 24 >> 24 == 101) {
                        k = n;
                        h = 6400;
                        do {
                          k = k + 1 | 0;
                          h = h + 1 | 0;
                          g = a[k >> 0] | 0;
                          f = a[h >> 0] | 0
                        } while (!(g << 24 >> 24 == 0 ? 1 : g << 24 >> 24 != f << 24 >> 24));
                        if (g << 24 >> 24 != f << 24 >> 24) {
                          b = -1;
                          break a
                        }
                        c[(c[e >> 2] | 0) + (p * 28 | 0) + 20 >> 2] = 1;
                        break
                      } else if (g << 24 >> 24 == 108) {
                        k = n;
                        h = 6408;
                        r = 194
                      } else if (g << 24 >> 24 == 116) {
                        k = n;
                        h = 6424
                      } else {
                        b = -1;
                        break a
                      }
                      do
                        if ((r | 0) == 194) {
                          while (1) {
                            r = 0;
                            k = k + 1 | 0;
                            h = h + 1 | 0;
                            f = a[k >> 0] | 0;
                            b = a[h >> 0] | 0;
                            if (f << 24 >> 24 == 0 ? 1 : f << 24 >> 24 != b << 24 >> 24) break;
                            else r = 194
                          }
                          if (f << 24 >> 24 != b << 24 >> 24)
                            if (g << 24 >> 24 == 116) {
                              k = n;
                              h = 6424;
                              break
                            } else {
                              b = -1;
                              break a
                            }
                          else {
                            c[(c[e >> 2] | 0) + (p * 28 | 0) + 16 >> 2] = 1;
                            break f
                          }
                        }
                      while (0);
                      do {
                        k = k + 1 | 0;
                        h = h + 1 | 0;
                        g = a[k >> 0] | 0;
                        f = a[h >> 0] | 0
                      } while (!(g << 24 >> 24 == 0 ? 1 : g << 24 >> 24 != f << 24 >> 24));
                      if (g << 24 >> 24 != f << 24 >> 24) {
                        b = -1;
                        break a
                      }
                      c[(c[e >> 2] | 0) + (p * 28 | 0) + 24 >> 2] = 1
                    }
                  while (0);
                o = o + 1 | 0;
                if ((o | 0) >= (q | 0)) break b
              }
            }
          while (0);
        b = c[(c[1448] | 0) + (d << 2) >> 2] | 0
      }
      if ((r | 0) == 64) {
        Nb(h);
        b = -1
      } else if ((r | 0) == 89) {
        c[5280 + (f << 2) >> 2] = 0;
        b = -1
      } else if ((r | 0) == 91) {
        c[c[5280 + (f << 2) >> 2] >> 2] = 0;
        b = -1
      } else if ((r | 0) == 107) {
        c[4768 + (f << 2) >> 2] = 0;
        b = -1
      } else if ((r | 0) == 109) {
        c[c[4768 + (f << 2) >> 2] >> 2] = 0;
        b = -1
      } else if ((r | 0) == 120) {
        c[(c[e >> 2] | 0) + (p * 28 | 0) >> 2] = 0;
        b = -1
      }
      Ba(c[(c[1448] | 0) + (d << 2) >> 2] | 0) | 0;
      c[(c[1448] | 0) + (d << 2) >> 2] = 0;
      o = b;
      i = t;
      return o | 0
    }

    function Lb(b) {
      b = b | 0;
      var d = 0,
        e = 0,
        f = 0,
        g = 0,
        h = 0,
        k = 0;
      k = i;
      i = i + 32 | 0;
      if ((i | 0) >= (j | 0)) ba();
      if (!b) {
        b = c[1608] | 0;
        if (!b) {
          b = 0;
          i = k;
          return b | 0
        }
      };
      c[k >> 2] = 0;
      c[k + 4 >> 2] = 0;
      c[k + 8 >> 2] = 0;
      c[k + 12 >> 2] = 0;
      c[k + 16 >> 2] = 0;
      c[k + 20 >> 2] = 0;
      c[k + 24 >> 2] = 0;
      c[k + 28 >> 2] = 0;
      f = 6104;
      e = 32;
      while (1) {
        d = k + (((e & 255) >>> 5 & 255) << 2) | 0;
        c[d >> 2] = 1 << (e & 31) | c[d >> 2];
        d = f + 1 | 0;
        if ((d | 0) == 6107) break;
        else {
          f = d;
          e = a[d >> 0] | 0
        }
      }
      e = a[b >> 0] | 0;
      a: do
          if (e << 24 >> 24) {
            d = b;
            while (1) {
              if (!(1 << (e & 31) & c[k + (((e & 255) >>> 5 & 255) << 2) >> 2])) break;
              d = d + 1 | 0;
              e = a[d >> 0] | 0;
              if (!(e << 24 >> 24)) break a
            }
            h = b;
            c[k >> 2] = 0;
            c[k + 4 >> 2] = 0;
            c[k + 8 >> 2] = 0;
            c[k + 12 >> 2] = 0;
            c[k + 16 >> 2] = 0;
            c[k + 20 >> 2] = 0;
            c[k + 24 >> 2] = 0;
            c[k + 28 >> 2] = 0;
            e = 6104;
            f = 32;
            while (1) {
              g = k + (((f & 255) >>> 5 & 255) << 2) | 0;
              c[g >> 2] = 1 << (f & 31) | c[g >> 2];
              f = e + 1 | 0;
              if ((f | 0) == 6107) break;
              else {
                e = f;
                f = a[f >> 0] | 0
              }
            }
            g = d;
            e = a[d >> 0] | 0;
            b: do
                if (!(e << 24 >> 24)) f = d;
                else {
                  f = d;
                  do {
                    if (1 << (e & 31) & c[k + (((e & 255) >>> 5 & 255) << 2) >> 2]) break b;
                    f = f + 1 | 0;
                    e = a[f >> 0] | 0
                  } while (e << 24 >> 24 != 0)
                }
              while (0);
            f = f - g + (g - h) | 0;
            e = b + f | 0;
            c[1608] = e;
            if (!(a[e >> 0] | 0)) {
              c[1608] = 0;
              b = d;
              i = k;
              return b | 0
            } else {
              c[1608] = b + (f + 1);
              a[e >> 0] = 0;
              b = d;
              i = k;
              return b | 0
            }
          }
        while (0);
      c[1608] = 0;
      b = 0;
      i = k;
      return b | 0
    }

    function Mb(a) {
      a = a | 0;
      var b = 0,
        d = 0,
        e = 0,
        f = 0,
        g = 0,
        h = 0,
        i = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0,
        o = 0,
        p = 0,
        q = 0,
        r = 0,
        s = 0,
        t = 0,
        u = 0,
        v = 0,
        w = 0,
        x = 0,
        y = 0,
        z = 0,
        A = 0,
        B = 0,
        C = 0,
        D = 0,
        E = 0,
        F = 0,
        G = 0,
        H = 0;
      do
        if (a >>> 0 < 245) {
          m = a >>> 0 < 11 ? 16 : a + 11 & -8;
          h = c[1610] | 0;
          if (h >>> (m >>> 3) & 3) {
            d = (h >>> (m >>> 3) & 1 ^ 1) + (m >>> 3) << 1;
            b = c[6480 + (d + 2 << 2) >> 2] | 0;
            e = c[b + 8 >> 2] | 0;
            do
              if ((6480 + (d << 2) | 0) != (e | 0)) {
                if (e >>> 0 < (c[1614] | 0) >>> 0) Ha();
                if ((c[e + 12 >> 2] | 0) == (b | 0)) {
                  c[e + 12 >> 2] = 6480 + (d << 2);
                  c[6480 + (d + 2 << 2) >> 2] = e;
                  break
                } else Ha()
              } else c[1610] = h & ~(1 << (h >>> (m >>> 3) & 1 ^ 1) + (m >>> 3)); while (0);
            w = (h >>> (m >>> 3) & 1 ^ 1) + (m >>> 3) << 3;
            c[b + 4 >> 2] = w | 3;
            c[b + (w | 4) >> 2] = c[b + (w | 4) >> 2] | 1;
            w = b + 8 | 0;
            return w | 0
          }
          a = c[1612] | 0;
          if (m >>> 0 > a >>> 0) {
            if (h >>> (m >>> 3)) {
              e = h >>> (m >>> 3) << (m >>> 3) & (2 << (m >>> 3) | 0 - (2 << (m >>> 3)));
              g = ((e & 0 - e) + -1 | 0) >>> (((e & 0 - e) + -1 | 0) >>> 12 & 16);
              b = g >>> (g >>> 5 & 8) >>> (g >>> (g >>> 5 & 8) >>> 2 & 4);
              b = (g >>> 5 & 8 | ((e & 0 - e) + -1 | 0) >>> 12 & 16 | g >>> (g >>> 5 & 8) >>> 2 & 4 | b >>> 1 & 2 | b >>> (b >>> 1 & 2) >>> 1 & 1) + (b >>> (b >>> 1 & 2) >>> (b >>> (b >>> 1 & 2) >>> 1 & 1)) | 0;
              g = c[6480 + ((b << 1) + 2 << 2) >> 2] | 0;
              e = c[g + 8 >> 2] | 0;
              do
                if ((6480 + (b << 1 << 2) | 0) != (e | 0)) {
                  if (e >>> 0 < (c[1614] | 0) >>> 0) Ha();
                  if ((c[e + 12 >> 2] | 0) == (g | 0)) {
                    c[e + 12 >> 2] = 6480 + (b << 1 << 2);
                    c[6480 + ((b << 1) + 2 << 2) >> 2] = e;
                    i = c[1612] | 0;
                    break
                  } else Ha()
                } else {
                  c[1610] = h & ~(1 << b);
                  i = a
                }
              while (0);
              c[g + 4 >> 2] = m | 3;
              c[g + (m | 4) >> 2] = (b << 3) - m | 1;
              c[g + (b << 3) >> 2] = (b << 3) - m;
              if (i) {
                f = c[1615] | 0;
                d = i >>> 3;
                e = c[1610] | 0;
                if (e & 1 << d) {
                  e = c[6480 + ((d << 1) + 2 << 2) >> 2] | 0;
                  if (e >>> 0 < (c[1614] | 0) >>> 0) Ha();
                  else {
                    j = 6480 + ((d << 1) + 2 << 2) | 0;
                    k = e
                  }
                } else {
                  c[1610] = e | 1 << d;
                  j = 6480 + ((d << 1) + 2 << 2) | 0;
                  k = 6480 + (d << 1 << 2) | 0
                }
                c[j >> 2] = f;
                c[k + 12 >> 2] = f;
                c[f + 8 >> 2] = k;
                c[f + 12 >> 2] = 6480 + (d << 1 << 2)
              }
              c[1612] = (b << 3) - m;
              c[1615] = g + m;
              w = g + 8 | 0;
              return w | 0
            }
            g = c[1611] | 0;
            if (g) {
              i = ((g & 0 - g) + -1 | 0) >>> (((g & 0 - g) + -1 | 0) >>> 12 & 16);
              j = i >>> (i >>> 5 & 8) >>> (i >>> (i >>> 5 & 8) >>> 2 & 4);
              j = c[6744 + ((i >>> 5 & 8 | ((g & 0 - g) + -1 | 0) >>> 12 & 16 | i >>> (i >>> 5 & 8) >>> 2 & 4 | j >>> 1 & 2 | j >>> (j >>> 1 & 2) >>> 1 & 1) + (j >>> (j >>> 1 & 2) >>> (j >>> (j >>> 1 & 2) >>> 1 & 1)) << 2) >> 2] | 0;
              i = (c[j + 4 >> 2] & -8) - m | 0;
              f = j;
              while (1) {
                e = c[f + 16 >> 2] | 0;
                if (!e) {
                  e = c[f + 20 >> 2] | 0;
                  if (!e) break
                }
                f = (c[e + 4 >> 2] & -8) - m | 0;
                w = f >>> 0 < i >>> 0;
                i = w ? f : i;
                f = e;
                j = w ? e : j
              }
              a = c[1614] | 0;
              if (j >>> 0 < a >>> 0) Ha();
              h = j + m | 0;
              if (j >>> 0 >= h >>> 0) Ha();
              g = c[j + 24 >> 2] | 0;
              f = c[j + 12 >> 2] | 0;
              do
                if ((f | 0) == (j | 0)) {
                  e = j + 20 | 0;
                  f = c[e >> 2] | 0;
                  if (!f) {
                    e = j + 16 | 0;
                    f = c[e >> 2] | 0;
                    if (!f) {
                      o = 0;
                      break
                    }
                  }
                  while (1) {
                    d = f + 20 | 0;
                    b = c[d >> 2] | 0;
                    if (b) {
                      f = b;
                      e = d;
                      continue
                    }
                    d = f + 16 | 0;
                    b = c[d >> 2] | 0;
                    if (!b) break;
                    else {
                      f = b;
                      e = d
                    }
                  }
                  if (e >>> 0 < a >>> 0) Ha();
                  else {
                    c[e >> 2] = 0;
                    o = f;
                    break
                  }
                } else {
                  e = c[j + 8 >> 2] | 0;
                  if (e >>> 0 < a >>> 0) Ha();
                  if ((c[e + 12 >> 2] | 0) != (j | 0)) Ha();
                  if ((c[f + 8 >> 2] | 0) == (j | 0)) {
                    c[e + 12 >> 2] = f;
                    c[f + 8 >> 2] = e;
                    o = f;
                    break
                  } else Ha()
                }
              while (0);
              do
                if (g) {
                  e = c[j + 28 >> 2] | 0;
                  if ((j | 0) == (c[6744 + (e << 2) >> 2] | 0)) {
                    c[6744 + (e << 2) >> 2] = o;
                    if (!o) {
                      c[1611] = c[1611] & ~(1 << e);
                      break
                    }
                  } else {
                    if (g >>> 0 < (c[1614] | 0) >>> 0) Ha();
                    if ((c[g + 16 >> 2] | 0) == (j | 0)) c[g + 16 >> 2] = o;
                    else c[g + 20 >> 2] = o;
                    if (!o) break
                  }
                  f = c[1614] | 0;
                  if (o >>> 0 < f >>> 0) Ha();
                  c[o + 24 >> 2] = g;
                  e = c[j + 16 >> 2] | 0;
                  do
                    if (e)
                      if (e >>> 0 < f >>> 0) Ha();
                      else {
                        c[o + 16 >> 2] = e;
                        c[e + 24 >> 2] = o;
                        break
                      }
                  while (0);
                  e = c[j + 20 >> 2] | 0;
                  if (e)
                    if (e >>> 0 < (c[1614] | 0) >>> 0) Ha();
                    else {
                      c[o + 20 >> 2] = e;
                      c[e + 24 >> 2] = o;
                      break
                    }
                }
              while (0);
              if (i >>> 0 < 16) {
                w = i + m | 0;
                c[j + 4 >> 2] = w | 3;
                w = j + (w + 4) | 0;
                c[w >> 2] = c[w >> 2] | 1
              } else {
                c[j + 4 >> 2] = m | 3;
                c[j + (m | 4) >> 2] = i | 1;
                c[j + (i + m) >> 2] = i;
                d = c[1612] | 0;
                if (d) {
                  b = c[1615] | 0;
                  e = c[1610] | 0;
                  if (e & 1 << (d >>> 3)) {
                    e = c[6480 + ((d >>> 3 << 1) + 2 << 2) >> 2] | 0;
                    if (e >>> 0 < (c[1614] | 0) >>> 0) Ha();
                    else {
                      p = 6480 + ((d >>> 3 << 1) + 2 << 2) | 0;
                      n = e
                    }
                  } else {
                    c[1610] = e | 1 << (d >>> 3);
                    p = 6480 + ((d >>> 3 << 1) + 2 << 2) | 0;
                    n = 6480 + (d >>> 3 << 1 << 2) | 0
                  }
                  c[p >> 2] = b;
                  c[n + 12 >> 2] = b;
                  c[b + 8 >> 2] = n;
                  c[b + 12 >> 2] = 6480 + (d >>> 3 << 1 << 2)
                }
                c[1612] = i;
                c[1615] = h
              }
              w = j + 8 | 0;
              return w | 0
            } else u = m
          } else u = m
        } else if (a >>> 0 <= 4294967231) {
        n = a + 11 & -8;
        k = c[1611] | 0;
        if (k) {
          if ((a + 11 | 0) >>> 8)
            if (n >>> 0 > 16777215) j = 31;
            else {
              j = (a + 11 | 0) >>> 8 << ((((a + 11 | 0) >>> 8) + 1048320 | 0) >>> 16 & 8);
              j = 14 - ((j + 520192 | 0) >>> 16 & 4 | (((a + 11 | 0) >>> 8) + 1048320 | 0) >>> 16 & 8 | ((j << ((j + 520192 | 0) >>> 16 & 4)) + 245760 | 0) >>> 16 & 2) + (j << ((j + 520192 | 0) >>> 16 & 4) << (((j << ((j + 520192 | 0) >>> 16 & 4)) + 245760 | 0) >>> 16 & 2) >>> 15) | 0;
              j = n >>> (j + 7 | 0) & 1 | j << 1
            }
          else j = 0;
          a = c[6744 + (j << 2) >> 2] | 0;
          a: do
              if (!a) {
                g = 0 - n | 0;
                f = 0;
                a = 0;
                y = 86
              } else {
                g = 0 - n | 0;
                f = 0;
                h = n << ((j | 0) == 31 ? 0 : 25 - (j >>> 1) | 0);
                i = a;
                a = 0;
                while (1) {
                  e = c[i + 4 >> 2] & -8;
                  if ((e - n | 0) >>> 0 < g >>> 0)
                    if ((e | 0) == (n | 0)) {
                      g = e - n | 0;
                      e = i;
                      a = i;
                      y = 90;
                      break a
                    } else {
                      g = e - n | 0;
                      a = i
                    }
                  p = c[i + 20 >> 2] | 0;
                  i = c[i + 16 + (h >>> 31 << 2) >> 2] | 0;
                  f = (p | 0) == 0 | (p | 0) == (i | 0) ? f : p;
                  if (!i) {
                    y = 86;
                    break
                  } else h = h << 1
                }
              }
            while (0);
          if ((y | 0) == 86) {
            if ((f | 0) == 0 & (a | 0) == 0) {
              a = 2 << j;
              if (!((a | 0 - a) & k)) {
                u = n;
                break
              }
              p = ((a | 0 - a) & k & 0 - ((a | 0 - a) & k)) + -1 | 0;
              a = p >>> (p >>> 12 & 16) >>> (p >>> (p >>> 12 & 16) >>> 5 & 8);
              f = a >>> (a >>> 2 & 4) >>> (a >>> (a >>> 2 & 4) >>> 1 & 2);
              f = c[6744 + ((p >>> (p >>> 12 & 16) >>> 5 & 8 | p >>> 12 & 16 | a >>> 2 & 4 | a >>> (a >>> 2 & 4) >>> 1 & 2 | f >>> 1 & 1) + (f >>> (f >>> 1 & 1)) << 2) >> 2] | 0;
              a = 0
            }
            if (!f) {
              o = g;
              p = a
            } else {
              e = f;
              y = 90
            }
          }
          if ((y | 0) == 90)
            while (1) {
              y = 0;
              p = (c[e + 4 >> 2] & -8) - n | 0;
              f = p >>> 0 < g >>> 0;
              g = f ? p : g;
              a = f ? e : a;
              f = c[e + 16 >> 2] | 0;
              if (f) {
                e = f;
                y = 90;
                continue
              }
              e = c[e + 20 >> 2] | 0;
              if (!e) {
                o = g;
                p = a;
                break
              } else y = 90
            }
          if ((p | 0) != 0 ? o >>> 0 < ((c[1612] | 0) - n | 0) >>> 0 : 0) {
            a = c[1614] | 0;
            if (p >>> 0 < a >>> 0) Ha();
            l = p + n | 0;
            if (p >>> 0 >= l >>> 0) Ha();
            b = c[p + 24 >> 2] | 0;
            f = c[p + 12 >> 2] | 0;
            do
              if ((f | 0) == (p | 0)) {
                e = p + 20 | 0;
                f = c[e >> 2] | 0;
                if (!f) {
                  e = p + 16 | 0;
                  f = c[e >> 2] | 0;
                  if (!f) {
                    m = 0;
                    break
                  }
                }
                while (1) {
                  g = f + 20 | 0;
                  d = c[g >> 2] | 0;
                  if (d) {
                    f = d;
                    e = g;
                    continue
                  }
                  g = f + 16 | 0;
                  d = c[g >> 2] | 0;
                  if (!d) break;
                  else {
                    f = d;
                    e = g
                  }
                }
                if (e >>> 0 < a >>> 0) Ha();
                else {
                  c[e >> 2] = 0;
                  m = f;
                  break
                }
              } else {
                e = c[p + 8 >> 2] | 0;
                if (e >>> 0 < a >>> 0) Ha();
                if ((c[e + 12 >> 2] | 0) != (p | 0)) Ha();
                if ((c[f + 8 >> 2] | 0) == (p | 0)) {
                  c[e + 12 >> 2] = f;
                  c[f + 8 >> 2] = e;
                  m = f;
                  break
                } else Ha()
              }
            while (0);
            do
              if (b) {
                f = c[p + 28 >> 2] | 0;
                if ((p | 0) == (c[6744 + (f << 2) >> 2] | 0)) {
                  c[6744 + (f << 2) >> 2] = m;
                  if (!m) {
                    c[1611] = c[1611] & ~(1 << f);
                    break
                  }
                } else {
                  if (b >>> 0 < (c[1614] | 0) >>> 0) Ha();
                  if ((c[b + 16 >> 2] | 0) == (p | 0)) c[b + 16 >> 2] = m;
                  else c[b + 20 >> 2] = m;
                  if (!m) break
                }
                e = c[1614] | 0;
                if (m >>> 0 < e >>> 0) Ha();
                c[m + 24 >> 2] = b;
                f = c[p + 16 >> 2] | 0;
                do
                  if (f)
                    if (f >>> 0 < e >>> 0) Ha();
                    else {
                      c[m + 16 >> 2] = f;
                      c[f + 24 >> 2] = m;
                      break
                    }
                while (0);
                e = c[p + 20 >> 2] | 0;
                if (e)
                  if (e >>> 0 < (c[1614] | 0) >>> 0) Ha();
                  else {
                    c[m + 20 >> 2] = e;
                    c[e + 24 >> 2] = m;
                    break
                  }
              }
            while (0);
            b: do
                if (o >>> 0 >= 16) {
                  c[p + 4 >> 2] = n | 3;
                  c[p + (n | 4) >> 2] = o | 1;
                  c[p + (o + n) >> 2] = o;
                  f = o >>> 3;
                  if (o >>> 0 < 256) {
                    e = c[1610] | 0;
                    if (e & 1 << f) {
                      e = c[6480 + ((f << 1) + 2 << 2) >> 2] | 0;
                      if (e >>> 0 < (c[1614] | 0) >>> 0) Ha();
                      else {
                        r = 6480 + ((f << 1) + 2 << 2) | 0;
                        s = e
                      }
                    } else {
                      c[1610] = e | 1 << f;
                      r = 6480 + ((f << 1) + 2 << 2) | 0;
                      s = 6480 + (f << 1 << 2) | 0
                    }
                    c[r >> 2] = l;
                    c[s + 12 >> 2] = l;
                    c[p + (n + 8) >> 2] = s;
                    c[p + (n + 12) >> 2] = 6480 + (f << 1 << 2);
                    break
                  }
                  e = o >>> 8;
                  if (e)
                    if (o >>> 0 > 16777215) f = 31;
                    else {
                      f = e << ((e + 1048320 | 0) >>> 16 & 8) << (((e << ((e + 1048320 | 0) >>> 16 & 8)) + 520192 | 0) >>> 16 & 4);
                      f = 14 - (((e << ((e + 1048320 | 0) >>> 16 & 8)) + 520192 | 0) >>> 16 & 4 | (e + 1048320 | 0) >>> 16 & 8 | (f + 245760 | 0) >>> 16 & 2) + (f << ((f + 245760 | 0) >>> 16 & 2) >>> 15) | 0;
                      f = o >>> (f + 7 | 0) & 1 | f << 1
                    }
                  else f = 0;
                  e = 6744 + (f << 2) | 0;
                  c[p + (n + 28) >> 2] = f;
                  c[p + (n + 20) >> 2] = 0;
                  c[p + (n + 16) >> 2] = 0;
                  d = c[1611] | 0;
                  b = 1 << f;
                  if (!(d & b)) {
                    c[1611] = d | b;
                    c[e >> 2] = l;
                    c[p + (n + 24) >> 2] = e;
                    c[p + (n + 12) >> 2] = l;
                    c[p + (n + 8) >> 2] = l;
                    break
                  }
                  e = c[e >> 2] | 0;
                  c: do
                    if ((c[e + 4 >> 2] & -8 | 0) != (o | 0)) {
                      f = o << ((f | 0) == 31 ? 0 : 25 - (f >>> 1) | 0);
                      while (1) {
                        b = e + 16 + (f >>> 31 << 2) | 0;
                        d = c[b >> 2] | 0;
                        if (!d) break;
                        if ((c[d + 4 >> 2] & -8 | 0) == (o | 0)) {
                          u = d;
                          break c
                        } else {
                          f = f << 1;
                          e = d
                        }
                      }
                      if (b >>> 0 < (c[1614] | 0) >>> 0) Ha();
                      else {
                        c[b >> 2] = l;
                        c[p + (n + 24) >> 2] = e;
                        c[p + (n + 12) >> 2] = l;
                        c[p + (n + 8) >> 2] = l;
                        break b
                      }
                    } else u = e; while (0);
                  e = u + 8 | 0;
                  d = c[e >> 2] | 0;
                  w = c[1614] | 0;
                  if (d >>> 0 >= w >>> 0 & u >>> 0 >= w >>> 0) {
                    c[d + 12 >> 2] = l;
                    c[e >> 2] = l;
                    c[p + (n + 8) >> 2] = d;
                    c[p + (n + 12) >> 2] = u;
                    c[p + (n + 24) >> 2] = 0;
                    break
                  } else Ha()
                } else {
                  w = o + n | 0;
                  c[p + 4 >> 2] = w | 3;
                  w = p + (w + 4) | 0;
                  c[w >> 2] = c[w >> 2] | 1
                }
              while (0);
            w = p + 8 | 0;
            return w | 0
          } else u = n
        } else u = n
      } else u = -1;
      while (0);
      g = c[1612] | 0;
      if (g >>> 0 >= u >>> 0) {
        b = g - u | 0;
        d = c[1615] | 0;
        if (b >>> 0 > 15) {
          c[1615] = d + u;
          c[1612] = b;
          c[d + (u + 4) >> 2] = b | 1;
          c[d + g >> 2] = b;
          c[d + 4 >> 2] = u | 3
        } else {
          c[1612] = 0;
          c[1615] = 0;
          c[d + 4 >> 2] = g | 3;
          c[d + (g + 4) >> 2] = c[d + (g + 4) >> 2] | 1
        }
        w = d + 8 | 0;
        return w | 0
      }
      g = c[1613] | 0;
      if (g >>> 0 > u >>> 0) {
        v = g - u | 0;
        c[1613] = v;
        w = c[1616] | 0;
        c[1616] = w + u;
        c[w + (u + 4) >> 2] = v | 1;
        c[w + 4 >> 2] = u | 3;
        w = w + 8 | 0;
        return w | 0
      }
      do
        if (!(c[1728] | 0)) {
          g = wa(30) | 0;
          if (!(g + -1 & g)) {
            c[1730] = g;
            c[1729] = g;
            c[1731] = -1;
            c[1732] = -1;
            c[1733] = 0;
            c[1721] = 0;
            c[1728] = (Ja(0) | 0) & -16 ^ 1431655768;
            break
          } else Ha()
        }
      while (0);
      l = u + 48 | 0;
      f = c[1730] | 0;
      b = u + 47 | 0;
      d = f + b & 0 - f;
      if (d >>> 0 <= u >>> 0) {
        w = 0;
        return w | 0
      }
      a = c[1720] | 0;
      if ((a | 0) != 0 ? (s = c[1718] | 0, (s + d | 0) >>> 0 <= s >>> 0 | (s + d | 0) >>> 0 > a >>> 0) : 0) {
        w = 0;
        return w | 0
      }
      d: do
          if (!(c[1721] & 4)) {
            g = c[1616] | 0;
            e: do
              if (g) {
                e = 6888;
                while (1) {
                  a = c[e >> 2] | 0;
                  if (a >>> 0 <= g >>> 0 ? (q = e + 4 | 0, (a + (c[q >> 2] | 0) | 0) >>> 0 > g >>> 0) : 0) break;
                  a = c[e + 8 >> 2] | 0;
                  if (!a) {
                    y = 174;
                    break e
                  } else e = a
                }
                f = f + b - (c[1613] | 0) & 0 - f;
                if (f >>> 0 < 2147483647) {
                  a = ta(f | 0) | 0;
                  s = (a | 0) == ((c[e >> 2] | 0) + (c[q >> 2] | 0) | 0);
                  g = s ? f : 0;
                  if (s) {
                    if ((a | 0) != (-1 | 0)) {
                      s = a;
                      p = g;
                      y = 194;
                      break d
                    }
                  } else y = 184
                } else g = 0
              } else y = 174; while (0);
            do
              if ((y | 0) == 174) {
                e = ta(0) | 0;
                if ((e | 0) != (-1 | 0)) {
                  g = c[1729] | 0;
                  if (!(g + -1 & e)) f = d;
                  else f = d - e + (g + -1 + e & 0 - g) | 0;
                  a = c[1718] | 0;
                  g = a + f | 0;
                  if (f >>> 0 > u >>> 0 & f >>> 0 < 2147483647) {
                    s = c[1720] | 0;
                    if ((s | 0) != 0 ? g >>> 0 <= a >>> 0 | g >>> 0 > s >>> 0 : 0) {
                      g = 0;
                      break
                    }
                    a = ta(f | 0) | 0;
                    g = (a | 0) == (e | 0) ? f : 0;
                    if ((a | 0) == (e | 0)) {
                      s = e;
                      p = g;
                      y = 194;
                      break d
                    } else y = 184
                  } else g = 0
                } else g = 0
              }
            while (0);
            f: do
                if ((y | 0) == 184) {
                  e = 0 - f | 0;
                  do
                    if (l >>> 0 > f >>> 0 & (f >>> 0 < 2147483647 & (a | 0) != (-1 | 0)) ? (t = c[1730] | 0, t = b - f + t & 0 - t, t >>> 0 < 2147483647) : 0)
                      if ((ta(t | 0) | 0) == (-1 | 0)) {
                        ta(e | 0) | 0;
                        break f
                      } else {
                        f = t + f | 0;
                        break
                      }
                  while (0);
                  if ((a | 0) != (-1 | 0)) {
                    s = a;
                    p = f;
                    y = 194;
                    break d
                  }
                }
              while (0);
            c[1721] = c[1721] | 4;
            y = 191
          } else {
            g = 0;
            y = 191
          }
        while (0);
      if ((((y | 0) == 191 ? d >>> 0 < 2147483647 : 0) ? (v = ta(d | 0) | 0, w = ta(0) | 0, v >>> 0 < w >>> 0 & ((v | 0) != (-1 | 0) & (w | 0) != (-1 | 0))) : 0) ? (x = (w - v | 0) >>> 0 > (u + 40 | 0) >>> 0, x) : 0) {
        s = v;
        p = x ? w - v | 0 : g;
        y = 194
      }
      if ((y | 0) == 194) {
        g = (c[1718] | 0) + p | 0;
        c[1718] = g;
        if (g >>> 0 > (c[1719] | 0) >>> 0) c[1719] = g;
        h = c[1616] | 0;
        g: do
            if (h) {
              b = 6888;
              while (1) {
                g = c[b >> 2] | 0;
                f = b + 4 | 0;
                e = c[f >> 2] | 0;
                if ((s | 0) == (g + e | 0)) {
                  y = 204;
                  break
                }
                d = c[b + 8 >> 2] | 0;
                if (!d) break;
                else b = d
              }
              if (((y | 0) == 204 ? (c[b + 12 >> 2] & 8 | 0) == 0 : 0) ? h >>> 0 < s >>> 0 & h >>> 0 >= g >>> 0 : 0) {
                c[f >> 2] = e + p;
                w = (c[1613] | 0) + p | 0;
                v = (h + 8 & 7 | 0) == 0 ? 0 : 0 - (h + 8) & 7;
                c[1616] = h + v;
                c[1613] = w - v;
                c[h + (v + 4) >> 2] = w - v | 1;
                c[h + (w + 4) >> 2] = 40;
                c[1617] = c[1732];
                break
              }
              g = c[1614] | 0;
              if (s >>> 0 < g >>> 0) {
                c[1614] = s;
                g = s
              }
              e = s + p | 0;
              f = 6888;
              while (1) {
                if ((c[f >> 2] | 0) == (e | 0)) {
                  y = 212;
                  break
                }
                f = c[f + 8 >> 2] | 0;
                if (!f) {
                  f = 6888;
                  break
                }
              }
              if ((y | 0) == 212)
                if (!(c[f + 12 >> 2] & 8)) {
                  c[f >> 2] = s;
                  n = f + 4 | 0;
                  c[n >> 2] = (c[n >> 2] | 0) + p;
                  n = s + 8 | 0;
                  n = (n & 7 | 0) == 0 ? 0 : 0 - n & 7;
                  k = s + (p + 8) | 0;
                  k = (k & 7 | 0) == 0 ? 0 : 0 - k & 7;
                  f = s + (k + p) | 0;
                  m = n + u | 0;
                  o = s + m | 0;
                  l = f - (s + n) - u | 0;
                  c[s + (n + 4) >> 2] = u | 3;
                  h: do
                      if ((f | 0) != (h | 0)) {
                        if ((f | 0) == (c[1615] | 0)) {
                          w = (c[1612] | 0) + l | 0;
                          c[1612] = w;
                          c[1615] = o;
                          c[s + (m + 4) >> 2] = w | 1;
                          c[s + (w + m) >> 2] = w;
                          break
                        }
                        i = p + 4 | 0;
                        j = c[s + (k + i) >> 2] | 0;
                        if ((j & 3 | 0) == 1) {
                          i: do
                            if (j >>> 0 >= 256) {
                              h = c[s + ((k | 24) + p) >> 2] | 0;
                              e = c[s + (p + 12 + k) >> 2] | 0;
                              do
                                if ((e | 0) == (f | 0)) {
                                  d = s + ((k | 16) + i) | 0;
                                  e = c[d >> 2] | 0;
                                  if (!e) {
                                    d = s + ((k | 16) + p) | 0;
                                    e = c[d >> 2] | 0;
                                    if (!e) {
                                      E = 0;
                                      break
                                    }
                                  }
                                  while (1) {
                                    b = e + 20 | 0;
                                    a = c[b >> 2] | 0;
                                    if (a) {
                                      e = a;
                                      d = b;
                                      continue
                                    }
                                    a = e + 16 | 0;
                                    b = c[a >> 2] | 0;
                                    if (!b) break;
                                    else {
                                      e = b;
                                      d = a
                                    }
                                  }
                                  if (d >>> 0 < g >>> 0) Ha();
                                  else {
                                    c[d >> 2] = 0;
                                    E = e;
                                    break
                                  }
                                } else {
                                  d = c[s + ((k | 8) + p) >> 2] | 0;
                                  if (d >>> 0 < g >>> 0) Ha();
                                  if ((c[d + 12 >> 2] | 0) != (f | 0)) Ha();
                                  if ((c[e + 8 >> 2] | 0) == (f | 0)) {
                                    c[d + 12 >> 2] = e;
                                    c[e + 8 >> 2] = d;
                                    E = e;
                                    break
                                  } else Ha()
                                }
                              while (0);
                              if (!h) break;
                              g = c[s + (p + 28 + k) >> 2] | 0;
                              do
                                if ((f | 0) != (c[6744 + (g << 2) >> 2] | 0)) {
                                  if (h >>> 0 < (c[1614] | 0) >>> 0) Ha();
                                  if ((c[h + 16 >> 2] | 0) == (f | 0)) c[h + 16 >> 2] = E;
                                  else c[h + 20 >> 2] = E;
                                  if (!E) break i
                                } else {
                                  c[6744 + (g << 2) >> 2] = E;
                                  if (E) break;
                                  c[1611] = c[1611] & ~(1 << g);
                                  break i
                                }
                              while (0);
                              f = c[1614] | 0;
                              if (E >>> 0 < f >>> 0) Ha();
                              c[E + 24 >> 2] = h;
                              g = c[s + ((k | 16) + p) >> 2] | 0;
                              do
                                if (g)
                                  if (g >>> 0 < f >>> 0) Ha();
                                  else {
                                    c[E + 16 >> 2] = g;
                                    c[g + 24 >> 2] = E;
                                    break
                                  }
                              while (0);
                              g = c[s + ((k | 16) + i) >> 2] | 0;
                              if (!g) break;
                              if (g >>> 0 < (c[1614] | 0) >>> 0) Ha();
                              else {
                                c[E + 20 >> 2] = g;
                                c[g + 24 >> 2] = E;
                                break
                              }
                            } else {
                              e = c[s + ((k | 8) + p) >> 2] | 0;
                              d = c[s + (p + 12 + k) >> 2] | 0;
                              do
                                if ((e | 0) != (6480 + (j >>> 3 << 1 << 2) | 0)) {
                                  if (e >>> 0 < g >>> 0) Ha();
                                  if ((c[e + 12 >> 2] | 0) == (f | 0)) break;
                                  Ha()
                                }
                              while (0);
                              if ((d | 0) == (e | 0)) {
                                c[1610] = c[1610] & ~(1 << (j >>> 3));
                                break
                              }
                              do
                                if ((d | 0) == (6480 + (j >>> 3 << 1 << 2) | 0)) C = d + 8 | 0;
                                else {
                                  if (d >>> 0 < g >>> 0) Ha();
                                  if ((c[d + 8 >> 2] | 0) == (f | 0)) {
                                    C = d + 8 | 0;
                                    break
                                  }
                                  Ha()
                                }
                              while (0);
                              c[e + 12 >> 2] = d;
                              c[C >> 2] = e
                            }while (0);f = s + ((j & -8 | k) + p) | 0;a = (j & -8) + l | 0
                        }
                        else a = l;
                        f = f + 4 | 0;
                        c[f >> 2] = c[f >> 2] & -2;
                        c[s + (m + 4) >> 2] = a | 1;
                        c[s + (a + m) >> 2] = a;
                        f = a >>> 3;
                        if (a >>> 0 < 256) {
                          e = c[1610] | 0;
                          do
                            if (!(e & 1 << f)) {
                              c[1610] = e | 1 << f;
                              F = 6480 + ((f << 1) + 2 << 2) | 0;
                              G = 6480 + (f << 1 << 2) | 0
                            } else {
                              e = c[6480 + ((f << 1) + 2 << 2) >> 2] | 0;
                              if (e >>> 0 >= (c[1614] | 0) >>> 0) {
                                F = 6480 + ((f << 1) + 2 << 2) | 0;
                                G = e;
                                break
                              }
                              Ha()
                            }
                          while (0);
                          c[F >> 2] = o;
                          c[G + 12 >> 2] = o;
                          c[s + (m + 8) >> 2] = G;
                          c[s + (m + 12) >> 2] = 6480 + (f << 1 << 2);
                          break
                        }
                        e = a >>> 8;
                        do
                          if (!e) b = 0;
                          else {
                            if (a >>> 0 > 16777215) {
                              b = 31;
                              break
                            }
                            b = e << ((e + 1048320 | 0) >>> 16 & 8) << (((e << ((e + 1048320 | 0) >>> 16 & 8)) + 520192 | 0) >>> 16 & 4);
                            b = 14 - (((e << ((e + 1048320 | 0) >>> 16 & 8)) + 520192 | 0) >>> 16 & 4 | (e + 1048320 | 0) >>> 16 & 8 | (b + 245760 | 0) >>> 16 & 2) + (b << ((b + 245760 | 0) >>> 16 & 2) >>> 15) | 0;
                            b = a >>> (b + 7 | 0) & 1 | b << 1
                          }
                        while (0);
                        f = 6744 + (b << 2) | 0;
                        c[s + (m + 28) >> 2] = b;
                        c[s + (m + 20) >> 2] = 0;
                        c[s + (m + 16) >> 2] = 0;
                        e = c[1611] | 0;
                        d = 1 << b;
                        if (!(e & d)) {
                          c[1611] = e | d;
                          c[f >> 2] = o;
                          c[s + (m + 24) >> 2] = f;
                          c[s + (m + 12) >> 2] = o;
                          c[s + (m + 8) >> 2] = o;
                          break
                        }
                        e = c[f >> 2] | 0;
                        j: do
                          if ((c[e + 4 >> 2] & -8 | 0) != (a | 0)) {
                            b = a << ((b | 0) == 31 ? 0 : 25 - (b >>> 1) | 0);
                            while (1) {
                              d = e + 16 + (b >>> 31 << 2) | 0;
                              f = c[d >> 2] | 0;
                              if (!f) break;
                              if ((c[f + 4 >> 2] & -8 | 0) == (a | 0)) {
                                H = f;
                                break j
                              } else {
                                b = b << 1;
                                e = f
                              }
                            }
                            if (d >>> 0 < (c[1614] | 0) >>> 0) Ha();
                            else {
                              c[d >> 2] = o;
                              c[s + (m + 24) >> 2] = e;
                              c[s + (m + 12) >> 2] = o;
                              c[s + (m + 8) >> 2] = o;
                              break h
                            }
                          } else H = e; while (0);
                        e = H + 8 | 0;
                        d = c[e >> 2] | 0;
                        w = c[1614] | 0;
                        if (d >>> 0 >= w >>> 0 & H >>> 0 >= w >>> 0) {
                          c[d + 12 >> 2] = o;
                          c[e >> 2] = o;
                          c[s + (m + 8) >> 2] = d;
                          c[s + (m + 12) >> 2] = H;
                          c[s + (m + 24) >> 2] = 0;
                          break
                        } else Ha()
                      } else {
                        w = (c[1613] | 0) + l | 0;
                        c[1613] = w;
                        c[1616] = o;
                        c[s + (m + 4) >> 2] = w | 1
                      }
                    while (0);
                  w = s + (n | 8) | 0;
                  return w | 0
                } else f = 6888;
              while (1) {
                d = c[f >> 2] | 0;
                if (d >>> 0 <= h >>> 0 ? (z = c[f + 4 >> 2] | 0, (d + z | 0) >>> 0 > h >>> 0) : 0) break;
                f = c[f + 8 >> 2] | 0
              }
              a = d + (z + -47 + ((d + (z + -39) & 7 | 0) == 0 ? 0 : 0 - (d + (z + -39)) & 7)) | 0;
              a = a >>> 0 < (h + 16 | 0) >>> 0 ? h : a;
              w = s + 8 | 0;
              w = (w & 7 | 0) == 0 ? 0 : 0 - w & 7;
              v = p + -40 - w | 0;
              c[1616] = s + w;
              c[1613] = v;
              c[s + (w + 4) >> 2] = v | 1;
              c[s + (p + -36) >> 2] = 40;
              c[1617] = c[1732];
              c[a + 4 >> 2] = 27;
              c[a + 8 >> 2] = c[1722];
              c[a + 8 + 4 >> 2] = c[1723];
              c[a + 8 + 8 >> 2] = c[1724];
              c[a + 8 + 12 >> 2] = c[1725];
              c[1722] = s;
              c[1723] = p;
              c[1725] = 0;
              c[1724] = a + 8;
              c[a + 28 >> 2] = 7;
              if ((a + 32 | 0) >>> 0 < (d + z | 0) >>> 0) {
                e = a + 28 | 0;
                do {
                  w = e;
                  e = e + 4 | 0;
                  c[e >> 2] = 7
                } while ((w + 8 | 0) >>> 0 < (d + z | 0) >>> 0)
              }
              if ((a | 0) != (h | 0)) {
                c[a + 4 >> 2] = c[a + 4 >> 2] & -2;
                c[h + 4 >> 2] = a - h | 1;
                c[a >> 2] = a - h;
                if ((a - h | 0) >>> 0 < 256) {
                  e = c[1610] | 0;
                  if (e & 1 << ((a - h | 0) >>> 3)) {
                    e = c[6480 + (((a - h | 0) >>> 3 << 1) + 2 << 2) >> 2] | 0;
                    if (e >>> 0 < (c[1614] | 0) >>> 0) Ha();
                    else {
                      A = 6480 + (((a - h | 0) >>> 3 << 1) + 2 << 2) | 0;
                      B = e
                    }
                  } else {
                    c[1610] = e | 1 << ((a - h | 0) >>> 3);
                    A = 6480 + (((a - h | 0) >>> 3 << 1) + 2 << 2) | 0;
                    B = 6480 + ((a - h | 0) >>> 3 << 1 << 2) | 0
                  }
                  c[A >> 2] = h;
                  c[B + 12 >> 2] = h;
                  c[h + 8 >> 2] = B;
                  c[h + 12 >> 2] = 6480 + ((a - h | 0) >>> 3 << 1 << 2);
                  break
                }
                if ((a - h | 0) >>> 8)
                  if ((a - h | 0) >>> 0 > 16777215) f = 31;
                  else {
                    f = (a - h | 0) >>> 8 << ((((a - h | 0) >>> 8) + 1048320 | 0) >>> 16 & 8);
                    f = 14 - ((f + 520192 | 0) >>> 16 & 4 | (((a - h | 0) >>> 8) + 1048320 | 0) >>> 16 & 8 | ((f << ((f + 520192 | 0) >>> 16 & 4)) + 245760 | 0) >>> 16 & 2) + (f << ((f + 520192 | 0) >>> 16 & 4) << (((f << ((f + 520192 | 0) >>> 16 & 4)) + 245760 | 0) >>> 16 & 2) >>> 15) | 0;
                    f = (a - h | 0) >>> (f + 7 | 0) & 1 | f << 1
                  }
                else f = 0;
                e = 6744 + (f << 2) | 0;
                c[h + 28 >> 2] = f;
                c[h + 20 >> 2] = 0;
                c[h + 16 >> 2] = 0;
                d = c[1611] | 0;
                b = 1 << f;
                if (!(d & b)) {
                  c[1611] = d | b;
                  c[e >> 2] = h;
                  c[h + 24 >> 2] = e;
                  c[h + 12 >> 2] = h;
                  c[h + 8 >> 2] = h;
                  break
                }
                e = c[e >> 2] | 0;
                k: do
                  if ((c[e + 4 >> 2] & -8 | 0) != (a - h | 0)) {
                    f = a - h << ((f | 0) == 31 ? 0 : 25 - (f >>> 1) | 0);
                    while (1) {
                      b = e + 16 + (f >>> 31 << 2) | 0;
                      d = c[b >> 2] | 0;
                      if (!d) break;
                      if ((c[d + 4 >> 2] & -8 | 0) == (a - h | 0)) {
                        D = d;
                        break k
                      } else {
                        f = f << 1;
                        e = d
                      }
                    }
                    if (b >>> 0 < (c[1614] | 0) >>> 0) Ha();
                    else {
                      c[b >> 2] = h;
                      c[h + 24 >> 2] = e;
                      c[h + 12 >> 2] = h;
                      c[h + 8 >> 2] = h;
                      break g
                    }
                  } else D = e; while (0);
                d = D + 8 | 0;
                b = c[d >> 2] | 0;
                w = c[1614] | 0;
                if (b >>> 0 >= w >>> 0 & D >>> 0 >= w >>> 0) {
                  c[b + 12 >> 2] = h;
                  c[d >> 2] = h;
                  c[h + 8 >> 2] = b;
                  c[h + 12 >> 2] = D;
                  c[h + 24 >> 2] = 0;
                  break
                } else Ha()
              }
            } else {
              w = c[1614] | 0;
              if ((w | 0) == 0 | s >>> 0 < w >>> 0) c[1614] = s;
              c[1722] = s;
              c[1723] = p;
              c[1725] = 0;
              c[1619] = c[1728];
              c[1618] = -1;
              d = 0;
              do {
                w = d << 1;
                c[6480 + (w + 3 << 2) >> 2] = 6480 + (w << 2);
                c[6480 + (w + 2 << 2) >> 2] = 6480 + (w << 2);
                d = d + 1 | 0
              } while ((d | 0) != 32);
              w = s + 8 | 0;
              w = (w & 7 | 0) == 0 ? 0 : 0 - w & 7;
              v = p + -40 - w | 0;
              c[1616] = s + w;
              c[1613] = v;
              c[s + (w + 4) >> 2] = v | 1;
              c[s + (p + -36) >> 2] = 40;
              c[1617] = c[1732]
            }
          while (0);
        b = c[1613] | 0;
        if (b >>> 0 > u >>> 0) {
          v = b - u | 0;
          c[1613] = v;
          w = c[1616] | 0;
          c[1616] = w + u;
          c[w + (u + 4) >> 2] = v | 1;
          c[w + 4 >> 2] = u | 3;
          w = w + 8 | 0;
          return w | 0
        }
      }
      c[(Da() | 0) >> 2] = 12;
      w = 0;
      return w | 0
    }

    function Nb(a) {
      a = a | 0;
      var b = 0,
        d = 0,
        e = 0,
        f = 0,
        g = 0,
        h = 0,
        i = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0,
        o = 0,
        p = 0,
        q = 0,
        r = 0,
        s = 0,
        t = 0,
        u = 0;
      if (!a) return;
      i = c[1614] | 0;
      if ((a + -8 | 0) >>> 0 < i >>> 0) Ha();
      p = c[a + -4 >> 2] | 0;
      if ((p & 3 | 0) == 1) Ha();
      o = a + ((p & -8) + -8) | 0;
      do
        if (!(p & 1)) {
          k = c[a + -8 >> 2] | 0;
          if (!(p & 3)) return;
          l = a + (-8 - k) | 0;
          m = k + (p & -8) | 0;
          if (l >>> 0 < i >>> 0) Ha();
          if ((l | 0) == (c[1615] | 0)) {
            f = c[a + ((p & -8) + -4) >> 2] | 0;
            if ((f & 3 | 0) != 3) {
              t = l;
              g = m;
              break
            }
            c[1612] = m;
            c[a + ((p & -8) + -4) >> 2] = f & -2;
            c[a + (-8 - k + 4) >> 2] = m | 1;
            c[o >> 2] = m;
            return
          }
          if (k >>> 0 < 256) {
            f = c[a + (-8 - k + 8) >> 2] | 0;
            e = c[a + (-8 - k + 12) >> 2] | 0;
            if ((f | 0) != (6480 + (k >>> 3 << 1 << 2) | 0)) {
              if (f >>> 0 < i >>> 0) Ha();
              if ((c[f + 12 >> 2] | 0) != (l | 0)) Ha()
            }
            if ((e | 0) == (f | 0)) {
              c[1610] = c[1610] & ~(1 << (k >>> 3));
              t = l;
              g = m;
              break
            }
            if ((e | 0) != (6480 + (k >>> 3 << 1 << 2) | 0)) {
              if (e >>> 0 < i >>> 0) Ha();
              if ((c[e + 8 >> 2] | 0) != (l | 0)) Ha();
              else d = e + 8 | 0
            } else d = e + 8 | 0;
            c[f + 12 >> 2] = e;
            c[d >> 2] = f;
            t = l;
            g = m;
            break
          }
          b = c[a + (-8 - k + 24) >> 2] | 0;
          f = c[a + (-8 - k + 12) >> 2] | 0;
          do
            if ((f | 0) == (l | 0)) {
              f = c[a + (-8 - k + 20) >> 2] | 0;
              if (!f) {
                f = c[a + (-8 - k + 16) >> 2] | 0;
                if (!f) {
                  j = 0;
                  break
                } else h = a + (-8 - k + 16) | 0
              } else h = a + (-8 - k + 20) | 0;
              while (1) {
                e = f + 20 | 0;
                d = c[e >> 2] | 0;
                if (d) {
                  f = d;
                  h = e;
                  continue
                }
                e = f + 16 | 0;
                d = c[e >> 2] | 0;
                if (!d) break;
                else {
                  f = d;
                  h = e
                }
              }
              if (h >>> 0 < i >>> 0) Ha();
              else {
                c[h >> 2] = 0;
                j = f;
                break
              }
            } else {
              e = c[a + (-8 - k + 8) >> 2] | 0;
              if (e >>> 0 < i >>> 0) Ha();
              if ((c[e + 12 >> 2] | 0) != (l | 0)) Ha();
              if ((c[f + 8 >> 2] | 0) == (l | 0)) {
                c[e + 12 >> 2] = f;
                c[f + 8 >> 2] = e;
                j = f;
                break
              } else Ha()
            }
          while (0);
          if (b) {
            f = c[a + (-8 - k + 28) >> 2] | 0;
            if ((l | 0) == (c[6744 + (f << 2) >> 2] | 0)) {
              c[6744 + (f << 2) >> 2] = j;
              if (!j) {
                c[1611] = c[1611] & ~(1 << f);
                t = l;
                g = m;
                break
              }
            } else {
              if (b >>> 0 < (c[1614] | 0) >>> 0) Ha();
              if ((c[b + 16 >> 2] | 0) == (l | 0)) c[b + 16 >> 2] = j;
              else c[b + 20 >> 2] = j;
              if (!j) {
                t = l;
                g = m;
                break
              }
            }
            e = c[1614] | 0;
            if (j >>> 0 < e >>> 0) Ha();
            c[j + 24 >> 2] = b;
            f = c[a + (-8 - k + 16) >> 2] | 0;
            do
              if (f)
                if (f >>> 0 < e >>> 0) Ha();
                else {
                  c[j + 16 >> 2] = f;
                  c[f + 24 >> 2] = j;
                  break
                }
            while (0);
            f = c[a + (-8 - k + 20) >> 2] | 0;
            if (f)
              if (f >>> 0 < (c[1614] | 0) >>> 0) Ha();
              else {
                c[j + 20 >> 2] = f;
                c[f + 24 >> 2] = j;
                t = l;
                g = m;
                break
              }
            else {
              t = l;
              g = m
            }
          } else {
            t = l;
            g = m
          }
        } else {
          t = a + -8 | 0;
          g = p & -8
        }
      while (0);
      if (t >>> 0 >= o >>> 0) Ha();
      d = c[a + ((p & -8) + -4) >> 2] | 0;
      if (!(d & 1)) Ha();
      if (!(d & 2)) {
        if ((o | 0) == (c[1616] | 0)) {
          l = (c[1613] | 0) + g | 0;
          c[1613] = l;
          c[1616] = t;
          c[t + 4 >> 2] = l | 1;
          if ((t | 0) != (c[1615] | 0)) return;
          c[1615] = 0;
          c[1612] = 0;
          return
        }
        if ((o | 0) == (c[1615] | 0)) {
          l = (c[1612] | 0) + g | 0;
          c[1612] = l;
          c[1615] = t;
          c[t + 4 >> 2] = l | 1;
          c[t + l >> 2] = l;
          return
        }
        g = (d & -8) + g | 0;
        do
          if (d >>> 0 >= 256) {
            h = c[a + ((p & -8) + 16) >> 2] | 0;
            f = c[a + (p & -8 | 4) >> 2] | 0;
            do
              if ((f | 0) == (o | 0)) {
                f = c[a + ((p & -8) + 12) >> 2] | 0;
                if (!f) {
                  f = c[a + ((p & -8) + 8) >> 2] | 0;
                  if (!f) {
                    q = 0;
                    break
                  } else b = a + ((p & -8) + 8) | 0
                } else b = a + ((p & -8) + 12) | 0;
                while (1) {
                  e = f + 20 | 0;
                  d = c[e >> 2] | 0;
                  if (d) {
                    f = d;
                    b = e;
                    continue
                  }
                  e = f + 16 | 0;
                  d = c[e >> 2] | 0;
                  if (!d) break;
                  else {
                    f = d;
                    b = e
                  }
                }
                if (b >>> 0 < (c[1614] | 0) >>> 0) Ha();
                else {
                  c[b >> 2] = 0;
                  q = f;
                  break
                }
              } else {
                e = c[a + (p & -8) >> 2] | 0;
                if (e >>> 0 < (c[1614] | 0) >>> 0) Ha();
                if ((c[e + 12 >> 2] | 0) != (o | 0)) Ha();
                if ((c[f + 8 >> 2] | 0) == (o | 0)) {
                  c[e + 12 >> 2] = f;
                  c[f + 8 >> 2] = e;
                  q = f;
                  break
                } else Ha()
              }
            while (0);
            if (h) {
              f = c[a + ((p & -8) + 20) >> 2] | 0;
              if ((o | 0) == (c[6744 + (f << 2) >> 2] | 0)) {
                c[6744 + (f << 2) >> 2] = q;
                if (!q) {
                  c[1611] = c[1611] & ~(1 << f);
                  break
                }
              } else {
                if (h >>> 0 < (c[1614] | 0) >>> 0) Ha();
                if ((c[h + 16 >> 2] | 0) == (o | 0)) c[h + 16 >> 2] = q;
                else c[h + 20 >> 2] = q;
                if (!q) break
              }
              e = c[1614] | 0;
              if (q >>> 0 < e >>> 0) Ha();
              c[q + 24 >> 2] = h;
              f = c[a + ((p & -8) + 8) >> 2] | 0;
              do
                if (f)
                  if (f >>> 0 < e >>> 0) Ha();
                  else {
                    c[q + 16 >> 2] = f;
                    c[f + 24 >> 2] = q;
                    break
                  }
              while (0);
              d = c[a + ((p & -8) + 12) >> 2] | 0;
              if (d)
                if (d >>> 0 < (c[1614] | 0) >>> 0) Ha();
                else {
                  c[q + 20 >> 2] = d;
                  c[d + 24 >> 2] = q;
                  break
                }
            }
          } else {
            e = c[a + (p & -8) >> 2] | 0;
            f = c[a + (p & -8 | 4) >> 2] | 0;
            if ((e | 0) != (6480 + (d >>> 3 << 1 << 2) | 0)) {
              if (e >>> 0 < (c[1614] | 0) >>> 0) Ha();
              if ((c[e + 12 >> 2] | 0) != (o | 0)) Ha()
            }
            if ((f | 0) == (e | 0)) {
              c[1610] = c[1610] & ~(1 << (d >>> 3));
              break
            }
            if ((f | 0) != (6480 + (d >>> 3 << 1 << 2) | 0)) {
              if (f >>> 0 < (c[1614] | 0) >>> 0) Ha();
              if ((c[f + 8 >> 2] | 0) != (o | 0)) Ha();
              else n = f + 8 | 0
            } else n = f + 8 | 0;
            c[e + 12 >> 2] = f;
            c[n >> 2] = e
          }
        while (0);
        c[t + 4 >> 2] = g | 1;
        c[t + g >> 2] = g;
        if ((t | 0) == (c[1615] | 0)) {
          c[1612] = g;
          return
        }
      } else {
        c[a + ((p & -8) + -4) >> 2] = d & -2;
        c[t + 4 >> 2] = g | 1;
        c[t + g >> 2] = g
      }
      e = g >>> 3;
      if (g >>> 0 < 256) {
        d = c[1610] | 0;
        if (d & 1 << e) {
          d = c[6480 + ((e << 1) + 2 << 2) >> 2] | 0;
          if (d >>> 0 < (c[1614] | 0) >>> 0) Ha();
          else {
            r = 6480 + ((e << 1) + 2 << 2) | 0;
            s = d
          }
        } else {
          c[1610] = d | 1 << e;
          r = 6480 + ((e << 1) + 2 << 2) | 0;
          s = 6480 + (e << 1 << 2) | 0
        }
        c[r >> 2] = t;
        c[s + 12 >> 2] = t;
        c[t + 8 >> 2] = s;
        c[t + 12 >> 2] = 6480 + (e << 1 << 2);
        return
      }
      b = g >>> 8;
      if (b)
        if (g >>> 0 > 16777215) f = 31;
        else {
          f = b << ((b + 1048320 | 0) >>> 16 & 8) << (((b << ((b + 1048320 | 0) >>> 16 & 8)) + 520192 | 0) >>> 16 & 4);
          f = 14 - (((b << ((b + 1048320 | 0) >>> 16 & 8)) + 520192 | 0) >>> 16 & 4 | (b + 1048320 | 0) >>> 16 & 8 | (f + 245760 | 0) >>> 16 & 2) + (f << ((f + 245760 | 0) >>> 16 & 2) >>> 15) | 0;
          f = g >>> (f + 7 | 0) & 1 | f << 1
        }
      else f = 0;
      d = 6744 + (f << 2) | 0;
      c[t + 28 >> 2] = f;
      c[t + 20 >> 2] = 0;
      c[t + 16 >> 2] = 0;
      b = c[1611] | 0;
      e = 1 << f;
      a: do
          if (b & e) {
            d = c[d >> 2] | 0;
            b: do
              if ((c[d + 4 >> 2] & -8 | 0) != (g | 0)) {
                f = g << ((f | 0) == 31 ? 0 : 25 - (f >>> 1) | 0);
                while (1) {
                  b = d + 16 + (f >>> 31 << 2) | 0;
                  e = c[b >> 2] | 0;
                  if (!e) break;
                  if ((c[e + 4 >> 2] & -8 | 0) == (g | 0)) {
                    u = e;
                    break b
                  } else {
                    f = f << 1;
                    d = e
                  }
                }
                if (b >>> 0 < (c[1614] | 0) >>> 0) Ha();
                else {
                  c[b >> 2] = t;
                  c[t + 24 >> 2] = d;
                  c[t + 12 >> 2] = t;
                  c[t + 8 >> 2] = t;
                  break a
                }
              } else u = d; while (0);
            b = u + 8 | 0;
            d = c[b >> 2] | 0;
            l = c[1614] | 0;
            if (d >>> 0 >= l >>> 0 & u >>> 0 >= l >>> 0) {
              c[d + 12 >> 2] = t;
              c[b >> 2] = t;
              c[t + 8 >> 2] = d;
              c[t + 12 >> 2] = u;
              c[t + 24 >> 2] = 0;
              break
            } else Ha()
          } else {
            c[1611] = b | e;
            c[d >> 2] = t;
            c[t + 24 >> 2] = d;
            c[t + 12 >> 2] = t;
            c[t + 8 >> 2] = t
          }
        while (0);
      l = (c[1618] | 0) + -1 | 0;
      c[1618] = l;
      if (!l) b = 6896;
      else return;
      while (1) {
        b = c[b >> 2] | 0;
        if (!b) break;
        else b = b + 8 | 0
      }
      c[1618] = -1;
      return
    }

    function Ob() {}

    function Pb(b, d, e) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0,
        g = 0,
        h = 0;
      f = b + e | 0;
      if ((e | 0) >= 20) {
        d = d & 255;
        g = b & 3;
        h = d | d << 8 | d << 16 | d << 24;
        if (g) {
          g = b + 4 - g | 0;
          while ((b | 0) < (g | 0)) {
            a[b >> 0] = d;
            b = b + 1 | 0
          }
        }
        while ((b | 0) < (f & ~3 | 0)) {
          c[b >> 2] = h;
          b = b + 4 | 0
        }
      }
      while ((b | 0) < (f | 0)) {
        a[b >> 0] = d;
        b = b + 1 | 0
      }
      return b - e | 0
    }

    function Qb(a, b, c, d) {
      a = a | 0;
      b = b | 0;
      c = c | 0;
      d = d | 0;
      return (C = b + d + (a + c >>> 0 >>> 0 < a >>> 0 | 0) >>> 0, a + c >>> 0 | 0) | 0
    }

    function Rb(b) {
      b = b | 0;
      var c = 0;
      c = b;
      while (a[c >> 0] | 0) c = c + 1 | 0;
      return c - b | 0
    }

    function Sb(b, c) {
      b = b | 0;
      c = c | 0;
      var d = 0,
        e = 0;
      e = b + (Rb(b) | 0) | 0;
      do {
        a[e + d >> 0] = a[c + d >> 0];
        d = d + 1 | 0
      } while (a[c + (d - 1) >> 0] | 0);
      return b | 0
    }

    function Tb(b, d, e) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0;
      if ((e | 0) >= 4096) return ua(b | 0, d | 0, e | 0) | 0;
      f = b | 0;
      if ((b & 3) == (d & 3)) {
        while (b & 3) {
          if (!e) return f | 0;
          a[b >> 0] = a[d >> 0] | 0;
          b = b + 1 | 0;
          d = d + 1 | 0;
          e = e - 1 | 0
        }
        while ((e | 0) >= 4) {
          c[b >> 2] = c[d >> 2];
          b = b + 4 | 0;
          d = d + 4 | 0;
          e = e - 4 | 0
        }
      }
      while ((e | 0) > 0) {
        a[b >> 0] = a[d >> 0] | 0;
        b = b + 1 | 0;
        d = d + 1 | 0;
        e = e - 1 | 0
      }
      return f | 0
    }

    function Ub(b, c, d) {
      b = b | 0;
      c = c | 0;
      d = d | 0;
      var e = 0,
        f = 0;
      while ((e | 0) < (d | 0)) {
        a[b + e >> 0] = f ? 0 : a[c + e >> 0] | 0;
        f = f ? 1 : (a[c + e >> 0] | 0) == 0;
        e = e + 1 | 0
      }
      return b | 0
    }

    function Vb(b, c) {
      b = b | 0;
      c = c | 0;
      var d = 0;
      do {
        a[b + d >> 0] = a[c + d >> 0];
        d = d + 1 | 0
      } while (a[c + (d - 1) >> 0] | 0);
      return b | 0
    }

    function Wb(a) {
      a = a | 0;
      return (a & 255) << 24 | (a >> 8 & 255) << 16 | (a >> 16 & 255) << 8 | a >>> 24 | 0
    }

    function Xb(a, b, c, d) {
      a = a | 0;
      b = b | 0;
      c = c | 0;
      d = d | 0;
      b = b - d - (c >>> 0 > a >>> 0 | 0) >>> 0;
      return (C = b, a - c >>> 0 | 0) | 0
    }

    function Yb(a, b, c) {
      a = a | 0;
      b = b | 0;
      c = c | 0;
      if ((c | 0) < 32) {
        C = b << c | (a & (1 << c) - 1 << 32 - c) >>> 32 - c;
        return a << c
      }
      C = a << c - 32;
      return 0
    }

    function Zb(a, b, c) {
      a = a | 0;
      b = b | 0;
      c = c | 0;
      if ((c | 0) < 32) {
        C = b >>> c;
        return a >>> c | (b & (1 << c) - 1) << 32 - c
      }
      C = 0;
      return b >>> c - 32 | 0
    }

    function _b(a, b, c) {
      a = a | 0;
      b = b | 0;
      c = c | 0;
      if ((c | 0) < 32) {
        C = b >> c;
        return a >>> c | (b & (1 << c) - 1) << 32 - c
      }
      C = (b | 0) < 0 ? -1 : 0;
      return b >> c - 32 | 0
    }

    function $b(b) {
      b = b | 0;
      var c = 0;
      c = a[m + (b & 255) >> 0] | 0;
      if ((c | 0) < 8) return c | 0;
      c = a[m + (b >> 8 & 255) >> 0] | 0;
      if ((c | 0) < 8) return c + 8 | 0;
      c = a[m + (b >> 16 & 255) >> 0] | 0;
      if ((c | 0) < 8) return c + 16 | 0;
      return (a[m + (b >>> 24) >> 0] | 0) + 24 | 0
    }

    function ac(a, b) {
      a = a | 0;
      b = b | 0;
      var c = 0,
        d = 0,
        e = 0;
      c = _(b & 65535, a & 65535) | 0;
      e = (c >>> 16) + (_(b & 65535, a >>> 16) | 0) | 0;
      d = _(b >>> 16, a & 65535) | 0;
      return (C = (e >>> 16) + (_(b >>> 16, a >>> 16) | 0) + (((e & 65535) + d | 0) >>> 16) | 0, e + d << 16 | c & 65535 | 0) | 0
    }

    function bc(a, b, c, d) {
      a = a | 0;
      b = b | 0;
      c = c | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0,
        h = 0;
      g = b >> 31 | ((b | 0) < 0 ? -1 : 0) << 1;
      e = ((b | 0) < 0 ? -1 : 0) >> 31 | ((b | 0) < 0 ? -1 : 0) << 1;
      h = d >> 31 | ((d | 0) < 0 ? -1 : 0) << 1;
      f = ((d | 0) < 0 ? -1 : 0) >> 31 | ((d | 0) < 0 ? -1 : 0) << 1;
      b = Xb(g ^ a, e ^ b, g, e) | 0;
      a = C;
      return Xb((gc(b, a, Xb(h ^ c, f ^ d, h, f) | 0, C, 0) | 0) ^ (h ^ g), C ^ (f ^ e), h ^ g, f ^ e) | 0
    }

    function cc(a, b, d, e) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0,
        g = 0,
        h = 0,
        j = 0,
        k = 0;
      f = i;
      i = i + 8 | 0;
      h = b >> 31 | ((b | 0) < 0 ? -1 : 0) << 1;
      g = ((b | 0) < 0 ? -1 : 0) >> 31 | ((b | 0) < 0 ? -1 : 0) << 1;
      k = e >> 31 | ((e | 0) < 0 ? -1 : 0) << 1;
      j = ((e | 0) < 0 ? -1 : 0) >> 31 | ((e | 0) < 0 ? -1 : 0) << 1;
      b = Xb(h ^ a, g ^ b, h, g) | 0;
      a = C;
      gc(b, a, Xb(k ^ d, j ^ e, k, j) | 0, C, f | 0) | 0;
      a = Xb(c[f >> 2] ^ h, c[f + 4 >> 2] ^ g, h, g) | 0;
      b = C;
      i = f;
      return (C = b, a) | 0
    }

    function dc(a, b, c, d) {
      a = a | 0;
      b = b | 0;
      c = c | 0;
      d = d | 0;
      var e = 0,
        f = 0;
      e = ac(a, c) | 0;
      f = C;
      return (C = (_(b, c) | 0) + (_(d, a) | 0) + f | f & 0, e | 0 | 0) | 0
    }

    function ec(a, b, c, d) {
      a = a | 0;
      b = b | 0;
      c = c | 0;
      d = d | 0;
      return gc(a, b, c, d, 0) | 0
    }

    function fc(a, b, d, e) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0;
      f = i;
      i = i + 8 | 0;
      gc(a, b, d, e, f | 0) | 0;
      i = f;
      return (C = c[f + 4 >> 2] | 0, c[f >> 2] | 0) | 0
    }

    function gc(a, b, d, e, f) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      var g = 0,
        h = 0,
        i = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0,
        o = 0,
        p = 0;
      if (!b)
        if (!e) {
          if (f) {
            c[f >> 2] = (a >>> 0) % (d >>> 0);
            c[f + 4 >> 2] = 0
          }
          m = 0;
          d = (a >>> 0) / (d >>> 0) >>> 0;
          return (C = m, d) | 0
        } else {
          if (!f) {
            m = 0;
            d = 0;
            return (C = m, d) | 0
          }
          c[f >> 2] = a | 0;
          c[f + 4 >> 2] = b & 0;
          m = 0;
          d = 0;
          return (C = m, d) | 0
        }
      do
        if (d) {
          if (e) {
            h = (aa(e | 0) | 0) - (aa(b | 0) | 0) | 0;
            if (h >>> 0 <= 31) {
              j = h + 1 | 0;
              i = a >>> ((h + 1 | 0) >>> 0) & h - 31 >> 31 | b << 31 - h;
              m = b >>> ((h + 1 | 0) >>> 0) & h - 31 >> 31;
              g = 0;
              h = a << 31 - h;
              break
            }
            if (!f) {
              m = 0;
              d = 0;
              return (C = m, d) | 0
            }
            c[f >> 2] = a | 0;
            c[f + 4 >> 2] = b | b & 0;
            m = 0;
            d = 0;
            return (C = m, d) | 0
          }
          if (d - 1 & d) {
            h = (aa(d | 0) | 0) + 33 - (aa(b | 0) | 0) | 0;
            j = h;
            i = 32 - h - 1 >> 31 & b >>> ((h - 32 | 0) >>> 0) | (b << 32 - h | a >>> (h >>> 0)) & h - 32 >> 31;
            m = h - 32 >> 31 & b >>> (h >>> 0);
            g = a << 64 - h & 32 - h >> 31;
            h = (b << 64 - h | a >>> ((h - 32 | 0) >>> 0)) & 32 - h >> 31 | a << 32 - h & h - 33 >> 31;
            break
          }
          if (f) {
            c[f >> 2] = d - 1 & a;
            c[f + 4 >> 2] = 0
          }
          if ((d | 0) == 1) {
            m = b | b & 0;
            d = a | 0 | 0;
            return (C = m, d) | 0
          } else {
            d = $b(d | 0) | 0;
            m = b >>> (d >>> 0) | 0;
            d = b << 32 - d | a >>> (d >>> 0) | 0;
            return (C = m, d) | 0
          }
        } else {
          if (!e) {
            if (f) {
              c[f >> 2] = (b >>> 0) % (d >>> 0);
              c[f + 4 >> 2] = 0
            }
            m = 0;
            d = (b >>> 0) / (d >>> 0) >>> 0;
            return (C = m, d) | 0
          }
          if (!a) {
            if (f) {
              c[f >> 2] = 0;
              c[f + 4 >> 2] = (b >>> 0) % (e >>> 0)
            }
            m = 0;
            d = (b >>> 0) / (e >>> 0) >>> 0;
            return (C = m, d) | 0
          }
          if (!(e - 1 & e)) {
            if (f) {
              c[f >> 2] = a | 0;
              c[f + 4 >> 2] = e - 1 & b | b & 0
            }
            m = 0;
            d = b >>> (($b(e | 0) | 0) >>> 0);
            return (C = m, d) | 0
          }
          h = (aa(e | 0) | 0) - (aa(b | 0) | 0) | 0;
          if (h >>> 0 <= 30) {
            j = h + 1 | 0;
            i = b << 31 - h | a >>> ((h + 1 | 0) >>> 0);
            m = b >>> ((h + 1 | 0) >>> 0);
            g = 0;
            h = a << 31 - h;
            break
          }
          if (!f) {
            m = 0;
            d = 0;
            return (C = m, d) | 0
          }
          c[f >> 2] = a | 0;
          c[f + 4 >> 2] = b | b & 0;
          m = 0;
          d = 0;
          return (C = m, d) | 0
        }
      while (0);
      if (!j) {
        j = h;
        b = m;
        h = 0;
        a = 0
      } else {
        k = Qb(d | 0 | 0, e | e & 0 | 0, -1, -1) | 0;
        l = C;
        b = m;
        a = 0;
        do {
          p = h;
          h = g >>> 31 | h << 1;
          g = a | g << 1;
          p = i << 1 | p >>> 31 | 0;
          o = i >>> 31 | b << 1 | 0;
          Xb(k, l, p, o) | 0;
          m = C;
          n = m >> 31 | ((m | 0) < 0 ? -1 : 0) << 1;
          a = n & 1;
          i = Xb(p, o, n & (d | 0), (((m | 0) < 0 ? -1 : 0) >> 31 | ((m | 0) < 0 ? -1 : 0) << 1) & (e | e & 0)) | 0;
          b = C;
          j = j - 1 | 0
        } while ((j | 0) != 0);
        j = h;
        h = 0
      }
      if (f) {
        c[f >> 2] = i;
        c[f + 4 >> 2] = b
      }
      m = (g | 0) >>> 31 | j << 1 | (0 << 1 | g >>> 31) & 0 | h;
      d = (g << 1 | 0 >>> 31) & -2 | a;
      return (C = m, d) | 0
    }

    function hc(a, b) {
      a = a | 0;
      b = b | 0;
      return Pa[a & 3](b | 0) | 0
    }

    function ic(a, b, c, d) {
      a = a | 0;
      b = b | 0;
      c = c | 0;
      d = d | 0;
      return Qa[a & 1](b | 0, c | 0, d | 0) | 0
    }

    function jc(a, b, c, d, e) {
      a = a | 0;
      b = b | 0;
      c = c | 0;
      d = d | 0;
      e = e | 0;
      return Ra[a & 1](b | 0, c | 0, d | 0, e | 0) | 0
    }

    function kc(a, b, c, d) {
      a = a | 0;
      b = b | 0;
      c = c | 0;
      d = d | 0;
      Sa[a & 7](b | 0, c | 0, d | 0)
    }

    function lc(a) {
      a = a | 0;
      da(0);
      return 0
    }

    function mc(a, b, c) {
      a = a | 0;
      b = b | 0;
      c = c | 0;
      ea(1);
      return 0
    }

    function nc(a, b, c, d) {
      a = a | 0;
      b = b | 0;
      c = c | 0;
      d = d | 0;
      fa(2);
      return 0
    }

    function oc(a, b, c) {
      a = a | 0;
      b = b | 0;
      c = c | 0;
      ga(3)
    }

    // EMSCRIPTEN_END_FUNCS
    var Pa = [lc, ib, jb, lc];
    var Qa = [mc, hb];
    var Ra = [nc, gb];
    var Sa = [oc, kb, lb, mb, ob, nb, oc, oc];
    return {
      _strlen: Rb,
      _strcat: Sb,
      _mid_istream_open_mem: eb,
      _mid_song_read_wave: sb,
      _mid_exit: Ib,
      _strncpy: Ub,
      _mid_song_load_with_options: $a,
      _memset: Pb,
      _memcpy: Tb,
      _llvm_bswap_i32: Wb,
      _mid_song_get_missing_instrument: bb,
      _mid_song_get_total_time: rb,
      _mid_istream_close: fb,
      _i64Add: Qb,
      _mid_song_free: Hb,
      _mid_init: Gb,
      _mid_song_start: pb,
      _free_instruments: Bb,
      _mid_song_get_num_missing_instruments: ab,
      _free: Nb,
      _mid_song_seek: qb,
      _malloc: Mb,
      _strcpy: Vb,
      runPostSets: Ob,
      stackAlloc: Ta,
      stackSave: Ua,
      stackRestore: Va,
      setThrew: Wa,
      setTempRet0: Za,
      getTempRet0: _a,
      dynCall_ii: hc,
      dynCall_iiii: ic,
      dynCall_iiiii: jc,
      dynCall_viii: kc
    }
  })


  // EMSCRIPTEN_END_ASM
  (Module.asmGlobalArg, Module.asmLibraryArg, buffer);
  var real__strlen = asm["_strlen"];
  asm["_strlen"] = (function () {
    assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
    assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
    return real__strlen.apply(null, arguments)
  });
  var real__strcat = asm["_strcat"];
  asm["_strcat"] = (function () {
    assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
    assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
    return real__strcat.apply(null, arguments)
  });
  var real__mid_song_read_wave = asm["_mid_song_read_wave"];
  asm["_mid_song_read_wave"] = (function () {
    assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
    assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
    return real__mid_song_read_wave.apply(null, arguments)
  });
  var real__mid_exit = asm["_mid_exit"];
  asm["_mid_exit"] = (function () {
    assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
    assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
    return real__mid_exit.apply(null, arguments)
  });
  var real__strncpy = asm["_strncpy"];
  asm["_strncpy"] = (function () {
    assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
    assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
    return real__strncpy.apply(null, arguments)
  });
  var real__mid_song_load_with_options = asm["_mid_song_load_with_options"];
  asm["_mid_song_load_with_options"] = (function () {
    assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
    assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
    return real__mid_song_load_with_options.apply(null, arguments)
  });
  var real__mid_istream_open_mem = asm["_mid_istream_open_mem"];
  asm["_mid_istream_open_mem"] = (function () {
    assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
    assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
    return real__mid_istream_open_mem.apply(null, arguments)
  });
  var real__llvm_bswap_i32 = asm["_llvm_bswap_i32"];
  asm["_llvm_bswap_i32"] = (function () {
    assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
    assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
    return real__llvm_bswap_i32.apply(null, arguments)
  });
  var real__mid_song_get_missing_instrument = asm["_mid_song_get_missing_instrument"];
  asm["_mid_song_get_missing_instrument"] = (function () {
    assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
    assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
    return real__mid_song_get_missing_instrument.apply(null, arguments)
  });
  var real__mid_song_get_total_time = asm["_mid_song_get_total_time"];
  asm["_mid_song_get_total_time"] = (function () {
    assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
    assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
    return real__mid_song_get_total_time.apply(null, arguments)
  });
  var real__mid_istream_close = asm["_mid_istream_close"];
  asm["_mid_istream_close"] = (function () {
    assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
    assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
    return real__mid_istream_close.apply(null, arguments)
  });
  var real__i64Add = asm["_i64Add"];
  asm["_i64Add"] = (function () {
    assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
    assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
    return real__i64Add.apply(null, arguments)
  });
  var real__mid_song_free = asm["_mid_song_free"];
  asm["_mid_song_free"] = (function () {
    assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
    assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
    return real__mid_song_free.apply(null, arguments)
  });
  var real__mid_init = asm["_mid_init"];
  asm["_mid_init"] = (function () {
    assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
    assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
    return real__mid_init.apply(null, arguments)
  });
  var real__mid_song_start = asm["_mid_song_start"];
  asm["_mid_song_start"] = (function () {
    assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
    assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
    return real__mid_song_start.apply(null, arguments)
  });
  var real__free_instruments = asm["_free_instruments"];
  asm["_free_instruments"] = (function () {
    assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
    assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
    return real__free_instruments.apply(null, arguments)
  });
  var real__mid_song_get_num_missing_instruments = asm["_mid_song_get_num_missing_instruments"];
  asm["_mid_song_get_num_missing_instruments"] = (function () {
    assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
    assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
    return real__mid_song_get_num_missing_instruments.apply(null, arguments)
  });
  var real__mid_song_seek = asm["_mid_song_seek"];
  asm["_mid_song_seek"] = (function () {
    assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
    assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
    return real__mid_song_seek.apply(null, arguments)
  });
  var real__strcpy = asm["_strcpy"];
  asm["_strcpy"] = (function () {
    assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
    assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
    return real__strcpy.apply(null, arguments)
  });
  var _strlen = Module["_strlen"] = asm["_strlen"];
  var _strcat = Module["_strcat"] = asm["_strcat"];
  var _memset = Module["_memset"] = asm["_memset"];
  var _mid_song_read_wave = Module["_mid_song_read_wave"] = asm["_mid_song_read_wave"];
  var _mid_exit = Module["_mid_exit"] = asm["_mid_exit"];
  var _strncpy = Module["_strncpy"] = asm["_strncpy"];
  var _mid_song_load_with_options = Module["_mid_song_load_with_options"] = asm["_mid_song_load_with_options"];
  var _mid_istream_open_mem = Module["_mid_istream_open_mem"] = asm["_mid_istream_open_mem"];
  var _memcpy = Module["_memcpy"] = asm["_memcpy"];
  var _llvm_bswap_i32 = Module["_llvm_bswap_i32"] = asm["_llvm_bswap_i32"];
  var _mid_song_get_missing_instrument = Module["_mid_song_get_missing_instrument"] = asm["_mid_song_get_missing_instrument"];
  var _mid_song_get_total_time = Module["_mid_song_get_total_time"] = asm["_mid_song_get_total_time"];
  var _mid_istream_close = Module["_mid_istream_close"] = asm["_mid_istream_close"];
  var _i64Add = Module["_i64Add"] = asm["_i64Add"];
  var _mid_song_free = Module["_mid_song_free"] = asm["_mid_song_free"];
  var _mid_init = Module["_mid_init"] = asm["_mid_init"];
  var _mid_song_start = Module["_mid_song_start"] = asm["_mid_song_start"];
  var _free_instruments = Module["_free_instruments"] = asm["_free_instruments"];
  var _mid_song_get_num_missing_instruments = Module["_mid_song_get_num_missing_instruments"] = asm["_mid_song_get_num_missing_instruments"];
  var _free = Module["_free"] = asm["_free"];
  var runPostSets = Module["runPostSets"] = asm["runPostSets"];
  var _mid_song_seek = Module["_mid_song_seek"] = asm["_mid_song_seek"];
  var _malloc = Module["_malloc"] = asm["_malloc"];
  var _strcpy = Module["_strcpy"] = asm["_strcpy"];
  var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
  var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
  var dynCall_iiiii = Module["dynCall_iiiii"] = asm["dynCall_iiiii"];
  var dynCall_viii = Module["dynCall_viii"] = asm["dynCall_viii"];
  Runtime.stackAlloc = asm["stackAlloc"];
  Runtime.stackSave = asm["stackSave"];
  Runtime.stackRestore = asm["stackRestore"];
  Runtime.setTempRet0 = asm["setTempRet0"];
  Runtime.getTempRet0 = asm["getTempRet0"];
  var i64Math = (function () {
    var goog = {
      math: {}
    };
    goog.math.Long = (function (low, high) {
      this.low_ = low | 0;
      this.high_ = high | 0
    });
    goog.math.Long.IntCache_ = {};
    goog.math.Long.fromInt = (function (value) {
      if (-128 <= value && value < 128) {
        var cachedObj = goog.math.Long.IntCache_[value];
        if (cachedObj) {
          return cachedObj
        }
      }
      var obj = new goog.math.Long(value | 0, value < 0 ? -1 : 0);
      if (-128 <= value && value < 128) {
        goog.math.Long.IntCache_[value] = obj
      }
      return obj
    });
    goog.math.Long.fromNumber = (function (value) {
      if (isNaN(value) || !isFinite(value)) {
        return goog.math.Long.ZERO
      } else if (value <= -goog.math.Long.TWO_PWR_63_DBL_) {
        return goog.math.Long.MIN_VALUE
      } else if (value + 1 >= goog.math.Long.TWO_PWR_63_DBL_) {
        return goog.math.Long.MAX_VALUE
      } else if (value < 0) {
        return goog.math.Long.fromNumber(-value).negate()
      } else {
        return new goog.math.Long(value % goog.math.Long.TWO_PWR_32_DBL_ | 0, value / goog.math.Long.TWO_PWR_32_DBL_ | 0)
      }
    });
    goog.math.Long.fromBits = (function (lowBits, highBits) {
      return new goog.math.Long(lowBits, highBits)
    });
    goog.math.Long.fromString = (function (str, opt_radix) {
      if (str.length == 0) {
        throw Error("number format error: empty string")
      }
      var radix = opt_radix || 10;
      if (radix < 2 || 36 < radix) {
        throw Error("radix out of range: " + radix)
      }
      if (str.charAt(0) == "-") {
        return goog.math.Long.fromString(str.substring(1), radix).negate()
      } else if (str.indexOf("-") >= 0) {
        throw Error('number format error: interior "-" character: ' + str)
      }
      var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 8));
      var result = goog.math.Long.ZERO;
      for (var i = 0; i < str.length; i += 8) {
        var size = Math.min(8, str.length - i);
        var value = parseInt(str.substring(i, i + size), radix);
        if (size < 8) {
          var power = goog.math.Long.fromNumber(Math.pow(radix, size));
          result = result.multiply(power).add(goog.math.Long.fromNumber(value))
        } else {
          result = result.multiply(radixToPower);
          result = result.add(goog.math.Long.fromNumber(value))
        }
      }
      return result
    });
    goog.math.Long.TWO_PWR_16_DBL_ = 1 << 16;
    goog.math.Long.TWO_PWR_24_DBL_ = 1 << 24;
    goog.math.Long.TWO_PWR_32_DBL_ = goog.math.Long.TWO_PWR_16_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;
    goog.math.Long.TWO_PWR_31_DBL_ = goog.math.Long.TWO_PWR_32_DBL_ / 2;
    goog.math.Long.TWO_PWR_48_DBL_ = goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;
    goog.math.Long.TWO_PWR_64_DBL_ = goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_32_DBL_;
    goog.math.Long.TWO_PWR_63_DBL_ = goog.math.Long.TWO_PWR_64_DBL_ / 2;
    goog.math.Long.ZERO = goog.math.Long.fromInt(0);
    goog.math.Long.ONE = goog.math.Long.fromInt(1);
    goog.math.Long.NEG_ONE = goog.math.Long.fromInt(-1);
    goog.math.Long.MAX_VALUE = goog.math.Long.fromBits(4294967295 | 0, 2147483647 | 0);
    goog.math.Long.MIN_VALUE = goog.math.Long.fromBits(0, 2147483648 | 0);
    goog.math.Long.TWO_PWR_24_ = goog.math.Long.fromInt(1 << 24);
    goog.math.Long.prototype.toInt = (function () {
      return this.low_
    });
    goog.math.Long.prototype.toNumber = (function () {
      return this.high_ * goog.math.Long.TWO_PWR_32_DBL_ + this.getLowBitsUnsigned()
    });
    goog.math.Long.prototype.toString = (function (opt_radix) {
      var radix = opt_radix || 10;
      if (radix < 2 || 36 < radix) {
        throw Error("radix out of range: " + radix)
      }
      if (this.isZero()) {
        return "0"
      }
      if (this.isNegative()) {
        if (this.equals(goog.math.Long.MIN_VALUE)) {
          var radixLong = goog.math.Long.fromNumber(radix);
          var div = this.div(radixLong);
          var rem = div.multiply(radixLong).subtract(this);
          return div.toString(radix) + rem.toInt().toString(radix)
        } else {
          return "-" + this.negate().toString(radix)
        }
      }
      var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 6));
      var rem = this;
      var result = "";
      while (true) {
        var remDiv = rem.div(radixToPower);
        var intval = rem.subtract(remDiv.multiply(radixToPower)).toInt();
        var digits = intval.toString(radix);
        rem = remDiv;
        if (rem.isZero()) {
          return digits + result
        } else {
          while (digits.length < 6) {
            digits = "0" + digits
          }
          result = "" + digits + result
        }
      }
    });
    goog.math.Long.prototype.getHighBits = (function () {
      return this.high_
    });
    goog.math.Long.prototype.getLowBits = (function () {
      return this.low_
    });
    goog.math.Long.prototype.getLowBitsUnsigned = (function () {
      return this.low_ >= 0 ? this.low_ : goog.math.Long.TWO_PWR_32_DBL_ + this.low_
    });
    goog.math.Long.prototype.getNumBitsAbs = (function () {
      if (this.isNegative()) {
        if (this.equals(goog.math.Long.MIN_VALUE)) {
          return 64
        } else {
          return this.negate().getNumBitsAbs()
        }
      } else {
        var val = this.high_ != 0 ? this.high_ : this.low_;
        for (var bit = 31; bit > 0; bit--) {
          if ((val & 1 << bit) != 0) {
            break
          }
        }
        return this.high_ != 0 ? bit + 33 : bit + 1
      }
    });
    goog.math.Long.prototype.isZero = (function () {
      return this.high_ == 0 && this.low_ == 0
    });
    goog.math.Long.prototype.isNegative = (function () {
      return this.high_ < 0
    });
    goog.math.Long.prototype.isOdd = (function () {
      return (this.low_ & 1) == 1
    });
    goog.math.Long.prototype.equals = (function (other) {
      return this.high_ == other.high_ && this.low_ == other.low_
    });
    goog.math.Long.prototype.notEquals = (function (other) {
      return this.high_ != other.high_ || this.low_ != other.low_
    });
    goog.math.Long.prototype.lessThan = (function (other) {
      return this.compare(other) < 0
    });
    goog.math.Long.prototype.lessThanOrEqual = (function (other) {
      return this.compare(other) <= 0
    });
    goog.math.Long.prototype.greaterThan = (function (other) {
      return this.compare(other) > 0
    });
    goog.math.Long.prototype.greaterThanOrEqual = (function (other) {
      return this.compare(other) >= 0
    });
    goog.math.Long.prototype.compare = (function (other) {
      if (this.equals(other)) {
        return 0
      }
      var thisNeg = this.isNegative();
      var otherNeg = other.isNegative();
      if (thisNeg && !otherNeg) {
        return -1
      }
      if (!thisNeg && otherNeg) {
        return 1
      }
      if (this.subtract(other).isNegative()) {
        return -1
      } else {
        return 1
      }
    });
    goog.math.Long.prototype.negate = (function () {
      if (this.equals(goog.math.Long.MIN_VALUE)) {
        return goog.math.Long.MIN_VALUE
      } else {
        return this.not().add(goog.math.Long.ONE)
      }
    });
    goog.math.Long.prototype.add = (function (other) {
      var a48 = this.high_ >>> 16;
      var a32 = this.high_ & 65535;
      var a16 = this.low_ >>> 16;
      var a00 = this.low_ & 65535;
      var b48 = other.high_ >>> 16;
      var b32 = other.high_ & 65535;
      var b16 = other.low_ >>> 16;
      var b00 = other.low_ & 65535;
      var c48 = 0,
        c32 = 0,
        c16 = 0,
        c00 = 0;
      c00 += a00 + b00;
      c16 += c00 >>> 16;
      c00 &= 65535;
      c16 += a16 + b16;
      c32 += c16 >>> 16;
      c16 &= 65535;
      c32 += a32 + b32;
      c48 += c32 >>> 16;
      c32 &= 65535;
      c48 += a48 + b48;
      c48 &= 65535;
      return goog.math.Long.fromBits(c16 << 16 | c00, c48 << 16 | c32)
    });
    goog.math.Long.prototype.subtract = (function (other) {
      return this.add(other.negate())
    });
    goog.math.Long.prototype.multiply = (function (other) {
      if (this.isZero()) {
        return goog.math.Long.ZERO
      } else if (other.isZero()) {
        return goog.math.Long.ZERO
      }
      if (this.equals(goog.math.Long.MIN_VALUE)) {
        return other.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO
      } else if (other.equals(goog.math.Long.MIN_VALUE)) {
        return this.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO
      }
      if (this.isNegative()) {
        if (other.isNegative()) {
          return this.negate().multiply(other.negate())
        } else {
          return this.negate().multiply(other).negate()
        }
      } else if (other.isNegative()) {
        return this.multiply(other.negate()).negate()
      }
      if (this.lessThan(goog.math.Long.TWO_PWR_24_) && other.lessThan(goog.math.Long.TWO_PWR_24_)) {
        return goog.math.Long.fromNumber(this.toNumber() * other.toNumber())
      }
      var a48 = this.high_ >>> 16;
      var a32 = this.high_ & 65535;
      var a16 = this.low_ >>> 16;
      var a00 = this.low_ & 65535;
      var b48 = other.high_ >>> 16;
      var b32 = other.high_ & 65535;
      var b16 = other.low_ >>> 16;
      var b00 = other.low_ & 65535;
      var c48 = 0,
        c32 = 0,
        c16 = 0,
        c00 = 0;
      c00 += a00 * b00;
      c16 += c00 >>> 16;
      c00 &= 65535;
      c16 += a16 * b00;
      c32 += c16 >>> 16;
      c16 &= 65535;
      c16 += a00 * b16;
      c32 += c16 >>> 16;
      c16 &= 65535;
      c32 += a32 * b00;
      c48 += c32 >>> 16;
      c32 &= 65535;
      c32 += a16 * b16;
      c48 += c32 >>> 16;
      c32 &= 65535;
      c32 += a00 * b32;
      c48 += c32 >>> 16;
      c32 &= 65535;
      c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
      c48 &= 65535;
      return goog.math.Long.fromBits(c16 << 16 | c00, c48 << 16 | c32)
    });
    goog.math.Long.prototype.div = (function (other) {
      if (other.isZero()) {
        throw Error("division by zero")
      } else if (this.isZero()) {
        return goog.math.Long.ZERO
      }
      if (this.equals(goog.math.Long.MIN_VALUE)) {
        if (other.equals(goog.math.Long.ONE) || other.equals(goog.math.Long.NEG_ONE)) {
          return goog.math.Long.MIN_VALUE
        } else if (other.equals(goog.math.Long.MIN_VALUE)) {
          return goog.math.Long.ONE
        } else {
          var halfThis = this.shiftRight(1);
          var approx = halfThis.div(other).shiftLeft(1);
          if (approx.equals(goog.math.Long.ZERO)) {
            return other.isNegative() ? goog.math.Long.ONE : goog.math.Long.NEG_ONE
          } else {
            var rem = this.subtract(other.multiply(approx));
            var result = approx.add(rem.div(other));
            return result
          }
        }
      } else if (other.equals(goog.math.Long.MIN_VALUE)) {
        return goog.math.Long.ZERO
      }
      if (this.isNegative()) {
        if (other.isNegative()) {
          return this.negate().div(other.negate())
        } else {
          return this.negate().div(other).negate()
        }
      } else if (other.isNegative()) {
        return this.div(other.negate()).negate()
      }
      var res = goog.math.Long.ZERO;
      var rem = this;
      while (rem.greaterThanOrEqual(other)) {
        var approx = Math.max(1, Math.floor(rem.toNumber() / other.toNumber()));
        var log2 = Math.ceil(Math.log(approx) / Math.LN2);
        var delta = log2 <= 48 ? 1 : Math.pow(2, log2 - 48);
        var approxRes = goog.math.Long.fromNumber(approx);
        var approxRem = approxRes.multiply(other);
        while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
          approx -= delta;
          approxRes = goog.math.Long.fromNumber(approx);
          approxRem = approxRes.multiply(other)
        }
        if (approxRes.isZero()) {
          approxRes = goog.math.Long.ONE
        }
        res = res.add(approxRes);
        rem = rem.subtract(approxRem)
      }
      return res
    });
    goog.math.Long.prototype.modulo = (function (other) {
      return this.subtract(this.div(other).multiply(other))
    });
    goog.math.Long.prototype.not = (function () {
      return goog.math.Long.fromBits(~this.low_, ~this.high_)
    });
    goog.math.Long.prototype.and = (function (other) {
      return goog.math.Long.fromBits(this.low_ & other.low_, this.high_ & other.high_)
    });
    goog.math.Long.prototype.or = (function (other) {
      return goog.math.Long.fromBits(this.low_ | other.low_, this.high_ | other.high_)
    });
    goog.math.Long.prototype.xor = (function (other) {
      return goog.math.Long.fromBits(this.low_ ^ other.low_, this.high_ ^ other.high_)
    });
    goog.math.Long.prototype.shiftLeft = (function (numBits) {
      numBits &= 63;
      if (numBits == 0) {
        return this
      } else {
        var low = this.low_;
        if (numBits < 32) {
          var high = this.high_;
          return goog.math.Long.fromBits(low << numBits, high << numBits | low >>> 32 - numBits)
        } else {
          return goog.math.Long.fromBits(0, low << numBits - 32)
        }
      }
    });
    goog.math.Long.prototype.shiftRight = (function (numBits) {
      numBits &= 63;
      if (numBits == 0) {
        return this
      } else {
        var high = this.high_;
        if (numBits < 32) {
          var low = this.low_;
          return goog.math.Long.fromBits(low >>> numBits | high << 32 - numBits, high >> numBits)
        } else {
          return goog.math.Long.fromBits(high >> numBits - 32, high >= 0 ? 0 : -1)
        }
      }
    });
    goog.math.Long.prototype.shiftRightUnsigned = (function (numBits) {
      numBits &= 63;
      if (numBits == 0) {
        return this
      } else {
        var high = this.high_;
        if (numBits < 32) {
          var low = this.low_;
          return goog.math.Long.fromBits(low >>> numBits | high << 32 - numBits, high >>> numBits)
        } else if (numBits == 32) {
          return goog.math.Long.fromBits(high, 0)
        } else {
          return goog.math.Long.fromBits(high >>> numBits - 32, 0)
        }
      }
    });
    var navigator = {
      appName: "Modern Browser"
    };
    var dbits;
    var canary = 0xdeadbeefcafe;
    var j_lm = (canary & 16777215) == 15715070;

    function BigInteger(a, b, c) {
      if (a != null)
        if ("number" == typeof a) this.fromNumber(a, b, c);
        else if (b == null && "string" != typeof a) this.fromString(a, 256);
      else this.fromString(a, b)
    }

    function nbi() {
      return new BigInteger(null)
    }

    function am1(i, x, w, j, c, n) {
      while (--n >= 0) {
        var v = x * this[i++] + w[j] + c;
        c = Math.floor(v / 67108864);
        w[j++] = v & 67108863
      }
      return c
    }

    function am2(i, x, w, j, c, n) {
      var xl = x & 32767,
        xh = x >> 15;
      while (--n >= 0) {
        var l = this[i] & 32767;
        var h = this[i++] >> 15;
        var m = xh * l + h * xl;
        l = xl * l + ((m & 32767) << 15) + w[j] + (c & 1073741823);
        c = (l >>> 30) + (m >>> 15) + xh * h + (c >>> 30);
        w[j++] = l & 1073741823
      }
      return c
    }

    function am3(i, x, w, j, c, n) {
      var xl = x & 16383,
        xh = x >> 14;
      while (--n >= 0) {
        var l = this[i] & 16383;
        var h = this[i++] >> 14;
        var m = xh * l + h * xl;
        l = xl * l + ((m & 16383) << 14) + w[j] + c;
        c = (l >> 28) + (m >> 14) + xh * h;
        w[j++] = l & 268435455
      }
      return c
    }
    if (j_lm && navigator.appName == "Microsoft Internet Explorer") {
      BigInteger.prototype.am = am2;
      dbits = 30
    } else if (j_lm && navigator.appName != "Netscape") {
      BigInteger.prototype.am = am1;
      dbits = 26
    } else {
      BigInteger.prototype.am = am3;
      dbits = 28
    }
    BigInteger.prototype.DB = dbits;
    BigInteger.prototype.DM = (1 << dbits) - 1;
    BigInteger.prototype.DV = 1 << dbits;
    var BI_FP = 52;
    BigInteger.prototype.FV = Math.pow(2, BI_FP);
    BigInteger.prototype.F1 = BI_FP - dbits;
    BigInteger.prototype.F2 = 2 * dbits - BI_FP;
    var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
    var BI_RC = new Array;
    var rr, vv;
    rr = "0".charCodeAt(0);
    for (vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
    rr = "a".charCodeAt(0);
    for (vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
    rr = "A".charCodeAt(0);
    for (vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;

    function int2char(n) {
      return BI_RM.charAt(n)
    }

    function intAt(s, i) {
      var c = BI_RC[s.charCodeAt(i)];
      return c == null ? -1 : c
    }

    function bnpCopyTo(r) {
      for (var i = this.t - 1; i >= 0; --i) r[i] = this[i];
      r.t = this.t;
      r.s = this.s
    }

    function bnpFromInt(x) {
      this.t = 1;
      this.s = x < 0 ? -1 : 0;
      if (x > 0) this[0] = x;
      else if (x < -1) this[0] = x + DV;
      else this.t = 0
    }

    function nbv(i) {
      var r = nbi();
      r.fromInt(i);
      return r
    }

    function bnpFromString(s, b) {
      var k;
      if (b == 16) k = 4;
      else if (b == 8) k = 3;
      else if (b == 256) k = 8;
      else if (b == 2) k = 1;
      else if (b == 32) k = 5;
      else if (b == 4) k = 2;
      else {
        this.fromRadix(s, b);
        return
      }
      this.t = 0;
      this.s = 0;
      var i = s.length,
        mi = false,
        sh = 0;
      while (--i >= 0) {
        var x = k == 8 ? s[i] & 255 : intAt(s, i);
        if (x < 0) {
          if (s.charAt(i) == "-") mi = true;
          continue
        }
        mi = false;
        if (sh == 0) this[this.t++] = x;
        else if (sh + k > this.DB) {
          this[this.t - 1] |= (x & (1 << this.DB - sh) - 1) << sh;
          this[this.t++] = x >> this.DB - sh
        } else this[this.t - 1] |= x << sh;
        sh += k;
        if (sh >= this.DB) sh -= this.DB
      }
      if (k == 8 && (s[0] & 128) != 0) {
        this.s = -1;
        if (sh > 0) this[this.t - 1] |= (1 << this.DB - sh) - 1 << sh
      }
      this.clamp();
      if (mi) BigInteger.ZERO.subTo(this, this)
    }

    function bnpClamp() {
      var c = this.s & this.DM;
      while (this.t > 0 && this[this.t - 1] == c) --this.t
    }

    function bnToString(b) {
      if (this.s < 0) return "-" + this.negate().toString(b);
      var k;
      if (b == 16) k = 4;
      else if (b == 8) k = 3;
      else if (b == 2) k = 1;
      else if (b == 32) k = 5;
      else if (b == 4) k = 2;
      else return this.toRadix(b);
      var km = (1 << k) - 1,
        d, m = false,
        r = "",
        i = this.t;
      var p = this.DB - i * this.DB % k;
      if (i-- > 0) {
        if (p < this.DB && (d = this[i] >> p) > 0) {
          m = true;
          r = int2char(d)
        }
        while (i >= 0) {
          if (p < k) {
            d = (this[i] & (1 << p) - 1) << k - p;
            d |= this[--i] >> (p += this.DB - k)
          } else {
            d = this[i] >> (p -= k) & km;
            if (p <= 0) {
              p += this.DB;
              --i
            }
          }
          if (d > 0) m = true;
          if (m) r += int2char(d)
        }
      }
      return m ? r : "0"
    }

    function bnNegate() {
      var r = nbi();
      BigInteger.ZERO.subTo(this, r);
      return r
    }

    function bnAbs() {
      return this.s < 0 ? this.negate() : this
    }

    function bnCompareTo(a) {
      var r = this.s - a.s;
      if (r != 0) return r;
      var i = this.t;
      r = i - a.t;
      if (r != 0) return this.s < 0 ? -r : r;
      while (--i >= 0)
        if ((r = this[i] - a[i]) != 0) return r;
      return 0
    }

    function nbits(x) {
      var r = 1,
        t;
      if ((t = x >>> 16) != 0) {
        x = t;
        r += 16
      }
      if ((t = x >> 8) != 0) {
        x = t;
        r += 8
      }
      if ((t = x >> 4) != 0) {
        x = t;
        r += 4
      }
      if ((t = x >> 2) != 0) {
        x = t;
        r += 2
      }
      if ((t = x >> 1) != 0) {
        x = t;
        r += 1
      }
      return r
    }

    function bnBitLength() {
      if (this.t <= 0) return 0;
      return this.DB * (this.t - 1) + nbits(this[this.t - 1] ^ this.s & this.DM)
    }

    function bnpDLShiftTo(n, r) {
      var i;
      for (i = this.t - 1; i >= 0; --i) r[i + n] = this[i];
      for (i = n - 1; i >= 0; --i) r[i] = 0;
      r.t = this.t + n;
      r.s = this.s
    }

    function bnpDRShiftTo(n, r) {
      for (var i = n; i < this.t; ++i) r[i - n] = this[i];
      r.t = Math.max(this.t - n, 0);
      r.s = this.s
    }

    function bnpLShiftTo(n, r) {
      var bs = n % this.DB;
      var cbs = this.DB - bs;
      var bm = (1 << cbs) - 1;
      var ds = Math.floor(n / this.DB),
        c = this.s << bs & this.DM,
        i;
      for (i = this.t - 1; i >= 0; --i) {
        r[i + ds + 1] = this[i] >> cbs | c;
        c = (this[i] & bm) << bs
      }
      for (i = ds - 1; i >= 0; --i) r[i] = 0;
      r[ds] = c;
      r.t = this.t + ds + 1;
      r.s = this.s;
      r.clamp()
    }

    function bnpRShiftTo(n, r) {
      r.s = this.s;
      var ds = Math.floor(n / this.DB);
      if (ds >= this.t) {
        r.t = 0;
        return
      }
      var bs = n % this.DB;
      var cbs = this.DB - bs;
      var bm = (1 << bs) - 1;
      r[0] = this[ds] >> bs;
      for (var i = ds + 1; i < this.t; ++i) {
        r[i - ds - 1] |= (this[i] & bm) << cbs;
        r[i - ds] = this[i] >> bs
      }
      if (bs > 0) r[this.t - ds - 1] |= (this.s & bm) << cbs;
      r.t = this.t - ds;
      r.clamp()
    }

    function bnpSubTo(a, r) {
      var i = 0,
        c = 0,
        m = Math.min(a.t, this.t);
      while (i < m) {
        c += this[i] - a[i];
        r[i++] = c & this.DM;
        c >>= this.DB
      }
      if (a.t < this.t) {
        c -= a.s;
        while (i < this.t) {
          c += this[i];
          r[i++] = c & this.DM;
          c >>= this.DB
        }
        c += this.s
      } else {
        c += this.s;
        while (i < a.t) {
          c -= a[i];
          r[i++] = c & this.DM;
          c >>= this.DB
        }
        c -= a.s
      }
      r.s = c < 0 ? -1 : 0;
      if (c < -1) r[i++] = this.DV + c;
      else if (c > 0) r[i++] = c;
      r.t = i;
      r.clamp()
    }

    function bnpMultiplyTo(a, r) {
      var x = this.abs(),
        y = a.abs();
      var i = x.t;
      r.t = i + y.t;
      while (--i >= 0) r[i] = 0;
      for (i = 0; i < y.t; ++i) r[i + x.t] = x.am(0, y[i], r, i, 0, x.t);
      r.s = 0;
      r.clamp();
      if (this.s != a.s) BigInteger.ZERO.subTo(r, r)
    }

    function bnpSquareTo(r) {
      var x = this.abs();
      var i = r.t = 2 * x.t;
      while (--i >= 0) r[i] = 0;
      for (i = 0; i < x.t - 1; ++i) {
        var c = x.am(i, x[i], r, 2 * i, 0, 1);
        if ((r[i + x.t] += x.am(i + 1, 2 * x[i], r, 2 * i + 1, c, x.t - i - 1)) >= x.DV) {
          r[i + x.t] -= x.DV;
          r[i + x.t + 1] = 1
        }
      }
      if (r.t > 0) r[r.t - 1] += x.am(i, x[i], r, 2 * i, 0, 1);
      r.s = 0;
      r.clamp()
    }

    function bnpDivRemTo(m, q, r) {
      var pm = m.abs();
      if (pm.t <= 0) return;
      var pt = this.abs();
      if (pt.t < pm.t) {
        if (q != null) q.fromInt(0);
        if (r != null) this.copyTo(r);
        return
      }
      if (r == null) r = nbi();
      var y = nbi(),
        ts = this.s,
        ms = m.s;
      var nsh = this.DB - nbits(pm[pm.t - 1]);
      if (nsh > 0) {
        pm.lShiftTo(nsh, y);
        pt.lShiftTo(nsh, r)
      } else {
        pm.copyTo(y);
        pt.copyTo(r)
      }
      var ys = y.t;
      var y0 = y[ys - 1];
      if (y0 == 0) return;
      var yt = y0 * (1 << this.F1) + (ys > 1 ? y[ys - 2] >> this.F2 : 0);
      var d1 = this.FV / yt,
        d2 = (1 << this.F1) / yt,
        e = 1 << this.F2;
      var i = r.t,
        j = i - ys,
        t = q == null ? nbi() : q;
      y.dlShiftTo(j, t);
      if (r.compareTo(t) >= 0) {
        r[r.t++] = 1;
        r.subTo(t, r)
      }
      BigInteger.ONE.dlShiftTo(ys, t);
      t.subTo(y, y);
      while (y.t < ys) y[y.t++] = 0;
      while (--j >= 0) {
        var qd = r[--i] == y0 ? this.DM : Math.floor(r[i] * d1 + (r[i - 1] + e) * d2);
        if ((r[i] += y.am(0, qd, r, j, 0, ys)) < qd) {
          y.dlShiftTo(j, t);
          r.subTo(t, r);
          while (r[i] < --qd) r.subTo(t, r)
        }
      }
      if (q != null) {
        r.drShiftTo(ys, q);
        if (ts != ms) BigInteger.ZERO.subTo(q, q)
      }
      r.t = ys;
      r.clamp();
      if (nsh > 0) r.rShiftTo(nsh, r);
      if (ts < 0) BigInteger.ZERO.subTo(r, r)
    }

    function bnMod(a) {
      var r = nbi();
      this.abs().divRemTo(a, null, r);
      if (this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r, r);
      return r
    }

    function Classic(m) {
      this.m = m
    }

    function cConvert(x) {
      if (x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);
      else return x
    }

    function cRevert(x) {
      return x
    }

    function cReduce(x) {
      x.divRemTo(this.m, null, x)
    }

    function cMulTo(x, y, r) {
      x.multiplyTo(y, r);
      this.reduce(r)
    }

    function cSqrTo(x, r) {
      x.squareTo(r);
      this.reduce(r)
    }
    Classic.prototype.convert = cConvert;
    Classic.prototype.revert = cRevert;
    Classic.prototype.reduce = cReduce;
    Classic.prototype.mulTo = cMulTo;
    Classic.prototype.sqrTo = cSqrTo;

    function bnpInvDigit() {
      if (this.t < 1) return 0;
      var x = this[0];
      if ((x & 1) == 0) return 0;
      var y = x & 3;
      y = y * (2 - (x & 15) * y) & 15;
      y = y * (2 - (x & 255) * y) & 255;
      y = y * (2 - ((x & 65535) * y & 65535)) & 65535;
      y = y * (2 - x * y % this.DV) % this.DV;
      return y > 0 ? this.DV - y : -y
    }

    function Montgomery(m) {
      this.m = m;
      this.mp = m.invDigit();
      this.mpl = this.mp & 32767;
      this.mph = this.mp >> 15;
      this.um = (1 << m.DB - 15) - 1;
      this.mt2 = 2 * m.t
    }

    function montConvert(x) {
      var r = nbi();
      x.abs().dlShiftTo(this.m.t, r);
      r.divRemTo(this.m, null, r);
      if (x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r, r);
      return r
    }

    function montRevert(x) {
      var r = nbi();
      x.copyTo(r);
      this.reduce(r);
      return r
    }

    function montReduce(x) {
      while (x.t <= this.mt2) x[x.t++] = 0;
      for (var i = 0; i < this.m.t; ++i) {
        var j = x[i] & 32767;
        var u0 = j * this.mpl + ((j * this.mph + (x[i] >> 15) * this.mpl & this.um) << 15) & x.DM;
        j = i + this.m.t;
        x[j] += this.m.am(0, u0, x, i, 0, this.m.t);
        while (x[j] >= x.DV) {
          x[j] -= x.DV;
          x[++j]++
        }
      }
      x.clamp();
      x.drShiftTo(this.m.t, x);
      if (x.compareTo(this.m) >= 0) x.subTo(this.m, x)
    }

    function montSqrTo(x, r) {
      x.squareTo(r);
      this.reduce(r)
    }

    function montMulTo(x, y, r) {
      x.multiplyTo(y, r);
      this.reduce(r)
    }
    Montgomery.prototype.convert = montConvert;
    Montgomery.prototype.revert = montRevert;
    Montgomery.prototype.reduce = montReduce;
    Montgomery.prototype.mulTo = montMulTo;
    Montgomery.prototype.sqrTo = montSqrTo;

    function bnpIsEven() {
      return (this.t > 0 ? this[0] & 1 : this.s) == 0
    }

    function bnpExp(e, z) {
      if (e > 4294967295 || e < 1) return BigInteger.ONE;
      var r = nbi(),
        r2 = nbi(),
        g = z.convert(this),
        i = nbits(e) - 1;
      g.copyTo(r);
      while (--i >= 0) {
        z.sqrTo(r, r2);
        if ((e & 1 << i) > 0) z.mulTo(r2, g, r);
        else {
          var t = r;
          r = r2;
          r2 = t
        }
      }
      return z.revert(r)
    }

    function bnModPowInt(e, m) {
      var z;
      if (e < 256 || m.isEven()) z = new Classic(m);
      else z = new Montgomery(m);
      return this.exp(e, z)
    }
    BigInteger.prototype.copyTo = bnpCopyTo;
    BigInteger.prototype.fromInt = bnpFromInt;
    BigInteger.prototype.fromString = bnpFromString;
    BigInteger.prototype.clamp = bnpClamp;
    BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
    BigInteger.prototype.drShiftTo = bnpDRShiftTo;
    BigInteger.prototype.lShiftTo = bnpLShiftTo;
    BigInteger.prototype.rShiftTo = bnpRShiftTo;
    BigInteger.prototype.subTo = bnpSubTo;
    BigInteger.prototype.multiplyTo = bnpMultiplyTo;
    BigInteger.prototype.squareTo = bnpSquareTo;
    BigInteger.prototype.divRemTo = bnpDivRemTo;
    BigInteger.prototype.invDigit = bnpInvDigit;
    BigInteger.prototype.isEven = bnpIsEven;
    BigInteger.prototype.exp = bnpExp;
    BigInteger.prototype.toString = bnToString;
    BigInteger.prototype.negate = bnNegate;
    BigInteger.prototype.abs = bnAbs;
    BigInteger.prototype.compareTo = bnCompareTo;
    BigInteger.prototype.bitLength = bnBitLength;
    BigInteger.prototype.mod = bnMod;
    BigInteger.prototype.modPowInt = bnModPowInt;
    BigInteger.ZERO = nbv(0);
    BigInteger.ONE = nbv(1);

    function bnpFromRadix(s, b) {
      this.fromInt(0);
      if (b == null) b = 10;
      var cs = this.chunkSize(b);
      var d = Math.pow(b, cs),
        mi = false,
        j = 0,
        w = 0;
      for (var i = 0; i < s.length; ++i) {
        var x = intAt(s, i);
        if (x < 0) {
          if (s.charAt(i) == "-" && this.signum() == 0) mi = true;
          continue
        }
        w = b * w + x;
        if (++j >= cs) {
          this.dMultiply(d);
          this.dAddOffset(w, 0);
          j = 0;
          w = 0
        }
      }
      if (j > 0) {
        this.dMultiply(Math.pow(b, j));
        this.dAddOffset(w, 0)
      }
      if (mi) BigInteger.ZERO.subTo(this, this)
    }

    function bnpChunkSize(r) {
      return Math.floor(Math.LN2 * this.DB / Math.log(r))
    }

    function bnSigNum() {
      if (this.s < 0) return -1;
      else if (this.t <= 0 || this.t == 1 && this[0] <= 0) return 0;
      else return 1
    }

    function bnpDMultiply(n) {
      this[this.t] = this.am(0, n - 1, this, 0, 0, this.t);
      ++this.t;
      this.clamp()
    }

    function bnpDAddOffset(n, w) {
      if (n == 0) return;
      while (this.t <= w) this[this.t++] = 0;
      this[w] += n;
      while (this[w] >= this.DV) {
        this[w] -= this.DV;
        if (++w >= this.t) this[this.t++] = 0;
        ++this[w]
      }
    }

    function bnpToRadix(b) {
      if (b == null) b = 10;
      if (this.signum() == 0 || b < 2 || b > 36) return "0";
      var cs = this.chunkSize(b);
      var a = Math.pow(b, cs);
      var d = nbv(a),
        y = nbi(),
        z = nbi(),
        r = "";
      this.divRemTo(d, y, z);
      while (y.signum() > 0) {
        r = (a + z.intValue()).toString(b).substr(1) + r;
        y.divRemTo(d, y, z)
      }
      return z.intValue().toString(b) + r
    }

    function bnIntValue() {
      if (this.s < 0) {
        if (this.t == 1) return this[0] - this.DV;
        else if (this.t == 0) return -1
      } else if (this.t == 1) return this[0];
      else if (this.t == 0) return 0;
      return (this[1] & (1 << 32 - this.DB) - 1) << this.DB | this[0]
    }

    function bnpAddTo(a, r) {
      var i = 0,
        c = 0,
        m = Math.min(a.t, this.t);
      while (i < m) {
        c += this[i] + a[i];
        r[i++] = c & this.DM;
        c >>= this.DB
      }
      if (a.t < this.t) {
        c += a.s;
        while (i < this.t) {
          c += this[i];
          r[i++] = c & this.DM;
          c >>= this.DB
        }
        c += this.s
      } else {
        c += this.s;
        while (i < a.t) {
          c += a[i];
          r[i++] = c & this.DM;
          c >>= this.DB
        }
        c += a.s
      }
      r.s = c < 0 ? -1 : 0;
      if (c > 0) r[i++] = c;
      else if (c < -1) r[i++] = this.DV + c;
      r.t = i;
      r.clamp()
    }
    BigInteger.prototype.fromRadix = bnpFromRadix;
    BigInteger.prototype.chunkSize = bnpChunkSize;
    BigInteger.prototype.signum = bnSigNum;
    BigInteger.prototype.dMultiply = bnpDMultiply;
    BigInteger.prototype.dAddOffset = bnpDAddOffset;
    BigInteger.prototype.toRadix = bnpToRadix;
    BigInteger.prototype.intValue = bnIntValue;
    BigInteger.prototype.addTo = bnpAddTo;
    var Wrapper = {
      abs: (function (l, h) {
        var x = new goog.math.Long(l, h);
        var ret;
        if (x.isNegative()) {
          ret = x.negate()
        } else {
          ret = x
        }
        HEAP32[tempDoublePtr >> 2] = ret.low_;
        HEAP32[tempDoublePtr + 4 >> 2] = ret.high_
      }),
      ensureTemps: (function () {
        if (Wrapper.ensuredTemps) return;
        Wrapper.ensuredTemps = true;
        Wrapper.two32 = new BigInteger;
        Wrapper.two32.fromString("4294967296", 10);
        Wrapper.two64 = new BigInteger;
        Wrapper.two64.fromString("18446744073709551616", 10);
        Wrapper.temp1 = new BigInteger;
        Wrapper.temp2 = new BigInteger
      }),
      lh2bignum: (function (l, h) {
        var a = new BigInteger;
        a.fromString(h.toString(), 10);
        var b = new BigInteger;
        a.multiplyTo(Wrapper.two32, b);
        var c = new BigInteger;
        c.fromString(l.toString(), 10);
        var d = new BigInteger;
        c.addTo(b, d);
        return d
      }),
      stringify: (function (l, h, unsigned) {
        var ret = (new goog.math.Long(l, h)).toString();
        if (unsigned && ret[0] == "-") {
          Wrapper.ensureTemps();
          var bignum = new BigInteger;
          bignum.fromString(ret, 10);
          ret = new BigInteger;
          Wrapper.two64.addTo(bignum, ret);
          ret = ret.toString(10)
        }
        return ret
      }),
      fromString: (function (str, base, min, max, unsigned) {
        Wrapper.ensureTemps();
        var bignum = new BigInteger;
        bignum.fromString(str, base);
        var bigmin = new BigInteger;
        bigmin.fromString(min, 10);
        var bigmax = new BigInteger;
        bigmax.fromString(max, 10);
        if (unsigned && bignum.compareTo(BigInteger.ZERO) < 0) {
          var temp = new BigInteger;
          bignum.addTo(Wrapper.two64, temp);
          bignum = temp
        }
        var error = false;
        if (bignum.compareTo(bigmin) < 0) {
          bignum = bigmin;
          error = true
        } else if (bignum.compareTo(bigmax) > 0) {
          bignum = bigmax;
          error = true
        }
        var ret = goog.math.Long.fromString(bignum.toString());
        HEAP32[tempDoublePtr >> 2] = ret.low_;
        HEAP32[tempDoublePtr + 4 >> 2] = ret.high_;
        if (error) throw "range error"
      })
    };
    return Wrapper
  })();
  if (memoryInitializer) {
    if (typeof Module["locateFile"] === "function") {
      memoryInitializer = Module["locateFile"](memoryInitializer)
    } else if (Module["memoryInitializerPrefixURL"]) {
      memoryInitializer = Module["memoryInitializerPrefixURL"] + memoryInitializer
    }
    if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
      var data = Module["readBinary"](memoryInitializer);
      HEAPU8.set(data, STATIC_BASE)
    } else {
      addRunDependency("memory initializer");
      var applyMemoryInitializer = (function (data) {
        if (data.byteLength) data = new Uint8Array(data);
        for (var i = 0; i < data.length; i++) {
          assert(HEAPU8[STATIC_BASE + i] === 0, "area for memory initializer should not have been touched before it's loaded")
        }
        HEAPU8.set(data, STATIC_BASE);
        removeRunDependency("memory initializer")
      });
      var request = Module["memoryInitializerRequest"];
      if (request) {
        if (request.response) {
          setTimeout((function () {
            applyMemoryInitializer(request.response)
          }), 0)
        } else {
          request.addEventListener("load", (function () {
            if (request.status !== 0) {
              console.warn("a problem seems to have happened with Module.memoryInitializerRequest, status: " + request.status)
            }
            if (!request.response || typeof request.response !== "object" || !request.response.byteLength) {
              console.warn("a problem seems to have happened with Module.memoryInitializerRequest response (expected ArrayBuffer): " + request.response)
            }
            applyMemoryInitializer(request.response)
          }))
        }
      } else {
        Browser.asyncLoad(memoryInitializer, applyMemoryInitializer, (function () {
          throw "could not load memory initializer " + memoryInitializer
        }))
      }
    }
  }

  function ExitStatus(status) {
    this.name = "ExitStatus";
    this.message = "Program terminated with exit(" + status + ")";
    this.status = status
  }
  ExitStatus.prototype = new Error;
  ExitStatus.prototype.constructor = ExitStatus;
  var initialStackTop;
  var preloadStartTime = null;
  var calledMain = false;
  dependenciesFulfilled = function runCaller() {
    if (!Module["calledRun"]) run();
    if (!Module["calledRun"]) dependenciesFulfilled = runCaller
  };
  Module["callMain"] = Module.callMain = function callMain(args) {
    assert(runDependencies == 0, "cannot call main when async dependencies remain! (listen on __ATMAIN__)");
    assert(__ATPRERUN__.length == 0, "cannot call main when preRun functions remain to be called");
    args = args || [];
    ensureInitRuntime();
    var argc = args.length + 1;

    function pad() {
      for (var i = 0; i < 4 - 1; i++) {
        argv.push(0)
      }
    }
    var argv = [allocate(intArrayFromString(Module["thisProgram"]), "i8", ALLOC_NORMAL)];
    pad();
    for (var i = 0; i < argc - 1; i = i + 1) {
      argv.push(allocate(intArrayFromString(args[i]), "i8", ALLOC_NORMAL));
      pad()
    }
    argv.push(0);
    argv = allocate(argv, "i32", ALLOC_NORMAL);
    initialStackTop = STACKTOP;
    try {
      var ret = Module["_main"](argc, argv, 0);
      exit(ret, true)
    } catch (e) {
      if (e instanceof ExitStatus) {
        return
      } else if (e == "SimulateInfiniteLoop") {
        Module["noExitRuntime"] = true;
        return
      } else {
        if (e && typeof e === "object" && e.stack) Module.printErr("exception thrown: " + [e, e.stack]);
        throw e
      }
    } finally {
      calledMain = true
    }
  };

  function run(args) {
    args = args || Module["arguments"];
    if (preloadStartTime === null) preloadStartTime = Date.now();
    if (runDependencies > 0) {
      Module.printErr("run() called, but dependencies remain, so not running");
      return
    }
    preRun();
    if (runDependencies > 0) return;
    if (Module["calledRun"]) return;

    function doRun() {
      if (Module["calledRun"]) return;
      Module["calledRun"] = true;
      if (ABORT) return;
      ensureInitRuntime();
      preMain();
      if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
        Module.printErr("pre-main prep time: " + (Date.now() - preloadStartTime) + " ms")
      }
      if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
      if (Module["_main"] && shouldRunNow) Module["callMain"](args);
      postRun()
    }
    if (Module["setStatus"]) {
      Module["setStatus"]("Running...");
      setTimeout((function () {
        setTimeout((function () {
          Module["setStatus"]("")
        }), 1);
        doRun()
      }), 1)
    } else {
      doRun()
    }
  }
  Module["run"] = Module.run = run;

  function exit(status, implicit) {
    if (implicit && Module["noExitRuntime"]) {
      Module.printErr("exit(" + status + ") implicitly called by end of main(), but noExitRuntime, so not exiting the runtime (you can use emscripten_force_exit, if you want to force a true shutdown)");
      return
    }
    if (Module["noExitRuntime"]) {
      Module.printErr("exit(" + status + ") called, but noExitRuntime, so halting execution but not exiting the runtime or preventing further async execution (you can use emscripten_force_exit, if you want to force a true shutdown)")
    } else {
      ABORT = true;
      EXITSTATUS = status;
      STACKTOP = initialStackTop;
      exitRuntime();
      if (Module["onExit"]) Module["onExit"](status)
    }
    if (ENVIRONMENT_IS_NODE) {
      process["stdout"]["once"]("drain", (function () {
        process["exit"](status)
      }));
      console.log(" ");
      setTimeout((function () {
        process["exit"](status)
      }), 500)
    } else if (ENVIRONMENT_IS_SHELL && typeof quit === "function") {
      quit(status)
    }
    throw new ExitStatus(status)
  }
  Module["exit"] = Module.exit = exit;
  var abortDecorators = [];

  function abort(what) {
    if (what !== undefined) {
      Module.print(what);
      Module.printErr(what);
      what = JSON.stringify(what)
    } else {
      what = ""
    }
    ABORT = true;
    EXITSTATUS = 1;
    var extra = "";
    var output = "abort(" + what + ") at " + stackTrace() + extra;
    if (abortDecorators) {
      abortDecorators.forEach((function (decorator) {
        output = decorator(output, what)
      }))
    }
    throw output
  }
  Module["abort"] = Module.abort = abort;
  load_bank(Module);
  if (Module["preInit"]) {
    if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
    while (Module["preInit"].length > 0) {
      Module["preInit"].pop()()
    }
  }
  var shouldRunNow = true;
  if (Module["noInitialRun"]) {
    shouldRunNow = false
  }
  Module["noExitRuntime"] = true;
  run();
  return Module
})()