import './index.css';
import CPU from './cpu';
import { MAX_EXECUTABLE_MEMORY } from './constants';

const cpu = new CPU();

// Setup button listeners
document.getElementById('load-file').onclick = () => {
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const fileList = fileInput.files;
  if (fileList.length === 0) return;

  const executable = fileList[0];
  if (executable.size > MAX_EXECUTABLE_MEMORY) return;

  const fileReader = new FileReader();
  fileReader.onload = () => {
    const buffer = fileReader.result as ArrayBuffer;
    const data = new Uint8Array(buffer);
    cpu.loadExecutable(data);
    cpu.run();
  };
  fileReader.readAsArrayBuffer(executable);
};

document.getElementById('pause').onclick = () => {
  cpu.pause();
};
