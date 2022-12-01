/*
 This Source Code Form is subject to the terms of the Mozilla Public
 License, v. 2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.

 Palefill Web Technologies Polyfill Add-on
 Copyright (c) 2020-22 Martok & Contributors. All rights reserved.

 Portions based on GitHub Web Components Polyfill Add-on
 Copyright (c) 2020 JustOff. All rights reserved.
 Copyright (c) 2022 SeaHOH. All rights reserved.
 https://github.com/JustOff/github-wc-polyfill


Element.prototype.toggleAttribute, Array.prototype.flat, Window.queueMicrotask
Copyright (c) 2005-2020 Mozilla and individual contributors.
https://developer.mozilla.org/docs/Web/API/Element/toggleAttribute
https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/flat
https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/queueMicrotask


Array.prototype.flatMap polyfill
Copyright (c) 2017 Aluan Haddad.
https://github.com/aluanhaddad/flat-map

Custom Elements polyfill
Copyright (c) 2020 The Polymer Project Authors. All rights reserved.
https://github.com/webcomponents/polyfills


DarkTree ShadowDOM Polyfill
Copyright (c) 2022 Martok
https://github.com/martok/js-darktree


String.prototype.matchAll polyfill
Copyright (c) 2022 SeaHOH
https://github.com/JustOff/github-wc-polyfill/commit/1b0e52569a430dabd9d7d680cbb6f4209e77a377
*/
"use strict";

const { jss } = require("util");

/*
To ensure proper escaping, use the template tag "jss".
Then, escape in content:
   `   as \`
   ${  as \${
No other changes (escape sequences, backslashes...) required.
*/

exports.Element_toggleAttribute = jss`if (typeof Element.prototype.toggleAttribute !== "function") {
  Element.prototype.toggleAttribute = function(name, force) {
    if(force !== void 0) force = !!force

    if (this.hasAttribute(name)) {
      if (force) return true;
      this.removeAttribute(name);
      return false;
    }
    if (force === false) return false;

    this.setAttribute(name, "");
    return true;
  };
}
`;

exports.Array_flatMap = jss`if (typeof Array.prototype.flatMap !== "function") {
  function flattenIntoArray(target, source, start, depth, mapperFunction, thisArg) {
    const mapperFunctionProvied = mapperFunction !== undefined;
    let targetIndex = start;
    let sourceIndex = 0;
    const sourceLen = source.length;
    while (sourceIndex < sourceLen) {
      const p = sourceIndex;
      const exists = !!source[p];
      if (exists === true) {
        let element = source[p];
        if (element) {
          if (mapperFunctionProvied) {
            element = mapperFunction.call(thisArg, element, sourceIndex, target);
          }
          const spreadable = Object.getOwnPropertySymbols(element).includes(Symbol.isConcatSpreadable) || Array.isArray(element);
          if (spreadable === true && depth > 0) {
            const nextIndex = flattenIntoArray(target, element, targetIndex, depth - 1);
            targetIndex = nextIndex;
          } else {
            if (!Number.isSafeInteger(targetIndex)) {
              throw TypeError();
            }
            target[targetIndex] = element;
          }
        }
      }
      targetIndex += 1;
      sourceIndex += 1;
    }
    return targetIndex;
  }
  function arraySpeciesCreate(originalArray, length) {
    const isArray = Array.isArray(originalArray);
    if (!isArray) {
      return Array(length);
    }
    let C = Object.getPrototypeOf(originalArray).constructor;
    if (C) {
      if (typeof C === 'object' || typeof C === 'function') {
        C = C[Symbol.species.toString()];
        C = C !== null ? C : undefined;
      }
      if (C === undefined) {
        return Array(length);
      }
      if (typeof C !== 'function') {
        throw TypeError('invalid constructor');
      }
      const result = new C(length);
      return result;
    }
  }
  Array.prototype.flatMap = function flatMap(callbackFn, thisArg) {
    const o = Object(this);
    if (!callbackFn || typeof callbackFn.call !== 'function') {
      throw TypeError('callbackFn must be callable.');
    }
    const t = thisArg !== undefined ? thisArg : undefined;
    const a = arraySpeciesCreate(o, o.length);
    flattenIntoArray(a, o, 0, 1, callbackFn, t);
    return a.filter(x => x !== undefined, a);
  };
}`;

exports.Array_flat = jss`if (typeof Array.prototype.flat !== "function") {
  Array.prototype.flat = function() {
    var depth = arguments[0];
    depth = depth === undefined ? 1 : Math.floor(depth);
    if (depth < 1) return Array.prototype.slice.call(this);
    return (function flat(arr, depth) {
      var len = arr.length >>> 0;
      var flattened = [];
      var i = 0;
      while (i < len) {
        if (i in arr) {
          var el = arr[i];
          if (Array.isArray(el) && depth > 0)
            flattened = flattened.concat(flat(el, depth - 1));
          else flattened.push(el);
        }
        i++;
      }
      return flattened;
    })(this, depth);
  };
}`;

exports.Blob_arrayBuffer = jss`(function() {
    function _convImpl(op) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = (evt) => resolve(reader.result);
            // TODO: translate to conforming exception object
            reader.onerror = (evt) => reject(evt);
            try {
                op(reader);
            } catch(e) {
                reject(e);
            }
        });
    }
    for (const cls of [Blob, File]) {
        const proto = cls.prototype;
        if (typeof proto.arrayBuffer !== "function") {
            proto.arrayBuffer = function() {
                return _convImpl(reader => reader.readAsArrayBuffer(this));
            };
        }
        if (typeof proto.text !== "function") {
            proto.text = function() {
                return _convImpl(reader => reader.readAsText(this, "utf8"));
            };
        }
    }
})()`;

exports.Function_toString_proxy = jss`(function() {
try {
    const dummy = Function.toString.call(new Proxy(()=>{}, {}));
} catch (e) {
    const old_fts = Function.toString;
    Function.prototype.toString = function() {
        try {
            return old_fts.call(this);
        } catch(e) {
            if (!!/incompatible/.exec(e)) {
                return "function () {\n    [native code]\n}";
            }
            throw e;
        }
    }
}})()
`

exports.String_matchAll = jss`if (typeof String.prototype.matchAll !== "function") {
  String.prototype.matchAll = function* (pattern) {
  let isRe = pattern instanceof RegExp, flags = "g", res = [];
  if (!isRe)
    // \$()*+,-.?[\]^{|}
    pattern = pattern.replace(/[\x24\x28-\x2e\x3f\x5b-\x5e\x7b-\x7d]/g, "\\$\&");
  else if (pattern.global)
    flags = pattern.flags;
  else
    flags += pattern.flags;
  pattern = new RegExp(pattern, flags);
  this.replace(pattern, function (...groups) {
    groups.input = groups.pop();
    groups.index = groups.pop();
    res.push(groups);
    return groups[0];
  });
  for (let m of res) yield m;
}}`;

exports.Intl_RelativeTimeFormat_dummy = jss`if (typeof Intl.RelativeTimeFormat !== "function") {
  Intl.RelativeTimeFormat = class {
      constructor(locales = "en", options = {}) {}
      format(value, unit) {
          const str = "" + Math.abs(0+value) + " " + unit;
          if (value<0) return str + " ago";
          return str;
      }
  };
}`;

exports.Window_queueMicrotask = jss`if (typeof self.queueMicrotask !== "function") {
  self.queueMicrotask = function (callback) {
    Promise.resolve()
      .then(callback)
      .catch(e => setTimeout(() => { throw e; })); // report exceptions
  };
}`;

exports.Window_customElements = jss`(function(){'use strict';var n=window.Document.prototype.createElement,p=window.Document.prototype.createElementNS,aa=window.Document.prototype.importNode,ba=window.Document.prototype.prepend,ca=window.Document.prototype.append,da=window.DocumentFragment.prototype.prepend,ea=window.DocumentFragment.prototype.append,q=window.Node.prototype.cloneNode,r=window.Node.prototype.appendChild,t=window.Node.prototype.insertBefore,u=window.Node.prototype.removeChild,v=window.Node.prototype.replaceChild,w=Object.getOwnPropertyDescriptor(window.Node.prototype,
"textContent"),y=window.Element.prototype.attachShadow,z=Object.getOwnPropertyDescriptor(window.Element.prototype,"innerHTML"),A=window.Element.prototype.getAttribute,B=window.Element.prototype.setAttribute,C=window.Element.prototype.removeAttribute,D=window.Element.prototype.getAttributeNS,E=window.Element.prototype.setAttributeNS,F=window.Element.prototype.removeAttributeNS,G=window.Element.prototype.insertAdjacentElement,H=window.Element.prototype.insertAdjacentHTML,fa=window.Element.prototype.prepend,
ha=window.Element.prototype.append,ia=window.Element.prototype.before,ja=window.Element.prototype.after,ka=window.Element.prototype.replaceWith,la=window.Element.prototype.remove,ma=window.HTMLElement,I=Object.getOwnPropertyDescriptor(window.HTMLElement.prototype,"innerHTML"),na=window.HTMLElement.prototype.insertAdjacentElement,oa=window.HTMLElement.prototype.insertAdjacentHTML;var pa=new Set;"annotation-xml color-profile font-face font-face-src font-face-uri font-face-format font-face-name missing-glyph".split(" ").forEach(function(a){return pa.add(a)});function qa(a){var b=pa.has(a);a=/^[a-z][.0-9_a-z]*-[-.0-9_a-z]*$/.test(a);return!b&&a}var ra=document.contains?document.contains.bind(document):document.documentElement.contains.bind(document.documentElement);
function J(a){var b=a.isConnected;if(void 0!==b)return b;if(ra(a))return!0;for(;a&&!(a.__CE_isImportDocument||a instanceof Document);)a=a.parentNode||(window.ShadowRoot&&a instanceof ShadowRoot?a.host:void 0);return!(!a||!(a.__CE_isImportDocument||a instanceof Document))}function K(a){var b=a.children;if(b)return Array.prototype.slice.call(b);b=[];for(a=a.firstChild;a;a=a.nextSibling)a.nodeType===Node.ELEMENT_NODE&&b.push(a);return b}
function L(a,b){for(;b&&b!==a&&!b.nextSibling;)b=b.parentNode;return b&&b!==a?b.nextSibling:null}
function M(a,b,c){for(var f=a;f;){if(f.nodeType===Node.ELEMENT_NODE){var d=f;b(d);var e=d.localName;if("link"===e&&"import"===d.getAttribute("rel")){f=d.import;void 0===c&&(c=new Set);if(f instanceof Node&&!c.has(f))for(c.add(f),f=f.firstChild;f;f=f.nextSibling)M(f,b,c);f=L(a,d);continue}else if("template"===e){f=L(a,d);continue}if(d=d.__CE_shadowRoot)for(d=d.firstChild;d;d=d.nextSibling)M(d,b,c)}f=f.firstChild?f.firstChild:L(a,f)}};function N(){var a=!(null===O||void 0===O||!O.noDocumentConstructionObserver),b=!(null===O||void 0===O||!O.shadyDomFastWalk);this.m=[];this.g=[];this.j=!1;this.shadyDomFastWalk=b;this.I=!a}function P(a,b,c,f){var d=window.ShadyDOM;if(a.shadyDomFastWalk&&d&&d.inUse){if(b.nodeType===Node.ELEMENT_NODE&&c(b),b.querySelectorAll)for(a=d.nativeMethods.querySelectorAll.call(b,"*"),b=0;b<a.length;b++)c(a[b])}else M(b,c,f)}function sa(a,b){a.j=!0;a.m.push(b)}function ta(a,b){a.j=!0;a.g.push(b)}
function Q(a,b){a.j&&P(a,b,function(c){return R(a,c)})}function R(a,b){if(a.j&&!b.__CE_patched){b.__CE_patched=!0;for(var c=0;c<a.m.length;c++)a.m[c](b);for(c=0;c<a.g.length;c++)a.g[c](b)}}function S(a,b){var c=[];P(a,b,function(d){return c.push(d)});for(b=0;b<c.length;b++){var f=c[b];1===f.__CE_state?a.connectedCallback(f):T(a,f)}}function U(a,b){var c=[];P(a,b,function(d){return c.push(d)});for(b=0;b<c.length;b++){var f=c[b];1===f.__CE_state&&a.disconnectedCallback(f)}}
function V(a,b,c){c=void 0===c?{}:c;var f=c.J,d=c.upgrade||function(g){return T(a,g)},e=[];P(a,b,function(g){a.j&&R(a,g);if("link"===g.localName&&"import"===g.getAttribute("rel")){var h=g.import;h instanceof Node&&(h.__CE_isImportDocument=!0,h.__CE_registry=document.__CE_registry);h&&"complete"===h.readyState?h.__CE_documentLoadHandled=!0:g.addEventListener("load",function(){var k=g.import;if(!k.__CE_documentLoadHandled){k.__CE_documentLoadHandled=!0;var l=new Set;f&&(f.forEach(function(m){return l.add(m)}),
l.delete(k));V(a,k,{J:l,upgrade:d})}})}else e.push(g)},f);for(b=0;b<e.length;b++)d(e[b])}
function T(a,b){try{var c=b.ownerDocument,f=c.__CE_registry;var d=f&&(c.defaultView||c.__CE_isImportDocument)?W(f,b.localName):void 0;if(d&&void 0===b.__CE_state){d.constructionStack.push(b);try{try{if(new d.constructorFunction!==b)throw Error("The custom element constructor did not produce the element being upgraded.");}finally{d.constructionStack.pop()}}catch(k){throw b.__CE_state=2,k;}b.__CE_state=1;b.__CE_definition=d;if(d.attributeChangedCallback&&b.hasAttributes()){var e=d.observedAttributes;
for(d=0;d<e.length;d++){var g=e[d],h=b.getAttribute(g);null!==h&&a.attributeChangedCallback(b,g,null,h,null)}}J(b)&&a.connectedCallback(b)}}catch(k){X(k)}}N.prototype.connectedCallback=function(a){var b=a.__CE_definition;if(b.connectedCallback)try{b.connectedCallback.call(a)}catch(c){X(c)}};N.prototype.disconnectedCallback=function(a){var b=a.__CE_definition;if(b.disconnectedCallback)try{b.disconnectedCallback.call(a)}catch(c){X(c)}};
N.prototype.attributeChangedCallback=function(a,b,c,f,d){var e=a.__CE_definition;if(e.attributeChangedCallback&&-1<e.observedAttributes.indexOf(b))try{e.attributeChangedCallback.call(a,b,c,f,d)}catch(g){X(g)}};
function ua(a,b,c,f){var d=b.__CE_registry;if(d&&(null===f||"http://www.w3.org/1999/xhtml"===f)&&(d=W(d,c)))try{var e=new d.constructorFunction;if(void 0===e.__CE_state||void 0===e.__CE_definition)throw Error("Failed to construct '"+c+"': The returned value was not constructed with the HTMLElement constructor.");if("http://www.w3.org/1999/xhtml"!==e.namespaceURI)throw Error("Failed to construct '"+c+"': The constructed element's namespace must be the HTML namespace.");if(e.hasAttributes())throw Error("Failed to construct '"+
c+"': The constructed element must not have any attributes.");if(null!==e.firstChild)throw Error("Failed to construct '"+c+"': The constructed element must not have any children.");if(null!==e.parentNode)throw Error("Failed to construct '"+c+"': The constructed element must not have a parent node.");if(e.ownerDocument!==b)throw Error("Failed to construct '"+c+"': The constructed element's owner document is incorrect.");if(e.localName!==c)throw Error("Failed to construct '"+c+"': The constructed element's local name is incorrect.");
return e}catch(g){return X(g),b=null===f?n.call(b,c):p.call(b,f,c),Object.setPrototypeOf(b,HTMLUnknownElement.prototype),b.__CE_state=2,b.__CE_definition=void 0,R(a,b),b}b=null===f?n.call(b,c):p.call(b,f,c);R(a,b);return b}
function X(a){var b=a.message,c=a.sourceURL||a.fileName||"",f=a.line||a.lineNumber||0,d=a.column||a.columnNumber||0,e=void 0;void 0===ErrorEvent.prototype.initErrorEvent?e=new ErrorEvent("error",{cancelable:!0,message:b,filename:c,lineno:f,colno:d,error:a}):(e=document.createEvent("ErrorEvent"),e.initErrorEvent("error",!1,!0,b,c,f),e.preventDefault=function(){Object.defineProperty(this,"defaultPrevented",{configurable:!0,get:function(){return!0}})});void 0===e.error&&Object.defineProperty(e,"error",
{configurable:!0,enumerable:!0,get:function(){return a}});window.dispatchEvent(e);e.defaultPrevented||console.error(a)};function va(){var a=this;this.g=void 0;this.F=new Promise(function(b){a.l=b})}va.prototype.resolve=function(a){if(this.g)throw Error("Already resolved.");this.g=a;this.l(a)};function wa(a){var b=document;this.l=void 0;this.h=a;this.g=b;V(this.h,this.g);"loading"===this.g.readyState&&(this.l=new MutationObserver(this.G.bind(this)),this.l.observe(this.g,{childList:!0,subtree:!0}))}function xa(a){a.l&&a.l.disconnect()}wa.prototype.G=function(a){var b=this.g.readyState;"interactive"!==b&&"complete"!==b||xa(this);for(b=0;b<a.length;b++)for(var c=a[b].addedNodes,f=0;f<c.length;f++)V(this.h,c[f])};function Y(a){this.s=new Map;this.u=new Map;this.C=new Map;this.A=!1;this.B=new Map;this.o=function(b){return b()};this.i=!1;this.v=[];this.h=a;this.D=a.I?new wa(a):void 0}Y.prototype.H=function(a,b){var c=this;if(!(b instanceof Function))throw new TypeError("Custom element constructor getters must be functions.");ya(this,a);this.s.set(a,b);this.v.push(a);this.i||(this.i=!0,this.o(function(){return za(c)}))};
Y.prototype.define=function(a,b){var c=this;if(!(b instanceof Function))throw new TypeError("Custom element constructors must be functions.");ya(this,a);Aa(this,a,b);this.v.push(a);this.i||(this.i=!0,this.o(function(){return za(c)}))};function ya(a,b){if(!qa(b))throw new SyntaxError("The element name '"+b+"' is not valid.");if(W(a,b))throw Error("A custom element with name '"+(b+"' has already been defined."));if(a.A)throw Error("A custom element is already being defined.");}
function Aa(a,b,c){a.A=!0;var f;try{var d=c.prototype;if(!(d instanceof Object))throw new TypeError("The custom element constructor's prototype is not an object.");var e=function(m){var x=d[m];if(void 0!==x&&!(x instanceof Function))throw Error("The '"+m+"' callback must be a function.");return x};var g=e("connectedCallback");var h=e("disconnectedCallback");var k=e("adoptedCallback");var l=(f=e("attributeChangedCallback"))&&c.observedAttributes||[]}catch(m){throw m;}finally{a.A=!1}c={localName:b,
constructorFunction:c,connectedCallback:g,disconnectedCallback:h,adoptedCallback:k,attributeChangedCallback:f,observedAttributes:l,constructionStack:[]};a.u.set(b,c);a.C.set(c.constructorFunction,c);return c}Y.prototype.upgrade=function(a){V(this.h,a)};
function za(a){if(!1!==a.i){a.i=!1;for(var b=[],c=a.v,f=new Map,d=0;d<c.length;d++)f.set(c[d],[]);V(a.h,document,{upgrade:function(k){if(void 0===k.__CE_state){var l=k.localName,m=f.get(l);m?m.push(k):a.u.has(l)&&b.push(k)}}});for(d=0;d<b.length;d++)T(a.h,b[d]);for(d=0;d<c.length;d++){for(var e=c[d],g=f.get(e),h=0;h<g.length;h++)T(a.h,g[h]);(e=a.B.get(e))&&e.resolve(void 0)}c.length=0}}Y.prototype.get=function(a){if(a=W(this,a))return a.constructorFunction};
Y.prototype.whenDefined=function(a){if(!qa(a))return Promise.reject(new SyntaxError("'"+a+"' is not a valid custom element name."));var b=this.B.get(a);if(b)return b.F;b=new va;this.B.set(a,b);var c=this.u.has(a)||this.s.has(a);a=-1===this.v.indexOf(a);c&&a&&b.resolve(void 0);return b.F};Y.prototype.polyfillWrapFlushCallback=function(a){this.D&&xa(this.D);var b=this.o;this.o=function(c){return a(function(){return b(c)})}};
function W(a,b){var c=a.u.get(b);if(c)return c;if(c=a.s.get(b)){a.s.delete(b);try{return Aa(a,b,c())}catch(f){X(f)}}}window.CustomElementRegistry=Y;Y.prototype.define=Y.prototype.define;Y.prototype.upgrade=Y.prototype.upgrade;Y.prototype.get=Y.prototype.get;Y.prototype.whenDefined=Y.prototype.whenDefined;Y.prototype.polyfillDefineLazy=Y.prototype.H;Y.prototype.polyfillWrapFlushCallback=Y.prototype.polyfillWrapFlushCallback;function Z(a,b,c){function f(d){return function(e){for(var g=[],h=0;h<arguments.length;++h)g[h]=arguments[h];h=[];for(var k=[],l=0;l<g.length;l++){var m=g[l];m instanceof Element&&J(m)&&k.push(m);if(m instanceof DocumentFragment)for(m=m.firstChild;m;m=m.nextSibling)h.push(m);else h.push(m)}d.apply(this,g);for(g=0;g<k.length;g++)U(a,k[g]);if(J(this))for(g=0;g<h.length;g++)k=h[g],k instanceof Element&&S(a,k)}}void 0!==c.prepend&&(b.prepend=f(c.prepend));void 0!==c.append&&(b.append=f(c.append))};function Ba(a){Document.prototype.createElement=function(b){return ua(a,this,b,null)};Document.prototype.importNode=function(b,c){b=aa.call(this,b,!!c);this.__CE_registry?V(a,b):Q(a,b);return b};Document.prototype.createElementNS=function(b,c){return ua(a,this,c,b)};Z(a,Document.prototype,{prepend:ba,append:ca})};function Ca(a){function b(f){return function(d){for(var e=[],g=0;g<arguments.length;++g)e[g]=arguments[g];g=[];for(var h=[],k=0;k<e.length;k++){var l=e[k];l instanceof Element&&J(l)&&h.push(l);if(l instanceof DocumentFragment)for(l=l.firstChild;l;l=l.nextSibling)g.push(l);else g.push(l)}f.apply(this,e);for(e=0;e<h.length;e++)U(a,h[e]);if(J(this))for(e=0;e<g.length;e++)h=g[e],h instanceof Element&&S(a,h)}}var c=Element.prototype;void 0!==ia&&(c.before=b(ia));void 0!==ja&&(c.after=b(ja));void 0!==ka&&
(c.replaceWith=function(f){for(var d=[],e=0;e<arguments.length;++e)d[e]=arguments[e];e=[];for(var g=[],h=0;h<d.length;h++){var k=d[h];k instanceof Element&&J(k)&&g.push(k);if(k instanceof DocumentFragment)for(k=k.firstChild;k;k=k.nextSibling)e.push(k);else e.push(k)}h=J(this);ka.apply(this,d);for(d=0;d<g.length;d++)U(a,g[d]);if(h)for(U(a,this),d=0;d<e.length;d++)g=e[d],g instanceof Element&&S(a,g)});void 0!==la&&(c.remove=function(){var f=J(this);la.call(this);f&&U(a,this)})};function Da(a){function b(d,e){Object.defineProperty(d,"innerHTML",{enumerable:e.enumerable,configurable:!0,get:e.get,set:function(g){var h=this,k=void 0;J(this)&&(k=[],P(a,this,function(x){x!==h&&k.push(x)}));e.set.call(this,g);if(k)for(var l=0;l<k.length;l++){var m=k[l];1===m.__CE_state&&a.disconnectedCallback(m)}this.ownerDocument.__CE_registry?V(a,this):Q(a,this);return g}})}function c(d,e){d.insertAdjacentElement=function(g,h){var k=J(h);g=e.call(this,g,h);k&&U(a,h);J(g)&&S(a,h);return g}}function f(d,
e){function g(h,k){for(var l=[];h!==k;h=h.nextSibling)l.push(h);for(k=0;k<l.length;k++)V(a,l[k])}d.insertAdjacentHTML=function(h,k){h=h.toLowerCase();if("beforebegin"===h){var l=this.previousSibling;e.call(this,h,k);g(l||this.parentNode.firstChild,this)}else if("afterbegin"===h)l=this.firstChild,e.call(this,h,k),g(this.firstChild,l);else if("beforeend"===h)l=this.lastChild,e.call(this,h,k),g(l||this.firstChild,null);else if("afterend"===h)l=this.nextSibling,e.call(this,h,k),g(this.nextSibling,l);
else throw new SyntaxError("The value provided ("+String(h)+") is not one of 'beforebegin', 'afterbegin', 'beforeend', or 'afterend'.");}}y&&(Element.prototype.attachShadow=function(d){d=y.call(this,d);if(a.j&&!d.__CE_patched){d.__CE_patched=!0;for(var e=0;e<a.m.length;e++)a.m[e](d)}return this.__CE_shadowRoot=d});z&&z.get?b(Element.prototype,z):I&&I.get?b(HTMLElement.prototype,I):ta(a,function(d){b(d,{enumerable:!0,configurable:!0,get:function(){return q.call(this,!0).innerHTML},set:function(e){var g=
"template"===this.localName,h=g?this.content:this,k=p.call(document,this.namespaceURI,this.localName);for(k.innerHTML=e;0<h.childNodes.length;)u.call(h,h.childNodes[0]);for(e=g?k.content:k;0<e.childNodes.length;)r.call(h,e.childNodes[0])}})});Element.prototype.setAttribute=function(d,e){if(1!==this.__CE_state)return B.call(this,d,e);var g=A.call(this,d);B.call(this,d,e);e=A.call(this,d);a.attributeChangedCallback(this,d,g,e,null)};Element.prototype.setAttributeNS=function(d,e,g){if(1!==this.__CE_state)return E.call(this,
d,e,g);var h=D.call(this,d,e);E.call(this,d,e,g);g=D.call(this,d,e);a.attributeChangedCallback(this,e,h,g,d)};Element.prototype.removeAttribute=function(d){if(1!==this.__CE_state)return C.call(this,d);var e=A.call(this,d);C.call(this,d);null!==e&&a.attributeChangedCallback(this,d,e,null,null)};Element.prototype.removeAttributeNS=function(d,e){if(1!==this.__CE_state)return F.call(this,d,e);var g=D.call(this,d,e);F.call(this,d,e);var h=D.call(this,d,e);g!==h&&a.attributeChangedCallback(this,e,g,h,d)};
na?c(HTMLElement.prototype,na):G&&c(Element.prototype,G);oa?f(HTMLElement.prototype,oa):H&&f(Element.prototype,H);Z(a,Element.prototype,{prepend:fa,append:ha});Ca(a)};var Ea={};function Fa(a){function b(){var c=new.target;var f=document.__CE_registry.C.get(c);if(!f)throw Error("Failed to construct a custom element: The constructor was not registered with customElements.");var d=f.constructionStack;if(0===d.length)return d=n.call(document,f.localName),Object.setPrototypeOf(d,c.prototype),d.__CE_state=1,d.__CE_definition=f,R(a,d),d;var e=d.length-1,g=d[e];if(g===Ea)throw Error("Failed to construct '"+f.localName+"': This element was already constructed.");d[e]=Ea;
Object.setPrototypeOf(g,c.prototype);R(a,g);return g}b.prototype=ma.prototype;Object.defineProperty(HTMLElement.prototype,"constructor",{writable:!0,configurable:!0,enumerable:!1,value:b});window.HTMLElement=b};function Ga(a){function b(c,f){Object.defineProperty(c,"textContent",{enumerable:f.enumerable,configurable:!0,get:f.get,set:function(d){if(this.nodeType===Node.TEXT_NODE)f.set.call(this,d);else{var e=void 0;if(this.firstChild){var g=this.childNodes,h=g.length;if(0<h&&J(this)){e=Array(h);for(var k=0;k<h;k++)e[k]=g[k]}}f.set.call(this,d);if(e)for(d=0;d<e.length;d++)U(a,e[d])}}})}Node.prototype.insertBefore=function(c,f){if(c instanceof DocumentFragment){var d=K(c);c=t.call(this,c,f);if(J(this))for(f=
0;f<d.length;f++)S(a,d[f]);return c}d=c instanceof Element&&J(c);f=t.call(this,c,f);d&&U(a,c);J(this)&&S(a,c);return f};Node.prototype.appendChild=function(c){if(c instanceof DocumentFragment){var f=K(c);c=r.call(this,c);if(J(this))for(var d=0;d<f.length;d++)S(a,f[d]);return c}f=c instanceof Element&&J(c);d=r.call(this,c);f&&U(a,c);J(this)&&S(a,c);return d};Node.prototype.cloneNode=function(c){c=q.call(this,!!c);this.ownerDocument.__CE_registry?V(a,c):Q(a,c);return c};Node.prototype.removeChild=function(c){var f=
c instanceof Element&&J(c),d=u.call(this,c);f&&U(a,c);return d};Node.prototype.replaceChild=function(c,f){if(c instanceof DocumentFragment){var d=K(c);c=v.call(this,c,f);if(J(this))for(U(a,f),f=0;f<d.length;f++)S(a,d[f]);return c}d=c instanceof Element&&J(c);var e=v.call(this,c,f),g=J(this);g&&U(a,f);d&&U(a,c);g&&S(a,c);return e};w&&w.get?b(Node.prototype,w):sa(a,function(c){b(c,{enumerable:!0,configurable:!0,get:function(){for(var f=[],d=this.firstChild;d;d=d.nextSibling)d.nodeType!==Node.COMMENT_NODE&&
f.push(d.textContent);return f.join("")},set:function(f){for(;this.firstChild;)u.call(this,this.firstChild);null!=f&&""!==f&&r.call(this,document.createTextNode(f))}})})};var O=window.customElements;function Ha(){var a=new N;Fa(a);Ba(a);Z(a,DocumentFragment.prototype,{prepend:da,append:ea});Ga(a);Da(a);a=new Y(a);document.__CE_registry=a;Object.defineProperty(window,"customElements",{configurable:!0,enumerable:!0,value:a})}O&&!O.forcePolyfill&&"function"==typeof O.define&&"function"==typeof O.get||Ha();window.__CE_installPolyfill=Ha;
}).call(self);`

exports.Window_ShadowRoot = jss`!function(){"use strict";if(window.ShadowRoot||Element.prototype.attachShadow){if(!window.ShadowRoot||!Element.prototype.attachShadow)throw new TypeError("DarkTree: ShadowRoot is partially implemented.");return}if(Node.prototype.getRootNode)throw new TypeError("DarkTree: NodePrototype.getRootNode is available, but ShadowDOM is not.");if(!customElements||!customElements.define)throw new TypeError("DarkTree: customElements registry not available.");const e=(e,t)=>{const{get:o,set:n}=Object.getOwnPropertyDescriptor(e,t);return{get:o,set:n}},t={customElements:{define:customElements.define.bind(customElements)},Element:{after:Element.prototype.after,append:Element.prototype.append,before:Element.prototype.before,childElementCount:e(Element.prototype,"childElementCount"),children:e(Element.prototype,"children"),firstElementChild:e(Element.prototype,"firstElementChild"),innerHTML:e(Element.prototype,"innerHTML"),insertAdjacentElement:Element.prototype.insertAdjacentElement,insertAdjacentHTML:Element.prototype.insertAdjacentHTML,insertAdjacentText:Element.prototype.insertAdjacentText,lastElementChild:e(Element.prototype,"lastElementChild"),nextElementSibling:e(Element.prototype,"nextElementSibling"),outerHTML:e(Element.prototype,"outerHTML"),prepend:Element.prototype.prepend,previousElementSibling:e(Element.prototype,"previousElementSibling"),querySelector:Element.prototype.querySelector,querySelectorAll:Element.prototype.querySelectorAll,remove:Element.prototype.remove},HTMLStyleElement:{},Node:{appendChild:Node.prototype.appendChild,childNodes:e(Node.prototype,"childNodes"),cloneNode:Node.prototype.cloneNode,firstChild:e(Node.prototype,"firstChild"),hasChildNodes:Node.prototype.hasChildNodes,insertBefore:Node.prototype.insertBefore,lastChild:e(Node.prototype,"lastChild"),nextSibling:e(Node.prototype,"nextSibling"),parentNode:e(Node.prototype,"parentNode"),previousSibling:e(Node.prototype,"previousSibling"),removeChild:Node.prototype.removeChild,textContent:e(Node.prototype,"textContent")}},o="shadow-host-id",n=new Set(["article","aside","blockquote","body","div","footer","h1","h2","h3","h4","h5","h6","header","main","nav","p","section","span"]);let i=1;const r=new class{getRoot(e){for(;e.parentNode;)e=e.parentNode;return e}getShadowRoot(e){const t=this.getRoot(e);return t instanceof m?t:null}getShadowIncludingRoot(e){let t=this.getRoot(e);for(;e instanceof m;)t=this.getRoot(t.host);return t}isContainedIn(e,t){for(;e.parentNode;)if((e=e.parentNode)==t)return!0;return!1}hasSameNativeChildren(e,o){const n=t.Node.childNodes.get.call(e);if(o.length!==n.length)return!1;for(let e=0;e<o.length;e++)if(o[e]!==n[e])return!1;return!0}getNodeSibling(e,o){const n=o>0?1:-1,i=o>0?t.Node.nextSibling.get:t.Node.previousSibling.get;let r=i.call(e);const s=e.parentNode;if(s){if(s.dtVirtualChildNodes){const t=s.dtVirtualChildNodes.findIndex((t=>t===e));if(t<0)throw new DOMException("Node not found in VirtualParent children list","HierarchyRequestError");const o=t+n;return o>=0&&o<s.dtVirtualChildNodes.length?s.dtVirtualChildNodes[o]:null}if(s instanceof m)for(;r&&s.host.dtVirtualChildNodes.includes(r);)r=i.call(r)}return r}maybeTextNode(e){return e instanceof Node?e:document.createTextNode(""+e)}escapeAsInnerHTML(e){const o=document.createElement("script");return o.setAttribute("type","application/x-not-parsed"),t.Node.textContent.set.call(o,e),t.Element.innerHTML.get.call(o)}tryNativeCloneNode(e,o){const n=e.ownerDocument.__CE_registry;try{return delete e.ownerDocument.__CE_registry,t.Node.cloneNode.call(e,o)}finally{e.ownerDocument.__CE_registry=n}}},s=new class{assignReadOnly(e,t,o){Object.defineProperty(e,t,{value:o,configurable:!0})}mixin(e,t){for(const o of Object.getOwnPropertyNames(t))Object.defineProperty(e,o,Object.getOwnPropertyDescriptor(t,o))}mro(e,t){if(!e||e==Object.prototype)return[];const o=s.mro(Object.getPrototypeOf(e),t),n=Object.getOwnPropertyDescriptor(e,t);return n&&(n._at=e,o.unshift(n)),o}},d=new class{constructor(){this.tempSheet=null}parseCSS(e){this.tempSheet||(this.tempSheet=document.createElement("style"),t.Node.appendChild.call(document.head,this.tempSheet)),t.Node.textContent.set.call(this.tempSheet,e);try{return this.tempSheet.sheet.cssRules}finally{t.Node.textContent.set.call(this.tempSheet,"")}}};class l{define(e,o){n.add(e);try{return t.customElements.define.call(this,e,o)}catch(e){throw e instanceof SyntaxError?new DOMException(e.message,"SyntaxError"):e instanceof Error&&"Error"===e.name?new DOMException(e.message,"NotSupportedError"):e}}}class a{attachShadow(e){if(void 0!==this.shadowRoot)throw new DOMException(\`The <\${this.tagName}> element has be tried to attach to is already a shadow host.\`,"InvalidStateError");if(!n.has(this.localName))throw new DOMException(\`The <\${this.tagName}> element does not supported to attach shadow\`,"NotSupportedError");!function(){if(g)return;g=!0,s.mixin(Element.prototype,h.prototype),s.mixin(HTMLElement.prototype,c),s.mixin(m.prototype,h.prototype),delete m.prototype.outerHTML,s.mixin(HTMLStyleElement.prototype,u.prototype),s.mixin(Node.prototype,f.prototype)}();let o=new m;return s.assignReadOnly(o,"host",this),s.assignReadOnly(o,"mode",e.mode),s.assignReadOnly(o,"delegatesFocus",!!e.delegatesFocus),o.dtUnique=i++,s.assignReadOnly(this,"shadowRoot","closed"===e.mode?null:o),s.assignReadOnly(this,"dtShadowRoot",o),this.dtVirtualize(),t.Node.textContent.set.call(this,""),o}get assignedSlot(){const e=t.Node.parentNode.get.call(this);return e&&e instanceof p?e:null}}class h{after(...e){const t=this.parentNode;if(!t)throw new DOMException("Node has no parent","HierarchyRequestError");const o=this.nextSibling;for(const n of e)t.insertBefore(r.maybeTextNode(n),o)}append(...e){for(const t of e)this.insertBefore(r.maybeTextNode(t),null)}before(...e){const t=this.parentNode;if(!t)throw new DOMException("Node has no parent","HierarchyRequestError");for(const o of e)t.insertBefore(r.maybeTextNode(o),this)}get childElementCount(){return this.children.length}get children(){return Array.prototype.filter.call(this.childNodes,(e=>e instanceof Element))}get firstElementChild(){let e=this.firstChild;for(;e&&!(e instanceof Element);)e=e.nextSibling;return e}get innerHTML(){const e=[];for(const t of this.childNodes)switch(t.nodeType){case Node.ELEMENT_NODE:e.push(t.outerHTML);break;case Node.TEXT_NODE:e.push(r.escapeAsInnerHTML(t.textContent));break;case Node.COMMENT_NODE:e.push(\`\x3c!--\${t.textContent}--\x3e\`)}return e.join("")}set innerHTML(e){if(!(this.dtVirtualChildNodes||this instanceof m)){t.Element.innerHTML.set.call(this,e)}for(const e of this.childNodes)this.removeChild(e);this.insertAdjacentHTML("beforeend",e)}insertAdjacentElement(e,t){if(!(t instanceof Element||t instanceof DocumentFragment||t instanceof Text))throw new DOMException("Argument 2 of Element.insertAdjacentElement does not implement interface Element.","TypeError");const o=this.parentNode,n=o&&o!==this.ownerDocument;switch(e){case"beforebegin":if(!n)throw new DOMException("No valid parent","NoModificationAllowedError");o.insertBefore(t,this);break;case"afterbegin":this.insertBefore(t,this.firstChild);break;case"beforeend":this.insertBefore(t,null);break;case"afterend":if(!n)throw new DOMException("No valid parent","NoModificationAllowedError");o.insertBefore(t,this.nextSibling);break;default:throw new DOMException("Invalid node location","SyntaxError")}}insertAdjacentHTML(e,o){const n=document.createElement("template");t.Element.innerHTML.set.call(n,o),this.insertAdjacentElement(e,n.content)}insertAdjacentText(e,t){this.insertAdjacentElement(e,document.createTextNode(""+t))}get lastElementChild(){let e=this.lastChild;for(;e&&!(e instanceof Element);)e=e.previousSibling;return e}get nextElementSibling(){if(!this.parentNode)throw new DOMException("Node has no parent","HierarchyRequestError");let e=this.nextSibling;for(;e&&!(e instanceof Element);)e=e.nextSibling;return e}get outerHTML(){const e=r.tryNativeCloneNode(this,!1);e.removeAttribute(o),e.removeAttribute("shadow-slot-status");const n=t.Element.outerHTML.get.call(e);let i=n.lastIndexOf("></");return i<0&&(i=n.length),n.substr(0,i+1)+this.innerHTML+n.substr(i+1)}set outerHTML(e){const t=this.parentNode;if(!t)throw new DOMException("Node has no parent","NoModificationAllowedError");const o=this.nextSibling;t.removeChild(this),o?o.insertAdjacentHTML("beforebegin",e):t.insertAdjacentHTML("beforeend",e)}prepend(...e){const t=this.firstChild;for(const o of e)this.insertBefore(r.maybeTextNode(o),t)}get previousElementSibling(){if(!this.parentNode)throw new DOMException("Node has no parent","HierarchyRequestError");let e=this.previousSibling;for(;e&&!(e instanceof Element);)e=e.previousSibling;return e}querySelector(e){return t.Element.querySelector.call(this,e)}querySelectorAll(e){return t.Element.querySelectorAll.call(this,e)}remove(){const e=this.parentNode;e&&e.removeChild(this)}}const c={insertAdjacentElement:h.prototype.insertAdjacentElement,insertAdjacentHTML:h.prototype.insertAdjacentHTML};class p extends HTMLElement{constructor(){super()}get name(){return this.getAttribute("name")||""}set name(e){e!==name&&(this.setAttribute("name","val"),N.nodeUpdate(this))}dtSlotAssign(e){return e||(e=this.dtVirtualChildNodes),!r.hasSameNativeChildren(this,e)&&(t.Node.textContent.set.call(this,""),t.Element.append.apply(this,e),!0)}}class u{get textContent(){return void 0!==this.dtOriginalTextContent?this.dtOriginalTextContent:t.Node.textContent.get.call(this)}set textContent(e){delete this.dtOriginalTextContent,N.beginNodeUpdate(this);try{t.Node.textContent.set.call(this,e)}finally{N.endNodeUpdate()}}get innerHTML(){return void 0!==this.dtOriginalTextContent?r.escapeAsInnerHTML(this.dtOriginalTextContent):t.Element.innerHTML.get.call(this)}set innerHTML(e){delete this.dtOriginalTextContent,N.beginNodeUpdate(this);try{t.Element.innerHTML.set.call(this,e)}finally{N.endNodeUpdate()}}dtUpdateGlobalized(){if(void 0!==this.dtOriginalTextContent)return;const e=r.getShadowRoot(this);if(!e)return;const o=e.dtHostSelector,n=this.textContent;this.dtOriginalTextContent=n;const i=d.parseCSS(n.replace(/:host(-context)?(?:\(([\s\S]+?)\))?/g,(function(e,t,n){return t?\`:-moz-any(\${n}) \${o}\`:n?\`\${o}:-moz-any(\${n})\`:o}))),s=[];for(const e of i){const t=e instanceof CSSStyleRule&&!e.selectorText.includes(o)?o+" "+e.cssText:e.cssText;s.push(t)}t.Node.textContent.set.call(this,s.join("\n"))}}class f{getRootNode(e){return"object"==typeof e&&!!e.composed?r.getShadowIncludingRoot(this):r.getRoot(this)}get childNodes(){return this.dtVirtualChildNodes?this.dtVirtualChildNodes.slice(0):t.Node.childNodes.get.call(this)}hasChildNodes(){return this.dtVirtualChildNodes?!!this.dtVirtualChildNodes.length:t.Node.hasChildNodes.call(this)}dtClearChildNodes(){N.beginNodeUpdate(this);try{if(this.dtVirtualChildNodes){for(const e of this.dtVirtualChildNodes){const o=t.Node.parentNode.get.call(e);o&&t.Node.removeChild.call(o,e),delete e.dtVirtualParent}this.dtVirtualChildNodes.length=0}else t.Node.textContent.set.call(this,"")}finally{N.endNodeUpdate()}}dtVirtualize(){if(this.dtVirtualChildNodes)throw new DOMException("Node is already virtual!","InvalidStateError");s.assignReadOnly(this,"dtVirtualChildNodes",Array.prototype.slice.call(t.Node.childNodes.get.call(this),0));for(const e of this.dtVirtualChildNodes)s.assignReadOnly(e,"dtVirtualParent",this)}get firstChild(){return this.dtVirtualChildNodes?this.dtVirtualChildNodes.length?this.dtVirtualChildNodes[0]:null:t.Node.firstChild.get.call(this)}get lastChild(){return this.dtVirtualChildNodes?this.dtVirtualChildNodes.length?this.dtVirtualChildNodes.at(-1):null:t.Node.firstChild.get.call(this)}appendChild(e){return this.insertBefore(e,null)}insertBefore(e,o){N.beginNodeUpdate(this,e);try{if(e&&e.parentNode&&e.parentNode.removeChild(e),this.dtVirtualChildNodes){const t=o?this.dtVirtualChildNodes.findIndex((e=>e===o)):this.dtVirtualChildNodes.length;if(t<0)throw new DOMException("Node was not found","NotFoundError");const n=e instanceof DocumentFragment?[...e.childNodes]:[e];Array.prototype.splice.apply(this.dtVirtualChildNodes,[t,0].concat(n));for(const e of n)s.assignReadOnly(e,"dtVirtualParent",this);return e}return t.Node.insertBefore.call(this,e,o)}finally{N.endNodeUpdate()}}removeChild(e){N.beginNodeUpdate(this,e);try{if(this.dtVirtualChildNodes&&e){const t=this.dtVirtualChildNodes.findIndex((t=>t===e));if(t<0)throw new DOMException("Node was not found","NotFoundError");return this.dtVirtualChildNodes.splice(t,1),delete e.dtVirtualParent,e}return t.Node.removeChild.call(this,e)}finally{N.endNodeUpdate()}}get parentNode(){if(this.dtVirtualParent)return this.dtVirtualParent;const e=t.Node.parentNode.get.call(this);return e?e.dtShadowRoot||e:null}get nextSibling(){return r.getNodeSibling(this,1)}get previousSibling(){return r.getNodeSibling(this,-1)}get textContent(){if(this.dtVirtualChildNodes){const e=[];for(const t of this.dtVirtualChildNodes)e.push(t.textContent);return e.join("")}return t.Node.textContent.get.call(this)}set textContent(e){if(this.textContent!=e){N.beginNodeUpdate(this);try{if(this.dtVirtualChildNodes){this.dtClearChildNodes();const t=document.createTextNode(e);this.appendChild(t)}else t.Node.textContent.set.call(this,e)}finally{N.endNodeUpdate()}}}cloneNode(e){const o=t.Node.cloneNode.call(this,!1);if(e)for(const e of this.childNodes)o.insertBefore(e.cloneNode(!0),null);return o}}const N=new class{constructor(){this.updateStack=[],this.logPerfEnabled=!1,this.logIndent=0}beginNodeUpdate(...e){const t=this.getRelatedShadowRootSet(e);if(this.isSubsetUpdate(t)){const e=this.updateStack[this.updateStack.length-1];e[1]=e[1]+1}else this.updateStack.push([t,1,e])}endNodeUpdate(){if(!this.updateStack.length)throw new DOMException("ShadowRenderService nesting error","NotSupportedError");const e=this.updateStack[this.updateStack.length-1],t=e[1]-1;t>0?e[1]=t:(this.performShadowUpdates(e[0]),this.updateStack.pop())}nodeUpdate(e){const t=new Set(this.getRelatedShadowRootSet([e]));t.size&&!this.isSubsetUpdate(t)&&this.performShadowUpdates(t)}isSubsetUpdate(e){if(!this.updateStack.length)return!1;if(!e.size)return!0;const t=this.updateStack[this.updateStack.length-1][0];if(!t.size)return!1;for(const o of e)if(!t.has(o))return!1;return!0}getRelatedShadowRootSet(e){const t=new Set;for(const o of e)if(o instanceof m)t.add(o);else if(o.dtShadowRoot)t.add(o.dtShadowRoot);else{const e=r.getShadowRoot(o);e&&t.add(e)}return t}performShadowUpdates(e){if(!e.size)return;this.logIndent++;const t=performance.now();let o,n=e.size,i=0,r=0,s=0;const d=new Map;try{for(const t of e)a(t);o=performance.now(),h()}finally{if(this.logIndent--,this.logPerfEnabled){const e=o-t,d=performance.now()-o;console.log("  ".repeat(this.logIndent),\`performShadowUpdates: \${e}+\${d}ms, made \${i} slot assignments (\${r} unchanged), \${s} preempted on \${n}\`,Math.random())}}function l(e,t){d.has(e)&&(s++,h()),d.set(e,t)}function a(e){let t=e.host.dtVirtualChildNodes.slice(0);const o=new Set;for(const e of t){const t=e.assignedSlot;t&&o.add(t)}!function e(t){for(const r of t.childNodes)n(r),r instanceof p?(i(r)||l(r,null),o.delete(r)):r instanceof HTMLStyleElement?r.dtUpdateGlobalized():e(r)}(e);for(const e of o)l(e,null);function n(e){e.nodeType!==Node.ELEMENT_NODE||"slot"!==e.localName||p.prototype.isPrototypeOf(e)||(Object.setPrototypeOf(e,p.prototype),e.dtVirtualize())}function i(e){const o=e.name,n=o?e=>e.nodeType===Node.ELEMENT_NODE&&e.getAttribute("slot")===o:e=>e.nodeType!==Node.ELEMENT_NODE||!e.hasAttribute("slot"),i=t.filter((e=>n(e)));return i.length>0&&(t=t.filter((e=>!i.includes(e))),l(e,i),!0)}}function h(){for(const[e,t]of d)e.dtSlotAssign(t)||r++,i++;d.clear()}}};class m extends DocumentFragment{get childNodes(){const e=t.Node.childNodes.get.call(this.host);return Array.prototype.filter.call(e,(e=>!this.host.dtVirtualChildNodes.includes(e)))}hasChildNodes(){return!!this.childNodes.length}get firstChild(){let e=t.Node.firstChild.get.call(this.host);for(;e&&this.host.dtVirtualChildNodes.includes(e);)e=t.Node.nextSibling.get.call(e);return e}get lastChild(){let e=t.Node.lastChild.get.call(this.host);for(;e&&this.host.dtVirtualChildNodes.includes(e);)e=t.Node.previousSibling.get.call(e);return e}appendChild(e){return this.insertBefore(e,null)}insertBefore(e,o){N.beginNodeUpdate(this);try{return t.Node.insertBefore.call(this.host,e,o)}finally{N.endNodeUpdate()}}removeChild(e){if(this.host.dtVirtualChildNodes.includes(e))throw new DOMException("Node was not found","NotFoundError");const o=t.Node.removeChild.call(this.host,e);return N.nodeUpdate(this),o}get textContent(){const e=[];for(const t of this.childNodes)e.push(t.textContent);return e.join("")}set textContent(e){if(this.textContent!=e){N.beginNodeUpdate(this);try{for(const e of this.childNodes)this.removeChild(e);const t=document.createTextNode(e);this.appendChild(t)}finally{N.endNodeUpdate()}}}cloneNode(e){throw new DOMException("ShadowRoot nodes are not clonable.","NotSupportedError")}get dtUnique(){return this.host.getAttribute(o)}set dtUnique(e){this.host.setAttribute(o,e)}get dtHostSelector(){return\`\${this.host.localName}[\${o}="\${this.dtUnique}"]\`}}let g=!1;window.__DT_Native=t,window.__DT_Property=s,window.ShadowRoot=m,window.HTMLSlotElement=p,s.mixin(customElements,l.prototype),s.mixin(Element.prototype,a.prototype)}();`;

exports.Github_enableDiffButton = jss`
  // Remove "disabled" attribute of "Load diff" buttons
  if (/^\/.+?\/.+?\/(commit\/|pull\/\d+\/files)/.test(location.pathname))
    document.addEventListener("DOMContentLoaded", function () {
      for (let button of document.getElementsByClassName("load-diff-button"))
        button.removeAttribute("disabled");
    }, {once: true});
  // TEMPORARY: hard-disable Turbo navigation to prevent memory leaks in Pale Moon
  document.addEventListener("DOMContentLoaded", () => {
    Turbo.session.elementIsNavigatable = (e) => false;
    Turbo.session.formMode = "off";
    Turbo.session.willFollowLinkToLocation = (l, ll, e) => false;
    const FrameElement = document.createElement("turbo-frame").constructor;
    FrameElement.delegateConstructor.prototype.shouldInterceptNavigation = (e, s=null) => false
  });
`

// This should not do anything -- this setter is the same as the native one.
//   (See dom/html/nsGenericHTMLElement.h ctrl-f "SetHTMLBoolAttr")
// Yet without this change, the property can't be observed.
exports.Element_hidden = jss`
Object.defineProperty(HTMLElement.prototype, "hidden", Object.assign(Object.getOwnPropertyDescriptor(HTMLElement.prototype, "hidden"), {
    set: function (h) {
            if (h)
                this.setAttribute("hidden", "");
            else
                this.removeAttribute("hidden");
        }
}));`;

exports.Element_replaceChildren = jss`if (!('replaceChildren' in Element.prototype)) {
    function Element_replaceChildren(...children) {
        const cn = this.childNodes;
        let count;
        while (count = cn.length) {
            cn[count-1].remove();
        }
        this.append(...children);
    }
    Element.prototype.replaceChildren = Element_replaceChildren;
    Document.prototype.replaceChildren = Element_replaceChildren;
    DocumentFragment.prototype.replaceChildren = Element_replaceChildren;
}`;

exports.Regex_UnicodePropertyDiacritic = String.raw`[\^\x60\xA8\xAF\xB4\xB7\xB8\u02B0-\u034E\u0350-\u0357\u035D-\u0362\u0374\u0375\u037A\u0384\u0385\u0483-\u0487\u0559\u0591-\u05A1\u05A3-\u05BD\u05BF\u05C1\u05C2\u05C4\u064B-\u0652\u0657\u0658\u06DF\u06E0\u06E5\u06E6\u06EA-\u06EC\u0730-\u074A\u07A6-\u07B0\u07EB-\u07F5\u0818\u0819\u0898-\u089F\u08C9-\u08D2\u08E3-\u08FE\u093C\u094D\u0951-\u0954\u0971\u09BC\u09CD\u0A3C\u0A4D\u0ABC\u0ACD\u0AFD-\u0AFF\u0B3C\u0B4D\u0B55\u0BCD\u0C3C\u0C4D\u0CBC\u0CCD\u0D3B\u0D3C\u0D4D\u0DCA\u0E47-\u0E4C\u0E4E\u0EBA\u0EC8-\u0ECC\u0F18\u0F19\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F82-\u0F84\u0F86\u0F87\u0FC6\u1037\u1039\u103A\u1063\u1064\u1069-\u106D\u1087-\u108D\u108F\u109A\u109B\u135D-\u135F\u1714\u1715\u17C9-\u17D3\u17DD\u1939-\u193B\u1A75-\u1A7C\u1A7F\u1AB0-\u1ABE\u1AC1-\u1ACB\u1B34\u1B44\u1B6B-\u1B73\u1BAA\u1BAB\u1C36\u1C37\u1C78-\u1C7D\u1CD0-\u1CE8\u1CED\u1CF4\u1CF7-\u1CF9\u1D2C-\u1D6A\u1DC4-\u1DCF\u1DF5-\u1DFF\u1FBD\u1FBF-\u1FC1\u1FCD-\u1FCF\u1FDD-\u1FDF\u1FED-\u1FEF\u1FFD\u1FFE\u2CEF-\u2CF1\u2E2F\u302A-\u302F\u3099-\u309C\u30FC\uA66F\uA67C\uA67D\uA67F\uA69C\uA69D\uA6F0\uA6F1\uA700-\uA721\uA788-\uA78A\uA7F8\uA7F9\uA8C4\uA8E0-\uA8F1\uA92B-\uA92E\uA953\uA9B3\uA9C0\uA9E5\uAA7B-\uAA7D\uAABF-\uAAC2\uAAF6\uAB5B-\uAB5F\uAB69-\uAB6B\uABEC\uABED\uFB1E\uFE20-\uFE2F\uFF3E\uFF40\uFF70\uFF9E\uFF9F\uFFE3]|\uD800\uDEE0|\uD801[\uDF80-\uDF85\uDF87-\uDFB0\uDFB2-\uDFBA]|\uD802[\uDEE5\uDEE6]|\uD803[\uDD22-\uDD27\uDF46-\uDF50\uDF82-\uDF85]|\uD804[\uDC46\uDC70\uDCB9\uDCBA\uDD33\uDD34\uDD73\uDDC0\uDDCA-\uDDCC\uDE35\uDE36\uDEE9\uDEEA\uDF3C\uDF4D\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC42\uDC46\uDCC2\uDCC3\uDDBF\uDDC0\uDE3F\uDEB6\uDEB7\uDF2B]|\uD806[\uDC39\uDC3A\uDD3D\uDD3E\uDD43\uDDE0\uDE34\uDE47\uDE99]|\uD807[\uDC3F\uDD42\uDD44\uDD45\uDD97]|\uD81A[\uDEF0-\uDEF4\uDF30-\uDF36]|\uD81B[\uDF8F-\uDF9F\uDFF0\uDFF1]|\uD82B[\uDFF0-\uDFF3\uDFF5-\uDFFB\uDFFD\uDFFE]|\uD833[\uDF00-\uDF2D\uDF30-\uDF46]|\uD834[\uDD67-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD]|\uD838[\uDD30-\uDD36\uDEAE\uDEEC-\uDEEF]|\uD83A[\uDCD0-\uDCD6\uDD44-\uDD46\uDD48-\uDD4A]`;
exports.Regex_UnicodePropertyEmoji = `[\\u{1f300}-\\u{1f5ff}\\u{1f900}-\\u{1f9ff}\\u{1f600}-\\u{1f64f}\\u{1f680}-\\u{1f6ff}\\u{2600}-\\u{26ff}\\u{2700}-\\u{27bf}\\u{1f1e6}-\\u{1f1ff}\\u{1f191}-\\u{1f251}\\u{1f004}\\u{1f0cf}\\u{1f170}-\\u{1f171}\\u{1f17e}-\\u{1f17f}\\u{1f18e}\\u{3030}\\u{2b50}\\u{2b55}\\u{2934}-\\u{2935}\\u{2b05}-\\u{2b07}\\u{2b1b}-\\u{2b1c}\\u{3297}\\u{3299}\\u{303d}\\u{00a9}\\u{00ae}\\u{2122}\\u{23f3}\\u{24c2}\\u{23e9}-\\u{23ef}\\u{25b6}\\u{23f8}-\\u{23fa}]`;
exports.Regex_UnicodePropertyLetter = String.raw`[\u0041-\u005A\u0061-\u007A\u00AA\u00B5\u00BA\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0\u08A2-\u08AC\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097F\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191C\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2183\u2184\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005\u3006\u3031-\u3035\u303B\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA697\uA6A0-\uA6E5\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA80-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]`;
