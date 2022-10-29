# Additional User-Styles

Palefill does not incorporate a user-style engine, and simple style changes are deliberately out of
scope for the fixes done here.

If required, the following snippets might be useful in the user style method of choice.

## drive.google.com

Fix scrolling in the main file list:

```css
@namespace url(http://www.w3.org/1999/xhtml);

@-moz-document domain("drive.google.com") {
  .PEfnhb, .a-q-Gd {
    position: absolute !important;
  }
}
```

