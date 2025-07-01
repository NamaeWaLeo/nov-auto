// converter.js

document.addEventListener('DOMContentLoaded', function () {
    const container = document.createElement('div');
    container.className = 'nai-auto-container nai-auto-responsive';
    container.innerHTML = getSharedUIHTML({ isConverter: true, showHeader: false });
    document.body.appendChild(container);

    // Converter에서는 '내역' 탭과 '단축어' 탭을 보이지 않게 숨김 처리
    const historyTabButton = container.querySelector('.tab-button[data-tab="history"]');
    if (historyTabButton) historyTabButton.style.display = 'none';
    const shortcutsTabButton = container.querySelector('.tab-button[data-tab="shortcuts"]');
    if (shortcutsTabButton) shortcutsTabButton.style.display = 'none';


    const previewList = container.querySelector('#preview-list');
    const processAndDownloadButton = container.querySelector('#process-and-download');
    const localImageInput = container.querySelector('#local-image-input');
    const img2tagInput = container.querySelector('#img2tag-image-input');
    const img2tagPreview = container.querySelector('#img2tag-preview');
    const novelaiOutput = container.querySelector('#novelai-output');
    const sdPixaiOutput = container.querySelector('#sd-pixai-output');

    let selectedFiles = new Map();
    let img2tagFile = null;
    
    const providerRadios = container.querySelectorAll('input[name="api-provider"]');
    const geminiModelSection = container.querySelector('#model-selection-gemini');
    const openaiModelSection = container.querySelector('#model-selection-openai');
    const geminiApiSection = container.querySelector('#gemini-api-section');
    const openaiApiSection = container.querySelector('#openai-api-section');

    function toggleProviderUI(provider) {
        if (geminiModelSection) geminiModelSection.style.display = (provider === 'gemini' || !provider) ? 'block' : 'none';
        if (openaiModelSection) openaiModelSection.style.display = (provider === 'openai') ? 'block' : 'none';
        if (geminiApiSection) geminiApiSection.style.display = (provider === 'gemini' || !provider) ? 'block' : 'none';
        if (openaiApiSection) openaiApiSection.style.display = (provider === 'openai') ? 'block' : 'none';
    }

    providerRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            toggleProviderUI(e.target.value);
            saveSettings();
        });
    });

    chrome.storage.local.get('apiProvider', (result) => {
        const provider = result.apiProvider || 'gemini';
        const radioToCheck = container.querySelector(`input[name="api-provider"][value="${provider}"]`);
        if (radioToCheck) radioToCheck.checked = true;
        toggleProviderUI(provider);
    });

    // converter쪽 창 스케일 조정 로직
    const applyConverterUIScale = (scaleValueStr = '100%') => {
        const scale = parseInt(scaleValueStr) / 100;
        const baseFontSize = 15; 
        document.documentElement.style.fontSize = `${baseFontSize * scale}px`;
    };

    container.querySelector('#ui-scale-select')?.addEventListener('change', (e) => {
        applyConverterUIScale(e.target.value);
        showToast(`UI 배율이 ${e.target.value}로 변경되었습니다.`, 'info');
        saveSettings({ uiScale: e.target.value });
    });

    chrome.storage.local.get('uiScale', (result) => {
        const savedScale = result.uiScale || '100%';
        const scaleSelect = container.querySelector('#ui-scale-select');
        if (scaleSelect) scaleSelect.value = savedScale;
        applyConverterUIScale(savedScale);
    });

    function renderPreviewList() {
        previewList.innerHTML = '';
        if (selectedFiles.size === 0) {
            previewList.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-secondary);" class="log-entry">선택된 이미지가 없습니다.</div>`;
            return;
        }
        selectedFiles.forEach((file, id) => {
            const listItem = document.createElement('div');
            listItem.className = 'preview-item log-entry';
            const reader = new FileReader();
            reader.onload = e => listItem.insertAdjacentHTML('afterbegin', `<img src="${e.target.result}" class="thumbnail">`);
            reader.readAsDataURL(file);
            listItem.insertAdjacentHTML('beforeend', `<span class="file-info" title="${file.name}">${file.name}</span>`);
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.title = '이 파일 제거';
            deleteBtn.onclick = e => { e.stopPropagation(); selectedFiles.delete(id); renderPreviewList(); showToast(`${file.name} 파일이 목록에서 제거되었습니다.`, 'info'); };
            listItem.appendChild(deleteBtn);
            previewList.appendChild(listItem);
        });
    }

    function handleImageSelect(event) {
        const newFiles = Array.from(event.target.files);
        if (newFiles.length === 0) return;
        let addedCount = 0;
        newFiles.forEach(file => {
            if (file.type.startsWith('image/')) {
                const fileId = `${file.name}-${file.lastModified}-${file.size}`;
                if (!selectedFiles.has(fileId)) {
                    selectedFiles.set(fileId, file);
                    addedCount++;
                }
            } else {
                showToast(`'${file.name}'은(는) 이미지 파일이 아닙니다.`, 'warn');
            }
        });
        localImageInput.value = '';
        if (addedCount > 0) showToast(`${addedCount}개의 새 이미지를 추가했습니다.`, 'success');
        renderPreviewList();
    }
    
    async function processSelectedImages() {
        if (selectedFiles.size === 0) return showToast("처리할 이미지를 먼저 선택해주세요.", "warn");
        addLogMessage(`${selectedFiles.size}개 이미지의 변환 및 다운로드를 시작합니다...`, "info");
        showToast("이미지 처리 시작...", "info");
        processAndDownloadButton.disabled = true;
        processAndDownloadButton.textContent = "처리 중...";
        const CONCURRENT_LIMIT = 5;
        const filesToProcess = Array.from(selectedFiles.values());
        let successCount = 0;
        let errorCount = 0;
        for (let i = 0; i < filesToProcess.length; i += CONCURRENT_LIMIT) {
            const chunk = filesToProcess.slice(i, i + CONCURRENT_LIMIT);
            const promises = chunk.map(file => {
                const objectURL = URL.createObjectURL(file);
                return processAndDownloadImage(objectURL, { originalFilename: file.name })
                    .then(() => { URL.revokeObjectURL(objectURL); return { status: 'fulfilled', file: file.name }; })
                    .catch(error => { URL.revokeObjectURL(objectURL); return { status: 'rejected', file: file.name, reason: error }; });
            });
            const results = await Promise.all(promises);
            results.forEach(result => {
                if (result.status === 'fulfilled') successCount++;
                else { errorCount++; addLogMessage(`${result.file} 처리 실패: ${result.reason.message}`, 'error'); }
            });
            addLogMessage(`${i + chunk.length} / ${filesToProcess.length} 처리 완료...`, 'info');
        }
        if (errorCount > 0) showToast(`${successCount}개 성공, ${errorCount}개 실패. 로그를 확인하세요.`, 'error');
        else showToast(`총 ${successCount}개의 이미지 처리를 모두 완료했습니다!`, 'success');
        processAndDownloadButton.disabled = false;
        processAndDownloadButton.textContent = "변환 및 다운로드";
    }

    function handleImg2TagSelect(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            img2tagFile = file;
            const reader = new FileReader();
            reader.onload = e => { img2tagPreview.src = e.target.result; img2tagPreview.style.display = 'block'; };
            reader.readAsDataURL(file);
            showToast(`${file.name}을(를) 분석 대상으로 선택했습니다.`, 'info');
        } else if (file) {
            showToast('선택한 파일은 이미지 파일이 아닙니다.', 'warn');
        }
        img2tagInput.value = '';
    }

    function displayFormattedPrompts(basePrompt) {
        const keywords = basePrompt.replace(/\./g, '').split(',').map(k => k.trim().toLowerCase()).filter(Boolean).join(', ');
        const novelAIPrompt = `{{masterpiece, best quality}}, ${keywords}`;
        const sdPrompt = `(8k, raw photo, best quality, masterpiece:1.2), (ultra realistic, cinematic), ${keywords}`;
        novelaiOutput.value = novelAIPrompt;
        sdPixaiOutput.value = sdPrompt;
    }

    async function interrogateWithOpenAI(apiKey, model, file) {
        addLogMessage(`[${model}] 모델로 프롬프트 분석을 시작합니다... (OpenAI)`, 'info');
        const base64Image = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
        const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` }, body: JSON.stringify({ model: model, messages: [{ role: "user", content: [{ type: "text", text: "Analyze this image in extreme detail for an AI art prompt. Describe everything including the main subjects, their clothing and expressions, any objects, the environment, background, and specific composition (e.g., 'from below', 'close-up'). Also describe the colors, lighting, and overall atmosphere. Format the entire output as a single, continuous list of comma-separated English keywords and phrases." }, { type: "image_url", image_url: { url: base64Image, detail: "high" } }] }], max_tokens: 500 }) });
        if (!response.ok) { const errorData = await response.json(); throw new Error(`OpenAI API 오류 (${response.status}): ${errorData.error?.message || response.statusText}`); }
        const data = await response.json();
        return data.choices[0]?.message?.content;
    }

    async function interrogateWithGemini(apiKey, model, file) {
        addLogMessage(`[${model}] 모델로 프롬프트 분석을 시작합니다... (Gemini)`, 'info');
        const base64Data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result.split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); });
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const requestBody = { contents: [{ parts: [{ text: "Analyze this image in extreme detail for an AI art prompt. Describe everything including the main subjects, their clothing and expressions, any objects, the environment, background, and specific composition (e.g., 'from below', 'close-up'). Also describe the colors, lighting, and overall atmosphere. Format the entire output as a single, continuous list of comma-separated English keywords and phrases." }, { inline_data: { mime_type: file.type, data: base64Data } }] }] };
        const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
        if (!response.ok) { const errorData = await response.json(); throw new Error(`Gemini API 오류 (${response.status}): ${errorData.error?.message || response.statusText}`); }
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text;
    }

    async function interrogateImage() {
        if (!img2tagFile) return showToast("먼저 분석할 이미지를 선택해주세요.", 'warn');
        const settings = await chrome.storage.local.get(['apiProvider', 'geminiApiKey', 'openaiApiKey', 'geminiModel', 'openaiModel']);
        const provider = settings.apiProvider || 'gemini';
        let apiKey, model, apiFunction;
        // 모델 기본값 shared.js에서 설정된 값으로 불러오도록 수정
        if (provider === 'gemini') { apiKey = settings.geminiApiKey; model = settings.geminiModel || 'gemini-1.5-flash'; apiFunction = interrogateWithGemini; }
        else { apiKey = settings.openaiApiKey; model = settings.openaiModel || 'gpt-4o'; apiFunction = interrogateWithOpenAI; }
        if (!apiKey) { showToast(`${provider.toUpperCase()} API 키가 필요합니다. 설정 탭에서 키를 저장해주세요.`, 'error'); container.querySelector('.tab-button[data-tab="settings"]')?.click(); return; }
        showToast('프롬프트 분석을 시작합니다...', 'info');
        const interrogateBtn = container.querySelector('#interrogate-image');
        interrogateBtn.disabled = true; interrogateBtn.textContent = '분석 중...';
        novelaiOutput.value = ''; sdPixaiOutput.value = '';
        try {
            const resultText = await apiFunction(apiKey, model, img2tagFile);
            if (resultText) { showToast('프롬프트 분석 성공!', 'success'); addLogMessage('프롬프트 분석에 성공했습니다.', 'success'); displayFormattedPrompts(resultText.trim()); }
            else { throw new Error('API 응답에서 유효한 텍스트를 찾을 수 없습니다.'); }
        } catch (error) {
            showToast(`프롬프트 분석 실패: ${error.message}`, 'error', 5000);
            addLogMessage(`프롬프트 분석 실패: ${error.message}`, 'error');
            console.error(error);
        } finally {
            interrogateBtn.disabled = false; interrogateBtn.textContent = '프롬프트 분석 시작';
        }
    }

    initializeSharedUI(container, {
        handleImageSelect,
        processAndDownload: processSelectedImages,
        handleImg2TagSelect,
        interrogateImage: interrogateImage,
    });
    
    renderPreviewList();
});