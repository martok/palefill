# [Palefill Web Technologies Polyfill Add-on](https://martok.github.io/palefill/)

Palefill is an add-on for Pale Moon that injects [polyfills](https://en.wikipedia.org/wiki/Polyfill_(programming))
into pages to improve compatibility.

## Installation

 * Install from Github Releases: [Latest](https://github.com/martok/palefill/releases/latest)
 * Find it on the official Add-Ons repository: [Extensions](https://addons.palemoon.org/search/?terms=palefill)

## Features

  * Targets [Pale Moon](https://www.palemoon.org/) browser
  * "runs on" any UXP toolkit browser (with limited support)
  * load polyfills for things like Web Components
  * fix/shim unsupported JS syntax elements
  * fix other minor compatibility issues

## Documentation

Full documentation including technical details is on [its own site](https://martok.github.io/palefill/).

## Reporting Issues

Something doesn't work? Report an [issue on Github](https://github.com/martok/palefill/issues).
To make this as efficient as possible, remember to provide some key information:

 * Was a similar issue already reported? Use the search, reference others if a previous problem came back.
 * What is the nature of the issue? Missing site parts, errors on the console (provide in full!), ... ?
 * What browser and version is used? Anything that is not the latest Pale Moon might be out of scope.
 * Any privacy add-ons? Cookie whitelisting breaks a surprising amount of sites (because it affects not just cookies).

## Credits

This add-on is heavily based on [**GitHub Web Components Polyfill**](https://github.com/JustOff/github-wc-polyfill),
which does the same thing for GitHub and a few other sites.
```
 Portions based on GitHub Web Components Polyfill Add-on
 Copyright (c) 2020 JustOff. All rights reserved.
 Copyright (c) 2022 SeaHOH. All rights reserved.
 https://github.com/JustOff/github-wc-polyfill
```

The polyfills themselves have different contributors, see `lib/polyfills.js`.

The following people have contributed to this add-on:

  * [roytam1](https://github.com/roytam1)
  * [UCyborg](https://github.com/UCyborg)

