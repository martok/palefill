/*
 This Source Code Form is subject to the terms of the Mozilla Public
 License, v. 2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.

 Pale Moon Web Technologies Polyfill Add-on
 Copyright (c) 2020 Martok. All rights reserved.


Element.prototype.toggleAttribute, Array.prototype.flat, Window.queueMicrotask
Copyright (c) 2005-2020 Mozilla and individual contributors.
https://developer.mozilla.org/docs/Web/API/Element/toggleAttribute
https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/flat
https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/queueMicrotask

Array.prototype.flatMap polyfill
Copyright (c) 2017 Aluan Haddad.
https://github.com/aluanhaddad/flat-map


*/

"use strict";

exports.Element_toggleAttribute = `if (typeof Element.prototype.toggleAttribute !== "function") {
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

exports.Array_flatMap = `if (typeof Array.prototype.flatMap !== "function") {
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

exports.Array_flat = `if (typeof Array.prototype.flat !== "function") {
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

exports.Window_queueMicrotask = `if (typeof window.queueMicrotask !== "function") {
  window.queueMicrotask = function (callback) {
    Promise.resolve()
      .then(callback)
      .catch(e => setTimeout(() => { throw e; })); // report exceptions
  };
}`
