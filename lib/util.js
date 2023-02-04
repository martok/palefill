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

class CSP {
    static headerToDict(headerStr) {
        const result = {};

        const DIRECTIVE = /([a-z\-]+)\s*(;?)/y;
        const EMPTY_DIRECTIVE = /\s*;/y;
        const VALUE = /((?:'[^']+')|(?:\*?[\S]+[^\s;])|\*)\s*(;?)/y;
        const WHITESPACE = /\s+/y;

        let cursor = 0;
        let match = null;
        const is_match = (expr) => {
            expr.lastIndex = cursor;
            match = expr.exec(headerStr);
            if (match) {
                cursor = expr.lastIndex;
                return true;
            }
            return false;
        };

        while (cursor < headerStr.length) {
            if (is_match(EMPTY_DIRECTIVE)) {
                // doubled-up semicolon, like:
                //    blob:;; child-src: ...
                is_match(WHITESPACE);
                continue;
            }
            if (!is_match(DIRECTIVE)) {
                throw SyntaxError("Problem parsing CSP: directive expected near " + headerStr.substr(cursor, 10));
            }
            const directive = match[1];
            if (!result.hasOwnProperty(directive)) {
                result[directive] = [];
            }
            if (match[2] === ";") {
                // standalone directive, no further elements required
            } else {
                // has values
                const list = result[directive];
                // values are either quoted or URIs, neither of which have whitespace
                while (cursor < headerStr.length) {
                    if (!is_match(VALUE)) {
                        throw SyntaxError("Problem parsing CSP: value expected near " + headerStr.substr(cursor, 10));
                    }
                    list.push(match[1]);
                    if (match[2] === ";") {
                        break;
                    }
                }
            }
            is_match(WHITESPACE);
        }

        return result;
    }

    static dictToHeader(dict) {
        return CSP.dictMap(dict, (dir, lst) => {
                if (Array.isArray(lst) && lst.length) {
                    return dir + " " + lst.join(" ");
                } else {
                    return dir;
                }
              }).
              join("; ");
    }

    static dictMap(dict, mapFn) {
        return Object.entries(dict).map(([dir, lst]) => mapFn(dir, lst));
    }
    
    static dictSimplify(dict) {
        const result = {};
        CSP.dictMap(dict, (dir, lst) => {
            if (lst.length) {
                const uniq_sources = [... new Set(lst)];
                result[dir] = uniq_sources;
            }
        });
        return result;
    }
};

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

function jss(strings, ...values) {
    if (values.length || strings.length != 1) {
        print("JS heredoc likely missing character escape", {strings, values});
    }
    const raw = String.raw.call(this, strings, ...values);
    const txt = Unicode.fromUTF8(raw);
    return txt.replaceAll("\\`", "`").replaceAll("\\${", "${");
}

class Unicode {
    static fromUTF8(utf8) {
        const converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
        converter.charset = "UTF-8";
        return converter.ConvertToUnicode(utf8);
    }

    static toUTF8(uni) {
        const converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
        converter.charset = "UTF-8";
        return converter.ConvertFromUnicode(uni) + converter.Finish();
    }

    static toUTF8Array(uni) {
        const converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
        converter.charset = "UTF-8";
        const result = {};
        return converter.convertToByteArray(uni, result);
    }
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

function arrayCompare(a, b) {
  if (typeof a.length === "undefined" || typeof b.length === "undefined")
    return false;
  if (a.length !== b.length)
    return false;
  return a.every((ae, i) => {ae === b[i]});
}

function setCompare(a, b) {
    return a.size === b.size && new Set([...a, ...b]).size === a.size;
}

function sha256(uniString) {
    if (!uniString) {
        return "";
    }

    const data = Unicode.toUTF8Array(uniString);
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
    arrayCompare,
    CSP,
    encodeHTMLAttribute,
    jss,
    Unicode,
    objectToJSON,
    print,
    setCompare,
    sha256,
    ListenableFunction,
    alert,
    confirm,
}