// compiler/binding.ts
// Phase 2: Reactive text bindings runtime generator
// Generates code to update DOM when state values change

import type { StateBinding } from "./types"

export function generateBindingRuntime(
  stateBindings: StateBinding[],
  stateDeclarations: Map<string, string>
): string {
  if (stateBindings.length === 0 && stateDeclarations.size === 0) {
    return "";
  }

  const stateNames = Array.from(stateDeclarations.keys());

  // Generate binding update map - collect all nodes for each state
  const bindingMapEntries: string[] = [];
  const bindingMap = new Map<string, string[]>();
  
  for (const stateBinding of stateBindings) {
    if (!bindingMap.has(stateBinding.stateName)) {
      bindingMap.set(stateBinding.stateName, []);
    }
    const selectors = bindingMap.get(stateBinding.stateName)!;
    for (const binding of stateBinding.bindings) {
      const bindId = `bind-${binding.nodeIndex}`;
      selectors.push(`span[data-zen-bind="${stateBinding.stateName}"][data-zen-bind-id="${bindId}"]`);
    }
  }

  // Convert to code - use querySelector for each unique binding ID
  for (const [stateName, selectors] of bindingMap.entries()) {
    if (selectors.length > 0) {
      const nodeSelectors = selectors.map(s => `document.querySelector("${s.replace(/"/g, '\\"')}")`).join(", ");
      bindingMapEntries.push(
        `    "${stateName}": [${nodeSelectors}]`
      );
    }
  }

  const bindingMapCode = bindingMapEntries.length > 0 
    ? `__zen_bindings = {\n${bindingMapEntries.join(",\n")}\n  };`
    : `__zen_bindings = {};`;

  // Generate state initialization code
  const stateInitCode = stateNames.map(name => {
    const initialValue = stateDeclarations.get(name) || "undefined";
    return `
  // Initialize state: ${name}
  (function() {
    let __zen_${name} = ${initialValue};
    Object.defineProperty(window, "${name}", {
      get: function() { return __zen_${name}; },
      set: function(value) {
        __zen_${name} = value;
        __zen_update_bindings("${name}", value);
      },
      enumerable: true,
      configurable: true
    });
  })();`;
  }).join("");

  // Generate initialization call (after DOM is ready)
  const initBindingsCode = stateNames.map(name => {
    return `    __zen_update_bindings("${name}", ${name});`;
  }).join("\n");

  return `
// Phase 2: Reactive text bindings runtime
(function() {
  let __zen_bindings = {};

  // Update function for a specific state
  function __zen_update_bindings(stateName, value) {
    const nodes = __zen_bindings[stateName];
    if (nodes) {
      nodes.forEach(node => {
        if (node) {
          node.textContent = String(value);
        }
      });
    }
  }

${stateInitCode}

  // Initialize binding map and bindings after DOM is ready
  function __zen_init_bindings() {
${bindingMapCode.split('\n').map(line => '    ' + line).join('\n')}
${initBindingsCode.split('\n').map(line => '    ' + line).join('\n')}
  }

  // Initialize bindings when DOM is ready (scripts are deferred, so DOM should be ready)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', __zen_init_bindings);
  } else {
    __zen_init_bindings();
  }
})();
`;
}

