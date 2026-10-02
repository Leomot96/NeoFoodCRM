const fs = require('fs');
const path = require('path');

function wrapSelector(sel) {
  // If already wrapped or is @rule or keyframe percent
  let s = sel.trim();
  if (!s || s.startsWith('@') || s.startsWith('from') || s.startsWith('to') || /^\d+%/.test(s)) {
    return sel;
  }
  
  // Split multiple comma-separated selectors: e.g. .a, .b
  const parts = s.split(',');
  const transformedParts = parts.map(part => {
    let p = part.trim();
    if (!p) return part;
    if (p.includes(':global(')) return part; // already global
    
    // Replace class sequences: e.g. .caja-page or .caja-status-badge.open or .dark .caja-page
    // We want to wrap each class compound with :global(...)
    // e.g. .caja-page -> :global(.caja-page)
    // .caja-status-badge.open -> :global(.caja-status-badge.open)
    // .dark .caja-card -> :global(.dark) :global(.caja-card)
    // .caja-btn:hover -> :global(.caja-btn):hover
    // .caja-input:focus -> :global(.caja-input):focus
    // .caja-table tr:hover -> :global(.caja-table) tr:hover
    // button.caja-btn -> button:global(.caja-btn)
    
    // Match class names with optional chained classes/pseudos:
    return p.replace(/(\.[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*)/g, (match) => {
      return `:global(${match})`;
    });
  });
  
  return transformedParts.join(', ');
}

function processCss(content) {
  const lines = content.split('\n');
  const out = [];
  let inKeyframes = false;
  let inComment = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (trimmed.startsWith('/*')) inComment = true;
    if (inComment) {
      out.push(line);
      if (trimmed.endsWith('*/') || trimmed.includes('*/')) inComment = false;
      continue;
    }
    
    if (trimmed.startsWith('@keyframes')) {
      inKeyframes = true;
      out.push(line);
      continue;
    }
    if (inKeyframes) {
      out.push(line);
      if (trimmed === '}') inKeyframes = false;
      continue;
    }
    
    // If it's a media query line
    if (trimmed.startsWith('@media')) {
      out.push(line);
      continue;
    }
    
    // If line has selector ending with {
    if (line.includes('{') && !line.includes(';') && !trimmed.startsWith('@')) {
      const idx = line.indexOf('{');
      const selector = line.substring(0, idx);
      const rest = line.substring(idx);
      out.push(wrapSelector(selector) + ' ' + rest.trim());
    } else {
      out.push(line);
    }
  }
  
  return out.join('\n');
}

// Test on Caja.module.css
const cajaPath = 'src/pages/Caja.module.css';
const originalCaja = fs.readFileSync(cajaPath, 'utf8');
const processedCaja = processCss(originalCaja);
console.log('Sample processed lines 1-40:');
console.log(processedCaja.split('\n').slice(0, 40).join('\n'));
