# Accessibility review

This is an implementation and manual verification record, not a WCAG conformance certificate. Independent assistive-technology testing is still needed before institutional deployment.

## Implemented

- A skip link precedes the header and targets the main content.
- The composer has a programmatic label. Enter sends; Shift+Enter creates a new line; composition input is respected.
- Language controls expose their selected state, the document language follows the interface, and each answer marks its own language.
- Buttons have visible keyboard focus. Icon-only controls have accessible names.
- Source links name their publication and table. Tables use real header cells and remain available alongside charts; CSV provides an alternative format.
- The mobile menu exposes its expanded state and supports Escape, returning focus to the menu control.
- The optional model dialog traps keyboard focus, closes with Escape and returns focus to its trigger.
- Loading and error states use status/alert semantics. Users can cancel server requests.
- Reduced-motion preferences disable decorative motion. Narrow layouts retain horizontal scrolling inside data tables.

## Verification limits

The release review checks desktop and 390 px layouts, keyboard submission, source/table access, language controls and the widget. No full screen-reader audit, native-speaker review, automated axe audit, or real-user accessibility study has been completed. Those must not be implied by passing unit tests. Long district tables intentionally scroll within their container.

NISR's current blue and Lexend typography are reused for visual integration. The prototype disclaimer stays visible; visual similarity does not imply endorsement.
