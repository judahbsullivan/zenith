
# Zenith Framework

---

## README.md

### What is Zenith?

Zenith is an **HTML-first, web-native framework** focused on predictable rendering, persistent navigation state, and minimal JavaScript by default.

Zenith treats HTML as the source of truth. Behavior is inferred through static analysis rather than developer flags like `use client` or `client-only`.

The framework is currently **under active construction**. Core goals and constraints are intentionally defined early to avoid runtime complexity and hydration pitfalls seen in existing frameworks.

### Core Principles (Locked In)

* HTML-first authoring
* `.zenith` file format
* Optional `<script>` and `<style>` blocks
* No required `<template>` wrapper
* Automatic client/runtime detection
* Navigation lifecycle as a first-class primitive
* Persistent layouts across navigation
* VDOM used intentionally (not everywhere)

### What Zenith Is (Currently)

* A compiler that transforms `.zenith` files into optimized runtime modules
* A navigation-aware runtime with lifecycle hooks
* A layout + document ownership system

### What Zenith Is Not (Yet)

* A finished production framework
* A replacement for all React/Vue use-cases
* An SSR platform (planned, not finalized)

### High-Level Architecture

```
.zenith files
   ↓
Compiler (parse → analyze → compose → generate)
   ↓
Runtime (navigation + rendering)
   ↓
DOM
```

### Status

Zenith is in the **foundation phase**. APIs may change rapidly.

### [Contributing](./docs/CONTRIBUTING.md)
