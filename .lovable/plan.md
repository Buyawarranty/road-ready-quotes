# Faster images and search-friendly descriptions

## Goal
Make the public Panda Protect pages load images faster while keeping them sharp, accessible, and useful to search engines.

## Changes
- Convert the largest actively used PNG/JPEG images to smaller WebP versions, resizing files that are far larger than their displayed dimensions.
- Prioritise only the first visible image on each page; lazy-load images farther down the page.
- Add accurate width, height, and responsive sizing hints to reduce layout movement and avoid downloading unnecessarily large images.
- Improve missing or generic alternative text with short, natural descriptions relevant to the page. Keep decorative images empty rather than stuffing keywords.
- Remove external image hotlinks where they slow or weaken reliability, using local optimised assets where appropriate.
- Preserve the existing layout and branding; this is a performance and search-quality update, not a redesign.

## Validation
- Compare image file sizes before and after.
- Check representative public pages on desktop and mobile for correct images, layout, and lazy loading.
- Verify that meaningful images have descriptive text and decorative images remain correctly ignored by screen readers.
