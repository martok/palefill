/*
 This Source Code Form is subject to the terms of the Mozilla Public
 License, v. 2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.

 Pale Moon Web Technologies Polyfill Add-on
 Copyright (c) 2020 Martok. All rights reserved.
*/

const { sha256, print } = require("util");
const pf = require("polyfills");

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

const _definitions = [
    {
        selector: ["github.com", "gist.github.com"],
        fill: ["gh-compat", "qmicrotask", "sm-gh-extra", "sm-cookie", "gh-worker-csp"]
    }
]

class PolyfillService {
    constructor() {
        this.isSeaMonkey = Services.appinfo.name == "SeaMonkey"
        this.fills = {}
        this.selectors = {}
    }

    destroy() {
    }

    loadDefinitions() {
        for (const defn of _definitions) {
            const key = Array.sort(defn.fill).join('+')
            for (const host of defn.selector) {
                this.selectors[host] = key;
            }
            if (!this.fills.hasOwnProperty(key)) {
                this.fills[key] = {
                    a: [...defn.fill]
                }
            }
        }
    }

    isSiteEnabled(URI) {
        // TODO: ABP-Style expressions
        return this.selectors.hasOwnProperty(URI.host);
    }

    getFills(URI) {
        // TODO: Merge fills from all expression matching defs
        const key = this.selectors[URI.host];
        if (!key) return null;
        return this.fills[key];
    }

    ensureCompiledFills(activeFills) {
        if (typeof activeFills.compiled !== "undefined") {
            return;
        }
        var scripts = [];
        var csp = {'script-src': [], 'worker-src': []};
        // for each selected polyfill, append it and it's consequences to a list
        for (const item of activeFills.a) {
            switch(item) {
                case "gh-compat":
                    scripts.push({"src": "https://github.githubassets.com/assets/compat-838cedbb.js",
                                  "integrity": "sha512-g4ztuyuFPzjTvIqYBeZdHEDaHz2K6RCz4RszsnL3m5ko4kiWCjB9W6uIScLkNr8l/BtC2dYiIFkOdOLDYBHLqQ=="});
                    break;
                case "gh-worker-csp":
                    csp["worker-src"].push("github.githubassets.com");
                    break;
                case "qmicrotask":
                    scripts.push(pf.Window_queueMicrotask);
                    break;
                case "sm-gh-extra":
                    scripts.push(pf.Element_toggleAttribute);
                    scripts.push(pf.Array_flat);
                    scripts.push(pf.Array_flatMap);
                    break;
            }
        }
        activeFills.scripts = "";
        activeFills.csp = {};
        var inline = "";
        for (const script of scripts) {
            if (typeof script === "string") {
                inline += "(function(){" + script + "}).call(this);\n";
            } else {
                activeFills.scripts += '<script crossorigin=\"anonymous\" ' + (typeof script.integrity!=="undefined"?`integrity="${script.integrity}" `:"") +
                                       'type="application/javascript" src="' + script.src + '"></script>';
            }
        }
        for (const [p, s] of Object.entries(csp)) {
            if (s) {
                activeFills.csp[p] = s.join(' ');
            }
        }
        // hash it
        var inlinehash = 'sha256-' + sha256(inline);
        // store output
        if (inline && inlinehash) {
            activeFills.scripts += `<script type="application/javascript" >${inline}</script>`;
            if (activeFills.csp["script-src"])
                activeFills.csp["script-src"] = activeFills.csp["script-src"] + " " + `'${inlinehash}'`;
            else
                activeFills.csp["script-src"] = `'${inlinehash}'`;
        }
        activeFills.compiled = true;
    }

    modifyContentSecurityPolicy(csp, activeFills) {
        this.ensureCompiledFills(activeFills);
        for (const [f, v] of Object.entries(activeFills.csp)) {
            if (csp.indexOf(f) == -1) {
                if (csp)
                    csp += '; ';
                csp += f + " " + v;
            } else {
                csp = csp.replace(f + " ", f + " " + v + " ");
            }
        }
        return csp;
    }

    modifyRequestData(data, activeFills) {
        this.ensureCompiledFills(activeFills);
        if (activeFills.scripts) {
            data = data.replace("<head>", "<head>" + activeFills.scripts);
        }
        return data;
    }
}

class TracingListener {
    constructor(fills) {
        this.receivedData = [];
        this.originalListener = null;
        this.performFills = fills;
    }

    onDataAvailable(request, context, inputStream, offset, count) {
        let binaryInputStream = Cc["@mozilla.org/binaryinputstream;1"].createInstance(Ci["nsIBinaryInputStream"]);
        binaryInputStream.setInputStream(inputStream);
        let data = binaryInputStream.readBytes(count);
        this.receivedData.push(data);
    }

    onStartRequest(request, context) {
        try {
            this.originalListener.onStartRequest(request, context);
        } catch (err) {
            request.cancel(err.result);
        }
    }

    onStopRequest(request, context, statusCode) {
        let data = this.receivedData.join("");
        try {
            data = service.modifyRequestData(data, this.performFills);
        } catch (e) {}
        let storageStream = Cc["@mozilla.org/storagestream;1"].createInstance(Ci["nsIStorageStream"]);
        storageStream.init(8192, data.length, null);
        let os = storageStream.getOutputStream(0);
        if (data.length > 0) {
            os.write(data, data.length);
        }
        os.close();
        try {
            this.originalListener.onDataAvailable(request, context, storageStream.newInputStream(0), 0, data.length);
        } catch (e) {}
        try {
            this.originalListener.onStopRequest(request, context, statusCode);
        } catch (e) {}
    }

}
TracingListener.prototype.QueryInterface = XPCOMUtils.generateQI([Ci.nsIStreamListener, Ci.nsISupports]);


class HTTPObserver {
    constructor() {
        this.cookie = null;
    }

    isHTMLDocument(subject) {
        return (subject.loadInfo.externalContentPolicyType == Ci.nsIContentPolicy.TYPE_DOCUMENT ||
                subject.loadInfo.externalContentPolicyType == Ci.nsIContentPolicy.TYPE_SUBDOCUMENT) &&
               (subject.getResponseHeader("Content-Type").indexOf("text/html") != -1);
    }

    isScript(subject) {
        return (subject.loadInfo.externalContentPolicyType == Ci.nsIContentPolicy.TYPE_SCRIPT);
    }

    observe(subject, topic, data) {
        if (!(subject instanceof Ci.nsIHttpChannel && service.isSiteEnabled(subject.URI))) {
            return;
        }
        const fills = service.getFills(subject.URI);
        switch (topic) {
            case "http-on-examine-response":
            case "http-on-examine-cached-response":
                if (subject.responseStatus == 200 || subject.responseStatus == 304) {
                    try {
                        if (this.isHTMLDocument(subject)) {
                            let csp = subject.getResponseHeader("Content-Security-Policy");
                            csp = service.modifyContentSecurityPolicy(csp, fills);
                            subject.setResponseHeader("Content-Security-Policy", csp, false);

                            if (subject.responseStatus == 200) {
                                const tracerSubject = subject.QueryInterface(Ci.nsITraceableChannel);
                                const newListener = new TracingListener(fills);
                                newListener.originalListener = tracerSubject.setNewListener(newListener);
                            }
                        } else if (this.isScript(subject)) {
                            let csp = subject.getResponseHeader("Content-Security-Policy");
                            csp = service.modifyContentSecurityPolicy(csp, fills);
                            subject.setResponseHeader("Content-Security-Policy", csp, false);
                        }
                    } catch (e) {console.error(e)}
                }
                break;
            case "http-on-modify-request":
                if (service.isSeaMonkey && fills.a.includes("sm-cookie")) {
                    try {
                        this.cookie = subject.getRequestHeader("Cookie");
                    } catch (e) {
                        if (this.cookie) {
                            subject.setRequestHeader("Cookie", this.cookie, false);
                        }
                    }
                }
                break;
        }
    }
}
HTTPObserver.prototypeQueryInterface = XPCOMUtils.generateQI([Ci.nsIObserver, Ci.nsISupportsWeakReference]);


var service = null;
var httpObserver = null;


function init() {
    service = new PolyfillService();
    httpObserver = new HTTPObserver();
    service.loadDefinitions();
    Services.obs.addObserver(httpObserver, "http-on-examine-response", false);
    Services.obs.addObserver(httpObserver, "http-on-examine-cached-response", false);
    if (service.isSeaMonkey) {
        Services.obs.addObserver(httpObserver, "http-on-modify-request", false);
    }
}

function done() {
    if (service.isSeaMonkey) {
        Services.obs.removeObserver(httpObserver, "http-on-modify-request", false);
    }
    Services.obs.removeObserver(httpObserver, "http-on-examine-cached-response", false);
    Services.obs.removeObserver(httpObserver, "http-on-examine-response", false);
    httpObserver = null;
    service.destroy();
    service = null;
    require.scopes = null;
    addonData = null;
}

exports = {
    init,
    done
}
