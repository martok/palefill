# Palefill Web Technologies Polyfill Add-on

Palefill is an add-on for Pale Moon that injects [polyfills](https://en.wikipedia.org/wiki/Polyfill_(programming))
into pages to improve compatibility.

## Features

Polyfills are specified as "fixes" that are applied based on selector rules. Fixes currently can be:

  * scripts that must be loaded
  * injected inline-scripts
  * Content-Security-Policy adjustments
  * script content changes

It is possible to specify any combination of required fixes for a site. See the [technical documentation](rules.md)
for more details.

## Supported Platforms

Palefill is developed and tested on *the most recently released version* of the [Pale Moon](https://www.palemoon.org/) browser.
New features and fixes always target this browser and the then-current state of the web.

Contributors have also helped with Iceweasel-UXP, Basilisk and SeaMonkey support. Those are considered "mostly supported".

It is also possible to install Palefill on *any* browser using the UXP toolkit. This should help with some more niche
projects or custom and testing branches. Due to implementation details, it is technically also possible to install the
addon on very old Firefox versions -- this is caught at runtime since this won't actually work.

When running in this compatibility mode, all features should still work as expected, but users should be aware that this
is completely untested and no claims at all are being made. In this case, a warning text is displayed in the add-on's preferences.

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

