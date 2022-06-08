# Pale Moon Web Technologies Polyfill Add-On

Inject Polyfills for various web technologies into pages requiring them. This addon is aimed
at Pale Moon and UXP. Seamonkey support is mostly untested. For others, [see below](#platform-support).

Polyfills are specified as "fixes" that are applied per domain. Fixes currently can be:

  * scripts that must be loaded
  * injected inline-scripts
  * Content-Security-Policy adjustments
  * script content changes

It is possible to specify any combination of required fixes for a site.

## Rule Syntax

Rules are made up of two parts: at least one selector and at least one fix.

**Fixes** can be any number of actions, best refer to [function evaluateFix](lib/main.js) for
up-to-date info on what each one does. The names are case-sensitive.

**Selectors** use a syntax derieved from Adblock filters. Three parts are used:

  * the domain part (*mandatory*) \
    The `*` wildcard can be used at the leftmost level to match any (recursive) subdomain
  * path part (*optional*) \
    The `*` wildcard can be used exactly once, anywhere in the path
  * delimted with a "$": content type selection (*optional*)
      * document: regular top-level document
      * subdocument: included document, such as frame or iframe
      * script: anything included via <script> tags

All of these are valid selectors:
```
example.com
example.com/path/a.html
*.example.com/path/to.js$script
example.com/path/any*.js$script
example.com$subdocument
```

**Rule scripts** are constructed by giving any number of selectors followed by a comma-separated list
of the fixes to apply, indented by whitespace:
```
example.com
example.com/path/a.html
  std-queueMicrotask,std-customElements
```

Additionally, the exclusion script has a special case: if the special fix `*` is used, all fixes are
suppressed for the matched sites. This is useful when running this addon alongside others that also
apply changes. For example, the following rule disables all fixes on `github.com`:
```
github.com
  *
```

## GitLab Rules

Since there are many self-hosted GitLab instances that all need the same fixes as the "official" `gitlab.com`,
a split approach is used for these: a list of well-known instances is shipped with the addon and additionally,
it is possible to specify custom URLs in the addon's preferences. This makes it easy to i.e. add private instances
that don't need to be in the global list.

## Platform Support

Palefill is developed on the Pale Moon browser. Contributors have also helped with Iceweasel-UXP, Basilisk and SeaMonkey
support. Those are considered "fully supported".

It is also possible to install Palefill on *any* browser using the UXP toolkit. This should help with some more niche
projects or custom and testing branches. Due to implementation details, it is technically also possible to install the
addon on very old Firefox versions -- this is caught at runtime since this won't actually work.

When running in this compatibility mode, all features should still work as expected, but users should be aware that this
is completely untested and no claims at all are being made. In this case, a warning text is displayed in the addon's preferences.

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

The following people have contributed to this addon:

  * [roytam1](https://github.com/roytam1)
  * [UCyborg](https://github.com/UCyborg)

