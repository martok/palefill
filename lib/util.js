/*
 This Source Code Form is subject to the terms of the Mozilla Public
 License, v. 2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.

 Pale Moon Web Technologies Polyfill Add-on
 Copyright (c) 2020-22 Martok. All rights reserved.
*/



function encodeHTMLAttribute(str) {
    /*!
     * escape-html
     *    (modified)
     * Copyright(c) 2012-2013 TJ Holowaychuk
     * Copyright(c) 2015 Andreas Lubbe
     * Copyright(c) 2015 Tiancheng "Timothy" Gu
     * MIT Licensed
     */

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

function print(argv) {
    const v = Array.from(arguments);
    v.unshift("PF: ");
    console.log.apply(console, v);
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

exports = {
    encodeHTMLAttribute,
    print,
    sha256
}