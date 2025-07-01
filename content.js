// content.js

window.NaiAuto = window.NaiAuto || {};
Object.assign(window.NaiAuto, {
    isGenerating: false,
    totalToGenerate: 0,
    generatedCount: 0,
    generateIntervalId: null,
    generationAttempt: 0,
});

let uiWrapper, uiContainer;
const MAX_RETRIES = 3;

// NovelAI 프롬프트 입력 필드를 찾기 위한 셀렉터 (더 유연하게 업데이트)
const PROMPT_INPUT_SELECTORS = [
    'textarea[placeholder*="프롬프트"]',
    'textarea[placeholder*="Add tags to describe your image."]',
    'textarea[data-v-b610c1f6][rows="1"]', // NovelAI 특정 프롬프트 필드 (예: Vue 컴포넌트 내부)
    'div[contenteditable="true"]',          // 일반적인 contenteditable div
    'input[type="text"], input[type="search"]' // 일반적인 텍스트 input 필드
];

// 단축어 기능 전역 변수 (content.js 내에서 관리)
let shortcutPillElement = null;
let currentInputTarget = null; // 현재 활성화된 입력 필드
// 현재 단축어 매칭 정보:
// {
//   matchedAbbr: string,            // 매칭된 단축어의 축약어 (예: "dahee")
//   fullText: string,               // 매칭된 단축어의 전체 텍스트
//   startOffsetInTarget: number,    // targetElement 내에서 대체될 부분의 시작 오프셋
//   endOffsetInTarget: number       // targetElement 내에서 대체될 부분의 끝 오프셋
// }
let currentShortcutMatchInfo = null;


window.NaiAuto.setUIStateGenerating = function(isGeneratingState) {
    window.NaiAuto.isGenerating = isGeneratingState;
    if (!uiContainer) {
        console.warn("setUIStateGenerating: uiContainer not found.");
        return;
    }

    const startBtn = uiContainer.querySelector('#start-generation');
    const stopBtn = uiContainer.querySelector('#stop-generation');
    const numToGenerateInput = uiContainer.querySelector('#num-to-generate');
    const downloadImageButton = uiContainer.querySelector('#download-image');

    // 자동 생성/중지 버튼 토글
    if (startBtn) {
        startBtn.style.display = isGeneratingState ? 'none' : 'flex';
        startBtn.disabled = isGeneratingState; // 시작 버튼은 생성 중일 때 비활성화
    }
    if (stopBtn) {
        stopBtn.style.display = isGeneratingState ? 'flex' : 'none';
        stopBtn.disabled = !isGeneratingState; // 중지 버튼은 생성 중이 아닐 때 비활성화
    }

    // 다른 UI 요소들의 비활성화/활성화
    if (numToGenerateInput) numToGenerateInput.disabled = isGeneratingState;
    if (downloadImageButton) downloadImageButton.disabled = isGeneratingState;

    // 설정 탭의 모든 입력 필드와 버튼 비활성화/활성화
    const settingsTabElements = uiContainer.querySelectorAll('#settings-tab-content input, #settings-tab-content button, #settings-tab-content select, #settings-tab-content textarea');
    settingsTabElements.forEach(el => {
        el.disabled = isGeneratingState;
    });

    // 단축어 탭의 입력 필드 및 버튼 비활성화 (생성 중에는 단축어 수정 불가)
    const shortcutAbbrInput = document.getElementById('shortcut-abbreviation');
    const shortcutFullTextInput = document.getElementById('shortcut-fulltext');
    const addShortcutBtn = document.getElementById('add-shortcut-btn');
    const backupShortcutsBtn = document.getElementById('backup-shortcuts');
    const restoreShortcutsInput = document.getElementById('restore-shortcuts-input');
    const clearShortcutsBtn = document.getElementById('clear-shortcuts');

    if (shortcutAbbrInput) shortcutAbbrInput.disabled = isGeneratingState;
    if (shortcutFullTextInput) shortcutFullTextInput.disabled = isGeneratingState;
    if (addShortcutBtn) addShortcutBtn.disabled = isGeneratingState;
    if (backupShortcutsBtn) backupShortcutsBtn.disabled = isGeneratingState;
    if (restoreShortcutsInput) restoreShortcutsInput.disabled = isGeneratingState;
    if (clearShortcutsBtn) clearShortcutsBtn.disabled = isGeneratingState;

    // API 키 저장 버튼도 생성 중일 때 비활성화
    const saveApiKeysButton = uiContainer.querySelector('#save-api-keys');
    if (saveApiKeysButton) saveApiKeysButton.disabled = isGeneratingState;
    
    // Img2Tag 탭의 요소들도 비활성화/활성화
    const img2tagInput = uiContainer.querySelector('#img2tag-image-input');
    const interrogateImageButton = uiContainer.querySelector('#interrogate-image');
    if (img2tagInput) img2tagInput.disabled = isGeneratingState;
    if (interrogateImageButton) interrogateImageButton.disabled = isGeneratingState;

    // 파일명 템플릿 Pill 관련 요소 비활성화/활성화
    const filenameTemplateContainer = uiContainer.querySelector('#filename-template-container');
    const filenameTemplateAddButtons = uiContainer.querySelectorAll('.available-templates .template-add-button');
    if (filenameTemplateContainer) {
        filenameTemplateContainer.style.pointerEvents = isGeneratingState ? 'none' : 'auto';
        filenameTemplateContainer.style.opacity = isGeneratingState ? '0.6' : '1';
    }
    filenameTemplateAddButtons.forEach(button => {
        button.disabled = isGeneratingState;
    });


    if (!isGeneratingState && typeof updateConditionalSettingsUI === 'function') {
        // 생성 중이 아닐 때만 조건부 UI 업데이트 (선택된 포맷에 따라 품질 설정 표시)
        updateConditionalSettingsUI();
    }
};

window.NaiAuto.lastProcessedImageUrl = null;

window.NaiAuto._waitForNewImage = function() {
    return new Promise((resolve, reject) => {
        const TIMEOUT = 30000; // 최대 30초 대기
        const CHECK_INTERVAL = 500; // 0.5초마다 확인
        const startTime = Date.now();

        const checkNewImage = () => {
            // 현재 화면에 보이는 모든 이미지 요소
            const currentImages = Array.from(document.querySelectorAll('img.image-grid-image[src^="blob:"]'));
            
            if (currentImages.length === 0) {
                // 이미지가 아직 없으면 계속 기다림
                if (Date.now() - startTime < TIMEOUT) {
                    setTimeout(checkNewImage, CHECK_INTERVAL);
                } else {
                    reject(new Error(`새 이미지 생성 타임아웃 (${TIMEOUT / 1000}초). 이미지가 나타나지 않았습니다.`));
                }
                return;
            }

            // NovelAI는 보통 새로 생성된 이미지를 가장 최근에 업데이트된 이미지로 보여줌
            // 여기서는 첫 번째 이미지 요소가 가장 중요한 후보일 가능성이 높음
            const mainImageElement = currentImages[0]; // 또는 currentImages[currentImages.length - 1] 일 수도 있음. 보통 첫 번째임.

            // 새로운 이미지인지 확인
            // src가 바뀌었고, 이전에 처리했던 이미지 URL과 다를 때
            if (mainImageElement && mainImageElement.src && mainImageElement.src !== window.NaiAuto.lastProcessedImageUrl) {
                // 이미지가 완전히 로드되었는지 확인
                if (mainImageElement.complete && mainImageElement.naturalWidth > 0) {
                    console.log("새 이미지 감지 및 로드 완료:", mainImageElement.src);
                    // 새로 로드된 이미지 URL을 저장
                    window.NaiAuto.lastProcessedImageUrl = mainImageElement.src;
                    resolve(mainImageElement);
                    return;
                } else {
                    // src는 바뀌었지만 아직 로드 중이면 기다림
                    console.log("새 이미지 src 감지, 로드 대기 중...", mainImageElement.src);
                }
            } else {
                // 아직 새 이미지가 아니거나, src가 바뀌지 않았거나, 이미 로드된 이미지일 경우
                console.log("새 이미지 대기 중... 현재 이미지:", mainImageElement ? mainImageElement.src : "없음");
            }

            // 타임아웃이 되지 않았으면 계속 확인
            if (Date.now() - startTime < TIMEOUT) {
                setTimeout(checkNewImage, CHECK_INTERVAL);
            } else {
                reject(new Error(`새 이미지 생성 타임아웃 (${TIMEOUT / 1000}초). 새로운 이미지가 로드되지 않았습니다.`));
            }
        };

        // 이미지 감지 시작
        checkNewImage();
    });
};

window.NaiAuto.startImageGenerationLoop = async function() {
    if (!window.NaiAuto.isGenerating) return;

    // 첫 번째 루프 시작 시에만 lastProcessedImageUrl 초기화
    if (window.NaiAuto.generatedCount === 0) {
        const initialImage = document.querySelector('img.image-grid-image[src^="blob:"]');
        window.NaiAuto.lastProcessedImageUrl = initialImage ? initialImage.src : null;
        console.log("자동 생성 시작: 초기 이미지 URL 설정됨:", window.NaiAuto.lastProcessedImageUrl);
    }

    if (window.NaiAuto.generatedCount >= window.NaiAuto.totalToGenerate) {
        updateStatus(`총 ${window.NaiAuto.totalToGenerate}장 생성 완료.`);
        showToast("자동 생성이 성공적으로 완료되었습니다.", "success");
        addLogMessage(`총 ${window.NaiAuto.totalToGenerate}장의 이미지 생성을 완료했습니다.`, 'success');
        window.NaiAuto.stopImageGeneration();
        return;
    }

    try {
        const currentCount = window.NaiAuto.generatedCount + 1;
        const totalCount = window.NaiAuto.totalToGenerate;
        
        updateStatus(`이미지 생성 중... (${currentCount}/${totalCount})`);
        updateProgress(currentCount, totalCount);

        const generateButton = await window.NaiAuto.findGenerateButton();
        if (!generateButton || generateButton.disabled) {
            throw new Error("활성화된 'Generate' 버튼을 찾을 수 없습니다. 프롬프트를 확인하거나 페이지를 새로고침 해주세요.");
        }

        addLogMessage(`[${currentCount}/${totalCount}] 이미지 생성 시작...`, 'info');
        generateButton.click();

        // 중요: 이미지가 완전히 로드될 때까지 _waitForNewImage가 기다림
        const newImageElement = await window.NaiAuto._waitForNewImage();
        addLogMessage(`[${currentCount}/${totalCount}] 새 이미지 감지 및 로드 완료.`, 'info');

        const { autoDownloadEnabled, generationInterval } = await chrome.storage.local.get({ autoDownloadEnabled: true, generationInterval: 1000 });

        if (autoDownloadEnabled) {
        await processAndDownloadImage(newImageElement.src, { altText: newImageElement.alt });
        } else {
            addLogMessage(`[${currentCount}/${totalCount}] 이미지 생성 완료 (자동 다운로드 비활성화됨).`, 'info');
            showToast(`[${currentCount}/${totalCount}] 이미지 생성 완료!`, 'success');
        }

        window.NaiAuto.generatedCount++;
        window.NaiAuto.generationAttempt = 0;
        // 다음 생성까지의 간격은 그대로 유지
        window.NaiAuto.generateIntervalId = setTimeout(window.NaiAuto.startImageGenerationLoop, generationInterval);

    } catch (error) {
        addLogMessage(`오류 발생: ${error.message}`, 'error');
        updateStatus(`오류: ${error.message.substring(0, 50)}...`);
        showToast(error.message, 'error', 5000);
        window.NaiAuto.generationAttempt++;

        if (window.NaiAuto.generationAttempt <= MAX_RETRIES) {
            const { generationInterval } = await chrome.storage.local.get({ generationInterval: 1000 });
            addLogMessage(`${window.NaiAuto.generationAttempt}/${MAX_RETRIES}번째 재시도를 시작합니다...`, 'warn');
            showToast(`${window.NaiAuto.generationAttempt}번째 재시도 중...`, 'warn');
            window.NaiAuto.generateIntervalId = setTimeout(window.NaiAuto.startImageGenerationLoop, generationInterval + 3000);
        } else {
            addLogMessage(`최대 재시도 횟수(${MAX_RETRIES}회) 초과. 자동 생성을 중지합니다.`, 'error');
            showToast("오류가 반복되어 생성을 중지했습니다.", "error");
            window.NaiAuto.stopImageGeneration(true);
        }
    }
};

window.NaiAuto.findGenerateButton = function() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 40; // 시도 횟수를 늘려 혹시 모를 로딩 지연에 대비 (20초까지 기다림)
        const interval = 500;

        const check = () => {
            const buttons = Array.from(document.querySelectorAll('button'));
            let foundButton = null;

            for (const btn of buttons) {
                // Generate 1 Image, Generate X Images 형태 모두 커버
                if (btn.textContent.includes('Generate') && btn.textContent.includes('Image')) {
                    // 버튼 자체가 비활성화되어 있지 않고,
                    // 부모 요소 중 클릭을 막는 것이 없는지 확인 (더 일반적인 접근)
                    const isActuallyClickable = !btn.disabled &&
                                               window.getComputedStyle(btn).getPropertyValue('pointer-events') !== 'none' &&
                                               window.getComputedStyle(btn).getPropertyValue('opacity') !== '0';

                    if (isActuallyClickable) {
                        foundButton = btn;
                        break;
                    }
                }
            }

            if (foundButton) {
                console.log("Generate 버튼을 성공적으로 찾았습니다!", foundButton);
                resolve(foundButton);
            } else {
                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(check, interval);
                } else {
                    reject(new Error("'Generate' 버튼을 20초 내에 찾지 못했습니다. (페이지 로드 상태 또는 버튼 활성화 대기 실패)"));
                }
            }
        };
        check();
    });
};

window.NaiAuto.stopImageGeneration = function(isError = false) {
    if (window.NaiAuto.generateIntervalId) {
        clearTimeout(window.NaiAuto.generateIntervalId);
        window.NaiAuto.generateIntervalId = null;
    }
    window.NaiAuto.isGenerating = false;
    window.NaiAuto.generationAttempt = 0;
    window.NaiAuto.setUIStateGenerating(false);
    updateProgress(0, 0);

    if (isError) {
        updateStatus("오류로 인해 중지됨.");
    } else {
        updateStatus("자동 생성이 중지되었습니다.");
        addLogMessage("사용자에 의해 자동 생성이 중지되었습니다.", "warn");
        showToast("자동 생성을 중지했습니다.", "info");
    }
};

window.NaiAuto.downloadCurrentImage = async function (event = null) {
    const mainImageElement = document.querySelector('img.image-grid-image[src^="blob:"]');
    if (!mainImageElement || !mainImageElement.src) {
        addLogMessage("다운로드할 이미지를 찾지 못했습니다.", "warn");
        return showToast("다운로드할 이미지를 선택해주세요.", "warn");
    }
    
    try {
        await processAndDownloadImage(mainImageElement.src, { altText: mainImageElement.alt });
    } catch (error) {
        // processAndDownloadImage 내부에서 이미 showToast 처리
    }
};

window.NaiAuto.injectUI = function() {
    if (document.getElementById('nai-auto-injector-wrapper')) return;

    uiWrapper = document.createElement('div');
    uiWrapper.id = 'nai-auto-injector-wrapper';
    
    uiContainer = document.createElement('div');
    uiContainer.className = 'nai-auto-container nai-auto-compact'; 
    
    // isConverter를 false로 명시하여 NovelAI 페이지에서 Converter UI가 주입되지 않도록 함
    uiContainer.innerHTML = getSharedUIHTML({ isGenerator: true, showHeader: true, isConverter: false, excludeDisclaimerModal: true }); 
    
    uiWrapper.appendChild(uiContainer);
    document.body.appendChild(uiWrapper);

    // Disclaimer Modal을 body에 직접 추가
    const disclaimerModalHtml = getDisclaimerModalHTML();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = disclaimerModalHtml;
    const modal = tempDiv.firstElementChild;
    document.body.appendChild(modal);

    // Shortcut Pill 및 Toast Container 초기화
    let shortcutPill = document.getElementById('shortcut-pill');
    if (!shortcutPill) {
        shortcutPill = document.createElement('div');
        shortcutPill.id = 'shortcut-pill';
        shortcutPill.className = 'shortcut-pill';
        document.body.appendChild(shortcutPill);
    }
    window.shortcutPillElement = shortcutPill; 

    // 드래그 기능
    let isDragging = false, offsetX, offsetY;
    const header = uiContainer.querySelector('.window-header');
    
    // uiWrapper에 직접 mousedown 이벤트를 걸어 드래그 가능 영역 확대
    uiWrapper.addEventListener('mousedown', (e) => {
        // 헤더 내부의 컨트롤 버튼이 아닌 경우에만 드래그 시작
        const isControl = e.target.closest('.controls');
        // 최소화된 상태이거나 헤더를 클릭했을 때 드래그 시작
        if (!isControl && (header.contains(e.target) || uiContainer.classList.contains('minimized'))) {
            isDragging = true;
            const rect = uiWrapper.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            uiWrapper.style.transition = 'none'; // 드래그 중 transition 제거
            document.body.style.userSelect = 'none'; // 텍스트 선택 방지
            document.body.style.cursor = 'grabbing'; // 커서 변경
            e.preventDefault(); // 기본 드래그 동작 방지
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        let newLeft = e.clientX - offsetX;
        let newTop = e.clientY - offsetY;
        
        // 화면 경계 처리
        const uiWidth = uiWrapper.offsetWidth;
        const uiHeight = uiWrapper.offsetHeight;

        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - uiWidth));
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - uiHeight));
        
        uiWrapper.style.left = `${newLeft}px`;
        uiWrapper.style.top = `${newTop}px`;
        uiWrapper.style.right = 'auto'; // right 속성 제거
        uiWrapper.style.transform = 'none'; // top/left로 이동하므로 transform 초기화
    });

    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        uiWrapper.style.transition = ''; // transition 복원
        document.body.style.userSelect = ''; // 텍스트 선택 허용
        document.body.style.cursor = ''; // 커서 복원
    });

    uiContainer.querySelector('#close-minimize-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const isMinimized = uiContainer.classList.contains('minimized');
        const currentRect = uiWrapper.getBoundingClientRect(); // 현재 uiWrapper의 위치/크기

        if (isMinimized) {
            // 복원될 때의 목표 크기 (CSS 변수 사용 또는 고정값)
            const targetWidth = 262.5; // .nai-auto-compact의 width (조정된 너비)
            const targetHeight = 580; // (예상) UI가 확장될 때의 높이

            let newLeft = currentRect.left;
            let newTop = currentRect.top;

            // X축 경계 처리
            if (newLeft + targetWidth > window.innerWidth) {
                newLeft = window.innerWidth - targetWidth - 10; // 우측에 10px 여유
            }
            if (newLeft < 0) {
                newLeft = 10; // 좌측에 10px 여유
            }

            // Y축 경계 처리
            if (newTop + targetHeight > window.innerHeight) {
                newTop = window.innerHeight - targetHeight - 10; // 하단에 10px 여유
            }
            if (newTop < 0) {
                newTop = 10; // 상단에 10px 여유
            }

            uiWrapper.style.left = `${newLeft}px`;
            uiWrapper.style.top = `${newTop}px`;
            uiWrapper.style.right = 'auto';
            uiWrapper.style.transform = 'none'; // 복원 시 transform 제거

        } else {
            // 최소화될 때 현재 위치 저장 (복원 시 사용)
            uiWrapper.dataset.lastLeft = uiWrapper.style.left;
            uiWrapper.dataset.lastTop = uiWrapper.style.top;
        }
        uiContainer.classList.toggle('minimized');
    });

    const applyInjectedUIScale = (scaleValueStr = '100%') => {
        const scale = parseInt(scaleValueStr) / 100;
        uiContainer.style.transformOrigin = 'top right';
        uiContainer.style.transform = `scale(${scale})`;
    };
    
    uiContainer.querySelector('#ui-scale-select')?.addEventListener('change', (e) => {
        applyInjectedUIScale(e.target.value);
        showToast(`UI 배율이 ${e.target.value}로 변경되었습니다.`, 'info');
        saveSettings({ uiScale: e.target.value });
    });
    
    chrome.storage.local.get('uiScale', (result) => {
        const savedScale = result.uiScale || '100%';
        const scaleSelect = uiContainer.querySelector('#ui-scale-select');
        if (scaleSelect) scaleSelect.value = savedScale;
        applyInjectedUIScale(savedScale);
    });

    const disclaimerOverlay = uiContainer.querySelector('#generation-disclaimer-overlay');
    const showDisclaimerBtn = uiContainer.querySelector('#show-disclaimer-btn');
    const actualModal = document.getElementById('disclaimer-modal');
    const agreeBtn = actualModal.querySelector('#disclaimer-agree-btn');
    const cancelBtn = actualModal.querySelector('#disclaimer-cancel-btn');
    const checkbox = actualModal.querySelector('#disclaimer-checkbox');

    const setGenerationFeatureState = (agreed) => {
        if(disclaimerOverlay) disclaimerOverlay.classList.toggle('hidden', agreed);
    };

    chrome.storage.local.get('hasAgreedToPolicy', (result) => {
        setGenerationFeatureState(result.hasAgreedToPolicy);
        if(!result.hasAgreedToPolicy && disclaimerOverlay) {
             disclaimerOverlay.style.display = 'flex';
        }
    });

    showDisclaimerBtn?.addEventListener('click', () => { 
        if(actualModal) {
            actualModal.classList.add('visible'); 
            document.body.style.overflow = 'hidden'; 
        }
    });
    cancelBtn?.addEventListener('click', () => { 
        if(actualModal) {
            actualModal.classList.remove('visible'); 
            if(checkbox) checkbox.checked = false; 
            document.body.style.overflow = ''; 
        }
    });
    actualModal?.addEventListener('click', (e) => { 
        if (e.target === actualModal) { 
            actualModal.classList.remove('visible'); 
            if(checkbox) checkbox.checked = false; 
            document.body.style.overflow = ''; 
        }
    });
    agreeBtn?.addEventListener('click', () => {
        if (checkbox?.checked) {
            chrome.storage.local.set({ hasAgreedToPolicy: true }, () => {
                showToast("자동 생성 기능이 활성화되었습니다.", "success");
                setGenerationFeatureState(true);
                if (actualModal) actualModal.classList.remove('visible');
                document.body.style.overflow = ''; 
            });
        } else {
            showToast("주의사항을 읽고 확인란에 체크해주세요.", "warn");
        }
    });

    // initializeSharedUI는 이제 shared.js에서 제거된 단축어 관련 기능 없이 호출
    initializeSharedUI(uiContainer, {
        startGeneration: () => {
            if (window.NaiAuto.isGenerating) return;
            const numInput = uiContainer.querySelector('#num-to-generate');
            const num = parseInt(numInput.value, 10);
            if (isNaN(num) || num <= 0) {
                showToast("생성할 이미지 수를 1 이상으로 입력하세요.", "warn");
                numInput.focus();
                return;
            }
            if (num > 500) {
                showToast("한 번에 최대 500장까지 생성할 수 있습니다.", "warn");
                return;
            }
            window.NaiAuto.totalToGenerate = num;
            window.NaiAuto.generatedCount = 0;
            window.NaiAuto.setUIStateGenerating(true);
            addLogMessage(`${num}장 이미지 자동 생성을 시작합니다.`, "info");
            window.NaiAuto.startImageGenerationLoop();
        },
        stopGeneration: () => window.NaiAuto.stopImageGeneration(false),
        downloadImage: window.NaiAuto.downloadCurrentImage,
    });
    updateStatus("준비 완료.");
    addLogMessage("Nai-Auto UI가 성공적으로 삽입되었습니다.", "success");

    // 단축어 기능 활성화 (content.js 내에서 직접)
    injectShortcutUIAndListeners();
    // UI 주입 및 리스너 부착 후 단축어 목록을 즉시 렌더링
    if (typeof window.NaiAuto.renderShortcuts === 'function') {
        window.NaiAuto.renderShortcuts();
    }
    
    // UI가 로드된 후 초기 상태 설정 (버튼 활성화/비활성화)
    window.NaiAuto.setUIStateGenerating(false);
};

// 단축어 기능 관련 HTML 및 로직 (모두 content.js 내부에 정의)
function getShortcutUIHTML() {
    return `
        <div id="shortcuts-tab-content" class="tab-content">
            <h2 class="section-title">단축어 관리</h2>
            <div class="section">
                <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 10px;">
                    프롬프트 입력 시 축약어를 드래그하여 선택하면 전체 텍스트로 대치할 수 있습니다.
                    (예: <code>yunji -> pink pajama, curly hair, girl</code>)
                </p>
                <div class="shortcut-input-group">
                    <input type="text" id="shortcut-abbreviation" class="styled-input" placeholder="축약어 (예: yunji)" style="width: 40%;">
                    <span style="color: var(--text-secondary); margin: 0 5px;">-></span>
                    <input type="text" id="shortcut-fulltext" class="styled-input" placeholder="전체 텍스트 (예: pink pajama, curly hair, girl)" style="width: 55%;">
                    <button id="add-shortcut-btn" class="action-button small" style="margin-left: 5px; width: auto; flex-shrink: 0;">추가</button>
                </div>
            </div>
            <div class="section">
                <h2 class="section-title">저장된 단축어</h2>
                <div id="shortcut-list" class="log-output-area" style="min-height: 150px;"></div>
                <div style="margin-top: 10px; display: flex; gap: 10px;">
                    <button id="backup-shortcuts" class="action-button secondary" style="flex: 1;">단축어 백업</button>
                    <label for="restore-shortcuts-input" class="action-button secondary" style="flex: 1; margin: 0; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                        <span>단축어 복원</span>
                        <input type="file" id="restore-shortcuts-input" accept=".json" class="hidden-input">
                    </label>
                </div>
                <button id="clear-shortcuts" class="action-button secondary" style="margin-top: 10px;">모든 단축어 삭제</button>
            </div>
        </div>
    `;
}

// 단축어 데이터 관리 함수
async function loadShortcuts() {
    return new Promise(resolve => {
        chrome.storage.local.get({ shortcuts: [] }, (result) => {
            if (chrome.runtime.lastError) {
                addLogMessage(`단축어 로드 실패: ${chrome.runtime.lastError.message}`, 'error');
                resolve([]);
            } else {
                resolve(result.shortcuts);
            }
        });
    });
}

async function saveShortcuts(shortcuts) {
    return new Promise(resolve => {
        chrome.storage.local.set({ shortcuts: shortcuts }, () => {
            if (chrome.runtime.lastError) {
                addLogMessage(`단축어 저장 실패: ${chrome.runtime.lastError.message}`, 'error');
                showToast(`단축어 저장 실패: ${chrome.runtime.lastError.message}`, 'error');
                resolve(false);
            } else {
                addLogMessage('단축어가 저장되었습니다.', 'info');
                resolve(true);
            }
        });
    });
}

window.NaiAuto.renderShortcuts = function() {
    const shortcutList = uiContainer?.querySelector('#shortcut-list');
    if (!shortcutList) return;

    loadShortcuts().then(shortcuts => {
        shortcutList.innerHTML = '';
        if (shortcuts.length === 0) {
            shortcutList.innerHTML = `<div class="log-entry" style="text-align: center; padding: 20px; color: var(--text-secondary);">저장된 단축어가 없습니다.</div>`;
            return;
        }
        shortcuts.forEach((shortcut, index) => {
            const item = document.createElement('div');
            item.className = 'preview-item log-entry';
            const displayText = `${shortcut.abbreviation} -> ${shortcut.fullText.length > 50 ? shortcut.fullText.substring(0, 50) + '...' : shortcut.fullText}`;
            item.innerHTML = `<span class="file-info" title="${shortcut.abbreviation} -> ${shortcut.fullText}">${displayText}</span>`;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.title = '이 단축어 제거';
            deleteBtn.onclick = async (e) => {
                e.stopPropagation();
                if (window.confirm(`'${shortcut.abbreviation}' 단축어를 삭제하시겠습니까?`)) {
                    const currentShortcuts = await loadShortcuts();
                    const newShortcuts = currentShortcuts.filter((_, i) => i !== index);
                    await saveShortcuts(newShortcuts);
                    window.NaiAuto.renderShortcuts();
                    showToast(`'${shortcut.abbreviation}' 단축어가 삭제되었습니다.`, 'info');
                }
            };
            item.appendChild(deleteBtn);
            shortcutList.appendChild(item);
        });
    });
};

async function addShortcutEntry() {
    const abbrInput = document.getElementById('shortcut-abbreviation');
    const fullTextInput = document.getElementById('shortcut-fulltext');

    const abbreviation = abbrInput.value.trim();
    const fullText = fullTextInput.value.trim();

    if (!abbreviation || !fullText) {
        showToast('축약어와 전체 텍스트를 모두 입력해주세요.', 'warn');
        return;
    }

    let currentShortcuts = await loadShortcuts();
    const existingIndex = currentShortcuts.findIndex(s => s.abbreviation === abbreviation);

    if (existingIndex !== -1) {
        if (window.confirm(`'${abbreviation}' 단축어가 이미 존재합니다. 기존 단축어를 '${fullText}'(으)로 업데이트하시겠습니까?`)) {
            currentShortcuts[existingIndex].fullText = fullText;
            showToast(`'${abbreviation}' 단축어가 업데이트되었습니다.`, 'success');
        } else {
            return;
        }
    } else {
        currentShortcuts.push({ abbreviation, fullText });
        showToast(`'${abbreviation}' 단축어가 추가되었습니다.`, 'success');
    }
    
    await saveShortcuts(currentShortcuts);
    window.NaiAuto.renderShortcuts();
    abbrInput.value = '';
    fullTextInput.value = '';
}

async function backupShortcuts() {
    const shortcuts = await loadShortcuts();
    if (shortcuts.length === 0) {
        showToast('백업할 단축어가 없습니다.', 'warn');
        return;
    }
    const blob = new Blob([JSON.stringify(shortcuts, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nai-auto_shortcuts_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('단축어 백업이 완료되었습니다.', 'success');
    addLogMessage('단축어 백업이 완료되었습니다.', 'info');
}

async function restoreShortcuts(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/json') {
        showToast('JSON 파일만 복원할 수 있습니다.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const parsed = JSON.parse(e.target.result);
            if (!Array.isArray(parsed) || !parsed.every(s => typeof s.abbreviation === 'string' && typeof s.fullText === 'string')) {
                throw new Error('유효한 단축어 JSON 형식이 아닙니다.');
            }
            if (window.confirm('현재 단축어를 모두 삭제하고 새 데이터로 복원하시겠습니까? (취소 시 기존 데이터에 새 데이터를 추가합니다)')) {
                await saveShortcuts(parsed);
                showToast('단축어가 성공적으로 복원되었습니다 (덮어쓰기).', 'success');
                addLogMessage('단축어가 성공적으로 복원되었습니다 (덮어쓰기).', 'info');
            } else {
                let currentShortcuts = await loadShortcuts();
                const newShortcutsMap = new Map(currentShortcuts.map(s => [s.abbreviation, s.fullText]));
                parsed.forEach(s => newShortcutsMap.set(s.abbreviation, s.fullText));
                const mergedShortcuts = Array.from(newShortcutsMap, ([abbreviation, fullText]) => ({ abbreviation, fullText }));
                await saveShortcuts(mergedShortcuts);
                showToast('단축어가 기존 데이터에 추가되었습니다.', 'success');
                addLogMessage('단축어가 기존 데이터에 추가되었습니다.', 'info');
            }
            window.NaiAuto.renderShortcuts();
        } catch (error) {
            showToast(`단축어 복원 실패: ${error.message}`, 'error');
            addLogMessage(`단축어 복원 실패: ${error.message}`, 'error');
            console.error('단축어 복원 오류:', error);
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // 동일 파일 재선택을 위해 input 초기화
}

async function clearAllShortcuts() {
    if (window.confirm("정말로 모든 단축어를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
        await saveShortcuts([]);
        showToast('모든 단축어가 삭제되었습니다.', 'info');
        addLogMessage('모든 단축어가 삭제되었습니다.', 'warn');
        window.NaiAuto.renderShortcuts();
    }
}

/**
 * 선택 영역의 마지막 지점을 기준으로 Pill UI를 표시합니다.
 * @param {string} matchedAbbr 매칭된 축약어 (정규식으로 찾은 단어)
 * @param {string} fullText 대체될 전체 텍스트
 * @param {Selection} selectionObj 현재 Selection 객체 (DOM Range를 얻기 위함)
 * @param {number} startOffsetInTarget targetElement 내에서 대체될 부분의 시작 오프셋
 * @param {number} endOffsetInTarget targetElement 내에서 대체될 부분의 끝 오프셋
 * @param {Element} targetInputElem 실제 텍스트가 입력된 input/textarea/contenteditable 요소
 */
function showShortcutPill(matchedAbbr, fullText, selectionObj, startOffsetInTarget, endOffsetInTarget, targetInputElem) {
    if (!window.shortcutPillElement) {
        console.error("Shortcut pill element is not initialized in content.js!");
        return;
    }
    hideShortcutPill(); // 기존 필 숨기기

    currentShortcutMatchInfo = {
        matchedAbbr: matchedAbbr,
        fullText: fullText,
        startOffsetInTarget: startOffsetInTarget,
        endOffsetInTarget: endOffsetInTarget
    };
    currentInputTarget = targetInputElem;

    const displayFullText = fullText.length > 50 ? fullText.substring(0, 50) + '...' : fullText;
    window.shortcutPillElement.innerHTML = `
        <span class="pill-text">${matchedAbbr} → ${displayFullText}</span>
        <button class="pill-btn accept-btn" title="Tab 키로 대치">대치</button>
        <button class="pill-btn dismiss-btn" title="Esc 키로 무시">무시</button>
    `;

    const range = selectionObj.getRangeAt(0);
    const rangeRect = range.getBoundingClientRect();
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    // Pill의 최대 크기를 가정 (CSS에서 정의된 visible 상태의 max-width, max-height)
    const pillWidthLimit = 280; 
    const pillHeightLimit = 150; 

    let finalX = rangeRect.right; 
    let finalY = rangeRect.bottom + 10; 

    // X축 경계 처리
    if (finalX + pillWidthLimit > viewportWidth - 20) { 
        finalX = viewportWidth - pillWidthLimit - 20;
    }
    if (finalX < 20) { 
        finalX = 20;
    }

    // Y축 경계 처리
    if (finalY + pillHeightLimit > viewportHeight - 20) {
        finalY = rangeRect.top - pillHeightLimit - 10; 
        if (finalY < 20) { 
            finalY = (viewportHeight - pillHeightLimit) / 2; 
        }
    }

    window.shortcutPillElement.style.left = `${finalX}px`;
    window.shortcutPillElement.style.top = `${finalY}px`;
    window.shortcutPillElement.classList.add('visible');

    const acceptBtn = window.shortcutPillElement.querySelector('.accept-btn');
    const dismissBtn = window.shortcutPillElement.querySelector('.dismiss-btn');

    acceptBtn?.addEventListener('click', replaceShortcutText, { once: true });
    dismissBtn?.addEventListener('click', hideShortcutPill, { once: true });
}

function hideShortcutPill() {
    if (window.shortcutPillElement) {
        window.shortcutPillElement.classList.remove('visible');
        window.shortcutPillElement.innerHTML = ''; 
    }
    currentInputTarget = null;
    currentShortcutMatchInfo = null;
}

function replaceShortcutText() {
    if (!currentInputTarget || !currentShortcutMatchInfo) return;

    const { fullText, startOffsetInTarget, endOffsetInTarget } = currentShortcutMatchInfo;
    
    const selection = window.getSelection();
    const originalRange = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    if (currentInputTarget.tagName === 'INPUT' || currentInputTarget.tagName === 'TEXTAREA') {
        const currentValue = currentInputTarget.value;
        const newText = currentValue.substring(0, startOffsetInTarget) + fullText + currentValue.substring(endOffsetInTarget);
        currentInputTarget.value = newText;
        
        const newCursorPos = startOffsetInTarget + fullText.length;
        currentInputTarget.setSelectionRange(newCursorPos, newCursorPos);

        const event = new Event('input', { bubbles: true });
        currentInputTarget.dispatchEvent(event);

    } else if (currentInputTarget.isContentEditable) {
        if (!originalRange) {
            hideShortcutPill();
            return;
        }

        const newRange = document.createRange();
        
        function findNodeAndOffset(element, offset) {
            let currentOffset = 0;
            for (const node of element.childNodes) {
                if (node.nodeType === Node.TEXT_NODE) {
                    const nodeLength = node.nodeValue.length;
                    if (offset <= currentOffset + nodeLength) {
                        return { node: node, offset: offset - currentOffset };
                    }
                    currentOffset += nodeLength;
                } else if (node.nodeType === Node.ELEMENT_NODE && node.isContentEditable) {
                    const nestedResult = findNodeAndOffset(node, offset - currentOffset);
                    if (nestedResult) return nestedResult;
                    currentOffset += node.textContent.length;
                }
            }
            return null;
        }

        const startPos = findNodeAndOffset(currentInputTarget, startOffsetInTarget);
        const endPos = findNodeAndOffset(currentInputTarget, endOffsetInTarget);
        
        if (!startPos || !endPos) {
            console.error("Failed to find exact text nodes for replacement in contenteditable.", {startOffsetInTarget, endOffsetInTarget, currentInputTarget});
            hideShortcutPill();
            return;
        }

        newRange.setStart(startPos.node, startPos.offset);
        newRange.setEnd(endPos.node, endPos.offset);
        
        newRange.deleteContents();
        newRange.insertNode(document.createTextNode(fullText));

        const newCursorNode = newRange.endContainer;
        const newCursorOffset = newRange.endOffset;
        selection.removeAllRanges();
        selection.addRange(newRange);

        const event = new Event('input', { bubbles: true });
        currentInputTarget.dispatchEvent(event);
    }

    hideShortcutPill();
}


// 단축어 UI 삽입 및 이벤트 리스너 부착
function injectShortcutUIAndListeners() {
    const tabButtonsContainer = uiContainer.querySelector('.tab-buttons');
    const shortcutsTabContent = uiContainer.querySelector('#shortcuts-tab-content');

    if (tabButtonsContainer && shortcutsTabContent) {
        if (shortcutsTabContent.innerHTML.trim() === '') {
            shortcutsTabContent.innerHTML = getShortcutUIHTML();
        }
    }
    
    document.getElementById('add-shortcut-btn')?.addEventListener('click', addShortcutEntry);
    document.getElementById('backup-shortcuts')?.addEventListener('click', backupShortcuts);
    document.getElementById('restore-shortcuts-input')?.addEventListener('change', restoreShortcuts);
    document.getElementById('clear-shortcuts')?.addEventListener('click', clearAllShortcuts);

    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('keydown', handleGlobalKeydown);

    addLogMessage("단축어 UI 및 리스너가 성공적으로 삽입되었습니다.", "info");
}

/**
 * 주어진 요소가 NovelAI 프롬프트 입력 필드에 해당하는지 확인합니다.
 * @param {Node} node 확인할 DOM 노드 (Element 또는 TextNode)
 * @returns {boolean} NovelAI 프롬프트 입력 필드이면 true, 아니면 false
 */
function isNovelAIPromptField(node) {
    if (!node) return false;

    let element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!element) return false;

    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.isContentEditable) {
        return true;
    }

    for (const selector of PROMPT_INPUT_SELECTORS) {
        if (element.closest(selector)) { 
            return true;
        }
    }
    return false;
}

/**
 * 텍스트 선택이 완료되었을 때 호출되는 함수.
 * 선택된 텍스트 내에서 단축어를 유연하게 감지하고 Pill UI를 표시합니다.
 * @param {MouseEvent} event
 */
async function handleTextSelection(event) {
    if (event.buttons !== 0) {
        return; 
    }

    const selection = window.getSelection();
    if (selection.isCollapsed || selection.rangeCount === 0) {
        hideShortcutPill(); 
        return;
    }

    const selectedText = selection.toString();
    const range = selection.getRangeAt(0);
    let targetElement = range.commonAncestorContainer;

    if (targetElement.nodeType === Node.TEXT_NODE) {
        targetElement = targetElement.parentElement;
    }

    if (!isNovelAIPromptField(targetElement)) {
        hideShortcutPill(); 
        return;
    }

    const shortcuts = await loadShortcuts();
    let bestMatch = null;

    const fullContent = (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA') ? targetElement.value : targetElement.textContent;

    let selectionStartOffsetInFullContent = -1;
    let selectionEndOffsetInFullContent = -1;

    if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA') {
        selectionStartOffsetInFullContent = targetElement.selectionStart;
        selectionEndOffsetInFullContent = targetElement.selectionEnd;
    } else if (targetElement.isContentEditable) {
        const preSelectionRange = range.cloneRange();
        preSelectionRange.selectNodeContents(targetElement);
        preSelectionRange.setEnd(range.startContainer, range.startOffset);
        selectionStartOffsetInFullContent = preSelectionRange.toString().length;
        selectionEndOffsetInFullContent = selectionStartOffsetInFullContent + selectedText.length;
    }

    if (selectionStartOffsetInFullContent === -1 || selectionEndOffsetInFullContent === -1) {
        hideShortcutPill();
        return;
    }

    for (const shortcut of shortcuts) {
        const escapedAbbr = shortcut.abbreviation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(^|[\\s,]|^)${escapedAbbr}([\\s,]|$)`, 'i');
        
        const contentSearchAreaStart = Math.max(0, selectionStartOffsetInFullContent - 20);
        const contentSearchAreaEnd = Math.min(fullContent.length, selectionEndOffsetInFullContent + 20);
        const contentAroundSelection = fullContent.substring(contentSearchAreaStart, contentSearchAreaEnd);
        const offsetInContentAroundSelection = contentSearchAreaStart;

        let match;
        while ((match = regex.exec(contentAroundSelection)) !== null) {
            const matchedAbbrInContentAround = match[2];
            const matchStartIndexInContentAround = match.index + match[1].length;
            const matchEndIndexInContentAround = matchStartIndexInContentAround + matchedAbbrInContentAround.length;

            const matchStartIndexInFullContent = offsetInContentAroundSelection + matchStartIndexInContentAround;
            const matchEndIndexInFullContent = offsetInContentAroundSelection + matchEndIndexInContentAround;
            
            const relativeIndexInSelectedText = selectedText.toLowerCase().indexOf(shortcut.abbreviation.toLowerCase());
            
            if (relativeIndexInSelectedText !== -1) {
                const abbrStartInSelected = selectionStartOffsetInFullContent + relativeIndexInSelectedText;
                const abbrEndInSelected = abbrStartInSelected + shortcut.abbreviation.length;

                if (abbrStartInSelected >= selectionStartOffsetInFullContent && abbrEndInSelected <= selectionEndOffsetInFullContent) {
                    bestMatch = {
                        abbreviation: shortcut.abbreviation,
                        fullText: shortcut.fullText,
                        startOffsetInTarget: abbrStartInSelected,
                        endOffsetInTarget: abbrEndInSelected
                    };
                    break;
                }
            }
        }
        if (bestMatch) break;
    }

    if (bestMatch) {
        showShortcutPill(
            bestMatch.abbreviation,
            bestMatch.fullText,
            selection, 
            bestMatch.startOffsetInTarget,
            bestMatch.endOffsetInTarget,
            targetElement 
        );
    } else {
        hideShortcutPill();
    }
}


/**
 * 전역 키다운 이벤트 핸들러. Tab/Esc 키를 감지하여 Pill UI를 제어합니다.
 * @param {KeyboardEvent} event
 */
function handleGlobalKeydown(event) {
    if (window.shortcutPillElement && window.shortcutPillElement.classList.contains('visible')) {
        if (event.key === 'Tab') {
            event.preventDefault(); 
            replaceShortcutText(); 
        } else if (event.key === 'Escape') {
            event.preventDefault(); 
            hideShortcutPill(); 
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.NaiAuto.injectUI);
} else {
    window.NaiAuto.injectUI();
}