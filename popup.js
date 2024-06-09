document.addEventListener('DOMContentLoaded', function() {
  const colorPicker = document.getElementById('colorPicker');

  chrome.storage.local.get('highlightColor', function(data) {
    const savedColor = data.highlightColor;
    if (savedColor) {
      colorPicker.value = savedColor;
    }
  });

  colorPicker.addEventListener('input', function() {
    const selectedColor = colorPicker.value;
    chrome.storage.local.set({ highlightColor: selectedColor });
  });

  document.getElementById('export-txt-btn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'exportToText' });
  });
});
