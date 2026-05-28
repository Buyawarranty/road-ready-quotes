# Embedding the Panda Protect dealer hero on WordPress

The dealer hero (headline, reg lookup, Dealer Login + Become a Dealer CTAs)
is available as a standalone widget at:

```
https://road-ready-quotes.lovable.app/dealer-widget
```

All buttons inside the widget navigate the **top window** to the matching
Panda Protect page:

| Action                       | Destination |
|------------------------------|-------------|
| Enter reg → Get Quote        | `/dealer-portal/login?redirect=/dealer-portal&reg=XXXX` (preserves reg into the 5-step journey after login) |
| Dealer Login                 | `/dealer-portal/login` |
| Become a Dealer              | `/dealer-portal/signup` |

## Quick install — Custom HTML block

Paste this into any WordPress page, Elementor HTML widget, or Gutenberg
"Custom HTML" block:

```html
<iframe
  id="panda-dealer-hero"
  src="https://road-ready-quotes.lovable.app/dealer-widget?bg=transparent"
  style="width:100%;border:0;min-height:780px;display:block"
  loading="lazy"
  title="Panda Protect dealer quote"
  allow="clipboard-write"
></iframe>
<script>
  (function () {
    var frame = document.getElementById('panda-dealer-hero');
    window.addEventListener('message', function (e) {
      if (e.origin !== 'https://road-ready-quotes.lovable.app') return;
      if (e.data && e.data.type === 'panda:resize' && frame) {
        frame.style.height = (e.data.height + 20) + 'px';
      }
    });
  })();
</script>
```

The auto-resize script keeps the iframe height in sync with the widget's
content — no scrollbars, no clipping.

## Query string options

| Param            | Effect |
|------------------|--------|
| `bg=transparent` | Removes the white background so the widget blends into your section |
| `compact=1`      | Hides headline + sub-copy and the CTA card; keeps just the reg form |
| `theme=dark`     | Reserved for future dark variant |

Example — reg form only, transparent:

```
https://road-ready-quotes.lovable.app/dealer-widget?bg=transparent&compact=1
```

## Optional: WordPress shortcode

Add this to your theme's `functions.php` (or a snippets plugin) so editors can
drop `[panda_dealer_hero]` anywhere:

```php
add_shortcode('panda_dealer_hero', function ($atts) {
  $atts = shortcode_atts(['compact' => '0', 'bg' => 'transparent'], $atts);
  $src = 'https://road-ready-quotes.lovable.app/dealer-widget?bg=' . esc_attr($atts['bg']);
  if ($atts['compact'] === '1') $src .= '&compact=1';
  ob_start(); ?>
  <iframe id="panda-dealer-hero" src="<?php echo esc_url($src); ?>"
    style="width:100%;border:0;min-height:780px;display:block"
    loading="lazy" title="Panda Protect dealer quote" allow="clipboard-write"></iframe>
  <script>
    (function(){var f=document.getElementById('panda-dealer-hero');
    window.addEventListener('message',function(e){
      if(e.origin!=='https://road-ready-quotes.lovable.app')return;
      if(e.data&&e.data.type==='panda:resize'&&f)f.style.height=(e.data.height+20)+'px';
    });})();
  </script>
  <?php return ob_get_clean();
});
```

## Notes

- The widget uses the same validation, styling, and routing as the main
  Panda Protect dealer portal — no behavioural drift.
- Authentication still happens on `road-ready-quotes.lovable.app`. After a
  WordPress visitor signs up / logs in, they continue inside the dealer
  portal. If you later want true SSO between the two sites we'd need to add
  an OAuth bridge — out of scope here.
- If you want to lock framing to your WordPress domain only (recommended for
  production), tell us the exact origin and we'll send a
  `Content-Security-Policy: frame-ancestors` header that whitelists it.
