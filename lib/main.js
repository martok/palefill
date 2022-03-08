/*
 This Source Code Form is subject to the terms of the Mozilla Public
 License, v. 2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.

 Pale Moon Web Technologies Polyfill Add-on
 Copyright (c) 2020-22 Martok. All rights reserved.

 Portions based on GitHub Web Components Polyfill Add-on
 Copyright (c) 2020 JustOff. All rights reserved.
 Copyright (c) 2022 SeaHOH. All rights reserved.
 https://github.com/JustOff/github-wc-polyfill

*/

const { encodeHTMLAttribute, sha256, print } = require("util");
const pf = require("polyfills");

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

const nsIContentPolicy = Ci.nsIContentPolicy;
const ENABLED_CONTENT_TYPES = new Set([nsIContentPolicy.TYPE_DOCUMENT, nsIContentPolicy.TYPE_SUBDOCUMENT, nsIContentPolicy.TYPE_SCRIPT]);

const _definitions = [
    {
        selector: ["www.dhl.de/etc.clientlibs/redesign/clientlibs/clientlibs-head.min.c1ad054852ef2c65cdaf76f87f21abb3.js$script"],
        fix: ["$script", "dhl-optchain"]
    },
    {
        selector: ["github.com", "gist.github.com"],
        fix: ["std-PerformanceObserver", "std-queueMicrotask", "gh-temp-oldindex2", "gh-compat", "sm-gh-extra", "sm-cookie"]
    },
    {
        selector: ["github.com/socket-worker.js$script", "gist.github.com/socket-worker.js$script"],
        fix: ["gh-worker-csp"]
    },
    {
        selector: ["gitlab.com"],
        fix: ["std-customElements"]
    },
    {
        selector: ["gitlab.com/assets/webpack/*.chunk.js$script"],
        fix: ["$script", "gl-script"]
    },
    {
        selector: ["godbolt.org"],
        fix: ["std-queueMicrotask"]
    },
    {
        selector: ["static.ce-cdn.net/vendor.v6.*.js$script"],
        fix: ["$script", "godbolt-script"]
    },
]

function evaluateFix(fix, script, csp, contentReplace) {
    switch(fix) {
        /* marker */
        case "$script":             // apply also to script content
        case "sm-cookie":           // re-set request cookie in SeaMonkey
            break;
        /* standard technologies */
        case "std-customElements":
            script.push(pf.Window_customElements);
            break;
        case "std-PerformanceObserver":
            csp["script-src"].push("unpkg.com");
            script.push({"src": "https://unpkg.com/@fastly/performance-observer-polyfill@2.0.0/polyfill/index.js",
                          "integrity": "sha384-a04eMdOeDNNfk4MJMfTFLaFz3BlylyFwanlcrzEJh6ddqcaapp/3phIOiNVrF/QC"});
            break;
        case "std-ShadowDOM":
            csp["script-src"].push("unpkg.com");
            script.push({"src": "https://unpkg.com/@webcomponents/shadydom@1.9.0/shadydom.min.js",
                          "integrity": "sha384-PFKLoiJYZCqKOdOUvo0Z18Ofro9s8QJkXaagRBHR4z8WMAyGeyp0ZWmziwHoeI7K"});
            break;
        case "std-queueMicrotask":
            script.push(pf.Window_queueMicrotask);
            break;
        /* site-specific fixes */
        case "dhl-optchain":
            contentReplace.push([`document?.getElementsByTagName?.('html')?.[0]?.getAttribute?.('lang')`, `document.getElementsByTagName('html')[0].getAttribute('lang')`]);
            break;
        case "gh-compat":
            script.push(pf.Element_attachShadow);
            script.push(pf.Github_enableDiffButton);
            script.push({"src": "https://github.githubassets.com/assets/compat-838cedbb.js",
                          "integrity": "sha512-g4ztuyuFPzjTvIqYBeZdHEDaHz2K6RCz4RszsnL3m5ko4kiWCjB9W6uIScLkNr8l/BtC2dYiIFkOdOLDYBHLqQ=="});
            break;
        case "gh-temp-oldindex2":
            contentReplace.push([/<script.+chunk-index2-[a-z0-9]+\.js"><\/script>/, ""]);
            script.push({"defer": "defer",
                          "integrity": "sha512-o/3J98IT190CWjNtrpkWpVUdnrkKSwQ1jDFOagsCc8ZvvyaqewKygiqxbxF/Z/BzHnrUvLkTe43sQ/D4PAyGRA==",
                          "data-module-id": "./chunk-index2.js",
                          "data-src": "https://github.githubassets.com/assets/chunk-index2-a3fdc9f7.js"});
            break;
        case "gh-worker-csp":
            csp["worker-src"].push("github.githubassets.com");
            break;
        case "gl-script":
            contentReplace.push(["/^&(?<iid>\\d+)$/", "/^&(\\d+)$/"]);
            contentReplace.push([`.groups.iid`, `[1]`]);
            // https://gitlab.com/gitlab-org/gitlab/-/merge_requests/79161
            contentReplace.push(["/^(?<indent>\\s*)(?<leader>((?<isOl>[*+-])|(?<isUl>\\d+\\.))( \\[([x ])\\])?\\s)(?<content>.)?/", "/^(\\s*)(([*+-]|\\d+\\.)( \\[[x ]\\])?\\s)(.)?/"]);
            contentReplace.push([/\{indent:(.),content:(.),leader:(.)\}=(.)\.groups;/, "[$1,$2,$3]=[$4[1],$4[5],$4[2]];"]);
            break;
        case "godbolt-script":
            contentReplace.push([`_languageId;_loadingTriggered;_lazyLoadPromise;_lazyLoadPromiseResolve;_lazyLoadPromiseReject;constructor(e){`,
                                 `constructor(e){this._languageId=this._loadingTriggered=this._lazyLoadPromise=this._lazyLoadPromiseResolve=this._lazyLoadPromiseReject=null;`]);
            break;
        /* browser-specific fixes */
        case "sm-gh-extra":
            script.push(pf.Element_toggleAttribute);
            script.push(pf.Array_flat);
            script.push(pf.Array_flatMap);
            break;
        default:
            return false;
    }
    return true;
}

class PolyfillService {
    constructor() {
        this.isSeaMonkey = Services.appinfo.name == "SeaMonkey";
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
                         path component may contain exactly 1 wildcard "*"
          ([.\w\-]+)
            domain fragment := 1
          (?:$|\^|(\/.*?))
            end of expression, ^ delimiter, path component := 2
          (\$((?:document|script)(?:,(?!$)|$))+)?
            starting with $, one or more of document|script, delimited by comma := 3
        */
        var expr = /^([.\w\-]+)(?:$|\^|(\/.*?))(\$((?:document|script|subdocument)(?:,(?!$)|$))+)?$/;
        for (const defn of _definitions) {
            const key = new Set(defn.fix);
            for (const selstr of defn.selector) {
                const [, domain, path, opts] = expr.exec(selstr);
                if (!domain) {
                    print("Error in expression: ", selstr);
                    continue;
                }
                const select = {d: domain};
                if (path) {
                    if (path.indexOf("*") < 0) {
                        select["p"] = path;
                    } else {
                        select["p"] = path.split("*");
                    }
                }
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
            if (selector.d !== URI.host) continue;
            if (selector.p) {
                if (typeof p === "string") {
                    if (selector.p !== URI.path) continue;
                } else {
                    if (!URI.path.endsWith(selector.p[1])) continue;
                    if (!URI.path.startsWith(selector.p[0])) continue;
                }
            }
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
        const contentReplace = [];
        // for each selected fix, append it and it's consequences to a list
        for (const item of activeFixes.a) {
            if (!evaluateFix(item, scripts, csp, contentReplace)) {
                print("Error in fix evaluation: ", item);
            };
        }
        // collect all consequences into easy to apply fields
        activeFixes.scripts = "";
        activeFixes.csp = {};
        activeFixes.contentReplace = contentReplace;
        let inline = "";
        for (const script of scripts) {
            if (typeof script === "string") {
                inline += "(function(){" + script + "}).call(this);\n";
            } else {
                const attribs = {"crossorigin": "anonymous", "type": "text/javascript"};
                const scr = ['<script'];
                for (const [k, v] of Object.entries(Object.assign(attribs, script))) {
                    scr.push(k + '=\"' + encodeHTMLAttribute(v) + '\"');
                }
                scr.push('></script>');
                activeFixes.scripts += scr.join(' ');
            }
        }
        for (const [p, s] of Object.entries(csp)) {
            if (s) {
                const uniq_sources = [... new Set(s)];
                activeFixes.csp[p] = uniq_sources.join(' ');
            }
        }
        // hash it
        const inlinehash = 'sha256-' + sha256(inline);
        // store output
        if (inline && inlinehash) {
            activeFixes.scripts += `<script type="text/javascript" >${inline}</script>`;
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
        if (activeFixes.contentReplace) {
            for (const [f, t] of activeFixes.contentReplace) {
                data = data.replace(f, t);
            }
        }
        if (activeFixes.scripts) {
            const p1 = data.indexOf("<head");
            if (p1>=0) {
                const p2 = data.indexOf(">", p1+5);
                if (p2 >= 0) {
                    data = data.slice(0, p2 + 1) + activeFixes.scripts + data.slice(p2 + 1);
                }
            }
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

    safeGetResponseHeader(channel, header, def = "") {
        try {
            return channel.getResponseHeader(header);
        } catch(e) {
            /*eat NS_ERROR_NOT_AVAILABLE exception if header is not set */
            return def;
        }
    }

    isHTMLDocument(subject) {
        return (subject.loadInfo.externalContentPolicyType == nsIContentPolicy.TYPE_DOCUMENT ||
                subject.loadInfo.externalContentPolicyType == nsIContentPolicy.TYPE_SUBDOCUMENT) &&
               (this.safeGetResponseHeader(subject, "Content-Type", "text/html").indexOf("text/html") != -1);
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
                if ([200, 304].includes(subject.responseStatus)) {
                    try {
                        //print("applied fixes to ", subject.URI.spec, ": ", fixes.a);
                        let csp = this.safeGetResponseHeader(subject, "Content-Security-Policy");
                        if (!!csp) {
                            csp = service.modifyContentSecurityPolicy(csp, fixes);
                            subject.setResponseHeader("Content-Security-Policy", csp, false);
                        }

                        const mod_content = this.isHTMLDocument(subject) || (this.isScript(subject) && fixes.a.includes("$script"));
                        // FIXME: ideally, we would only do that on new data (200) and let the cache store our modified content.
                        //        but apparently the cache is *before* the nsITraceableChannel?
                        if (mod_content) {
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
