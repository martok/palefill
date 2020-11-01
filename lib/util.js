/*
 This Source Code Form is subject to the terms of the Mozilla Public
 License, v. 2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.

 Pale Moon Web Technologies Polyfill Add-on
 Copyright (c) 2020 Martok. All rights reserved.
*/

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
    print,
    sha256
}