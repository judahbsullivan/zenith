// compiler/bindings.ts
// Phase 2: Object-style dynamic attribute bindings with quoted expressions
// Supports :class and :value attributes with synchronous, deterministic updates

export function generateAttributeBindingRuntime(bindings: Array<{ type: 'class' | 'value'; expression: string }>): string {
  if (bindings.length === 0) {
    return ''; // No bindings, no runtime needed
  }

  // Generate unique expression IDs for tracking
  const expressionIds = bindings.map((_, i) => `expr_${i}`);
  const expressionsStr = JSON.stringify(bindings.map(b => b.expression));
  const typesStr = JSON.stringify(bindings.map(b => b.type));

  return `
// Phase 2: Attribute binding runtime - synchronous, deterministic updates
// Note: 'use strict' is omitted to allow 'with' statement for expression evaluation
(function() {
  
  // Store all binding elements and their expressions
  const bindingExpressions = ${expressionsStr};
  const bindingTypes = ${typesStr};
  const bindingElements = [];
  
  // Reactive state proxy - tracks property access and updates DOM synchronously
  // Initialize with empty object - properties will be added dynamically
  const stateTarget = {};
  const stateProxy = new Proxy(stateTarget, {
    set(target, prop, value) {
      const oldValue = target[prop];
      target[prop] = value;
      
      // Log state change for debugging
      // console.log('[Zenith] State change:', prop, '=', value);
      
      // Synchronously update all affected bindings
      bindingElements.forEach(binding => {
        try {
          // Re-evaluate expression in context of current state
          // Pass target (the state object) as parameter to the evaluator function
          const result = binding.fn(target);
          
          if (binding.type === 'class') {
            updateClassBinding(binding.el, result);
            // console.log('[Zenith] Updated :class binding for element:', binding.el, 'result:', result);
          } else if (binding.type === 'value') {
            updateValueBinding(binding.el, result);
            // console.log('[Zenith] Updated :value binding for element:', binding.el, 'result:', result);
          }
        } catch (e) {
          // Log errors for debugging (Phase 2: graceful degradation)
          console.warn('[Zenith] Binding evaluation error:', e, 'for expression:', binding.expression);
        }
      });
      
      return true;
    },
    get(target, prop) {
      // Return undefined for missing properties (don't throw errors)
      return target[prop];
    }
  });
  
  // Make stateProxy available globally as 'state'
  window.state = stateProxy;
  
  // Helper: Evaluate class binding expression
  // Handles: objects, strings, empty objects, falsy values
  // Preserves existing static classes from the class attribute
  function updateClassBinding(el, result) {
    // Store static classes on first update (from class attribute)
    if (!el._zenStaticClasses) {
      const staticClasses = el.getAttribute('class') || '';
      el._zenStaticClasses = staticClasses.split(/\\s+/).filter(c => c);
    }
    const staticClassList = el._zenStaticClasses;
    
    if (typeof result === 'string') {
      // String value: treat as raw class names, merge with static classes
      const dynamicClasses = result.split(/\\s+/).filter(c => c);
      el.className = [...staticClassList, ...dynamicClasses].join(' ').trim();
    } else if (result && typeof result === 'object' && !Array.isArray(result)) {
      // Object value: extract keys with true values
      const dynamicClasses = [];
      for (const key in result) {
        if (result.hasOwnProperty(key) && result[key] === true) {
          dynamicClasses.push(key);
        }
      }
      // Merge static and dynamic classes
      el.className = [...staticClassList, ...dynamicClasses].join(' ').trim();
    } else {
      // Falsy, null, undefined, or non-object: keep only static classes
      el.className = staticClassList.join(' ').trim();
    }
  }
  
  // Helper: Evaluate value binding expression
  // Handles: primitives, falsy values
  function updateValueBinding(el, result) {
    if (result === null || result === undefined) {
      el.value = '';
    } else {
      el.value = String(result);
    }
  }
  
  // Helper: Safely evaluate expression string
  // Creates a function that evaluates the expression with state properties in scope
  function createEvaluator(expression) {
    // Trim whitespace from expression
    let trimmed = expression.trim();
    
    // Check if expression is a quoted string (single or double quotes)
    // If so, unquote it and check if it's a simple identifier
    let isSimpleIdentifier = false;
    let evalExpression = trimmed;
    
    // Handle quoted strings: "username" or 'username' -> username
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      // Extract the unquoted value
      const unquoted = trimmed.slice(1, -1);
      // Check if unquoted value is a simple identifier
      if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(unquoted)) {
        isSimpleIdentifier = true;
        evalExpression = unquoted; // Use unquoted identifier for evaluation
      }
      // Otherwise, treat as string literal (e.g., "'static-class'" -> "static-class")
    } else {
      // Not quoted: check if it's a simple identifier
      isSimpleIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(trimmed);
      if (isSimpleIdentifier) {
        evalExpression = trimmed; // Already unquoted identifier
      }
    }
    
    try {
      // Create a function that evaluates the expression
      // The expression is written as if state properties are directly accessible
      // We use Function constructor with 'with' statement to make state properties available
      // Note: 'with' is deprecated but necessary for this use case in non-strict mode
      return function(state) {
        try {
          // Use Function constructor to create evaluator with state in scope
          // This allows expressions like "{ active: isActive }" where isActive refers to state.isActive
          // For simple identifiers, evaluate them directly to access state properties
          // For quoted strings that aren't identifiers, evaluate as string literals
          // For object literals, evaluate as-is
          
          // Use Function constructor to create evaluator
          // The 'with' statement makes state properties available as variables
          // This allows expressions like "{ active: isActive }" where isActive refers to state.isActive
          const func = new Function('state', 
            'try {' +
            '  with (state) {' +
            '    return (' + evalExpression + ');' +
            '  }' +
            '} catch (e) {' +
            '  console.warn("[Zenith] Expression evaluation error:", ' + JSON.stringify(trimmed) + ', e);' +
            '  return null;' +
            '}'
          );
          const result = func(state);
          // console.log('[Zenith] Evaluated expression:', trimmed, 'result:', result, 'state:', state);
          return result;
        } catch (e) {
          // Last resort: return safe default
          console.warn('Expression evaluation error:', trimmed, e);
          const bindingIndex = bindingExpressions.indexOf(expression);
          return bindingIndex >= 0 && bindingTypes[bindingIndex] === 'class' ? {} : '';
        }
      };
    } catch (e) {
      // If expression is invalid, return a function that returns empty string/object
      console.warn('Invalid binding expression:', expression, e);
      const bindingIndex = bindingExpressions.indexOf(expression);
      return function() { 
        return bindingIndex >= 0 && bindingTypes[bindingIndex] === 'class' ? {} : ''; 
      };
    }
  }
  
  // Initialize bindings after DOM is ready
  function initializeBindings() {
    // console.log('[Zenith] Initializing attribute bindings...');
    
    // Find all elements with data-zen-class or data-zen-value attributes
    const classElements = document.querySelectorAll('[data-zen-class]');
    const valueElements = document.querySelectorAll('[data-zen-value]');
    
    // console.log('[Zenith] Found', classElements.length, ':class bindings and', valueElements.length, ':value bindings');
    
    // Process :class bindings
    classElements.forEach((el) => {
      const expression = el.getAttribute('data-zen-class');
      if (expression) {
        // console.log('[Zenith] Setting up :class binding:', expression, 'for element:', el);
        const fn = createEvaluator(expression);
        const result = fn(stateProxy);
        updateClassBinding(el, result);
        bindingElements.push({ el: el, type: 'class', expression, fn });
        // console.log('[Zenith] Initial :class result:', result, 'applied classes:', el.className);
      }
    });
    
    // Process :value bindings
    valueElements.forEach((el) => {
      const expression = el.getAttribute('data-zen-value');
      if (expression) {
        // console.log('[Zenith] Setting up :value binding:', expression, 'for element:', el);
        const fn = createEvaluator(expression);
        const result = fn(stateProxy);
        updateValueBinding(el, result);
        bindingElements.push({ el: el, type: 'value', expression, fn });
        // console.log('[Zenith] Initial :value result:', result, 'applied value:', el.value);
      }
    });
    
    // console.log('[Zenith] Initialized', bindingElements.length, 'bindings. State object:', stateProxy);
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBindings);
  } else {
    initializeBindings();
  }
})();
`;
}

