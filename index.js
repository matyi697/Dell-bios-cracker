const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises; 

function findBothAddressesInBinary(buffer) {
  const results = { fcAddresses: [], fdAddresses: [] };
  const len = buffer.length;

  for (let i = 0; i < len - 8; i++) {
    if (buffer[i] === 0x00 && buffer[i+2] === 0xAA) {
      const isFC = (buffer[i+1] === 0xFC);
      const isFD = (buffer[i+1] === 0xFD);

      if (isFC || isFD) {
        if (buffer[i+4] === 0x00 && buffer[i+5] === 0x00 && buffer[i+6] === 0x00) {
          if (isFC) results.fcAddresses.push(i);
          else results.fdAddresses.push(i);
          i += 6; 
          continue;
        }
        if (i + 9 <= len) {
          if (buffer[i+5] === 0x00 && buffer[i+6] === 0x00 && buffer[i+7] === 0x00) {
            if (isFC) results.fcAddresses.push(i);
            else results.fdAddresses.push(i);
            i += 7;
            continue;
          }
        }
      }
    }
  }
  return results; 
}

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, 
      nodeIntegration: false  
    }
  });
  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('start-processing', async (event, filePath) => {
  try {
    event.reply('log-message', `[*] Opening file: ${filePath}`);
    const fileBuffer = await fs.readFile(filePath);
    
    const FC_REPLACEMENT_HEX = "FC0000000000"; 
    const FD_REPLACEMENT_HEX = "FD0000000000";
    const fcReplacement = Buffer.from(FC_REPLACEMENT_HEX, "hex");
    const fdReplacement = Buffer.from(FD_REPLACEMENT_HEX, "hex");
    const INTEL_SIGNATURE = "$FPT";
    const PSSW_KEY_1 = "__KEYM__"; 
    const PSSW_KEY_2 = "__BPM__"; 
    const primarySeq = Buffer.from(INTEL_SIGNATURE, "hex");
    const fbSeq1 = Buffer.from(PSSW_KEY_1, "hex");
    const fbSeq2 = Buffer.from(PSSW_KEY_2, "hex");
    const primaryIndex = fileBuffer.indexOf(primarySeq);

    if (primaryIndex === -1) {
      event.reply('log-message', '[*] Intel Signature not found, searching for newer signatures...');
      const fb1Index = fileBuffer.indexOf(fbSeq1);
      const fb2Index = fileBuffer.indexOf(fbSeq2);

      if (fb1Index === -1 && fb2Index === -1) {
        event.reply('log-message', '[*] The file is corrupted, not a valid BIOS file!');
        return; 
      } 
      
      else {
        event.reply('log-message', '[*] The BIOS version is too new!');
        return;
      }
    }

    event.reply('log-message', '[*] Intel Signature Found! Searching for password signatures...');
    const found = findBothAddressesInBinary(fileBuffer);
    
    event.reply('log-message', `[*] FC type: ${found.fcAddresses.length} db, FD type: ${found.fdAddresses.length} db`);

    const offset = 1; 

    for (const address of found.fcAddresses) {
      fcReplacement.copy(fileBuffer, address + offset);
    }

    for (const address of found.fdAddresses) {
      fdReplacement.copy(fileBuffer, address + offset);
    }
   
    const parsedPath = path.parse(filePath);
    const newFilePath = path.join(parsedPath.dir, parsedPath.name + '_patched' + parsedPath.ext);
      
    await fs.writeFile(newFilePath, fileBuffer);
      
    event.reply('log-message', `[*] Success! Saved patched file to:`);
    event.reply('log-message', `[*] ${newFilePath}`);
    event.reply('log-message', `[*] Done processing.`);

  } catch (error) {
    event.reply('log-message', `[*] [ERROR] ${error.message}`);
  }
});
