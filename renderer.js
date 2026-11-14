const startBtn = document.getElementById('startBtn');
const fileInput = document.getElementById('fileInput');
const logOutput = document.getElementById('logOutput');
const statusText = document.getElementById('statusText');

function appendLog(message) {
  logOutput.value += message + '\n';
  logOutput.scrollTop = logOutput.scrollHeight; 
}

startBtn.addEventListener('click', () => {
  const file = fileInput.files[0];

  if (!file) {
    appendLog('[-] Error: No file selected!');
    return;
  }

  statusText.innerText = 'Processing...';
  appendLog(`[*] Selected file: ${file.name}`);
  appendLog('[*] Sending to backend for binary read...');
  
  window.api.processFile(file);
});

window.api.onLogMessage((message) => {
  appendLog(message);
  
  if (message.includes('Done') || message.includes('Error')) {
    statusText.innerText = 'Finished';
  }
});
