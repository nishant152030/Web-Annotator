let currentRange;

window.onload = loadHighlights;

document.addEventListener('mouseup', () => {
  const selection = window.getSelection();
  if (selection.toString().trim()) {
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    currentRange = selection.getRangeAt(0).cloneRange();
    showPopup(rect);
  } else {
    hidePopup();
  }
});

document.addEventListener('click', (event) => {
  const target = event.target;
  if (target.classList.contains('web-annotator-highlight')) {
    showRemovePopup(target);
  } else {
    hideRemovePopup();
  }
});

function showPopup(rect) {
  let popup = document.getElementById('annotator-popup');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'annotator-popup';
    popup.className = 'popup';
    popup.innerHTML = `
      <button id="add-note-btn" class="btn">Add Note</button>
    `;
    document.body.appendChild(popup);

    document.getElementById('add-note-btn').addEventListener('click', () => {
      showNoteInput(rect);
    });
  }

  popup.style.top = `${rect.top + window.scrollY}px`;
  popup.style.left = `${rect.left + window.scrollX}px`;
  popup.style.display = 'block';
}

function hidePopup() {
  const popup = document.getElementById('annotator-popup');
  if (popup) {
    popup.style.display = 'none';
  }
}

function showRemovePopup(target) {
  let removePopup = document.getElementById('remove-popup');
  if (!removePopup) {
    removePopup = document.createElement('div');
    removePopup.id = 'remove-popup';
    removePopup.className = 'popup';
    removePopup.innerHTML = `
      <button id="remove-highlight-btn" class="btn">Remove Highlight</button>
    `;
    document.body.appendChild(removePopup);

    document.getElementById('remove-highlight-btn').addEventListener('click', () => {
      removeHighlight(target);
      hideRemovePopup();
    });
  }

  const rect = target.getBoundingClientRect();
  removePopup.style.top = `${rect.top + window.scrollY}px`;
  removePopup.style.left = `${rect.left + window.scrollX}px`;
  removePopup.style.display = 'block';
}

function hideRemovePopup() {
  const removePopup = document.getElementById('remove-popup');
  if (removePopup) {
    removePopup.style.display = 'none';
  }
}

function showNoteInput(rect) {
  let notePopup = document.getElementById('note-popup');
  if (!notePopup) {
    notePopup = document.createElement('div');
    notePopup.id = 'note-popup';
    notePopup.className = 'popup';
    notePopup.innerHTML = `
      <textarea id="note-input" class="input" rows="4" cols="30" placeholder="Enter your note here..."></textarea>
      <button id="save-note-btn" class="btn">Save Note</button>
    `;
    document.body.appendChild(notePopup);

    document.getElementById('save-note-btn').addEventListener('click', () => {
      saveNote();
      hideNotePopup();
    });
  }

  notePopup.style.top = `${rect.bottom + window.scrollY}px`;
  notePopup.style.left = `${rect.left + window.scrollX}px`;
  notePopup.style.display = 'block';

  // Focus on the textarea
  document.getElementById('note-input').focus();
}

function hideNotePopup() {
  const notePopup = document.getElementById('note-popup');
  if (notePopup) {
    notePopup.style.display = 'none';
  }
}

function saveNote() {
  const note = document.getElementById('note-input').value;
  if (note && currentRange) {
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(currentRange);

    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.className = 'web-annotator-highlight';
    span.textContent = range.toString();
    span.setAttribute('data-note', note);
    span.setAttribute('data-category', 'note'); // Default category

    // Apply the selected highlight color
    chrome.storage.local.get('highlightColor', (result) => {
      span.style.backgroundColor = result.highlightColor || '#ffff00'; // Default to yellow if no color is selected
      range.deleteContents();
      range.insertNode(span);

      saveHighlight(span);

      // Clear the current range
      currentRange = null;
    });
  }
}

function removeHighlight(target) {
  if (target && target.parentNode) {
    const parent = target.parentNode;
    const textNode = document.createTextNode(target.textContent);
    parent.replaceChild(textNode, target);
    parent.normalize();

    removeHighlightFromStorage(target);
  }
}

function saveHighlight(span) {
  const highlights = JSON.parse(localStorage.getItem('highlights') || '[]');
  highlights.push({
    text: span.textContent,
    note: span.getAttribute('data-note'),
    category: span.getAttribute('data-category'),
    parentPath: getNodePath(span.parentNode),
    startOffset: getOffset(span.parentNode, span.textContent, true),
    endOffset: getOffset(span.parentNode, span.textContent, false),
    color: span.style.backgroundColor
  });
  localStorage.setItem('highlights', JSON.stringify(highlights));
}

function removeHighlightFromStorage(span) {
  const highlights = JSON.parse(localStorage.getItem('highlights') || '[]');
  const updatedHighlights = highlights.filter(highlight => 
    highlight.text !== span.textContent || 
    highlight.parentPath.join() !== getNodePath(span.parentNode).join() || 
    highlight.startOffset !== getOffset(span.parentNode, span.textContent, true) ||
    highlight.endOffset !== getOffset(span.parentNode, span.textContent, false)
  );
  localStorage.setItem('highlights', JSON.stringify(updatedHighlights));
}

function loadHighlights() {
  const highlights = JSON.parse(localStorage.getItem('highlights') || '[]');
  highlights.forEach(highlight => {
    const parent = getNodeByPath(highlight.parentPath);
    if (parent) {
      const range = document.createRange();
      const textNodes = getTextNodesIn(parent);
      let startNode, endNode, startOffset = 0, endOffset = 0;
      let foundStart = false;
      let offset = 0;

      for (const textNode of textNodes) {
        const textContent = textNode.textContent;

        if (!foundStart && offset + textContent.length >= highlight.startOffset) {
          startNode = textNode;
          startOffset = highlight.startOffset - offset;
          foundStart = true;
        }

        if (foundStart && offset + textContent.length >= highlight.endOffset) {
          endNode = textNode;
          endOffset = highlight.endOffset - offset;
          break;
        }

        offset += textContent.length;
      }

      if (startNode && endNode) {
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset);
        const span = document.createElement('span');
        span.className = 'web-annotator-highlight';
        span.textContent = highlight.text;
        span.setAttribute('data-note', highlight.note);
        span.setAttribute('data-category', highlight.category);
        span.style.backgroundColor = highlight.color || '#ffff00'; // Default to yellow if no color is stored
        range.deleteContents();
        range.insertNode(span);
      }
    }
  });
}

function getNodePath(node) {
  const path = [];
  while (node && node.nodeType === Node.ELEMENT_NODE) {
    let index = 0;
    for (let sibling = node.previousSibling; sibling; sibling = sibling.previousSibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE) {
        index++;
      }
    }
    path.unshift(index);
    node = node.parentNode;
  }
  return path;
}

function getNodeByPath(path) {
  let node = document.body;
  for (const index of path) {
    node = node.children[index];
    if (!node) {
      return null;
    }
  }
  return node;
}

function getOffset(node, text, start) {
  const data = node.textContent;
  return start ? data.indexOf(text) : data.indexOf(text) + text.length;
}

function getTextNodesIn(node) {
  const textNodes = [];
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
  let currentNode;
  while (currentNode = walker.nextNode()) {
    textNodes.push(currentNode);
  }
  return textNodes;
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getHighlights') {
    const highlights = JSON.parse(localStorage.getItem('highlights') || '[]');
    sendResponse({ highlights });
    return true;  // Will respond asynchronously
  } else if (message.action === 'searchAndFilter') {
    const keyword = message.keyword.toLowerCase();
    const category = message.category;
    const highlights = JSON.parse(localStorage.getItem('highlights') || '[]');
    let filteredHighlights = highlights.filter(highlight => {
      const matchesKeyword = keyword ? highlight.text.toLowerCase().includes(keyword) || (highlight.note && highlight.note.toLowerCase().includes(keyword)) : true;
      const matchesCategory = category !== 'all' ? highlight.category === category : true;
      return matchesKeyword && matchesCategory;
    });
    sendResponse({ highlights: filteredHighlights });
    return true;  // Will respond asynchronously
  }
});
