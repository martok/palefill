/*
 This Source Code Form is subject to the terms of the Mozilla Public
 License, v. 2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.

 Palefill Web Technologies Polyfill Add-on
 Copyright (c) 2020-22 Martok & Contributors. All rights reserved.
*/
"use strict";

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("resource://gre/modules/Services.jsm");

const PLATFORM_SUPPORTED_PRODUCTS = [                          // Apps specifically targeted by install.rdf etc.
    "{8de7fcbb-c55c-4fbe-bfc5-fc555c87dbc4}",                  // Pale Moon
    "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}",                  // Basilisk / Iceweasel-UXP
    "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}",                  // SeaMonkey
];
const PLATFORM_UXP_MAXVER = "10.*";                            // arbitrarily chosen

let gAddonData = null;

function require(module)
{
    let scopes = require.scopes;
    if (!(module in scopes)) {
        let url = gAddonData.resourceURI.spec + "lib/" + module + ".js";
        scopes[module] = {
            Cc, Ci, Cu, require,
            exports: {}
        };
        Services.scriptloader.loadSubScript(url, scopes[module]);
    }
    return scopes[module].exports;
}
require.scopes = Object.create(null);

function _validateRuntime(data) {
    const id = Services.appinfo.ID.toLowerCase();
    if (PLATFORM_SUPPORTED_PRODUCTS.includes(id)) {
        // definitely a supported app
        data.runtimeMode = "SUPPORTED";
    } else if (Services.vc.compare(Services.appinfo.platformVersion, PLATFORM_UXP_MAXVER) < 0) {
        // highly likely something building on UXP/Goanna
        data.runtimeMode = "UXP-GENERIC";
    } else {
        // any other Mozilla product. Not our place to be.
        data.runtimeMode = "INVALID";
    }
}

function startup(data, reason) {
    _validateRuntime(data);
    gAddonData = data;
    if (gAddonData.runtimeMode !== "INVALID") {
        const settings = require("settings").getService();
        settings.init("extensions.palefill.", gAddonData);
        settings.setDefaults(require("settings-defaults"));
        require("main").init();
        if (reason === ADDON_INSTALL && data.runtimeMode === "UXP-GENERIC") {
            // on first install, go to settings where we show the compat warning
            require("settings").getService().openAddonSettings();
        }
    }
}

function shutdown(data, reason) {
    if (reason == APP_SHUTDOWN) {
        return;
    }
    if (gAddonData.runtimeMode !== "INVALID") {
        require("main").done();
        require("settings").getService().done();
        require.scopes = {};
    }
    gAddonData = null;
}

function install(data, reason) {
    if (reason === ADDON_INSTALL) {
        _validateRuntime(data);
        if (data.runtimeMode === "INVALID") {
            alert("Palefill", "Palefill was just installed on a platform that it does not run on. You may want to disable/remove it, it will not function.");
        }
    }
}

function uninstall() {}
