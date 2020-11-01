# Pale Moon Web Technologies Polyfill Add-On

Inject Polyfills for various web technologies into pages requiring them. This addon is aimed
at UXP and Pale Moon. Seamonkey support is mostly untested.

Polyfills are specified as "fixes" that are applied per domain. Fixes currently can be
scripts that must be loaded, injected inline-scripts and/or Content-Security-Policy adjustments.
It is possible to specify any combination of required fixes for a site.

## Credits

This addon is heavily based on [**GitHub Web Components Polyfill**](https://github.com/JustOff/github-wc-polyfill), which does the same thing for GitHub, portions coming from there are `Copyright (c) 2020 JustOff.`

The polyfills themselves have different contributors, see `lib/polyfills.js`.

