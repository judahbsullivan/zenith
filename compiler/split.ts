import type { ZenFile, StateBinding, ScriptBlock } from "./types"
import * as parse5 from "parse5"
import { extractStateDeclarations, extractStateDeclarationsWithLocation, transformStateDeclarations, type StateDeclarationInfo } from "./parse"
import { extractEventHandlers, detectStateMutations, validateStateMutations, type InlineHandlerInfo } from "./mutation"

// ============================================
// ES6 Import Transform & Auto-Import System
// ============================================

/**
 * Zen primitives that can be auto-imported
 * Maps the function name to its internal implementation
 */
const ZEN_AUTO_IMPORTS = {
  // Reactivity primitives
  zenSignal: '__zenith.signal',
  zenState: '__zenith.state',
  zenEffect: '__zenith.effect',
  zenMemo: '__zenith.memo',
  zenRef: '__zenith.ref',
  zenBatch: '__zenith.batch',
  zenUntrack: '__zenith.untrack',
  // Clean aliases
  signal: '__zenith.signal',
  state: '__zenith.state',
  effect: '__zenith.effect',
  memo: '__zenith.memo',
  ref: '__zenith.ref',
  batch: '__zenith.batch',
  untrack: '__zenith.untrack',
  // Lifecycle hooks
  zenOnMount: '__zenith.onMount',
  zenOnUnmount: '__zenith.onUnmount',
  onMount: '__zenith.onMount',
  onUnmount: '__zenith.onUnmount',
  // Navigation (from router)
  navigate: '__zenith_router.navigate',
  getRoute: '__zenith_router.getRoute',
  isActive: '__zenith_router.isActive',
  prefetch: '__zenith_router.prefetch',
} as const;

/**
 * Parse and transform ES6 imports in script content
 * Converts imports to window/global references
 */
function transformImports(script: string): { 
  transformed: string; 
  imports: Array<{ from: string; names: string[] }>;
} {
  const imports: Array<{ from: string; names: string[] }> = [];
  
  // Match ES6 import statements
  // import { a, b, c } from 'module'
  // import { a as b } from 'module'
  // import defaultExport from 'module'
  // import * as name from 'module'
  const importRegex = /import\s+(?:(\{[^}]+\})|(\*\s+as\s+\w+)|(\w+))\s+from\s+['"]([^'"]+)['"]\s*;?/g;
  
  let transformed = script;
  let match;
  
  while ((match = importRegex.exec(script)) !== null) {
    const namedImports = match[1]; // { a, b, c }
    const namespaceImport = match[2]; // * as name
    const defaultImport = match[3]; // defaultExport
    const modulePath = match[4]; // 'module'
    
    const importedNames: string[] = [];
    
    if (namedImports) {
      // Parse { a, b as c, d }
      const names = namedImports
        .replace(/[{}]/g, '')
        .split(',')
        .map(n => n.trim())
        .filter(n => n);
      
      for (const name of names) {
        // Handle 'a as b' syntax
        const asMatch = name.match(/(\w+)\s+as\s+(\w+)/);
        if (asMatch) {
          importedNames.push(asMatch[2]); // Use the alias
        } else {
          importedNames.push(name);
        }
      }
    }
    
    if (defaultImport) {
      importedNames.push(defaultImport);
    }
    
    if (namespaceImport) {
      const nsMatch = namespaceImport.match(/\*\s+as\s+(\w+)/);
      if (nsMatch) {
        importedNames.push(nsMatch[1]);
      }
    }
    
    imports.push({ from: modulePath, names: importedNames });
  }
  
  // Remove import statements from the script
  transformed = transformed.replace(importRegex, '');
  
  // Clean up any leftover empty lines from removed imports
  transformed = transformed.replace(/^\s*\n{2,}/gm, '\n');
  
  return { transformed, imports };
}

/**
 * Detect zen primitives used in script and generate auto-import declarations
 */
function generateAutoImports(script: string, existingImports: string[]): string {
  const autoImportDeclarations: string[] = [];
  
  for (const [name, globalRef] of Object.entries(ZEN_AUTO_IMPORTS)) {
    // Skip if already imported
    if (existingImports.includes(name)) continue;
    
    // Check if the primitive is used in the script (as a word boundary)
    const usageRegex = new RegExp(`\\b${name}\\s*\\(`, 'g');
    if (usageRegex.test(script)) {
      autoImportDeclarations.push(`const ${name} = window.${globalRef};`);
    }
  }
  
  if (autoImportDeclarations.length > 0) {
    return `// Auto-imported zen primitives\n${autoImportDeclarations.join('\n')}\n\n`;
  }
  
  return '';
}

/**
 * Process script content: transform imports and add auto-imports
 */
export function processScriptImports(script: string): string {
  // First, transform ES6 imports
  const { transformed, imports } = transformImports(script);
  
  // Collect all imported names
  const importedNames = imports.flatMap(i => i.names);
  
  // Generate auto-imports for zen primitives
  const autoImports = generateAutoImports(transformed, importedNames);
  
  // Combine: auto-imports first, then the transformed script
  return autoImports + transformed;
}

// Transform on* attributes to data-zen-* attributes during compilation
// Also converts inline arrow functions to function names
// Returns: { transformedHtml, eventTypes, inlineHandlerMap } 
// where inlineHandlerMap maps original arrow function code to generated function names
function transformEventAttributes(
  html: string,
  inlineHandlerMap: Map<string, string> // maps arrow function code -> generated function name
): { transformedHtml: string; eventTypes: Set<string> } {
  const document = parse5.parse(html);
  const eventTypes = new Set<string>();
  
  function walk(node: any) {
    // Transform attributes on element nodes
    if (node.attrs && Array.isArray(node.attrs)) {
      node.attrs = node.attrs.map((attr: any) => {
        const attrName = attr.name.toLowerCase();
        // Check if attribute starts with "on" (event handler)
        if (attrName.startsWith('on') && attrName.length > 2) {
          // Convert onclick -> data-zen-click, onchange -> data-zen-change, etc.
          const eventType = attrName.slice(2); // Remove "on" prefix
          eventTypes.add(eventType); // Track which event types are used
          
          const handlerValue = attr.value;
          // Check if it's an inline arrow function
          const arrowFunctionMatch = handlerValue.match(/^\s*\([^)]*\)\s*=>\s*(.+)$/);
          
          if (arrowFunctionMatch) {
            // It's an inline arrow function - look up the generated function name
            const arrowBody = arrowFunctionMatch[1].trim();
            const generatedName = inlineHandlerMap.get(arrowBody);
            if (generatedName) {
              return {
                name: `data-zen-${eventType}`,
                value: generatedName
              };
            }
          }
          
          return {
            name: `data-zen-${eventType}`,
            value: handlerValue
          };
        }
        return attr;
      });
    }
    
    // Recursively process child nodes
    if (node.childNodes) {
      node.childNodes.forEach(walk);
    }
  }
  
  walk(document);
  
  // Serialize back to HTML string
  return {
    transformedHtml: parse5.serialize(document),
    eventTypes
  };
}

/**
 * Transform text bindings { stateName } in text nodes to <span data-zen-bind="stateName"></span>
 * Returns transformed HTML and a map of state bindings
 */
function transformTextBindings(
  html: string,
  declaredStates: Set<string>
): { transformedHtml: string; stateBindings: Map<string, StateBinding> } {
  const document = parse5.parse(html);
  const stateBindings = new Map<string, StateBinding>();
  let bindingIndex = 0;

  function walk(node: any) {
    // Skip script and style nodes - their content is handled separately
    if (node.nodeName === 'script' || node.nodeName === 'style') {
      return;
    }

    if (!node.childNodes || !Array.isArray(node.childNodes)) {
      return;
    }

    const newChildNodes: any[] = [];
    
    for (const child of node.childNodes) {
      if (child.nodeName === '#text' && child.value) {
        const text = child.value;
        // Match { identifier } pattern - only simple identifiers, no expressions
        const bindingRegex = /\{\s*(\w+)\s*\}/g;
        const matches = Array.from(text.matchAll(bindingRegex));
        
        if (matches.length === 0) {
          // No bindings, keep the text node as-is
          newChildNodes.push(child);
        } else {
          // Validate all bindings reference declared states
          // Skip validation for instance-scoped state names (__zen_comp_*_stateName)
          // These are component states that have already been transformed during inlining
          for (const match of matches) {
            const m = match as RegExpMatchArray;
            const stateName = m[1];
            if (!stateName) continue;
            
            // Skip validation for instance-scoped component state names
            // These are generated during component inlining (e.g., __zen_comp_0_clicks)
            if (stateName.startsWith('__zen_')) {
              continue;
            }
            
            if (!declaredStates.has(stateName)) {
              throw new Error(
                `Compiler Error: Binding "{ ${stateName} }" references undeclared state. ` +
                `Declared states: ${Array.from(declaredStates).join(', ') || '(none)'}`
              );
            }
          }

          // Split text by bindings and create nodes
          let lastIndex = 0;

          for (const match of matches) {
            const m = match as RegExpMatchArray;
            const stateName = m[1];
            if (!stateName) continue; // Skip if state name is missing (shouldn't happen)
            
            const matchStart = m.index!;
            const matchEnd = matchStart + m[0].length;

            // Add text before the binding
            if (matchStart > lastIndex) {
              const beforeText = text.substring(lastIndex, matchStart);
              if (beforeText) {
                newChildNodes.push({
                  nodeName: '#text',
                  value: beforeText,
                  parentNode: node
                });
              }
            }

            // Create span element for binding
            const bindId = `bind-${bindingIndex++}`;
            const spanNode = {
              nodeName: 'span',
              tagName: 'span',
              attrs: [
                {
                  name: 'data-zen-bind',
                  value: stateName
                },
                {
                  name: 'data-zen-bind-id',
                  value: bindId
                }
              ],
              childNodes: [],
              parentNode: node
            };
            newChildNodes.push(spanNode);

            // Track this binding
            if (!stateBindings.has(stateName)) {
              stateBindings.set(stateName, {
                stateName,
                bindings: []
              });
            }
            const binding = stateBindings.get(stateName)!;
            binding.bindings.push({
              stateName,
              nodeIndex: bindingIndex - 1
            });

            lastIndex = matchEnd;
          }

          // Add remaining text after last binding
          if (lastIndex < text.length) {
            const afterText = text.substring(lastIndex);
            if (afterText) {
              newChildNodes.push({
                nodeName: '#text',
                value: afterText,
                parentNode: node
              });
            }
          }
        }
      } else {
        // Not a text node, recurse into it
        walk(child);
        newChildNodes.push(child);
      }
    }
    
    node.childNodes = newChildNodes;
  }

  walk(document);

  return {
    transformedHtml: parse5.serialize(document),
    stateBindings
  };
}

// Transform :class and :value attributes to data-zen-* attributes
// Returns: { transformedHtml, bindings } where bindings contains attribute binding info
function transformAttributeBindings(html: string, scripts: ScriptBlock[]): { transformedHtml: string; bindings: Array<{ type: 'class' | 'value'; expression: string }> } {
  const document = parse5.parse(html);
  const bindings: Array<{ type: 'class' | 'value'; expression: string }> = [];
  
  function walk(node: any) {
    // Transform attributes on element nodes
    if (node.attrs && Array.isArray(node.attrs)) {
      node.attrs = node.attrs.map((attr: any) => {
        const attrName = attr.name;
        // Check if attribute is :class or :value (colon-prefixed)
        if (attrName === ':class' || attrName === ':value') {
          const bindingType = attrName.slice(1) as 'class' | 'value'; // Remove ":" prefix
          const expression = attr.value.trim(); // Store the quoted expression
          
          // Track this binding
          bindings.push({ type: bindingType, expression });
          
          // Transform to data-zen-* attribute
          return {
            name: `data-zen-${bindingType}`,
            value: expression // Store the expression string
          };
        }
        return attr;
      });
    }
    
    // Recursively process child nodes
    if (node.childNodes) {
      node.childNodes.forEach(walk);
    }
  }
  
  walk(document);
  
  // NOTE: Component state transformation is now handled in component-process.ts
  // via transformStateInHtml, which only transforms component INTERNAL state.
  // Props are direct bindings and should NOT be transformed here.
  // This function is kept for backward compatibility but does nothing now.
  
  // Serialize back to HTML string
  return {
    transformedHtml: parse5.serialize(document),
    bindings
  };
}

// Strip script and style tags from HTML since they're extracted to separate files
function stripScriptAndStyleTags(html: string): string {
  // Remove script tags (including content)
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  // Remove style tags (including content)
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  return html;
}

/**
 * Compiler error for state redeclaration
 */
export class StateRedeclarationError extends Error {
  constructor(
    public stateName: string,
    public firstDeclaration: StateDeclarationInfo,
    public secondDeclaration: StateDeclarationInfo
  ) {
    const firstLoc = `script ${firstDeclaration.scriptIndex + 1}, line ${firstDeclaration.line}, column ${firstDeclaration.column}`;
    const secondLoc = `script ${secondDeclaration.scriptIndex + 1}, line ${secondDeclaration.line}, column ${secondDeclaration.column}`;
    super(
      `Compiler Error: State variable "${stateName}" is declared multiple times.\n` +
      `  First declaration: ${firstLoc}\n` +
      `  Second declaration: ${secondLoc}\n` +
      `  State variables must be declared exactly once.`
    );
    this.name = 'StateRedeclarationError';
  }
}

// this function splits the props into what we are compiling the them down too 
// html styles and scripts
export function splitZen(file: ZenFile) {
  // Extract state declarations from all scripts with location information
  const allDeclarations: StateDeclarationInfo[] = [];
  for (let i = 0; i < file.scripts.length; i++) {
    const script = file.scripts[i];
    if (script) {
      const declarations = extractStateDeclarationsWithLocation(script.content, i);
      allDeclarations.push(...declarations);
    }
  }
  
  // Check for redeclarations and throw compile-time error
  const declaredStates = new Map<string, StateDeclarationInfo>();
  for (const declaration of allDeclarations) {
    const existing = declaredStates.get(declaration.name);
    if (existing) {
      throw new StateRedeclarationError(declaration.name, existing, declaration);
    }
    declaredStates.set(declaration.name, declaration);
  }
  
  // Convert to Map<string, string> for backward compatibility
  const stateMap = new Map<string, string>();
  declaredStates.forEach((info, name) => {
    stateMap.set(name, info.value);
  });

  // Extract event handlers from HTML (including inline arrow functions)
  const { eventHandlers, inlineHandlers } = extractEventHandlers(file.html);
  
  // Also add function props to event handlers (functions passed as props can mutate state)
  if (file.functionProps) {
    file.functionProps.forEach(funcName => eventHandlers.add(funcName));
  }
  
  // Generate function code for inline handlers and create a map
  // Map: arrow function body -> generated function name
  const inlineHandlerMap = new Map<string, string>(); // arrow body -> function name
  const inlineHandlerFunctions: string[] = []; // generated function code to inject
  
  inlineHandlers.forEach((handlerInfo, generatedName) => {
    inlineHandlerMap.set(handlerInfo.body, generatedName);
    
    // Replace parameter references in the body (e.g., "e" -> "event")
    let body = handlerInfo.body;
    if (handlerInfo.paramName && handlerInfo.paramName !== 'event' && handlerInfo.paramName !== '') {
      // Replace the parameter name with "event" in the body
      // Use word boundaries to avoid partial matches
      const paramRegex = new RegExp(`\\b${handlerInfo.paramName}\\b`, 'g');
      body = body.replace(paramRegex, 'event');
    }
    
    // Generate function code: function name(event, el) { body }
    const functionCode = `function ${generatedName}(event, el) { ${body} }`;
    inlineHandlerFunctions.push(functionCode);
  });
  
  // Inject inline handler functions into scripts (before state declaration removal)
  const scriptsWithInlineHandlers = file.scripts.map((script, index) => {
    if (inlineHandlerFunctions.length > 0 && index === 0) {
      // Inject inline handlers at the start of the first script
      return {
        ...script,
        content: inlineHandlerFunctions.join('\n\n') + '\n\n' + script.content
      };
    }
    return script;
  });
  
  // Detect and validate state mutations
  for (let i = 0; i < scriptsWithInlineHandlers.length; i++) {
    const script = scriptsWithInlineHandlers[i];
    if (!script) continue;
    const mutations = detectStateMutations(script.content, new Set(stateMap.keys()));
    validateStateMutations(mutations, eventHandlers, i);
  }

  // Transform event attributes (converting inline arrow functions to function names)
  const { transformedHtml: htmlAfterEvents, eventTypes } = transformEventAttributes(file.html, inlineHandlerMap);

  // Then transform attribute bindings (:class, :value)
  const { transformedHtml: htmlAfterAttributeBindings, bindings } = transformAttributeBindings(htmlAfterEvents, file.scripts);

  // Then transform text bindings (this will validate against declared states)
  const { transformedHtml: htmlAfterBindings, stateBindings } = transformTextBindings(
    htmlAfterAttributeBindings,
    new Set(stateMap.keys())
  );

  // Finally strip script/style tags
  const finalHtml = stripScriptAndStyleTags(htmlAfterBindings);

  // Transform scripts to:
  // 1. Process ES6 imports (transform to window references)
  // 2. Auto-import zen primitives
  // 3. Remove state declarations (runtime will handle them)
  // 4. Register functions on window for component access
  const transformedScripts = scriptsWithInlineHandlers.map((s, index) => {
    if (!s) return '';
    
    // Step 1 & 2: Process imports and auto-imports
    let transformed = processScriptImports(s.content);
    
    // Step 3: Transform state declarations
    transformed = transformStateDeclarations(transformed);
    
    // Step 4: Extract function declarations and register them on window
    // This allows components to access parent functions via props
    // SKIP if script contains an IIFE with window registration (component scripts are pre-wrapped)
    // Component scripts have pattern: window.__zen_comp_*_funcName = funcName
    const hasComponentRegistration = /window\.__zen_comp_\d+_\w+\s*=/.test(transformed);
    
    if (!hasComponentRegistration) {
      const functionRegex = /function\s+(\w+)\s*\([^)]*\)\s*\{/g;
      const functionNames: string[] = [];
      let match;
      while ((match = functionRegex.exec(transformed)) !== null) {
        if (match[1]) {
          functionNames.push(match[1]);
        }
      }
      
      // Register functions on window (only if not already registered)
      if (functionNames.length > 0) {
        const registrationCode = functionNames.map(name => 
          `  if (typeof window.${name} === 'undefined') { window.${name} = ${name}; }`
        ).join('\n');
        transformed += `\n\n// Register functions on window for component access\n${registrationCode}`;
      }
    }
    
    return transformed;
  });

  return {
    html: finalHtml,
    scripts: transformedScripts,
    styles: file.styles.map(style => style.content),
    eventTypes: Array.from(eventTypes).sort(), // Return sorted array of event types
    stateBindings: Array.from(stateBindings.values()), // Return array of state bindings
    stateDeclarations: stateMap, // Return map of state declarations (name -> value)
    bindings // Return attribute bindings for :class and :value
  }
}
