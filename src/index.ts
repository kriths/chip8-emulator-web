import './index.css';
import CPU from './cpu';
import { MAX_EXECUTABLE_MEMORY } from './constants';
import { $ } from './util/html';

const canvas = $('screen') as HTMLCanvasElement;
const cpu = new CPU(canvas);

function displayLoadStateResult(success: boolean) {
  $('loaded-success-indicator').style.display = success ? 'flex' : 'none';
  $('loaded-error-indicator').style.display = success ? 'none' : 'flex';
}

// Setup button listeners
$('file-input').onchange = (e) => {
  const fileInput = e.currentTarget as HTMLInputElement;
  const fileList = fileInput.files;
  if (fileList.length === 0) {
    displayLoadStateResult(false);
    return;
  }

  const executable = fileList[0];
  if (executable.size > MAX_EXECUTABLE_MEMORY) {
    displayLoadStateResult(false);
    return;
  }

  const fileReader = new FileReader();
  fileReader.onload = () => {
    const buffer = fileReader.result as ArrayBuffer;
    const data = new Uint8Array(buffer);
    cpu.loadExecutable(data);
    displayLoadStateResult(true);
  };
  fileReader.onerror = () => {
    displayLoadStateResult(false);
  };
  fileReader.readAsArrayBuffer(executable);
};

$('play').onclick = () => {
  cpu.run();
};

$('pause').onclick = () => {
  cpu.pause();
};
