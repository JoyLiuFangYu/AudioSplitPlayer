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
const progressBar = document.getElementById('progress-bar');
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

// Modal Elements
const modal = document.getElementById('blank-table-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnApplyManual = document.getElementById('btn-apply-manual');
const btnAddManualRow = document.getElementById('btn-add-manual-row');
const manualTbody = document.getElementById('manual-tbody');
const importText = document.getElementById('import-text');
const btnParseText = document.getElementById('btn-parse-text');

let currentFile = null;
let markDataTemp = { start: null, end: null };
let intervalsData = []; // Store interval objects: { id, name, start, end }
let currentAudioFilename = "未知音檔";
let isDraggingProgress = false;

function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function timeToSeconds(timeStr) {
    if (!timeStr) return 0;
    if (!isNaN(timeStr)) return parseFloat(timeStr);
    const parts = timeStr.split(':').reverse();
    let seconds = 0;
    for (let i = 0; i < parts.length; i++) {
        seconds += parseFloat(parts[i]) * Math.pow(60, i);
    }
    return seconds;
}

let mdFileHandle = null;
let isFirstSave = true;

async function autoSaveMd() {
    if (intervalsData.length === 0) return;
    
    let mdContent = `# ${currentAudioFilename} - 區間記錄\n\n`;
    mdContent += `| 區間名稱 | 開始時間 | 結束時間 |\n|---|---|---|\n`;
    intervalsData.forEach(i => {
        mdContent += `| ${i.name} | ${formatTime(i.start)} | ${formatTime(i.end)} |\n`;
    });

    if (window.showSaveFilePicker) {
        try {
            if (!mdFileHandle) {
                mdFileHandle = await window.showSaveFilePicker({
                    suggestedName: `${currentAudioFilename}.md`,
                    types: [{
                        description: 'Markdown File',
                        accept: {'text/markdown': ['.md']}
                    }]
                });
            }
            const writable = await mdFileHandle.createWritable();
            await writable.write(mdContent);
            await writable.close();
        } catch (err) {
            console.log("儲存取消或失敗", err);
        }
    } else {
        if (isFirstSave) {
            const blob = new Blob([mdContent], {type: "text/markdown"});
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `${currentAudioFilename}.md`;
            a.click();
            isFirstSave = false;
        }
    }
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
    if (!isDraggingProgress && audioEl.duration) {
        progressBar.value = (audioEl.currentTime / audioEl.duration) * 100;
    }
});
audioEl.addEventListener('loadedmetadata', () => {
    durationTimeDisp.textContent = formatTime(audioEl.duration);
    audioEl.volume = volumeSlider.value; // enforce 0.5 default
    progressBar.value = 0;
});
audioEl.addEventListener('play', () => btnPlayPause.textContent = "暫停");
audioEl.addEventListener('pause', () => btnPlayPause.textContent = "播放");

// Progress Bar
progressBar.addEventListener('input', () => {
    isDraggingProgress = true;
    if (audioEl.duration) {
        const targetTime = (progressBar.value / 100) * audioEl.duration;
        currentTimeDisp.textContent = formatTime(targetTime);
    }
});

progressBar.addEventListener('change', () => {
    if (audioEl.duration) {
        audioEl.currentTime = (progressBar.value / 100) * audioEl.duration;
    }
    isDraggingProgress = false;
});


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
    audioEl.play(); // 依指定時間恢復播放
});

// Marking System
btnMarkStart.addEventListener('click', () => {
    if (!audioEl.src) return alert('請先載入音檔！');
    audioEl.pause();
    markStartTimeDisp.value = formatTime(audioEl.currentTime);
});

btnMarkEnd.addEventListener('click', () => {
    if (!audioEl.src) return alert('請先載入音檔！');
    audioEl.pause();
    markEndTimeDisp.value = formatTime(audioEl.currentTime);
});

btnSaveMark.addEventListener('click', () => {
    const startVal = timeToSeconds(markStartTimeDisp.value);
    const endVal = timeToSeconds(markEndTimeDisp.value);

    if (isNaN(startVal) || isNaN(endVal)) {
        return alert("請輸入有效的時間格式！");
    }
    if (startVal >= endVal) {
        return alert("結束時間必須大於開始時間！");
    }
    const name = markName.value.trim() || `區間 ${intervalsData.length + 1}`;
    
    intervalsData.push({
        id: Date.now().toString(),
        name: name,
        start: startVal,
        end: endVal
    });
    
    markStartTimeDisp.value = "00:00:00";
    markEndTimeDisp.value = "00:00:00";
    markName.value = "";
    
    renderTable();
    autoSaveMd();
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
                <button onclick="editInterval('${interval.id}')">編輯</button>
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
    autoSaveMd();
};

window.editInterval = function(id) {
    const interval = intervalsData.find(i => i.id === id);
    if (!interval) return;
    
    const newName = prompt("請輸入新的區間名稱", interval.name);
    if (newName !== null) interval.name = newName;
    
    const newStart = prompt("請輸入新的開始時間 (格式 MM:SS 或秒數)", formatTime(interval.start));
    if (newStart !== null) interval.start = timeToSeconds(newStart);
    
    const newEnd = prompt("請輸入新的結束時間 (格式 MM:SS 或秒數)", formatTime(interval.end));
    if (newEnd !== null) interval.end = timeToSeconds(newEnd);
    
    renderTable();
    autoSaveMd();
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
    manualTbody.innerHTML = '';
    importText.value = '';
    addManualRow(); // 預設提供一列空白
    modal.style.display = 'flex';
});

// Modal Logic
btnCloseModal.addEventListener('click', () => {
    modal.style.display = 'none';
});

function addManualRow(name = '', start = '', end = '') {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="manual-name" value="${name}"></td>
        <td><input type="text" class="manual-start time-input" value="${start}" placeholder="00:00:00"></td>
        <td><input type="text" class="manual-end time-input" value="${end}" placeholder="00:00:00"></td>
        <td><button class="danger-btn" onclick="this.parentElement.parentElement.remove()">移除</button></td>
    `;
    manualTbody.appendChild(tr);
}

btnAddManualRow.addEventListener('click', () => {
    addManualRow();
});

btnParseText.addEventListener('click', () => {
    const lines = importText.value.split('\n');
    lines.forEach(line => {
        const parts = line.trim().split(/[\t, ]+/);
        if (parts.length >= 3) {
            const end = parts.pop();
            const start = parts.pop();
            const name = parts.join(' ');
            addManualRow(name, start, end);
        }
    });
    importText.value = ''; // 解析後清空文字區
});

btnApplyManual.addEventListener('click', () => {
    if (confirm('這將會套用並覆蓋目前的區間資料，確定嗎？')) {
        intervalsData = [];
        const rows = manualTbody.querySelectorAll('tr');
        rows.forEach(row => {
            const name = row.querySelector('.manual-name').value.trim();
            const startStr = row.querySelector('.manual-start').value.trim();
            const endStr = row.querySelector('.manual-end').value.trim();
            
            if (name || startStr || endStr) {
                intervalsData.push({
                    id: Date.now().toString() + Math.random().toString(),
                    name: name || '未命名',
                    start: timeToSeconds(startStr),
                    end: timeToSeconds(endStr)
                });
            }
        });
        renderTable();
        modal.style.display = 'none';
        autoSaveMd();
    }
});
