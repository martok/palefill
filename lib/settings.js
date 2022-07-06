/*
 This Source Code Form is subject to the terms of the Mozilla Public
 License, v. 2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.

 Palefill Web Technologies Polyfill Add-on
 Copyright (c) 2020-22 Martok & Contributors. All rights reserved.
*/
"use strict";

const { ListenableFunction } = require("util");

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import('resource://gre/modules/Services.jsm');

var gServiceInst = null;

class SettingsService {
    constructor () {
        this.addonId = null;
        this.addonVersion = null;
        this.prefs = null;
        this.onPrefChanged = ListenableFunction.make();
        this.onOptionsDisplayed = ListenableFunction.make();
        this.onOptionsHidden = ListenableFunction.make();
    }

    init(branch, addonData) {
        this.addonId = addonData.id;
        this.addonVersion = addonData.version;
        this.prefs = Services.prefs.getBranch(branch);
        this.prefs.addObserver("", this, false);
        Services.obs.addObserver(this, "addon-options-displayed", false);
        Services.obs.addObserver(this, "addon-options-hidden", false);
    }

    done() {
        this.prefs.removeObserver("", this);
        Services.obs.removeObserver(this, "addon-options-displayed");
        Services.obs.removeObserver(this, "addon-options-hidden");
        gServiceInst = null;
    }

    setDefaults(map) {
        // http://starkravingfinkle.org/blog/2011/01/restartless-add-ons-–-default-preferences/
        const branch = Services.prefs.getDefaultBranch(this.prefs.root);
        for (const [key, val] of Object.entries(map)) {
            switch (typeof val) {
                case "boolean":
                    branch.setBoolPref(key, val);
                    break;
                case "number":
                    branch.setIntPref(key, val);
                    break;
                case "string":
                    branch.setCharPref(key, val);
                    break;
            }
        }
    }

    getType(pref) {
        return this.prefs.getPrefType(pref);
    }

    isSet(pref) {
        return this.prefs.prefHasUserValue(pref);
    }

    getPref(pref) {
        switch (this.getType(pref)) {
            case Services.prefs.PREF_STRING:
                return this.prefs.getCharPref(pref);
            case Services.prefs.PREF_INT:
                return this.prefs.getIntPref(pref);
            case Services.prefs.PREF_BOOL:
                return this.prefs.getBoolPref(pref);
        }
        return null;
    }

    getJSONPref(pref) {
         const val = this.prefs.getCharPref(pref);
         if ("" === val) {
             return null;
         }
         return JSON.parse(val);
    }

    setPref(pref, value) {
        switch (this.getType(pref)) {
            case Services.prefs.PREF_STRING:
                return this.prefs.setCharPref(pref, ""+value);
            case Services.prefs.PREF_INT:
                return this.prefs.setIntPref(pref, 0+value);
            case Services.prefs.PREF_BOOL:
                return this.prefs.setBoolPref(pref, !!value);
        }
        return null;
    }

    setJSONPref(pref, obj) {
        if (obj == null) {
            this.prefs.setCharPref(pref, "");
        } else {
            const val = JSON.stringify(obj);
            this.prefs.setCharPref(pref, val);
        }
    }

    openAddonSettings() {
        Services.wm.getMostRecentWindow('navigator:browser').BrowserOpenAddonsMgr('addons://detail/'+this.addonId+'/preferences');
    }

    observe(subject, topic, data) {
        switch(topic) {
            case "nsPref:changed":
                this.onPrefChanged(this, data);
                break;
            case "addon-options-displayed":
                if (data === this.addonId) this.onOptionsDisplayed(this, subject);
                break;
            case "addon-options-hidden":
                if (data === this.addonId) this.onOptionsHidden(this, subject);
                break;
        }
    }
}


function getService() {
    if (!gServiceInst) {
        gServiceInst = new SettingsService();
    }
    return gServiceInst;
}

exports = {
    getService,
}