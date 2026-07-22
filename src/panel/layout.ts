/**
 * 通用区段框架：可折叠 section header + content 容器。
 */

export function createSection(
  body: HTMLElement,
  titleText: string,
  contentId: string,
  defaultOpen: boolean,
  badge: string
): HTMLElement {
  const section = document.createElement('div');
  section.className = 'section';

  const header = document.createElement('div');
  header.className = 'section-header';

  const arrow = document.createElement('span');
  arrow.className = 'arrow' + (defaultOpen ? ' open' : '');
  arrow.textContent = '▶';
  arrow.title = defaultOpen ? 'Collapse' : 'Expand';
  header.appendChild(arrow);

  const title = document.createElement('span');
  title.textContent = titleText;
  header.appendChild(title);

  if (badge) {
    const b = document.createElement('span');
    b.className = 'badge';
    b.textContent = badge;
    header.appendChild(b);
  }

  const content = document.createElement('div');
  content.id = '__we_' + contentId;
  content.className = 'section-content' + (defaultOpen ? ' open' : '');

  header.addEventListener('click', () => {
    content.classList.toggle('open');
    arrow.classList.toggle('open');
  });

  section.appendChild(header);
  section.appendChild(content);
  body.appendChild(section);

  return content;
}

export function createBody(panel: HTMLElement): HTMLElement {
  const body = document.createElement('div');
  body.className = 'panel-body';
  panel.appendChild(body);
  return body;
}