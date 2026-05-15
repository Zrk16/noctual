# Nocual Design Spec

## Colors
- --bg: #0C0C0B
- --surface: #141412
- --surface-2: #1C1C19
- --border: #2A2A26
- --text: #F2F0EB
- --text-muted: #6B6966
- --text-dim: #3D3D39
- --ai-accent: #C8903A
- --ai-accent-rgb: 200, 144, 58
- --ai-dim: rgba(200, 144, 58, 0.10)
- --ai-border: rgba(200, 144, 58, 0.25)

Strategy: Black/white stone base. Amber only for AI elements (assistant bubbles, AI page headers, action states).

## Typography
- Display: 'Syne', sans-serif — headings, logo, page titles
- Body: 'Space Grotesk', sans-serif — all UI text, labels, body copy
- Mono: 'DM Mono', monospace — numbers, times, financial data, code
- Scale: 12 / 14 / 16 / 20 / 28 / 40 / 56
- Google Fonts: https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Grotesk:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap

## Spacing
- --space-xs: 0.375rem
- --space-sm: 0.75rem
- --space-md: 1.25rem
- --space-lg: 2rem
- --space-xl: 3.5rem
- --space-2xl: 6rem

## Radius
- --radius-sm: 4px
- --radius-md: 8px
- --radius-lg: 16px

## Motion
- Reveal easing: cubic-bezier(0.16, 1, 0.3, 1)
- Micro-interaction duration: 180ms
- Reveal duration: 650ms
- Stagger delay: 70ms

## Layout
- App shell: fixed left sidebar (220px) + scrollable main content + fixed bottom assistant bar
- Sidebar contains: Nocual wordmark, nav links with icons, bottom user area
- Main content: padding-left: 220px, padding-bottom: 80px (assistant bar)
- Assistant bar: fixed bottom, 60px collapsed, 400px expanded, full-width
- No top navbar — sidebar IS the navigation

## Background Treatment
- Base: #0C0C0B warm near-black
- Grain overlay: SVG noise at 2.5% opacity on body::after
- Sidebar: slightly lighter #141412 with right border 1px #2A2A26
- Cards/surfaces: #1C1C19 with 1px border #2A2A26

## Aesthetic Direction
- Tone: Refined dark — premium Japanese stone editorial. Think Fear of God store, SSENSE, APC. Quiet confidence.
- Differentiator: The AI assistant has its own amber color identity — it feels like a different entity living inside a stone OS. Black/white app, golden voice.
- Anti-references: NOT hacker terminal. NOT neon cyberpunk. NOT corporate dark mode (navy blue). NOT glassmorphism.
