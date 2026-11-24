/**
 * Minimal, dependency-free Markdown renderer for study notes.
 * Input is HTML-escaped before any formatting is applied, so the output is safe
 * to inject and no raw HTML from notes can ever execute.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1.5 py-0.5 text-[0.85em]">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(
      /\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g,
      '<a class="font-semibold text-primary underline" href="$2" target="_blank" rel="noreferrer noopener">$1</a>',
    )
}

export function renderMarkdown(source: string): string {
  const lines = escapeHtml(source).split(/\r?\n/)
  const html: string[] = []
  let listOpen: 'ul' | 'ol' | null = null
  let inCode = false
  const codeLines: string[] = []

  const closeList = (): void => {
    if (listOpen) {
      html.push(`</${listOpen}>`)
      listOpen = null
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (line.startsWith('```')) {
      if (inCode) {
        html.push(`<pre class="overflow-x-auto rounded-2xl bg-muted p-3 text-xs"><code>${codeLines.join('\n')}</code></pre>`)
        codeLines.length = 0
        inCode = false
      } else {
        closeList()
        inCode = true
      }
      continue
    }
    if (inCode) {
      codeLines.push(line)
      continue
    }
    if (!line.trim()) {
      closeList()
      continue
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    if (heading) {
      closeList()
      const level = Math.min(4, (heading[1] ?? '#').length + 1)
      const sizes: Record<number, string> = {
        2: 'text-xl font-extrabold',
        3: 'text-lg font-bold',
        4: 'text-base font-bold',
        5: 'text-sm font-bold',
      }
      html.push(`<h${level} class="font-display ${sizes[level] ?? 'text-base font-bold'} mt-3">${inline(heading[2] ?? '')}</h${level}>`)
      continue
    }
    const bullet = /^[-*]\s+(.*)$/.exec(line)
    if (bullet) {
      if (listOpen !== 'ul') {
        closeList()
        html.push('<ul class="my-1 list-disc space-y-1 pl-5">')
        listOpen = 'ul'
      }
      html.push(`<li>${inline(bullet[1] ?? '')}</li>`)
      continue
    }
    const ordered = /^\d+\.\s+(.*)$/.exec(line)
    if (ordered) {
      if (listOpen !== 'ol') {
        closeList()
        html.push('<ol class="my-1 list-decimal space-y-1 pl-5">')
        listOpen = 'ol'
      }
      html.push(`<li>${inline(ordered[1] ?? '')}</li>`)
      continue
    }
    if (line.startsWith('&gt;')) {
      closeList()
      html.push(`<blockquote class="my-2 border-l-2 border-primary pl-3 text-muted-foreground">${inline(line.slice(4))}</blockquote>`)
      continue
    }
    closeList()
    html.push(`<p class="my-1.5 leading-relaxed">${inline(line)}</p>`)
  }
  closeList()
  if (inCode && codeLines.length) {
    html.push(`<pre class="overflow-x-auto rounded-2xl bg-muted p-3 text-xs"><code>${codeLines.join('\n')}</code></pre>`)
  }
  return html.join('\n')
}
