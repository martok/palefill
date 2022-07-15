/*
 This Source Code Form is subject to the terms of the Mozilla Public
 License, v. 2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.

 Palefill Web Technologies Polyfill Add-on
 Copyright (c) 2020-22 Martok & Contributors. All rights reserved.
*/

// Main Rule definitions.
// For easier maintainability, please keep in logical-alphabetical order:
//   generally sorted by host name part, minus "www."
//   "www.dhl.de" sorts as "dhl"
//   "static.ce-cdn.net" sorts together with its parent, "godbolt.org"

exports = String.raw`
developer.apple.com
    std-customElements
! --
www.deepl.com
    std-customElements
! --
www.dhl.de/etc.clientlibs/redesign/clientlibs/clientlibs-head.min.c1ad054852ef2c65cdaf76f87f21abb3.js$script
    $script-content,dhl-optchain
! --
github.com
gist.github.com
    std-PerformanceObserver,std-queueMicrotask,gh-temp-oldindex2,gh-compat,sm-gh-extra,sm-cookie
github.com/socket-worker.js$script
gist.github.com/socket-worker.js$script
github.com/assets-cdn/worker/socket-worker-*.js$script
gist.github.com/assets-cdn/worker/socket-worker-*.js$script
    gh-worker-csp
! --
godbolt.org
    std-queueMicrotask
static.ce-cdn.net/vendor.v*.js$script
    $script-content,godbolt-script
! --
www.ikea.com
    std-customElements,std-FunctionToString,ikea-mustard
! --
matlab.mathworks.com
    std-customElements
! --
docs.microsoft.com
    std-customElements
! --
www.pixiv.net
    std-customElements
! --
www.redditstatic.com/desktop2x/CommentsPage.*.js$script
    $script-content,reddit-comments-regexp
! --
*.tm-exchange.com
    std-IntlRelativeTimeFormat
*.tm-exchange.com/js/bundle.js?v=*$script
    $script-content,tmx-optchain
! --
www.virustotal.com
    vt-nomodule,std-BlobArrayBuffer
`;