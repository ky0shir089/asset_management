---
name: Asset Management
description: A clear, calm, and dependable operations ledger for asset lifecycle work.
colors:
  ledger-white: "oklch(1 0 0)"
  ledger-ink: "oklch(0.141 0.005 285.823)"
  deep-zinc: "oklch(0.21 0.006 285.885)"
  quiet-zinc: "oklch(0.967 0.001 286.375)"
  muted-zinc: "oklch(0.552 0.016 285.938)"
  rule-zinc: "oklch(0.92 0.004 286.32)"
  focus-zinc: "oklch(0.705 0.015 286.067)"
  raised-zinc: "oklch(0.274 0.006 286.033)"
  alert-red: "oklch(0.577 0.245 27.325)"
  alert-coral: "oklch(0.704 0.191 22.216)"
  active-blue: "oklch(0.488 0.243 264.376)"
  ledger-white-10: "oklch(1 0 0 / 10%)"
  ledger-white-15: "oklch(1 0 0 / 15%)"
  chart-blue: "#2a78d6"
  chart-orange: "#eb6834"
  chart-green: "#1baf7a"
  chart-amber: "#eda100"
  chart-pink: "#e87ba4"
  chart-blue-dark: "#3987e5"
  chart-orange-dark: "#d95926"
  chart-green-dark: "#199e70"
  chart-amber-dark: "#c98500"
  chart-pink-dark: "#d55181"
typography:
  display:
    fontFamily: "Roboto, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
  headline:
    fontFamily: "Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
  title:
    fontFamily: "Roboto, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
  body:
    fontFamily: "Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
  label:
    fontFamily: "Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0.025em"
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.625rem"
  xl: "0.875rem"
  2xl: "1.125rem"
  3xl: "1.375rem"
  4xl: "1.625rem"
spacing:
  1: "0.25rem"
  1-5: "0.375rem"
  2: "0.5rem"
  2-5: "0.625rem"
  3: "0.75rem"
  4: "1rem"
  5: "1.25rem"
  6: "1.5rem"
  8: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.deep-zinc}"
    textColor: "{colors.ledger-white}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 0.625rem"
    height: "2rem"
  button-secondary:
    backgroundColor: "{colors.quiet-zinc}"
    textColor: "{colors.deep-zinc}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 0.625rem"
    height: "2rem"
  input:
    backgroundColor: "{colors.ledger-white}"
    textColor: "{colors.ledger-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0.25rem 0.625rem"
    height: "2rem"
  card:
    backgroundColor: "{colors.ledger-white}"
    textColor: "{colors.ledger-ink}"
    rounded: "{rounded.xl}"
    padding: "1rem"
  badge:
    backgroundColor: "{colors.quiet-zinc}"
    textColor: "{colors.deep-zinc}"
    typography: "{typography.label}"
    rounded: "{rounded.4xl}"
    padding: "0.125rem 0.5rem"
    height: "1.25rem"
---

# Design System: Asset Management

## 1. Overview

**Creative North Star: "Operations Ledger"**

Asset Management should feel like a dependable operational record: composed, legible, and ready for daily work. Quiet Zinc neutrals keep attention on asset state, ownership, location, and next action. Familiar controls reduce interpretation cost for operators moving between forms, tables, approvals, and transaction history.

This is a restrained product system, not a marketing surface. Density is welcome when it improves scanning, but hierarchy, validation, and status must remain obvious. Light and dark themes are equal working environments. Motion communicates state only and never delays task completion.

The system explicitly rejects decorative SaaS styling: gradients, glossy or excessive cards, marketing-style metrics, ornamental motion, and effects that distract from operational work.

**Key Characteristics:**
- Quiet Zinc neutral foundation with sparse semantic color.
- Compact, familiar, and consistent product controls.
- Tonal and bordered separation before shadow.
- Clear state, ownership, location, and action hierarchy.
- Equal light and dark theme support.

## 2. Colors

Quiet Zinc uses low-chroma neutrals as working surfaces and reserves saturated color for action, status, and data distinction.

### Primary
- **Deep Zinc:** Primary actions and selected emphasis in light mode. Its inverse becomes the primary action surface in dark mode.
- **Active Blue:** Selected sidebar emphasis in dark mode. Use only for current navigation or equivalent active state.

### Secondary
- **Quiet Zinc:** Secondary actions, muted panels, hover states, and inactive selections in light mode.
- **Raised Zinc:** Secondary and raised surfaces in dark mode.

### Tertiary
- **Alert Red / Alert Coral:** Destructive and invalid states in light and dark modes. Never use these colors decoratively.
- **Chart Blue, Orange, Green, Amber, and Pink:** Data-series distinction only. Their dark variants preserve separation on dark surfaces.

### Neutral
- **Ledger White:** Light canvas and surface; also high-contrast text on dark surfaces.
- **Ledger Ink:** Light-mode text and dark-mode canvas.
- **Muted Zinc:** Secondary text in light mode and focus-ring source in dark mode.
- **Rule Zinc:** Borders and inverse primary action in dark mode.
- **Focus Zinc:** Focus rings and muted text on dark surfaces.
- **Ledger White 10 / 15:** Dark-mode borders and input fills only.

### Named Rules

**The One Operational Accent Rule.** Accent color marks primary action, current selection, status, or data series. It never decorates empty space.

**The Theme Parity Rule.** Every semantic role must preserve meaning and contrast in both light and dark themes; never treat dark mode as a color inversion afterthought.

**The No Color-Only Rule.** Error, success, warning, selected, and pending states always include text, iconography, shape, or another non-color cue.

## 3. Typography

**Display Font:** Roboto with sans-serif fallback  
**Body Font:** Roboto with sans-serif fallback  
**Label/Mono Font:** Roboto; no separate mono family

**Character:** One neutral sans family keeps labels, forms, tables, and headings coherent. Weight and spacing create hierarchy; font novelty never competes with asset data.

### Hierarchy
- **Display** (700, 1.875rem): Rare page-level overview headings only.
- **Headline** (600, 1.5rem): Main page headings and major dashboard regions.
- **Title** (600, 1.25rem): Section and panel headings.
- **Body** (400, 0.875rem): Default UI text and table content. Long explanatory prose stays within 65–75ch.
- **Label** (500, 0.75rem, 0.025em): Compact metadata and chart labels. Uppercase is occasional, never repeated as section scaffolding.

### Named Rules

**The One-Family Rule.** Roboto carries all product hierarchy. Never introduce a display face for labels, buttons, data, or navigation.

**The Data First Rule.** Tabular values remain easy to scan. Do not shrink important values below 0.75rem or use muted contrast for operationally significant data.

## 4. Elevation

Depth is tonal and bordered first. Cards stay flat with a one-pixel low-contrast ring. Shadows belong to floating layers such as selects, dropdowns, dialogs, and temporary overlays. This keeps persistent work surfaces calm while making transient layers unmistakable.

### Shadow Vocabulary
- **Compact Float** (`0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`): Select and dropdown content.
- **Raised Overlay** (`0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`): Large floating surfaces only when border and backdrop are insufficient.
- **Resting Surface:** No shadow. Use semantic surface contrast and a one-pixel ring.

### Named Rules

**The Bordered-First Rule.** Persistent containers are flat at rest. If every card casts a shadow, hierarchy has failed.

**The Floating-Layer Rule.** Shadow means content escaped normal document flow. Never use it as decoration.

## 5. Components

Components feel familiar and restrained: compact enough for operational work, explicit in every state, and visually consistent across modules.

### Buttons
- **Shape:** Gently rounded rectangle (0.625rem) with a transparent one-pixel border for stable sizing.
- **Primary:** Semantic primary background and primary foreground; 2rem default height; 0.625rem horizontal padding; 0.875rem medium-weight label.
- **Hover / Focus:** Semantic hover shift; visible border and three-pixel ring at 50% opacity; active buttons move down one pixel unless they open a popup.
- **Secondary / Ghost / Outline / Destructive / Link:** Existing variants retain the same size, typography, focus, disabled, and invalid vocabulary.
- **Disabled / Loading:** Disabled controls use 50% opacity and no pointer events. Loading must preserve button width and expose status text to assistive technology.

### Chips
- **Style:** Compact 1.25rem pill with 0.5rem horizontal padding and 0.75rem medium label.
- **State:** Primary, secondary, destructive, outline, ghost, and link variants use the same focus and invalid vocabulary as buttons.

### Cards / Containers
- **Corner Style:** Clearly rounded (0.875rem).
- **Background:** Semantic card surface and foreground.
- **Shadow Strategy:** Flat at rest; use a one-pixel foreground ring at 10% opacity.
- **Border:** Footer separation uses a one-pixel top border with muted tonal fill.
- **Internal Padding:** 1rem default; 0.75rem for small cards.

### Inputs / Fields
- **Style:** 2rem height, 0.625rem radius, semantic input border, transparent surface, 0.625rem horizontal padding. Mobile text remains 1rem to avoid browser zoom; desktop text is 0.875rem.
- **Focus:** Visible border plus three-pixel semantic ring at 50% opacity.
- **Error / Disabled:** Invalid fields use destructive border and ring. Disabled fields keep readable text, 50% opacity, and a muted surface. Field errors use `role="alert"`.
- **Grouping:** Vertical field groups use 0.5rem internal gaps and 1.25rem between fields.

### Navigation
- **Desktop:** 16rem sidebar, collapsing to a 3rem icon rail at the 48rem breakpoint.
- **Mobile:** 18rem off-canvas sidebar with the same menu hierarchy.
- **Items:** 2rem height, 0.5rem radius, 0.5rem padding, semantic accent on hover and current route, and a visible two-pixel focus ring.
- **Hierarchy:** Submenus use a one-pixel connector and consistent indentation. Module and menu ordering mirrors role configuration.
- **Motion:** Sidebar state transition lasts 200ms. Most component transitions last 150ms; menu and dialog entrances last 100ms. Reduced-motion users receive instant state changes.

### Tables and Floating Layers
- **Tables:** Horizontally scroll within their own container. Headers are 2.5rem high, medium weight, and non-wrapping; cells use 0.5rem padding. Hover, expanded, and selected rows use muted tonal fills.
- **Selects and Menus:** 0.625rem radius, compact padding, semantic popover surface, one-pixel ring, and Compact Float shadow.
- **Dialogs:** 0.875rem radius, 1rem padding, semantic surface, one-pixel ring, and a restrained backdrop. Dialogs are reserved for focused decisions that cannot stay inline.

## 6. Do's and Don'ts

### Do:
- **Do** make current asset state, ownership, location, and next valid action obvious.
- **Do** use semantic CSS variables so light and dark themes preserve identical meaning.
- **Do** use the 0.25rem spacing unit and existing radius scale before inventing new values.
- **Do** keep controls compact while preserving keyboard access, visible focus, and readable 0.875rem labels.
- **Do** keep wide tables inside their own horizontal scroll container so the page body never scrolls sideways.
- **Do** use skeletons for content loading and task-specific empty states that explain the next action.
- **Do** disable nonessential transition and entrance motion under `prefers-reduced-motion: reduce`.

### Don't:
- **Don't** use decorative SaaS styling: gradients, glossy or excessive cards, marketing-style metrics, ornamental motion, or visual effects that distract from operational work.
- **Don't** use colored side-stripe borders on cards, filters, alerts, or list items.
- **Don't** repeat identical metric cards when grouping, hierarchy, or direct comparison communicates more clearly.
- **Don't** use gradient text, decorative glassmorphism, or saturation on inactive states.
- **Don't** use tiny uppercase tracked labels as repeated section scaffolding.
- **Don't** use shadow on every container; shadow means a floating layer.
- **Don't** rely on color alone for validation, status, selection, or chart interpretation.
- **Don't** introduce a second UI font, custom form affordance, or decorative animation without a task-driven need.
