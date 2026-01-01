import fs from "fs"
import * as parse5 from "parse5"
import type { ZenFile, ScriptBlock, StyleBlock } from "./types"

export function parseZen(path: string): ZenFile {
  const source = fs.readFileSync(path, "utf-8");
  const document = parse5.parse(source);

  const scripts: ScriptBlock[] = [];
  const styles: StyleBlock[] = [];
  let scriptIndex = 0;
  let stylesIndex = 0;

  function extractTextContent(node: any): string {
    if (!node.childNodes?.length) return '';
    return node.childNodes
      .filter((n: any) => n.nodeName === '#text')
      .map((n: any) => n.value || '')
      .join('');
  }

  function walk(node: any) {
    if (node.nodeName === "script" && node.childNodes?.length) {
      const content = extractTextContent(node);
      scripts.push({ content, index: scriptIndex++ })
    }
    if (node.nodeName === "style" && node.childNodes?.length) {
      const content = extractTextContent(node);
      styles.push({
        content,
        index: stylesIndex++
      })
    }


    node.childNodes?.forEach(walk)
  }
  walk(document)

  return {
    html: source,
    scripts,
    styles
  }
}

/**
 * Extract state declarations from script content
 * Returns a Map of state name -> initial value expression
 */
export function extractStateDeclarations(scriptContent: string): Map<string, string> {
  const states = new Map<string, string>();
  // Match "state identifier = ..." pattern (captures everything after = until end of statement)
  // This regex matches: state <identifier> = <expression>
  // We need to handle the expression which may contain commas, semicolons, etc.
  // For now, we'll match until the end of the line or semicolon
  const stateRegex = /state\s+(\w+)\s*=\s*([^;]+?)(?:\s*;|\s*$)/gm;
  let match;
  while ((match = stateRegex.exec(scriptContent)) !== null) {
    const name = match[1];
    const value = match[2].trim();
    states.set(name, value);
  }
  return states;
}

/**
 * Transform script content to remove state declarations (they'll be handled by runtime)
 */
export function transformStateDeclarations(scriptContent: string): string {
  // Remove state declarations - replace with empty line
  return scriptContent.replace(/state\s+\w+\s*=\s*[^;]+?(?:\s*;|\s*$)/gm, '');
}
