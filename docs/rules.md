# Palefill Rules

Palefill internally uses a rule system inspired by Adblock to specify what rules are applied to sites.
This allows adding new fixes by writing very little code.

## Rule Syntax

Rules are made up of two parts: at least one selector and at least one fix.

**Fixes** can be any number of actions, best refer to [function evaluateFix]({{ site.github.repository_url }}/blob/master/lib/main.js) for
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
suppressed for the matched sites. This is useful when running this add-on alongside others that also
apply changes. For example, the following rule disables all fixes on `github.com`:
```
github.com
  *
```

## GitLab Rules

Since there are many self-hosted GitLab instances that all need the same fixes as the "official" `gitlab.com`,
a split approach is used for these: a list of well-known instances is shipped with the add-on and additionally,
it is possible to specify custom URLs in the add-on's preferences. This makes it easy to i.e. add private instances
that don't need to be in the global list.


## Builtin definitions

  * [Rules]({{ site.github.repository_url }}/blob/master/lib/builtin-rules.js)
  * [Gitlab Domains]({{ site.github.repository_url }}/blob/master/lib/builtin-gitlabs.js)
