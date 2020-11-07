/*
 This Source Code Form is subject to the terms of the Mozilla Public
 License, v. 2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.

 Pale Moon Web Technologies Polyfill Add-on
 Copyright (c) 2020 Martok. All rights reserved.
*/

const { sha256, print } = require("util");
const pf = require("polyfills");

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

const nsIContentPolicy = Ci.nsIContentPolicy;
const ENABLED_CONTENT_TYPES = new Set([nsIContentPolicy.TYPE_DOCUMENT, nsIContentPolicy.TYPE_SUBDOCUMENT, nsIContentPolicy.TYPE_SCRIPT]);

const _definitions = [
    {
        selector: ["github.com", "gist.github.com"],
        fix: ["gh-compat", "qmicrotask", "sm-gh-extra", "sm-cookie"]
    },
    {
        selector: ["github.com/socket-worker.js$script", "gist.github.com/socket-worker.js$script"],
        fix: ["gh-worker-csp"]
    }
]

class PolyfillService {
    constructor() {
        this.isSeaMonkey = Services.appinfo.name == "SeaMonkey"
        this.domainSet = new Set();
        this.selectors = new Map();
        this.fixes = new Map();
    }

    destroy() {
    }

    loadDefinitions() {
        /*
          Filter Syntax is basic https://adblockplus.org/filter-cheatsheet
          Limititations: Domain part MUST be present
                         only type options apply

          ([^\s][.\w]+)
            domain fragment := 1
          (?:$|\^|(\/.*?))
            end of pression, ^ delimiter, path component := 2
          (\$((?:document|script)(?:,(?!$)|$))+)?
            starting with $, one or more of document|script, delimited by comma := 3
        */
        var expr = /^([^\s][.\w]+)(?:$|\^|(\/.*?))(\$((?:document|script|subdocument)(?:,(?!$)|$))+)?$/;
        for (const defn of _definitions) {
            const key = new Set(defn.fix);
            for (const selstr of defn.selector) {
                const [, domain, path, opts] = expr.exec(selstr);
                if (!domain) {
                    print("Error in expression: ", selstr);
                    continue;
                }
                const select = {d: domain};
                if (path) select["p"] = path;
                const allowedTypes = new Set();
                if (opts) {
                    for (const o of opts.substr(1).split(",")) {
                        if (o == "document") {
                            allowedTypes.add(nsIContentPolicy.TYPE_DOCUMENT);
                        } else if (o == "subdocument") {
                            allowedTypes.add(nsIContentPolicy.TYPE_SUBDOCUMENT);
                        } else if (o == "script") {
                            allowedTypes.add(nsIContentPolicy.TYPE_SCRIPT);
                        }
                    }
                }
                if (!allowedTypes.size) {
                    allowedTypes.add(nsIContentPolicy.TYPE_DOCUMENT);
                    allowedTypes.add(nsIContentPolicy.TYPE_SUBDOCUMENT);
                }
                select["t"] = allowedTypes;
                this.domainSet.add(domain);
                this.selectors.set(select, key);
            }
        }
    }

    isSiteEnabled(URI) {
        return this.domainSet.has(URI.host);
    }

    getFixes(URI, contentPolicy) {
        const applied = new Set();
        for (const [selector, fixes] of this.selectors.entries()) {
            if (!selector.t.has(contentPolicy)) continue;
            if (selector.d != URI.host) continue;
            if (selector.p && (selector.p != URI.path)) continue;
            for (const f of fixes) {
                applied.add(f);
            }
        }
        if (!applied.size) {
            return null;
        }
        const aapplied = Array.sort([...applied]);
        const key = aapplied.join('+');
        let fixes = this.fixes.get(key);
        if (typeof fixes === "undefined") {
            fixes = {a: aapplied};
            this.fixes.set(key, fixes);
        }
        return fixes;
    }

    ensureCompiledFixes(activeFixes) {
        if (typeof activeFixes.compiled !== "undefined") {
            return;
        }
        const scripts = [];
        const csp = {'script-src': [], 'worker-src': []};
        // for each selected fix, append it and it's consequences to a list
        for (const item of activeFixes.a) {
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
        activeFixes.scripts = "";
        activeFixes.csp = {};
        let inline = "";
        for (const script of scripts) {
            if (typeof script === "string") {
                inline += "(function(){" + script + "}).call(this);\n";
            } else {
                activeFixes.scripts += '<script crossorigin=\"anonymous\" ' + (typeof script.integrity!=="undefined"?`integrity="${script.integrity}" `:"") +
                                       'type="application/javascript" src="' + script.src + '"></script>';
            }
        }
        for (const [p, s] of Object.entries(csp)) {
            if (s) {
                activeFixes.csp[p] = s.join(' ');
            }
        }
        // hash it
        const inlinehash = 'sha256-' + sha256(inline);
        // store output
        if (inline && inlinehash) {
            activeFixes.scripts += `<script type="application/javascript" >${inline}</script>`;
            if (activeFixes.csp["script-src"])
                activeFixes.csp["script-src"] = activeFixes.csp["script-src"] + " " + `'${inlinehash}'`;
            else
                activeFixes.csp["script-src"] = `'${inlinehash}'`;
        }
        activeFixes.compiled = true;
    }

    modifyContentSecurityPolicy(csp, activeFixes) {
        this.ensureCompiledFixes(activeFixes);
        for (const [f, v] of Object.entries(activeFixes.csp)) {
            const newval = f + " " + v;
            if (csp.indexOf(f) == -1) {
                if (csp)
                    csp += '; ';
                csp += newval;
            } else {
                csp = csp.replace(f + " ", newval + " ");
            }
        }
        return csp;
    }

    modifyRequestData(data, activeFixes) {
        this.ensureCompiledFixes(activeFixes);
        if (activeFixes.scripts) {
            data = data.replace("<head>", "<head>" + activeFixes.scripts);
        }
        return data;
    }
}

class TracingListener {
    constructor(fixes) {
        this.receivedData = [];
        this.originalListener = null;
        this.activeFixes = fixes;
    }

    onDataAvailable(request, context, inputStream, offset, count) {
        const binaryInputStream = Cc["@mozilla.org/binaryinputstream;1"].createInstance(Ci["nsIBinaryInputStream"]);
        binaryInputStream.setInputStream(inputStream);
        const data = binaryInputStream.readBytes(count);
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
            data = service.modifyRequestData(data, this.activeFixes);
        } catch (e) {}
        const storageStream = Cc["@mozilla.org/storagestream;1"].createInstance(Ci["nsIStorageStream"]);
        storageStream.init(8192, data.length, null);
        const os = storageStream.getOutputStream(0);
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
        return (subject.loadInfo.externalContentPolicyType == nsIContentPolicy.TYPE_DOCUMENT ||
                subject.loadInfo.externalContentPolicyType == nsIContentPolicy.TYPE_SUBDOCUMENT) &&
               (subject.getResponseHeader("Content-Type").indexOf("text/html") != -1);
    }

    isScript(subject) {
        return (subject.loadInfo.externalContentPolicyType == nsIContentPolicy.TYPE_SCRIPT);
    }

    observe(subject, topic, data) {
        // early-out tests
        if (!(subject instanceof Ci.nsIHttpChannel)) return;
        if (!ENABLED_CONTENT_TYPES.has(subject.loadInfo.externalContentPolicyType)) return;
        if (!service.isSiteEnabled(subject.URI)) return;

        const fixes = service.getFixes(subject.URI, subject.loadInfo.externalContentPolicyType);
        if (fixes === null) {
            // full test
            return;
        }
        switch (topic) {
            case "http-on-examine-response":
            case "http-on-examine-cached-response":
                if (subject.responseStatus == 200 || subject.responseStatus == 304) {
                    try {
                        let csp = subject.getResponseHeader("Content-Security-Policy");
                        csp = service.modifyContentSecurityPolicy(csp, fixes);
                        subject.setResponseHeader("Content-Security-Policy", csp, false);

                        if (subject.responseStatus == 200 && this.isHTMLDocument(subject)) {
                            const tracerSubject = subject.QueryInterface(Ci.nsITraceableChannel);
                            const newListener = new TracingListener(fixes);
                            newListener.originalListener = tracerSubject.setNewListener(newListener);
                        }
                    } catch (e) {console.error(e)}
                }
                break;
            case "http-on-modify-request":
                if (service.isSeaMonkey && fixes.a.includes("sm-cookie")) {
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
