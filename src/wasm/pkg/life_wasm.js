import * as wasm from './life_wasm_bg.wasm';

let cachegetUint32Memory = null;
function getUint32Memory() {
    if (cachegetUint32Memory === null || cachegetUint32Memory.buffer !== wasm.memory.buffer) {
        cachegetUint32Memory = new Uint32Array(wasm.memory.buffer);
    }
    return cachegetUint32Memory;
}

let WASM_VECTOR_LEN = 0;

function passArray32ToWasm(arg) {
    const ptr = wasm.__wbindgen_malloc(arg.length * 4);
    getUint32Memory().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

const heap = new Array(32);

heap.fill(undefined);

heap.push(undefined, null, true, false);

function getObject(idx) { return heap[idx]; }

let heap_next = heap.length;

function dropObject(idx) {
    if (idx < 36) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachegetUint8Memory = null;
function getUint8Memory() {
    if (cachegetUint8Memory === null || cachegetUint8Memory.buffer !== wasm.memory.buffer) {
        cachegetUint8Memory = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory;
}

function getStringFromWasm(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory().subarray(ptr, ptr + len));
}

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

let cachedTextEncoder = new TextEncoder('utf-8');

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm(arg) {

    let len = arg.length;
    let ptr = wasm.__wbindgen_malloc(len);

    const mem = getUint8Memory();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = wasm.__wbindgen_realloc(ptr, len, len = offset + arg.length * 3);
        const view = getUint8Memory().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachegetInt32Memory = null;
function getInt32Memory() {
    if (cachegetInt32Memory === null || cachegetInt32Memory.buffer !== wasm.memory.buffer) {
        cachegetInt32Memory = new Int32Array(wasm.memory.buffer);
    }
    return cachegetInt32Memory;
}

function handleError(e) {
    wasm.__wbindgen_exn_store(addHeapObject(e));
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}
/**
*/
export class GameEngine {

    static __wrap(ptr) {
        const obj = Object.create(GameEngine.prototype);
        obj.ptr = ptr;

        return obj;
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_gameengine_free(ptr);
    }
    /**
    * @param {number} size
    * @param {Uint32Array} starting_data
    * @returns {GameEngine}
    */
    constructor(size, starting_data) {
        const ret = wasm.gameengine_new(size, passArray32ToWasm(starting_data), WASM_VECTOR_LEN);
        return GameEngine.__wrap(ret);
    }
    /**
    * @returns {Result}
    */
    next() {
        const ret = wasm.gameengine_next(this.ptr);
        return Result.__wrap(ret);
    }
}
/**
*/
export class Result {

    static __wrap(ptr) {
        const obj = Object.create(Result.prototype);
        obj.ptr = ptr;

        return obj;
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_result_free(ptr);
    }
    /**
    * @returns {any}
    */
    get value() {
        const ret = wasm.result_value(this.ptr);
        return takeObject(ret);
    }
}

export const __wbindgen_object_drop_ref = function(arg0) {
    takeObject(arg0);
};

export const __wbindgen_string_new = function(arg0, arg1) {
    const ret = getStringFromWasm(arg0, arg1);
    return addHeapObject(ret);
};

export const __wbg_new_59cb74e423758ede = function() {
    const ret = new Error();
    return addHeapObject(ret);
};

export const __wbg_stack_558ba5917b466edd = function(arg0, arg1) {
    const ret = getObject(arg1).stack;
    const ret0 = passStringToWasm(ret);
    const ret1 = WASM_VECTOR_LEN;
    getInt32Memory()[arg0 / 4 + 0] = ret0;
    getInt32Memory()[arg0 / 4 + 1] = ret1;
};

export const __wbg_error_4bb6c2a97407129a = function(arg0, arg1) {
    const v0 = getStringFromWasm(arg0, arg1).slice();
    wasm.__wbindgen_free(arg0, arg1 * 1);
    console.error(v0);
};

export const __wbg_new_de17f04ab3be4063 = function() {
    const ret = new Object();
    return addHeapObject(ret);
};

export const __wbg_buffer_ef21d491a7c39636 = function(arg0) {
    const ret = getObject(arg0).buffer;
    return addHeapObject(ret);
};

export const __wbg_newwithbyteoffsetandlength_4ae8bf9b4845a9d6 = function(arg0, arg1, arg2) {
    const ret = new Uint32Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
    return addHeapObject(ret);
};

export const __wbg_set_e11a72d9733dadef = function(arg0, arg1, arg2) {
    try {
        const ret = Reflect.set(getObject(arg0), getObject(arg1), getObject(arg2));
        return ret;
    } catch (e) {
        handleError(e)
    }
};

export const __wbindgen_debug_string = function(arg0, arg1) {
    const ret = debugString(getObject(arg1));
    const ret0 = passStringToWasm(ret);
    const ret1 = WASM_VECTOR_LEN;
    getInt32Memory()[arg0 / 4 + 0] = ret0;
    getInt32Memory()[arg0 / 4 + 1] = ret1;
};

export const __wbindgen_throw = function(arg0, arg1) {
    throw new Error(getStringFromWasm(arg0, arg1));
};

export const __wbindgen_memory = function() {
    const ret = wasm.memory;
    return addHeapObject(ret);
};

