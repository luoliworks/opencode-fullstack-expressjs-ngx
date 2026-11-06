function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeUrl(raw: string): string {
  const url = raw.trim();
  if (/^(https?:\/\/|mailto:|\/|#)/i.test(url) && !url.startsWith('//')) {
    return escapeHtml(url);
  }
  return '#';
}

function parseInline(raw: string): string {
  // Extract inline code spans first so inner symbols aren't formatted
  const codeSpans: string[] = [];
  let text = raw.replace(/`([^`\n]+)`/g, (_match, code: string) => {
    const idx = codeSpans.length;
    codeSpans.push(`<code>${escapeHtml(code)}</code>`);
    return `\u0000CODE${idx}\u0000`;
  });

  text = escapeHtml(text);

  // Images: ![alt](url)
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_m, alt: string, url: string) => {
    const safeUrl = sanitizeUrl(url);
    return `<img src="${safeUrl}" alt="${alt}" loading="lazy" />`;
  });

  // Links: [label](url)
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, url: string) => {
    const safeUrl = sanitizeUrl(url);
    const isExt = /^https?:\/\//i.test(safeUrl);
    const attrs = isExt ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${safeUrl}"${attrs}>${label}</a>`;
  });

  // Bold + italic: ***text***
  text = text.replace(/\*\*\*([^\n*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold: **text** or __text__
  text = text.replace(/\*\*([^\n*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^\n_]+)__/g, '<strong>$1</strong>');
  // Italic: *text* or _text_
  text = text.replace(/(^|[^*])\*([^\n*]+)\*(?!\*)/g, '$1<em>$2</em>');
  text = text.replace(/(^|[^_])_([^\n_]+)_(?!_)/g, '$1<em>$2</em>');
  // Strikethrough: ~~text~~
  text = text.replace(/~~([^\n~]+)~~/g, '<del>$1</del>');

  // Restore inline code spans
  text = text.replace(/\u0000CODE(\d+)\u0000/g, (_m, idx: string) => codeSpans[Number(idx)] ?? '');

  return text;
}

/**
 * Zero-dependency, XSS-safe Markdown-to-HTML renderer for article bodies and previews.
 */
export function renderMarkdown(source: string): string {
  if (!source) return '';
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Fenced code block: ```lang ... ```
    const fenceMatch = line.match(/^```([\w+-]*)\s*$/);
    if (fenceMatch) {
      const lang = fenceMatch[1];
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing ```
      const langAttr = lang ? ` data-lang="${escapeHtml(lang)}"` : '';
      out.push(`<pre class="md-code-block"${langAttr}><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    // Heading: # through ######
    const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      out.push(`<h${level}>${parseInline(headingMatch[2])}</h${level}>`);
      i++;
      continue;
    }

    // Horizontal rule: ---, ***, ___
    if (/^(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
      out.push('<hr />');
      i++;
      continue;
    }

    // Blockquote: > ...
    if (/^\s*>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${renderMarkdown(quoteLines.join('\n'))}</blockquote>`);
      continue;
    }

    // GFM Table: | col1 | col2 | followed by | --- | --- |
    if (
      line.includes('|') &&
      i + 1 < lines.length &&
      /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(lines[i + 1])
    ) {
      const parseCells = (row: string): string[] =>
        row
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim());

      const headers = parseCells(line);
      i += 2; // skip header + separator
      const bodyRows: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        bodyRows.push(parseCells(lines[i]));
        i++;
      }
      const thHtml = headers.map((h) => `<th>${parseInline(h)}</th>`).join('');
      const tbHtml = bodyRows
        .map((r) => `<tr>${headers.map((_, idx) => `<td>${parseInline(r[idx] ?? '')}</td>`).join('')}</tr>`)
        .join('');
      out.push(`<div class="md-table-wrap"><table><thead><tr>${thHtml}</tr></thead><tbody>${tbHtml}</tbody></table></div>`);
      continue;
    }

    // Unordered list: - , * , +
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\s*[-*+]\s+/, '');
        const taskMatch = itemText.match(/^\[([ xX])\]\s+(.*)$/);
        if (taskMatch) {
          const checked = taskMatch[1].toLowerCase() === 'x' ? ' checked' : '';
          items.push(
            `<li class="task-item"><input type="checkbox" disabled${checked} /> <span>${parseInline(taskMatch[2])}</span></li>`,
          );
        } else {
          items.push(`<li>${parseInline(itemText)}</li>`);
        }
        i++;
      }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // Ordered list: 1. , 2. , ...
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\s*\d+\.\s+/, '');
        items.push(`<li>${parseInline(itemText)}</li>`);
        i++;
      }
      out.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    // Paragraph (collect consecutive non-block lines)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^```/.test(lines[i]) &&
      !/^#{1,6}\s+/.test(lines[i]) &&
      !/^(?:-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i].trim()) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      paraLines.push(parseInline(lines[i]));
      i++;
    }
    out.push(`<p>${paraLines.join('<br />')}</p>`);
  }

  return out.join('\n');
}

/**
 * Strips Markdown formatting into clean plain text for article card excerpts and bookmark descriptions.
 */
export function stripMarkdown(source: string): string {
  if (!source) return '';
  return source
    .replace(/```[\s\S]*?```/g, (block) =>
      block.replace(/^```[\w+-]*\n?/, '').replace(/```$/, ''),
    )
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^(#{1,6})\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[-*+]\s+(\[[ xX]\]\s+)?/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/(\*\*\*|\*\*|\*|___|__|_|~~|`)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
