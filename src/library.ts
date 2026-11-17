import { validateSession, type Session } from './session';

interface SavedTree {
  name: string;
  thumbnail: string;
  session: Session;
}

const libraryKey = 'growing-tree:library';

function readTrees(): SavedTree[] {
  const entries: unknown = JSON.parse(localStorage.getItem(libraryKey) ?? '[]');
  if (!Array.isArray(entries)) throw new Error('Invalid tree library');
  return entries.filter((entry): entry is SavedTree =>
    entry && typeof entry.name === 'string' && typeof entry.thumbnail === 'string'
    && /^data:image\/(webp|png);base64,/.test(entry.thumbnail) && !!validateSession(entry.session),
  );
}

function downloadTree(tree: SavedTree): void {
  const filename = tree.name.replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '') || 'canopy-tree';
  const file = new Blob([JSON.stringify(tree.session, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function connectLibrary(
  pause: () => void,
  capture: () => Pick<SavedTree, 'thumbnail' | 'session'>,
  open: (session: Session, name: string) => void,
): void {
  const nameDialog = document.querySelector<HTMLDialogElement>('#tree-name-dialog')!;
  const nameForm = document.querySelector<HTMLFormElement>('#tree-name-form')!;
  const nameInput = document.querySelector<HTMLInputElement>('#tree-name')!;
  const nameError = document.querySelector<HTMLElement>('#tree-name-error')!;
  const library = document.querySelector<HTMLDialogElement>('#tree-library')!;
  const message = document.querySelector<HTMLElement>('#tree-library-message')!;
  const list = document.querySelector<HTMLUListElement>('#tree-library-list')!;

  function openLibrary(notification = ''): void {
    list.replaceChildren();
    try {
      const trees = readTrees();
      message.textContent = notification || (trees.length ? '' : 'Save a tree to start your collection.');
      for (const tree of trees) {
        const item = document.createElement('li');
        item.className = 'tree-card';
        const load = document.createElement('button');
        load.type = 'button';
        load.className = 'tree-open';
        load.setAttribute('aria-label', `Open ${tree.name}`);
        const image = document.createElement('img');
        image.src = tree.thumbnail;
        image.alt = '';
        image.loading = 'lazy';
        const name = document.createElement('strong');
        name.textContent = tree.name;
        const generation = document.createElement('small');
        generation.textContent = `Generation ${tree.session.timeline.generation}`;
        load.append(image, name, generation);
        load.addEventListener('click', () => {
          try {
            open(tree.session, tree.name);
            library.close();
          } catch {
            message.textContent = 'Could not open that saved tree.';
          }
        });
        const download = document.createElement('button');
        download.type = 'button';
        download.className = 'button';
        download.textContent = 'Download workspace';
        download.setAttribute('aria-label', `Download workspace for ${tree.name}`);
        download.addEventListener('click', () => downloadTree(tree));
        item.append(load, download);
        list.append(item);
      }
    } catch {
      message.textContent = 'The browser could not open your tree collection.';
    }
    library.showModal();
  }

  document.querySelector('#my-trees')!.addEventListener('click', () => openLibrary());
  document.querySelector('#save-tree')!.addEventListener('click', () => {
    pause();
    nameForm.reset();
    nameError.textContent = '';
    nameDialog.showModal();
  });
  document.querySelector('#cancel-tree-name')!.addEventListener('click', () => nameDialog.close());
  nameForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) {
      nameError.textContent = 'Enter a name for this tree.';
      nameInput.focus();
      return;
    }
    try {
      const trees = readTrees();
      trees.unshift({ name, ...capture() });
      localStorage.setItem(libraryKey, JSON.stringify(trees));
    } catch {
      nameError.textContent = 'Could not save this tree. Browser storage may be full or unavailable.';
      return;
    }
    nameDialog.close();
    openLibrary(`Saved ${name}`);
  });
}
