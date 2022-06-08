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

const { alert, cspJoinHeader, cspSplitHeader, encodeHTMLAttribute, print, setCompare, sha256 } = require("util");
const settings = require("settings").getService();
const pf = require("polyfills");

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

const nsIContentPolicy = Ci.nsIContentPolicy;
const ENABLED_CONTENT_TYPES = new Set([nsIContentPolicy.TYPE_DOCUMENT, nsIContentPolicy.TYPE_SUBDOCUMENT, nsIContentPolicy.TYPE_SCRIPT]);

var gService = null;
var gHttpObserver = null;

function evaluateFix(fix, script, csp, contentReplace) {
    switch(fix) {
        /* marker */
        case "$script-content":     // apply also to script content
        case "sm-cookie":           // re-set request cookie in SeaMonkey
            break;
        /* standard technologies */
        case "std-customElements":
            script.push(pf.Window_customElements);
            break;
        case "std-IntlRelativeTimeFormat":
            script.push(pf.Intl_RelativeTimeFormat_dummy);
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
            script.push(pf.Element_hidden);
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
            contentReplace.push([`_onDidChange=new l.Emitter;_onDidExtraLibsChange=new l.Emitter;_extraLibs;_removedExtraLibs;_eagerModelSync;_compilerOptions;_diagnosticsOptions;_workerOptions;_onDidExtraLibsChangeTimeout;_inlayHintsOptions;constructor(e,t,i,n){`,
                                 `constructor(e,t,i,n){this._onDidChange=new l.Emitter;this._onDidExtraLibsChange=new l.Emitter;this._compilerOptions=this._diagnosticsOptions=this._workerOptions=this._inlayHintsOptions=null;`]);
            contentReplace.push([`_modeId;_defaults;_configChangeListener;_updateExtraLibsToken;_extraLibsChangeListener;_worker;_client;constructor(e,t){`,
                                 `constructor(e,t){`]);
            // now they're just trolling us - most of these aren't even efficient encodings
            contentReplace.push([`}_libFiles;_hasFetchedLibFiles;_fetchLibFilesPromise;`,
                                 `}`]);
            contentReplace.push([`}_disposables=[];_listener=Object.create(null);dispose()`,
                                 `}dispose()`]);
            contentReplace.push([`v=class extends p{constructor(e,t,i,n){`,
                                 `v=class extends p{constructor(e,t,i,n){this._disposables=[];this._listener=Object.create(null);`]);
            contentReplace.push([`i.kindModifiers?.indexOf("deprecated")`,
                                 `(i.kindModifiers==null?null:i.kindModifiers.indexOf("deprecated"))`]);
            contentReplace.push([`{signatureHelpTriggerCharacters=["(",","];`,
                                 `{`]);
            break;
        case "reddit-comments-regexp":
            contentReplace.push([String.raw`/(?:reddit\.com\/r\/)(?<subreddit>[\w]+)(?:\/comments\/)?(?<postId>[\w]+)?/`, String.raw`/(?:reddit\.com\/r\/)([\w]+)(?:\/comments\/)?([\w]+)?/`]);
            contentReplace.push([String.raw`var s;const{subreddit:o,postId:r}=(null===(s=t.match(i))||void 0===s?void 0:s.groups)||{};`, String.raw`const s=t.match(i),o=!s||null==s[1]?void 0:s[1],r=!s||null==s[2]?void 0:s[2];`]);
            break;
        case "tmx-optchain":
            contentReplace.push([`args.order2?.value`,
                                 `(args.order2===null?null:args.order2.value)`]);
        case "vt-nomodule":
            contentReplace.push([`nomodule=""`, ""]);
            contentReplace.push([`"noModule"`, `"$$noModule$$"`]);
        /* browser-specific fixes */
        case "sm-gh-extra":
            if (gService.isSeaMonkey) {
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

function supersededFixes(service) {
    // Declare fixes that are not needed anymore by certain versions of the ecosystem.
    // Mostly decided based on supported syntax tested by the PolyfillService, may also make assumptions
    // about other things based on these for simplicity.
    // Keep entries in each block in the same order as in evaluateFix's switch statement
    const superseded = new Set();
    if (service.isOptionalChainingSupported) {
        superseded.add("std-queueMicrotask");
        superseded.add("dhl-optchain");
        superseded.add("tmx-optchain");
    }
    if (service.isNullishCoalescingSupported) {
        superseded.add("gh-script-optchain");
    }
    return superseded;
}


class RuleSelector {
    constructor (domain) {
        this.domain = domain;
        this.path = undefined;
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

    compareExceptDomain(other) {
        return (typeof this.path === typeof other.path) &&
               (typeof this.path==="object" ? (this.path[0] === other.path[0] && this.path[1] === other.path[1]) : this.path === other.path) &&
               setCompare(this.policyTypes, other.policyTypes);
    }

    matchPath(path) {
        const selp = this.path;
        switch (typeof selp) {
            case "string":
                if (selp !== path)
                    return false;
                break;
            case "object":
                if (!path.endsWith(selp[1]))
                    return false;
                if (!path.startsWith(selp[0]))
                    return false;
                break;
        }
        return true;
    }
}
RuleSelector.RE_SUFFIX = /^(.*?)(?:\$((?:(?:document|script|subdocument)(?:,(?!$)|$))+))?$/;


/*
  Rule Engine Compiled Decision Tree
  Requirements:
    - early-out based on domain name
    - handle wildcards in final name of domains (not anywhere "up" the tree)
    - share RuleSelector if same fixset (memory optimization)
  Tree:
    'com':
      'github':
        '': [sel1]
        'gist': [sel1, sel2]
*/


class RuleEngine {
    constructor () {
        this.selectors = new Map();
        this.tree = {};
    }

    clear() {
        this.selectors.clear();
        this.tree = {};
    }

    _maybeRaiseSyntaxError(except, raiseErrors, context) {
        if (raiseErrors) {
            throw new SyntaxError("Error on parsing " + context + "\n" + except.message);
        }
        print("Error on parsing " + context + "\n" + except.message);
    }

    _domainSplit(domainPattern) {
        // return [...domainPattern].reverse().join("").split(".");
        const r = domainPattern.split(".");
        r.reverse();
        return r;
    }

    _treeAdd(domainPattern, selector) {
        const dcomp = this._domainSplit(domainPattern);

        let node = this.tree;
        let leaf = null;
        for (let i=0; i < dcomp.length; i++) {
            const c = dcomp[i];
            if ("*" === c) {
                leaf = node[c] = (node[c] || new Set());
                break;
            }
            node = node[c] = (node[c] || {});
        }
        if (null == leaf) {
            // ended here without a wildcard -> leaf is the explicit empty entry
            leaf = node[""] = (node[""] || new Set());
        }
        leaf.add(selector);
    }

    _treeFind(domain, testonly) {
        const dcomp = this._domainSplit(domain);
        const selectors = new Set();

        let node = this.tree;
        let sset;
        for (let i=0; i < dcomp.length; i++) {
            const c = dcomp[i];
            if ((sset = node["*"] || false) !== false) {
                if (testonly) return true;
                for (const s of sset) selectors.add(s);
            }
            node = node[c];
            if (!node) {
                // no more subdomains can match, resultset is at most any wildcards encountered up to here
                break;
            }
        }
        if (node) {
            // last domain part matched something
            if ((sset = node[""] || false) !== false) {
                if (testonly) return true;
                for (const s of sset) selectors.add(s);
            }
        }
        if (testonly) return false;
        return selectors;
    }

    _addRule(selector, fixset) {
        let usedSel = selector;
        // if the same selector and fixset already exists for another domain, reuse that to save memory
        for (const [sel, fix] of this.selectors.entries()) {
            if (setCompare(fixset, fix) && selector.compareExceptDomain(sel)) {
                usedSel = sel;
                break;
            }
        }
        if (usedSel === selector) {
            // no alias found, add new
            this.selectors.set(usedSel, fixset);
        }
        this._treeAdd(selector.domain, usedSel);
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
                        this._addRule(selector, fixset);
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
                            this._addRule(selector, fixset);
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

    removeFixes(fixset) {
        // recursively remove all invocations of the specified fixes from the current state
        const emptied = [];
        for (const [sel, fset] of this.selectors.entries()) {
            for (const x of fixset) {
                fset.delete(x);
            }
            if (fset.size == 1) {
                fset.delete("$script-content");
            }
            if (!fset.size) {
                emptied.push(sel);
            }
        }
        if (!emptied.length) return;
        // if any selector becomes empty, remove it from the map
        for (const sel of emptied) {
            this.selectors.delete(sel);
        }
        // remove all references to the deleted selectors from the tree, then simplify
        const purgeNodes = (node) => {
            let processed = 0;
            let purged = 0;
            for (const [k, c] of Object.entries(node)) {
                processed++;
                // is this a leaf node?
                if (c instanceof Set) {
                    for (const sel of emptied) {
                        c.delete(sel);
                    }
                    // if the leaf is now empty, remove it
                    if (!c.size) {
                        delete node[k];
                        purged++;
                    }
                } else {
                    // container node, process its children and remove if empty
                    if (purgeNodes(c)) {
                        delete node[k];
                        purged++;
                    }
                }
            }
            return purged == processed;
        };
        purgeNodes(this.tree);
    }

    isSiteEnabled(hostname) {
        return this._treeFind(hostname, true);
    }

    getApplicable(URI, contentPolicy) {
        const selectors = this._treeFind(URI.host, false);
        const applied = new Set();
        for (const selector of selectors) {
            if (!selector.policyTypes.has(contentPolicy)) continue;
            if (!selector.matchPath(URI.path)) continue;
            const fixes = this.selectors.get(selector);
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
        // coalesce inline scripts, create elements for external resources
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
        // hash the inline script and add script-src csp
        if (inline) {
            this.scripts += `<script type="text/javascript" >${inline}</script>`;
            csp['script-src'].push("'sha256-" + sha256(inline) + "'");
        }
        // convert CSP array to header text
        for (const [p, s] of Object.entries(csp)) {
            if (s.length) {
                const uniq_sources = [... new Set(s)];
                this.csp[p] = uniq_sources.join(' ');
            }
        }
        this.compiled = true;
    }

    isModifyScriptContent() {
        return this.fixes.includes("$script-content");
    }
}


class PolyfillService {
    constructor() {
        this.isSeaMonkey = Services.appinfo.name == "SeaMonkey";
        this.isPaleMoon = Services.appinfo.name == "Pale Moon";
        this.isOptionalChainingSupported = this._checkSyntax("foo?.bar");
        this.isNullishCoalescingSupported = this._checkSyntax("foo??bar");
        this.isNamedCapturingGroupSupported = this._checkSyntax("/(?<Name>x)/");
        this.fixCache = new Map();
        this.rules = new RuleEngine();
        this.exclusion = new RuleEngine();
        this._loadRules();
        settings.onPrefChanged.on(this._prefChanged, this);
    }

    destroy() {
        settings.onPrefChanged.remove(this._prefChanged, this);
    }

    _loadRules() {
        this.rules.clear();
        this.rules.addRulesFromString(require("builtin-rules"));
        this.rules.addRulesFromDict(this._getGitlabRules());
        this.exclusion.clear();
        this.exclusion.addRulesFromString(settings.getJSONPref("exclusion") || "");
        this.rules.removeFixes(supersededFixes(this));
    }

    _getGitlabRules() {
        const urls = [...require("builtin-gitlabs").split("\n"), ...settings.getPref("gitlab-urls").split(",")];
        let selbase = [];
        let selscript = [];
        for (const url of urls) {
            const b = url.replace(/(^\s+)|([\/\s]+$)/g, "");
            if (!b) continue;
            selbase.push(b);
            selscript.push(b + "/assets/webpack/*.chunk.js$script");
        }
        return [
            {selector: selbase, fix: ["std-customElements"]},
            {selector: selscript, fix: ["$script-content","gl-script"]},
        ];
    }

    _prefChanged(pref) {
        print("pref changed: ", pref);
        switch (pref) {
            case "exclusion":
                this.exclusion.clear();
                this.exclusion.addRulesFromString(settings.getJSONPref("exclusion") || "");
                break;
            case "gitlab-urls":
                this._loadRules();
                break;
        }
    }

    _checkSyntax(fragment) {
        try {
            Function(fragment);
        } catch(e) {
            return false;
        }
        return true;
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
        // no change required
        if (!Object.getOwnPropertyNames(activeFixes.csp).length) {
            return csp;
        }
        // parse map
        const policies = cspSplitHeader(csp);
        // append new rules
        for (const [dir, val] of Object.entries(activeFixes.csp)) {
            if (policies.hasOwnProperty(dir)) {
                policies[dir].push(val);
            } else {
                // special case: don't introduce a script-src policy if the only use is our inline script
                // (this check works because the hash signed script is always the last in the list, after all required domains)
                if ("script-src" === dir && val.startsWith("'sha256-")) {
                    continue;
                }
                policies[dir] = val;
            }
        }
        // reassemble the new policies
        csp = cspJoinHeader(policies);
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
            data = gService.modifyRequestData(data, this.activeFixes);
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
        if (!gService.isSiteEnabled(subject.URI)) return;

        // full test
        const fixes = gService.getFixes(subject.URI, subject.loadInfo.externalContentPolicyType);
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
                            csp = gService.modifyContentSecurityPolicy(csp, fixes);
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
                if (gService.isSeaMonkey && fixes.a.includes("sm-cookie")) {
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
    const toJSON = (obj, begins="") => {
        const ret = {};
        for (const key in obj) {
            if (!key.startsWith(begins)) continue;
            try {
                const d = obj[key];
                if (d instanceof Function) continue;
                ret[key] = (d instanceof Object) ? toJSON(d) : d;
            } catch {}
        }
        return ret;
    }

    const pnPlatformError = xul.getElementById("palefill-platform-error");
    const btnDumpPlatform = xul.getElementById("palefill-dump-platform");
    const txtFilters = xul.getElementById("palefill-exclusion-list");
    const btnApply = xul.getElementById("palefill-exclusion-apply");
    switch(gAddonData.runtimeMode) {
        case "INVALID":
            // won't even get here, sees the default error from update.xul
            break;
        case "UXP-GENERIC": {
            // replace error with warning text
            pnPlatformError.classList.replace("error", "warning");
            const icon = pnPlatformError.getElementsByClassName("error-icon")[0];
            const text = pnPlatformError.getElementsByClassName("global-error-text")[0];
            icon.classList.replace("error-icon", "warning-icon");
            text.style.display = "none"; // force XUL reflow after change
            text.removeAttribute("value");
            text.textContent = "Palefill auto-detected that this browser is UXP-based, but not officially supported. Some things may or may not work as expected.";
            text.style.display = "";
            break;
        }
        case "SUPPORTED":
            // all good
            pnPlatformError.nextElementSibling.setAttribute("first-row","true");
            pnPlatformError.remove();
            break;
    }
    btnDumpPlatform.addEventListener("click", () => {
        const info = {
            "PolyfillService": toJSON(gService, "is"),
            "appInfo": toJSON(Services.appinfo),
            "addonData": toJSON(gAddonData),
        };
        delete info["addonData"]["installPath"];
        console.log(JSON.stringify(info, null, '\t'));
    });
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


function init() {
    gService = new PolyfillService();
    gHttpObserver = new HTTPObserver();
    Services.obs.addObserver(gHttpObserver, "http-on-examine-response", false);
    Services.obs.addObserver(gHttpObserver, "http-on-examine-cached-response", false);
    if (gService.isSeaMonkey) {
        Services.obs.addObserver(gHttpObserver, "http-on-modify-request", false);
    }
    settings.onOptionsDisplayed.on(_optionsDisplayed);
}

function done() {
    settings.onOptionsDisplayed.remove(_optionsDisplayed);
    if (gService.isSeaMonkey) {
        Services.obs.removeObserver(gHttpObserver, "http-on-modify-request", false);
    }
    Services.obs.removeObserver(gHttpObserver, "http-on-examine-cached-response", false);
    Services.obs.removeObserver(gHttpObserver, "http-on-examine-response", false);
    gHttpObserver = null;
    gService.destroy();
    gService = null;
}

exports = {
    init,
    done
}
