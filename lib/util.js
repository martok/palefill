/*
 This Source Code Form is subject to the terms of the Mozilla Public
 License, v. 2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.

 Palefill Web Technologies Polyfill Add-on
 Copyright (c) 2020-22 Martok & Contributors. All rights reserved.


encodeHTMLAttribute is based on escape-html, used under the MIT License
Copyright(c) 2012-2013 TJ Holowaychuk
Copyright(c) 2015 Andreas Lubbe
Copyright(c) 2015 Tiancheng "Timothy" Gu
https://github.com/component/escape-html
*/
"use strict";

function cspJoinHeader(csp_map) {
    const parts = [];
    for (const [d, v] of Object.entries(csp_map)) {
        if (Array.isArray(v)) {
            parts.push(d + " " + v.join(" "));
        } else {
            parts.push(d);
        }
    }
    return parts.join("; ");
}

function cspSplitHeader(csp) {
    const result = {};

    const directive = /([a-z\-]+)\s*(;?)/y;
    const value = /((?:'[^']+')|\*|(?:[\S]+[^\s;]))\s*(;?)/y;
    const whitespace = /\s+/y;

    let cursor = 0;
    let match = null;
    const is_match = (expr) => {
        expr.lastIndex = cursor;
        match = expr.exec(csp);
        if (match) {
            cursor = expr.lastIndex;
            return true;
        }
        return false;
    };

    while (cursor < csp.length) {
        if (!is_match(directive)) {
            throw SyntaxError("Problem parsing CSP: directive expected near " + csp.substr(cursor, 10));
        }
        if (match[2] === ";") {
            // standalone
            result[match[1]] = true;
        } else {
            // has values
            const list = result[match[1]] = [];
            // values are either quoted or URIs, neither of which have whitespace
            while (cursor < csp.length) {
                if (!is_match(value)) {
                    throw SyntaxError("Problem parsing CSP: value expected near " + csp.substr(cursor, 10));
                }
                list.push(match[1]);
                if (match[2] === ";") {
                    break;
                }
            }
        }
        is_match(whitespace);
    }

    return result;
}

function encodeHTMLAttribute(str) {
    var match = /["'&<>]/.exec(str)

    if (!match) {
        return str;
    }

    let escape = '';
    let html = [];
    let lastIndex = 0;

    for (let index = match.index; index < str.length; index++) {
        switch (str.charCodeAt(index)) {
            case 34: // "
                escape = '&quot;';
                break;
            case 38: // &
                escape = '&amp;';
                break;
            case 39: // '
                escape = '&#39;';
                break;
            case 60: // <
                escape = '&lt;';
                break;
            case 62: // >
                escape = '&gt;';
                break;
            default:
                continue
        }

        if (lastIndex !== index) {
            html.push(str.substring(lastIndex, index));
        }

        lastIndex = index + 1
        html.push(escape);
    }

    if (lastIndex !== index) {
        html.push(str.substring(lastIndex, index));
    }

    return html.join('');
}

function objectToJSON(obj, filter=null) {
    const ret = {};
    for (const key in obj) {
        if (filter && !filter(key)) continue;
        try {
            const d = obj[key];
            if (d instanceof Function) continue;
            ret[key] = (d instanceof Object) ? objectToJSON(d, filter) : d;
        } catch (e) {}
    }
    return ret;
}

function print(argv) {
    if (!require("settings").getService().getPref('debug')) {
        // local require to avoid dependency
        return;
    }
    const v = Array.from(arguments);
    v.unshift("PF: ");
    console.log.apply(console, v);
}

function setCompare(a, b) {
    return a.size === b.size && new Set([...a, ...b]).size === a.size;
}

function sha256(aString) {
    if (!aString) {
        return "";
    }
    var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
    converter.charset = "UTF-8";
    var result = {};
    var data = converter.convertToByteArray(aString, result);

    var ch = Cc["@mozilla.org/security/hash;1"].createInstance(Ci.nsICryptoHash);
    ch.init(ch.SHA256);
    ch.update(data, data.length);
    return ch.finish(true);
}

class ListenableFunction {
    constructor() {
      throw "Static class";
    }

    static make() {
        const _listeners = [];
        const dispatch = function (thisArg, ...args) {
            for (const [h, t] of _listeners) {
                h.apply(t || thisArg, args);
            }
        };
        Object.assign(dispatch, {
            on: function(handler, thisArg = undefined) {
                for (const [h, t] of _listeners) {
                    if (h==handler && t == thisArg) {
                        return false;
                    }
                }
                _listeners.push([handler, thisArg]);
            },
            remove: function(handler, thisArg = undefined) {
                for (var i = 0, l = _listeners.length; i < l; i++) {
                    const entry = _listeners[i];
                    if (entry[0] == handler && (typeof thisArg=="undefined" || entry[1] == thisArg)) {
                        _listeners.splice(i, 1);
                        return;
                    }
                }
            },
        });
        return dispatch;
    }
}

function alert(title, message, parent=null) {
    Cc["@mozilla.org/embedcomp/prompt-service;1"].
      getService(Ci.nsIPromptService).
      alert(parent, title, message);
}

function confirm(title, message, parent=null) {
    return Cc["@mozilla.org/embedcomp/prompt-service;1"].
      getService(Ci.nsIPromptService).
      confirm(parent, title, message);
}

exports = {
    cspJoinHeader,
    cspSplitHeader,
    encodeHTMLAttribute,
    objectToJSON,
    print,
    setCompare,
    sha256,
    ListenableFunction,
    alert,
    confirm,
}