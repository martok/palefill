/*
 This Source Code Form is subject to the terms of the Mozilla Public
 License, v. 2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.

 Pale Moon Web Technologies Polyfill Add-on
 Copyright (c) 2020-22 Martok & Contributors. All rights reserved.

 Portions based on GitHub Web Components Polyfill Add-on
 Copyright (c) 2020 JustOff. All rights reserved.
 Copyright (c) 2022 SeaHOH. All rights reserved.
 https://github.com/JustOff/github-wc-polyfill

*/
"use strict";

const { encodeHTMLAttribute, sha256, print, alert } = require("util");
const settings = require("settings").getService();
const pf = require("polyfills");

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

const nsIContentPolicy = Ci.nsIContentPolicy;
const ENABLED_CONTENT_TYPES = new Set([nsIContentPolicy.TYPE_DOCUMENT, nsIContentPolicy.TYPE_SUBDOCUMENT, nsIContentPolicy.TYPE_SCRIPT]);

const _definitions = [
    {
        selector: ["cdn.sstatic.net/Js/full-anon.en.js?v=*$script"],
        fix: ["$script", "stackexchange-optchain"]
    },
    {
        selector: ["www.dhl.de/etc.clientlibs/redesign/clientlibs/clientlibs-head.min.c1ad054852ef2c65cdaf76f87f21abb3.js$script"],
        fix: ["$script", "dhl-optchain"]
    },
    {
        selector: ["github.com", "gist.github.com"],
        fix: ["std-PerformanceObserver", "std-queueMicrotask", "gh-temp-oldindex2", "gh-compat", "sm-gh-extra", "sm-cookie"]
    },
    {
        selector: ["github.com/socket-worker.js$script", "gist.github.com/socket-worker.js$script",
                   "github.com/assets-cdn/worker/socket-worker-*.js$script", "gist.github.com/assets-cdn/worker/socket-worker-*.js$script"],
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
        selector: ["www.pixiv.net"],
        fix: ["std-customElements"]
    },
    {
        selector: ["www.redditstatic.com/desktop2x/CommentsPage.*.js$script"],
        fix: ["$script", "reddit-comments-regexp"]
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
        case "gh-integrity":
            // strip any and all integrity from directly loaded files
            // FIXME: this is waaaay to general. should only do this for scripts we know will get modified?
            contentReplace.push([/integrity="sha512-[^"]+" (?=src="https:\/\/github.githubassets.com\/assets\/.+?\.js"><\/script>)/g, ""]);
            break;
        case "gh-temp-oldindex2":
            contentReplace.push([/<script.+chunk-index2-[a-z0-9]+\.js"><\/script>/, ""]);
            script.push({"defer": "defer",
                          "integrity": "sha512-o/3J98IT190CWjNtrpkWpVUdnrkKSwQ1jDFOagsCc8ZvvyaqewKygiqxbxF/Z/BzHnrUvLkTe43sQ/D4PAyGRA==",
                          "data-module-id": "./chunk-index2.js",
                          "data-src": "https://github.githubassets.com/assets/chunk-index2-a3fdc9f7.js"});
            break;
        case "gh-script-optchain":
            // works only for this specific minimizer output...
            contentReplace.push([/([a-zA-Z]+)\?\?/g, "((typeof($1)!==undefined)&&($1!==null))?($1):"]);
            contentReplace.push([`this.matchFields?.join("-")`, `((y)=>y?y.join("-"):y)(this.matchFields)`]);
            contentReplace.push([`H.integrity=S.sriHashes[t],`, ``]);
            break;
        case "gh-worker-csp":
            csp["worker-src"].push("github.githubassets.com");
            break;
        case "gl-script":
            contentReplace.push([String.raw`/^&(?<iid>\d+)$/`, String.raw`/^&(\d+)$/`]);
            contentReplace.push([`.groups.iid`, `[1]`]);
            // https://gitlab.com/gitlab-org/gitlab/-/merge_requests/79161
            contentReplace.push([String.raw`/^(?<indent>\s*)(?<leader>((?<isUl>[*+-])|(?<isOl>\d+\.))( \[([xX\s])\])?\s)(?<content>.)?/`, String.raw`/^(\s*)((([*+-])|(\d+\.))( \[([xX\s])\])?\s)(.)?/`]);
            // indent: 1, leader: 2, isUl: 4, isOl: 5, content: 8
            // const{indent:r,leader:o}=t.groups,
            contentReplace.push([/\{indent:(.),leader:(.)\}=(.)\.groups/, "[$1,$2]=[$3[1],$3[2]]"]);
            // const{leader:n,indent:i,content:s,isOl:a}=o.groups
            contentReplace.push([/\{leader:(.),indent:(.),content:(.),isOl:(.)\}=(.)\.groups/, "[$1,$2,$3,$4]=[$5[2],$5[1],$5[8],$5[5]]"]);
            // {indent:i,isOl:s}=null!==(n=null==e?void 0:e.groups)&&void 0!==n?n:{}
            contentReplace.push([/\{indent:(.),isOl:(.)\}=null!==\((.)=null==(.)\?void 0:.\.groups\)&&void 0!==.\?.:{}/, "[$1,$2]=(null!==$4?[$4[1],$4[5]]:[])"]);
            break;
        case "godbolt-script":
            contentReplace.push([`_languageId;_loadingTriggered;_lazyLoadPromise;_lazyLoadPromiseResolve;_lazyLoadPromiseReject;constructor(e){`,
                                 `constructor(e){this._languageId=this._loadingTriggered=this._lazyLoadPromise=this._lazyLoadPromiseResolve=this._lazyLoadPromiseReject=null;`]);
            break;
        case "reddit-comments-regexp":
            contentReplace.push([String.raw`/(?:reddit\.com\/r\/)(?<subreddit>[\w]+)(?:\/comments\/)?(?<postId>[\w]+)?/`, String.raw`/(?:reddit\.com\/r\/)([\w]+)(?:\/comments\/)?([\w]+)?/`]);
            contentReplace.push([String.raw`var s;const{subreddit:o,postId:r}=(null===(s=t.match(i))||void 0===s?void 0:s.groups)||{};`, String.raw`const s=t.match(i),o=null===s[1]?void 0:s[1],r=null===s[2]?void 0:s[2];`]);
            break;
        case "stackexchange-optchain":
            contentReplace.push([String.raw`const a=n?.toString().replace(/#.*$/,"")`, String.raw`const a = n === null || n === void 0 ? void 0 : n.toString().replace(/#.*$/, "")`]);
            break;
        /* browser-specific fixes */
        case "sm-gh-extra":
            if (service.isSeaMonkey) {
              script.push(pf.Element_toggleAttribute);
              script.push(pf.Array_flat);
              script.push(pf.Array_flatMap);
              script.push(pf.String_matchAll);
            }
            break;
        default:
            return false;
    }
    return true;
}


class RuleSelector {
    constructor (domain) {
        this.domain = domain
        this.path = undefined
        this.policyTypes = new Set();
    }

    /*
      Filter Syntax is basic https://adblockplus.org/filter-cheatsheet
      Limititations: Domain part MUST be present
                     only type options apply
                     path component may contain exactly 1 wildcard "*"
      Example:
        example.com
        example.com/path/a.html
        example.com/path/to.js$script
        example.com$subdocument
    */
    static parse(selstr) {
        const [, url, suffix] = RuleSelector.RE_SUFFIX.exec(selstr);
        if (!url) {
            throw new SyntaxError("URL part missing");
        }
        const opts = suffix?suffix.split(","):[];
        const ps = url.indexOf("/");
        const domain = (ps < 0) ? url : url.substring(0, ps);
        const path = (ps < 0) ? "" : url.substr(ps);
        if (!domain) {
            throw new SyntaxError("Domain part missing");
        }
        const selector = new RuleSelector(domain);
        if (path) {
            if (path.indexOf("*") < 0) {
                selector.path = path;
            } else {
                selector.path = path.split("*");
            }
        }
        for (const o of opts) {
            switch (o) {
                case "document":
                    selector.policyTypes.add(nsIContentPolicy.TYPE_DOCUMENT);
                    break;
                case "subdocument":
                    selector.policyTypes.add(nsIContentPolicy.TYPE_SUBDOCUMENT);
                    break;
                case "script":
                    selector.policyTypes.add(nsIContentPolicy.TYPE_SCRIPT);
                    break;
                default:
                    throw new SyntaxError("Unknown option: " + o);
            }
        }
        if (!selector.policyTypes.size) {
            selector.policyTypes.add(nsIContentPolicy.TYPE_DOCUMENT);
            selector.policyTypes.add(nsIContentPolicy.TYPE_SUBDOCUMENT);
        }
        return selector;
    }
}
RuleSelector.RE_SUFFIX = /^(.*?)(?:\$((?:(?:document|script|subdocument)(?:,(?!$)|$))+))?$/;


class RuleEngine {
    constructor () {
        this.selectors = new Map();
        this.enabledDomains = new Set();
    }

    clear() {
        this.selectors.clear();
        this.enabledDomains.clear();
    }

    _maybeRaiseSyntaxError(except, raiseErrors, context) {
        if (raiseErrors) {
            throw new SyntaxError("Error on parsing " + context + "\n" + except.message);
        }
        print("Error on parsing " + context + "\n" + except.message);
    }

    addRulesFromDict(defs, raiseErrors=false) {
        let processed = 0;
        let accepted = 0;
        for (const defn of defs) {
            const fixset = new Set(defn.fix);
            for (const selstr of defn.selector) {
                processed++;
                try {
                    const selector = RuleSelector.parse(selstr);
                    if (selector) {
                        this.enabledDomains.add(selector.domain);
                        this.selectors.set(selector, fixset);
                        accepted++;
                    }
                } catch (e) {
                    if (e instanceof SyntaxError) {
                      this._maybeRaiseSyntaxError(e, raiseErrors, selstr);
                    } else {
                        throw e;
                    }
                }
            }
        }
        return [accepted, processed];
    }

    addRulesFromString(script, raiseErrors=false) {
        let processed = 0;
        let accepted = 0;
        const lines = script.split(/\r\n|\r|\n/);
        let selectors = [];
        for (const line of lines) {
            if (!line) continue;
            if (line.startsWith("!")) continue;
            processed++;

            try {
                if (line.startsWith(" ") || line.startsWith("\t")) {
                    if (!selectors.length) {
                        throw new SyntaxError("Fixes without preceding selector");
                    }
                    const fixset = new Set();
                    for (const f of line.trim().split(",").filter(s => !!s.length)) {
                        fixset.add(f);
                    }
                    if (fixset.size) {
                        for (const selector of selectors) {
                            this.enabledDomains.add(selector.domain);
                            this.selectors.set(selector, fixset);
                        }
                    }
                    selectors = [];
                } else {
                    const selector = RuleSelector.parse(line);
                    if (selector) {
                        selectors.push(selector);
                    }
                }
                accepted ++;
            } catch (e) {
                if (e instanceof SyntaxError) {
                  this._maybeRaiseSyntaxError(e, raiseErrors, line);
                } else {
                    throw e;
                }
            }
        }
        if (selectors.length) {
            this._maybeRaiseSyntaxError(new SyntaxError("Final group missing fixes"), raiseErrors, "");
        }
        return [accepted, processed];
    }

    isSiteEnabled(hostname) {
        return this.enabledDomains.has(hostname);
    }

    getApplicable(URI, contentPolicy) {
        const applied = new Set();
        for (const [selector, fixes] of this.selectors.entries()) {
            if (!selector.policyTypes.has(contentPolicy)) continue;
            if (selector.domain !== URI.host) continue;
            switch (typeof selector.path) {
                case "string":
                    if (selector.path !== URI.path) continue;
                    break;
                case "object":
                    if (!URI.path.endsWith(selector.path[1])) continue;
                    if (!URI.path.startsWith(selector.path[0])) continue;
                    break;
            }
            for (const f of fixes) {
                applied.add(f);
            }
        }
        if (!applied.size) {
            return null;
        }
        return applied;
    }
}


class MergedFix {
    constructor (fixes) {
        this.fixes = fixes;
        this.compiled = false;
    }

    ensureCompiled() {
        if (this.compiled)
            return;

        const scripts = [];
        const csp = {'script-src': [], 'worker-src': []};
        const contentReplace = [];
        // for each selected fix, append it and it's consequences to a list
        for (const item of this.fixes) {
            if (!evaluateFix(item, scripts, csp, contentReplace)) {
                print("Error in fix evaluation: ", item);
            };
        }
        // collect all consequences into easy to apply fields
        this.scripts = "";
        this.csp = {};
        this.contentReplace = contentReplace;
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
                this.scripts += scr.join(' ');
            }
        }
        for (const [p, s] of Object.entries(csp)) {
            if (s) {
                const uniq_sources = [... new Set(s)];
                this.csp[p] = uniq_sources.join(' ');
            }
        }
        // hash it
        const inlinehash = 'sha256-' + sha256(inline);
        // store output
        if (inline && inlinehash) {
            this.scripts += `<script type="text/javascript" >${inline}</script>`;
            if (this.csp["script-src"])
                this.csp["script-src"] = this.csp["script-src"] + " " + `'${inlinehash}'`;
            else
                this.csp["script-src"] = `'${inlinehash}'`;
        }
        this.compiled = true;
    }

    isModifyScriptContent() {
        return this.fixes.includes("$script");
    }
}


class PolyfillService {
    constructor() {
        this.isSeaMonkey = Services.appinfo.name == "SeaMonkey";
        this.fixCache = new Map();
        this.rules = new RuleEngine();
        this.rules.addRulesFromDict(_definitions);
        this.exclusion = new RuleEngine();
        this.exclusion.addRulesFromString(settings.getJSONPref("exclusion") || "");
        settings.onPrefChanged.on(this._prefChanged, this);
    }

    destroy() {
        settings.onPrefChanged.remove(this._prefChanged, this);
    }

    _prefChanged(pref) {
        print("pref changed: ", pref);
        switch (pref) {
            case "exclusion":
                this.exclusion.clear();
                this.exclusion.addRulesFromString(settings.getJSONPref("exclusion") || "");
                break;
        }
    }

    isSiteEnabled(URI) {
        return this.rules.isSiteEnabled(URI.host);
    }

    getFixes(URI, contentPolicy) {
        const fset = this.rules.getApplicable(URI, contentPolicy);
        if (fset === null) {
            return null;
        }
        const excluded = this.exclusion.getApplicable(URI, contentPolicy);
        if (excluded !== null) {
            if (excluded.has("*")) {
                fset.clear()
            } else {
                for (const x of excluded) {
                    fset.delete(x);
                }
            }
        }
        if (!fset.size) {
            return null;
        }
        const aapplied = Array.sort([...fset]);
        const key = aapplied.join('+');
        let fixes = this.fixCache.get(key);
        if (typeof fixes === "undefined") {
            fixes = new MergedFix(aapplied);
            this.fixCache.set(key, fixes);
        }
        return fixes;
    }

    modifyContentSecurityPolicy(csp, activeFixes) {
        activeFixes.ensureCompiled();
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
        activeFixes.ensureCompiled();
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
TracingListener.QueryInterface = XPCOMUtils.generateQI([Ci.nsIStreamListener, Ci.nsISupports]);


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

        // full test
        const fixes = service.getFixes(subject.URI, subject.loadInfo.externalContentPolicyType);
        if (fixes === null) {
            return;
        }
        switch (topic) {
            case "http-on-examine-response":
            case "http-on-examine-cached-response":
                if ([200, 304].includes(subject.responseStatus)) {
                    try {
                        print("applied fixes to ", subject.URI.spec, ": ", fixes.fixes);
                        let csp = this.safeGetResponseHeader(subject, "Content-Security-Policy");
                        if (!!csp) {
                            csp = service.modifyContentSecurityPolicy(csp, fixes);
                            subject.setResponseHeader("Content-Security-Policy", csp, false);
                        }

                        const mod_content = this.isHTMLDocument(subject) || (this.isScript(subject) && fixes.isModifyScriptContent());
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
HTTPObserver.QueryInterface = XPCOMUtils.generateQI([Ci.nsIObserver, Ci.nsISupportsWeakReference]);


function _optionsDisplayed(xul) {
    const btnApply = xul.getElementById("palefill-exclusion-apply");
    const txtFilters = xul.getElementById("palefill-exclusion-list");
    txtFilters.value = settings.getJSONPref("exclusion") || "";
    btnApply.addEventListener("click", () => {
        const newText = txtFilters.value.trim();
        const tmpRules = new RuleEngine();
        try {
            const [a, p] = tmpRules.addRulesFromString(newText, true);
            if (a == p) {
                settings.setJSONPref("exclusion", newText);
                alert("Palefill", `Success! Saved.`);
            } else {
                alert("Palefill", `Successfully parsed ${a}/${p} lines. Check debug output for details.`);
            }
        } catch (e) {
            if (e instanceof SyntaxError) {
              alert("Palefill", e.message);
            } else {
                throw e;
            }
        }
    });
}


var service = null;
var httpObserver = null;

function init() {
    service = new PolyfillService();
    httpObserver = new HTTPObserver();
    Services.obs.addObserver(httpObserver, "http-on-examine-response", false);
    Services.obs.addObserver(httpObserver, "http-on-examine-cached-response", false);
    if (service.isSeaMonkey) {
        Services.obs.addObserver(httpObserver, "http-on-modify-request", false);
    }
    settings.onOptionsDisplayed.on(_optionsDisplayed);
}

function done() {
    settings.onOptionsDisplayed.remove(_optionsDisplayed);
    if (service.isSeaMonkey) {
        Services.obs.removeObserver(httpObserver, "http-on-modify-request", false);
    }
    Services.obs.removeObserver(httpObserver, "http-on-examine-cached-response", false);
    Services.obs.removeObserver(httpObserver, "http-on-examine-response", false);
    httpObserver = null;
    service.destroy();
    service = null;
}

exports = {
    init,
    done
}
