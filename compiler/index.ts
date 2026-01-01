
import { parseZen } from "./parse"
import { splitZen } from "./split"
import { emit } from "./emit"
import { generateEventBindingRuntime } from "./event"
import { generateBindingRuntime } from "./binding"
import { generateAttributeBindingRuntime } from "./bindings"

export function compile(entry: string, outDir = "dist") {
  const zen = parseZen(entry);
  const { html, styles, scripts, eventTypes, stateBindings, stateDeclarations, bindings } = splitZen(zen);

  // Generate runtime code for event types
  const eventRuntime = generateEventBindingRuntime(eventTypes);
  
  // Generate runtime code for text bindings (state variables)
  const bindingRuntime = generateBindingRuntime(stateBindings, stateDeclarations);
  
  // Generate runtime code for attribute bindings (:class, :value)
  const attributeBindingRuntime = generateAttributeBindingRuntime(bindings);

  const scriptsWithRuntime = scripts.map(s => {
    // Order: 
    // 1. Text binding runtime first (creates state variables and sets up text bindings)
    // 2. Attribute binding runtime (creates window.state proxy for :class/:value)
    // 3. User script content (can use state variables)
    // 4. Event runtime (sets up event delegation)
    let result = "";
    if (bindingRuntime) {
      result += bindingRuntime + "\n\n";
    }
    if (attributeBindingRuntime) {
      result += attributeBindingRuntime + "\n\n";
    }
    result += s;
    if (eventRuntime) {
      result += `\n\n${eventRuntime}`;
    }
    return result;
  })
  
  emit(outDir, html, scriptsWithRuntime, styles, entry);
}
