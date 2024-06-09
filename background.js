chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'exportToText') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getHighlights' }, (response) => {
        if (response && response.highlights) {
          generateTextFile(response.highlights);
        }
      });
    });
  }
});

function generateTextFile(highlights) {
  let textContent = 'Highlights:\n\n';
  
  highlights.forEach(highlight => {
    textContent += `Text: ${highlight.text}\n`;
    if (highlight.note) {
      textContent += `Note: ${highlight.note}\n`;
    }
    textContent += `Color: ${highlight.color}\n\n`;
  });

  const blob = new Blob([textContent], { type: 'text/plain' });
  const reader = new FileReader();
  reader.onloadend = function() {
    const base64data = reader.result.split(',')[1];
    const url = `data:application/octet-stream;base64,${base64data}`;
    chrome.downloads.download({
      url: url,
      filename: 'highlights.txt',
      saveAs: true
    });
  };
  reader.readAsDataURL(blob);
}
