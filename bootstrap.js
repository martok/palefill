/*
 This Source Code Form is subject to the terms of the Mozilla Public
 License, v. 2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.

 Pale Moon Web Technologies Add-on
 Copyright (c) 2020 Martok. All rights reserved.
*/

"use strict";
const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("resource://gre/modules/Services.jsm");

let addonData = null;

function require(module)
{
    let scopes = require.scopes;
    if (!(module in scopes)) {
        let url = addonData.resourceURI.spec + "lib/" + module + ".js";
        scopes[module] = {
            Cc, Ci, Cu, require,
            exports: {}
        };
        Services.scriptloader.loadSubScript(url, scopes[module]);
    }
    return scopes[module].exports;
}
require.scopes = {}; 

function startup(data, reason) {
    addonData = data;
    require("main").init();
}

function shutdown(data, reason) {
    if (reason == APP_SHUTDOWN) {
        return;
    }
    require("main").done();
    require.scopes = {};
    addonData = null;  
}

function install() {}

function uninstall() {}
