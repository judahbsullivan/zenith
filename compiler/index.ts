
import { parseZen } from "./parse"
import { splitZen } from "./split"
import { emit } from "./emit"
import { generateEventBindingRuntime } from "./event"
import { generateAttributeBindingRuntime } from "./bindings"

export function compile(entry: string, outDir = "dist") {
  const zen = parseZen(entry);
  const { html, styles, scripts, eventTypes, bindings } = splitZen(zen);

  // Generate runtime code only for event types actually used in the HTML
  const eventRuntime = generateEventBindingRuntime(eventTypes)
  
  // Generate runtime code for attribute bindings (:class, :value)
  const bindingsRuntime = generateAttributeBindingRuntime(bindings)

  const scriptsWithRuntime = scripts.map(s => {
    // preserve original script content, then append runtime snippets,
    // so handlers defined in the script are available to the runtime snippets.
    const runtimes = [eventRuntime, bindingsRuntime].filter(Boolean).join('\n\n');
    return runtimes ? `${s}\n\n${runtimes}` : s;
  })
  emit(outDir, html, scriptsWithRuntime, styles, entry);
}
