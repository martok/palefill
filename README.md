# Pale Moon Web Technologies Polyfill Add-On

Inject Polyfills for various web technologies into pages requiring them. This addon is aimed
at UXP and Pale Moon. Seamonkey support is mostly untested.

Polyfills are specified as "fixes" that are applied per domain. Fixes currently can be:

  * scripts that must be loaded
  * injected inline-scripts
  * Content-Security-Policy adjustments
  * script content changes

It is possible to specify any combination of required fixes for a site.

## Credits

This addon is heavily based on [**GitHub Web Components Polyfill**](https://github.com/JustOff/github-wc-polyfill),
which does the same thing for GitHub and a few other sites.
```
 Portions based on GitHub Web Components Polyfill Add-on
 Copyright (c) 2020 JustOff. All rights reserved.
 Copyright (c) 2022 SeaHOH. All rights reserved.
 https://github.com/JustOff/github-wc-polyfill
```

The polyfills themselves have different contributors, see `lib/polyfills.js`.

