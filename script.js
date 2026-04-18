// DOM Elements
const audioInput = document.getElementById('audio-input');
const audioNameDisplay = document.getElementById('current-filename');
const audioEl = document.getElementById('main-audio');

// Controls
const btnPlayPause = document.getElementById('btn-play-pause');
const volumeSlider = document.getElementById('volume-slider');
const speedSelect = document.getElementById('speed-select');
const skipButtons = document.querySelectorAll('.btn-skip');

// Jump & Time
const currentTimeDisp = document.getElementById('current-time');
const durationTimeDisp = document.getElementById('duration-time');
const jumpH = document.getElementById('jump-h');
const jumpM = document.getElementById('jump-m');
const jumpS = document.getElementById('jump-s');
const btnJump = document.getElementById('btn-jump');

// Marking
const btnMarkStart = document.getElementById('btn-mark-start');
const btnMarkEnd = document.getElementById('btn-mark-end');
const markStartTimeDisp = document.getElementById('mark-start-time');
const markEndTimeDisp = document.getElementById('mark-end-time');
const markName = document.getElementById('mark-name');
const btnSaveMark = document.getElementById('btn-save-mark');

// Table
const tbody = document.getElementById('intervals-tbody');
const btnExportData = document.getElementById('btn-export-data');
const importInput = document.getElementById('import-input');
const btnClearData = document.getElementById('btn-clear-data');
const btnClipSelected = document.getElementById('btn-clip-selected');
const btnClipAll = document.getElementById('btn-clip-all');

let currentFile = null;
let markDataTemp = { start: null, end: null };
let intervalsData = []; // Store interval objects: { id, name, start, end }
let currentAudioFilename = "未知音檔";

// Helper: Format seconds to HH:MM:SS
function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Event: File selection
audioInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        currentFile = file;
        currentAudioFilename = file.name.split('.').slice(0, -1).join('.') || file.name;
        audioNameDisplay.textContent = file.name;
        
        const fileURL = URL.createObjectURL(file);
        audioEl.src = fileURL;
        audioEl.load();
        btnPlayPause.textContent = "播放";
    }
});

// Audio events
audioEl.addEventListener('timeupdate', () => {
    currentTimeDisp.textContent = formatTime(audioEl.currentTime);
});
audioEl.addEventListener('loadedmetadata', () => {
    durationTimeDisp.textContent = formatTime(audioEl.duration);
    audioEl.volume = volumeSlider.value; // enforce 0.5 default
});
audioEl.addEventListener('play', () => btnPlayPause.textContent = "暫停");
audioEl.addEventListener('pause', () => btnPlayPause.textContent = "播放");

// Basic Controls
btnPlayPause.addEventListener('click', () => {
    if (!audioEl.src) return alert('請先載入音檔！');
    if (audioEl.paused) audioEl.play();
    else audioEl.pause();
});

volumeSlider.addEventListener('input', (e) => {
    audioEl.volume = e.target.value;
});

speedSelect.addEventListener('change', (e) => {
    audioEl.playbackRate = parseFloat(e.target.value);
});

skipButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (!audioEl.src) return;
        const dir = parseInt(e.target.dataset.dir);
        const sec = parseInt(e.target.dataset.sec);
        audioEl.currentTime += (dir * sec);
    });
});

btnJump.addEventListener('click', () => {
    if (!audioEl.src) return;
    const h = parseInt(jumpH.value) || 0;
    const m = parseInt(jumpM.value) || 0;
    const s = parseInt(jumpS.value) || 0;
    audioEl.currentTime = h * 3600 + m * 60 + s;
});

// Marking System
btnMarkStart.addEventListener('click', () => {
    if (!audioEl.src) return alert('請先載入音檔！');
    audioEl.pause();
    markDataTemp.start = audioEl.currentTime;
    markStartTimeDisp.textContent = formatTime(markDataTemp.start);
});

btnMarkEnd.addEventListener('click', () => {
    if (!audioEl.src) return alert('請先載入音檔！');
    audioEl.pause();
    markDataTemp.end = audioEl.currentTime;
    markEndTimeDisp.textContent = formatTime(markDataTemp.end);
});

btnSaveMark.addEventListener('click', () => {
    if (markDataTemp.start === null || markDataTemp.end === null) {
        return alert("請先設定開始與結束標記！");
    }
    if (markDataTemp.start >= markDataTemp.end) {
        return alert("結束時間必須大於開始時間！");
    }
    const name = markName.value.trim() || `區間 ${intervalsData.length + 1}`;
    
    intervalsData.push({
        id: Date.now().toString(),
        name: name,
        start: markDataTemp.start,
        end: markDataTemp.end
    });
    
    // Reset temp
    markDataTemp = { start: null, end: null };
    markStartTimeDisp.textContent = "--:--:--";
    markEndTimeDisp.textContent = "--:--:--";
    markName.value = "";
    
    renderTable();
});

// Render Table
function renderTable() {
    tbody.innerHTML = '';
    intervalsData.forEach((interval, index) => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td><input type="checkbox" class="interval-cb" data-id="${interval.id}"></td>
            <td>${interval.name}</td>
            <td>${formatTime(interval.start)}</td>
            <td>${formatTime(interval.end)}</td>
            <td>
                <button onclick="playInterval(${interval.start}, ${interval.end})">播放</button>
                <button onclick="deleteInterval('${interval.id}')">刪除</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Global functions for inline table action
window.playInterval = function(start, end) {
    if (!audioEl.src) return;
    audioEl.currentTime = start;
    audioEl.play();
    
    // Auto pause logic
    const autoPause = () => {
        if (audioEl.currentTime >= end) {
            audioEl.pause();
            audioEl.removeEventListener('timeupdate', autoPause);
        }
    };
    audioEl.addEventListener('timeupdate', autoPause);
};

window.deleteInterval = function(id) {
    intervalsData = intervalsData.filter(i => i.id !== id);
    renderTable();
};

// Data Import / Export (JSON format)
btnExportData.addEventListener('click', () => {
    if (intervalsData.length === 0) return alert('目前沒有區間資料可以匯出。');
    const dataStr = JSON.stringify(intervalsData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentAudioFilename}_intervals.json`;
    a.click();
    URL.revokeObjectURL(url);
});

importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const data = JSON.parse(evt.target.result);
            if (Array.isArray(data)) {
                intervalsData = data;
                renderTable();
                alert('成功載入區間資料！');
            }
        } catch (err) {
            alert('檔案格式錯誤，請選擇有效的 JSON 區間記錄檔。');
        }
    };
    reader.readAsText(file);
});

btnClearData.addEventListener('click', () => {
    if (confirm('確定要開啟空白資料表嗎？這會清除畫面上目前的區間資料。')) {
        intervalsData = [];
        renderTable();
    }
});

// Clipping Implementation using Web Audio API
async function encodeWAV(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // Write WAV header
    const writeString = (view, offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };
    
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // 1 channel (mono for simplicity, or 2 for stereo)
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // byte rate = sampleRate * blockAlign
    view.setUint16(32, 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    // float to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
}

async function processClips(intervals) {
    if (!currentFile) return alert('沒有可剪輯的音檔。請先載入原音檔！');
    if (intervals.length === 0) return alert('請選擇至少一個區間進行剪輯。');

    btnClipSelected.disabled = true;
    btnClipAll.disabled = true;
    
    alert("開始剪輯處理，請稍候...");
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await currentFile.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const zip = new JSZip();
        const folder = zip.folder(currentAudioFilename);

        for (let i = 0; i < intervals.length; i++) {
            const interval = intervals[i];
            const startFrame = Math.floor(interval.start * audioBuffer.sampleRate);
            const endFrame = Math.floor(interval.end * audioBuffer.sampleRate);
            const frameCount = endFrame - startFrame;
            
            if (frameCount <= 0) continue;

            const offlineCtx = new OfflineAudioContext(
                audioBuffer.numberOfChannels, 
                frameCount, 
                audioBuffer.sampleRate
            );
            
            const source = offlineCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(offlineCtx.destination);
            source.start(0, interval.start, interval.end - interval.start);

            const renderedBuffer = await offlineCtx.startRendering();
            
            // To simplify, we mix down to mono for the output WAV
            const channelData = renderedBuffer.getChannelData(0); 
            // If stereo is required, interleave channels here. Mono is much lighter.
            
            const wavData = await encodeWAV(channelData, renderedBuffer.sampleRate);
            const blob = new Blob([wavData], { type: 'audio/wav' });
            
            // File naming based on interval name
            let safeName = interval.name.replace(/[<>:"/\\|?*]+/g, '_');
            folder.file(`${safeName}.wav`, blob);
        }

        const zipBlob = await zip.generateAsync({type: "blob"});
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentAudioFilename}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        
        alert('剪輯完成！已下載 ZIP 檔。');
    } catch (err) {
        console.error(err);
        alert('剪輯發生錯誤：' + err.message);
    }
    
    btnClipSelected.disabled = false;
    btnClipAll.disabled = false;
}

btnClipSelected.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.interval-cb:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.dataset.id);
    const selectedIntervals = intervalsData.filter(i => selectedIds.includes(i.id));
    processClips(selectedIntervals);
});

btnClipAll.addEventListener('click', () => {
    processClips(intervalsData);
});
