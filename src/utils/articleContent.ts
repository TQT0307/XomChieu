const ARTICLE_TAG_PATTERN = /<\/?[a-z][\s\S]*?>/i;

const ALLOWED_TAGS = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'div',
  'em',
  'h2',
  'h3',
  'h4',
  'hr',
  'i',
  'li',
  'ol',
  'p',
  's',
  'span',
  'strong',
  'u',
  'ul',
]);

const BLOCKED_TAGS = new Set([
  'applet',
  'embed',
  'iframe',
  'link',
  'meta',
  'object',
  'script',
  'style',
  'svg',
]);

const BLOCK_TAGS = new Set([
  'blockquote',
  'div',
  'h2',
  'h3',
  'h4',
  'li',
  'ol',
  'p',
  'ul',
]);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const hasArticleHtml = (value: string) => ARTICLE_TAG_PATTERN.test(value);

const sanitizeStyle = (value: string) => {
  const safeDeclarations: string[] = [];

  for (const declaration of value.split(';')) {
    const separator = declaration.indexOf(':');
    if (separator < 0) continue;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const styleValue = declaration.slice(separator + 1).trim().toLowerCase();

    if (
      property === 'text-align' &&
      /^(left|center|right|justify)$/.test(styleValue)
    ) {
      safeDeclarations.push(`${property}: ${styleValue}`);
      continue;
    }

    if (
      (property === 'margin-left' || property === 'padding-left') &&
      /^(?:0|(?:[0-9]|[1-9][0-9]|1[0-9]{2}|200)(?:px|em|rem)?)$/.test(styleValue)
    ) {
      safeDeclarations.push(`${property}: ${styleValue}`);
      continue;
    }

    if (
      property === 'font-family' &&
      /^(inter|arial|georgia|verdana|tahoma|"times new roman"|'times new roman'|times new roman)(?:\s*,\s*(?:sans-serif|serif))?$/.test(styleValue)
    ) {
      safeDeclarations.push(`${property}: ${styleValue}`);
      continue;
    }

    if (
      property === 'font-size' &&
      /^(?:(?:12|14|16|18|20|24|28|32|36|40|48)px|xx-small|x-small|small|medium|large|x-large|xx-large|xxx-large)$/.test(styleValue)
    ) {
      safeDeclarations.push(`${property}: ${styleValue}`);
      continue;
    }
    if (property === 'font-weight' && /^(?:normal|bold|[1-9]00)$/.test(styleValue)) {
      safeDeclarations.push(`${property}: ${styleValue}`);
      continue;
    }

    if (property === 'font-style' && /^(?:normal|italic|oblique)$/.test(styleValue)) {
      safeDeclarations.push(`${property}: ${styleValue}`);
      continue;
    }

    if (
      (property === 'text-decoration' || property === 'text-decoration-line') &&
      /^(?:none|underline|line-through|underline line-through|line-through underline)$/.test(styleValue)
    ) {
      safeDeclarations.push(`${property}: ${styleValue}`);
      continue;
    }

    if (
      (property === 'color' || property === 'background-color') &&
      /^(?:#[0-9a-f]{3}|#[0-9a-f]{6}|rgb\(\s*(?:\d{1,3}\s*,\s*){2}\d{1,3}\s*\)|rgba\(\s*(?:\d{1,3}\s*,\s*){3}(?:0|1|0?\.\d+)\s*\))$/.test(styleValue)
    ) {
      safeDeclarations.push(`${property}: ${styleValue}`);
    }
  }

  return safeDeclarations.join('; ');
};

const sanitizeLink = (value: string) => {
  try {
    const parsed = new URL(value, window.location.origin);
    if (!['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) return '';
    return parsed.href;
  } catch {
    return '';
  }
};

export const sanitizeArticleHtml = (value: string) => {
  const normalized = String(value || '').replace(/\r\n?/g, '\n');
  if (!hasArticleHtml(normalized)) return escapeHtml(normalized);
  if (typeof DOMParser === 'undefined' || typeof document === 'undefined') {
    return escapeHtml(normalized);
  }

  const sourceDocument = new DOMParser().parseFromString(normalized, 'text/html');
  const targetDocument = document.implementation.createHTMLDocument('');

  const cloneNodeSafely = (node: Node): Node | DocumentFragment | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      return targetDocument.createTextNode(node.textContent || '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const sourceElement = node as HTMLElement;
    const tagName = sourceElement.tagName.toLowerCase();
    if (BLOCKED_TAGS.has(tagName)) return null;

    if (!ALLOWED_TAGS.has(tagName)) {
      const fragment = targetDocument.createDocumentFragment();
      sourceElement.childNodes.forEach(child => {
        const safeChild = cloneNodeSafely(child);
        if (safeChild) fragment.appendChild(safeChild);
      });
      return fragment;
    }

    const targetElement = targetDocument.createElement(tagName);
    const safeStyle = sanitizeStyle(sourceElement.getAttribute('style') || '');
    if (safeStyle) targetElement.setAttribute('style', safeStyle);

    if (tagName === 'a') {
      const safeHref = sanitizeLink(sourceElement.getAttribute('href') || '');
      if (safeHref) {
        targetElement.setAttribute('href', safeHref);
        targetElement.setAttribute('target', '_blank');
        targetElement.setAttribute('rel', 'noopener noreferrer');
      }
    }

    sourceElement.childNodes.forEach(child => {
      const safeChild = cloneNodeSafely(child);
      if (safeChild) targetElement.appendChild(safeChild);
    });
    return targetElement;
  };

  sourceDocument.body.childNodes.forEach(child => {
    const safeChild = cloneNodeSafely(child);
    if (safeChild) targetDocument.body.appendChild(safeChild);
  });

  return targetDocument.body.innerHTML;
};

export const articleContentToEditorHtml = (value: string) => {
  const normalized = String(value || '').replace(/\r\n?/g, '\n');
  if (hasArticleHtml(normalized)) return sanitizeArticleHtml(normalized);
  return escapeHtml(normalized).replace(/\n/g, '<br>');
};

export const articleContentToPlainText = (value: string) => {
  const normalized = String(value || '').replace(/\r\n?/g, '\n');
  if (!hasArticleHtml(normalized) || typeof DOMParser === 'undefined') {
    return normalized;
  }

  const sourceDocument = new DOMParser().parseFromString(
    sanitizeArticleHtml(normalized),
    'text/html'
  );
  const output: string[] = [];

  const readNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      output.push(node.textContent || '');
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as HTMLElement;
    if (element.tagName.toLowerCase() === 'br') {
      output.push('\n');
      return;
    }
    element.childNodes.forEach(readNode);
    if (BLOCK_TAGS.has(element.tagName.toLowerCase())) output.push('\n');
  };

  sourceDocument.body.childNodes.forEach(readNode);
  return output.join('').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
};

export const normalizeArticleContentForStorage = (value: string) => {
  const normalized = String(value || '').replace(/\r\n?/g, '\n');
  return hasArticleHtml(normalized) ? sanitizeArticleHtml(normalized) : normalized;
};
