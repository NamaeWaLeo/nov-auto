// shared.js

let uiRoot; // 메인 UI 컨테이너 (드래그 가능한 창) 참조

function getDisclaimerModalHTML() {
    const icons = { // 아이콘은 모달 내에서도 사용될 수 있으므로 전역 또는 상위 함수에서 정의
        unlock: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-6 9c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-9H9V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2z"/></svg>`
    };
    return `
        <div id="disclaimer-modal" class="modal-overlay">
            <div class="modal-content">
                <h2 class="modal-title">⚠️ 자동 생성 기능 사용 전 주의사항</h2>
                <div class="modal-text" style="text-align: left; max-height: 300px; overflow-y: auto; padding-right: 10px;">
                    <p>자동 생성 기능은 NovelAI 서버에 자동적으로 이미지 생성 요청을 보내는 스크립트입니다. 이러한 자동화된 접근은 NovelAI 서비스 약관(Terms of Service)에 위배될 수 있습니다.</p>
                    <p>NovelAI 약관(<a href="https://novelai.net/terms" target="_blank">https://novelai.net/terms</a>)에는 다음과 같은 내용이 포함될 수 있습니다:</p>
                    <blockquote style="font-size: 0.85em; border-left: 3px solid var(--accent-color); padding-left: 10px; margin: 10px 0; color: var(--text-secondary);">
                        "Unless expressively allowed and agreed, you may not use of botnets or automated systems in the Services that disrespect the limitations provided by our Service or otherwise place excessive strain on our Services;"
                    </blockquote>
                    <p>위 조항은 "명시적으로 허용되거나 합의되지 않은 한, 서비스에서 제공하는 제한을 무시하거나 서비스에 과도한 부담을 주는 봇넷이나 자동화된 시스템을 사용할 수 없습니다"는 의미입니다.</p>
                    <p>기본 설정은 1초의 대기시간을 가지고 버튼을 누르고, 이미지를 다운로드 받고 다시 버튼을 누르는 과정만을 자동화 하므로, 비정상적으로 빠르게 요청을 보내는 행위는 아닙니다. 그러나, 규정에 따라 정지를 당할 수도 있기에 사전 고지합니다.</p>
                    <p>이 기능을 사용할 경우, 사용자의 계정은 일시적 또는 영구적으로 정지될 위험이 있습니다. 이 확장 프로그램의 개발자는 기능 사용으로 인해 발생하는 어떠한 불이익에 대해서도 책임을 지지 않습니다.</p>
                </div>
                <label class="checkbox-item" style="margin-top: 15px;">
                    <input type="checkbox" id="disclaimer-checkbox" class="styled-checkbox">
                    <span>위 내용을 모두 이해했으며, 모든 위험을 감수하고 기능을 사용하겠습니다.</span>
                </label>
                <div class="modal-actions">
                    <button id="disclaimer-agree-btn" class="action-button">동의 및 활성화</button>
                    <button id="disclaimer-cancel-btn" class="action-button secondary">취소</button>
                </div>
            </div>
        </div>
    `;
}

function getSharedUIHTML(config = { isConverter: false, isGenerator: false, showHeader: true, excludeDisclaimerModal: false }) {
    const icons = {
        play: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M8 5v14l11-7L8 5z"/></svg>`,
        stop: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M6 6h12v12H6V6z"/></svg>`,
        download: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`,
        unlock: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-6 9c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-9H9V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2z"/></svg>`,
        magic: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M20.5 11.5c-1.74 0-3.48-.36-5.2-.88-.93-.28-1.77-.73-2.52-1.34-.14-.11-.26-.23-.37-.36L9 4.38C7.56 2.71 5.34 2 3 2c-.55 0-1 .45-1 1v2c0 .55.45 1 1 1h.14c1.12 0 2.18.25 3.16.7L9 9.38c.67.63 1.46 1.16 2.37 1.63.7.36 1.43.64 2.16.85 1.5.42 3.06.64 4.67.64 2.82 0 5.11-.99 6-2.73 0-.01.01-.02.01-.03.07-.15.13-.3.18-.46.02-.07.03-.13.04-.2l.01-.09c.01-.06.01-.11.02-.16v-.06c.01-.09.01-.18.01-.26 0-.55-.45-1-1-1h-2c-.55 0-1 .45-1 1v.09c0 .02-.01.04-.01.06-.01.07-.03.14-.04.2-.04.14-.09.28-.15.42-.01.03-.01.06-.02.09-.59 1.13-2.14 1.83-4.14 1.83zM15.5 16.5c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM12 11c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-3.5 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>`
    };

    return `
        ${config.showHeader ? `
        <div class="window-header">
            <div class="controls"><div class="control-btn" id="close-minimize-btn" title="최소화/복원"></div></div>
            <h1 class="title">Nai-Auto</h1>
        </div>
        ` : ''}

        <div class="window-content">
            <div class="tab-buttons">
                <button class="tab-button active" data-tab="main">메인</button>
                ${config.isConverter ? `<button class="tab-button" data-tab="img2tag">Img2Tag</button>` : ''}
                ${config.isGenerator ? `<button class="tab-button" data-tab="shortcuts">대치</button>` : ''} 
                <button class="tab-button" data-tab="history">내역</button>
                <button class="tab-button" data-tab="settings">설정</button>
                <button class="tab-button" data-tab="log">로그</button>
            </div>

            <div id="tab-content-wrapper">
                <div id="main-tab-content" class="tab-content active">
                    ${config.isGenerator ? `
                    <div class="section">
                        <h2 class="section-title">자동 생성</h2>
                        <div id="generation-section-wrapper" style="margin-bottom: 10px;">
                            <input type="number" id="num-to-generate" value="10" min="1" class="styled-input" placeholder="뽑을 이미지 수">
                            <button id="start-generation" class="action-button" style="margin-top: 10px;">
                                ${icons.play}
                                <span>생성 시작</span>
                            </button>
                            <button id="stop-generation" class="action-button" style="display:none; margin-top: 10px;">
                                ${icons.stop}
                                <span>생성 중지</span>
                            </button>
                            <div id="generation-disclaimer-overlay" class="hidden">
                                <p>이 기능은 사용 전 동의가 필요합니다.</p>
                                <button id="show-disclaimer-btn" class="action-button small">
                                    ${icons.unlock}
                                    <span>주의사항 확인 및 기능 활성화</span>
                                </button>
                            </div>
                        </div>
                        <button id="download-image" class="action-button">
                            ${icons.download}
                            <span>현재 이미지 다운로드</span>
                        </button>
                    </div>
                    <div id="progress-container" style="display: none;">
                        <progress id="generation-progress" max="100" value="0"></progress>
                    </div>
                    <div id="status-bar">준비 완료.</div>
                    ` : ''}

                    ${config.isConverter ? `
                    <div class="section file-upload-area" id="file-selection">
                        <h2 class="section-title">이미지 다중 변환</h2>
                        <label for="local-image-input" class="file-upload-label">이미지 파일(들) 선택</label>
                        <input type="file" id="local-image-input" accept="image/*" class="hidden-input" multiple>
                        <div id="preview-list"></div>
                    </div>
                    <button id="process-and-download" class="action-button">변환 및 다운로드</button>
                    ` : ''}
                </div>

                ${config.isConverter ? `
                <div id="img2tag-tab-content" class="tab-content">
                    <h2 class="section-title">이미지 프롬프트 추출 (Img2Tag)</h2>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 10px;">
                        선택된 이미지를 AI 모델이 분석하여 프롬프트를 생성합니다.
                    </p>
                    <div class="file-upload-area" style="margin-bottom: 10px;">
                        <label for="img2tag-image-input" class="file-upload-label">분석할 이미지 선택 (단일)</label>
                        <input type="file" id="img2tag-image-input" accept="image/*" class="hidden-input">
                        <img id="img2tag-preview" style="display: none;">
                    </div>
                    <button id="interrogate-image" class="action-button" style="margin-bottom: 15px;">
                        ${icons.magic}
                        <span>프롬프트 분석 시작</span>
                    </button>

                    <details class="settings-fieldset grid-span-all" data-setting-key="api-provider-settings">
                        <summary><h2 class="section-title">API 제공자 선택</h2></summary>
                        <div>
                            <div class="radio-group-horizontal" style="margin-bottom: 10px;">
                                <label class="radio-label">
                                    <input type="radio" name="api-provider" value="gemini" class="styled-radio">
                                    <span>Google Gemini</span>
                                </label>
                                <label class="radio-label">
                                    <input type="radio" name="api-provider" value="openai" class="styled-radio">
                                    <span>OpenAI ChatGPT</span>
                                </label>
                            </div>
                            
                            <div id="model-selection-gemini" style="margin-bottom: 10px; display: none;">
                                <h3 class="section-title" style="font-size: 0.9rem; margin-top: 5px;">Gemini 모델 선택:</h3>
                                <div class="radio-group-horizontal">
                                    <label class="radio-label sub-option">
                                        <input type="radio" name="gemini-model" value="gemini-2.0-flash" class="styled-radio">
                                        <span>Gemini 2.0 Flash</span>
                                    </label>
                                    <label class="radio-label sub-option">
                                        <input type="radio" name="gemini-model" value="gemini-1.5-flash" class="styled-radio">
                                        <span>Gemini 1.5 Flash</span>
                                    </label>
                                </div>
                            </div>

                            <div id="model-selection-openai" style="margin-bottom: 10px; display: none;">
                                <h3 class="section-title" style="font-size: 0.9rem; margin-top: 5px;">OpenAI 모델 선택:</h3>
                                <div class="radio-group-horizontal">
                                    <label class="radio-label sub-option">
                                        <input type="radio" name="openai-model" value="gpt-4o" class="styled-radio">
                                        <span>GPT-4o</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </details>

                    <div class="prompt-output-group">
                        <label class="prompt-label">NovelAI 형식:</label>
                        <textarea id="novelai-output" class="styled-input" rows="3" readonly></textarea>
                    </div>
                    <div class="prompt-output-group" style="margin-top: 10px;">
                        <label class="prompt-label">Stable Diffusion/PixAI 형식:</label>
                        <textarea id="sd-pixai-output" class="styled-input" rows="3" readonly></textarea>
                    </div>
                </div>
                ` : ''}

                <div id="shortcuts-tab-content" class="tab-content"></div>

                <div id="history-tab-content" class="tab-content">
                    <h2 class="section-title">작업 내역 (최근 50개)</h2>
                    <div id="history-list" class="log-output-area" style="min-height: 200px;"></div>
                    <button id="clear-history" class="action-button secondary" style="margin-top: 10px;">내역 전체 삭제</button>
                </div>

                <div id="settings-tab-content" class="tab-content">
                    <details class="settings-fieldset grid-span-all" data-setting-key="download-settings">
                        <summary><h2 class="section-title">다운로드 설정</h2></summary>
                        <div>
                            <label class="checkbox-item">
                                <input type="checkbox" id="remove-metadata" class="styled-checkbox">
                                <span>다운로드 시 메타데이터 제거</span>
                            </label>
                            <div>
                                <label for="filename-template-container" style="display: block; margin-top:10px; margin-bottom: 5px;">파일명 템플릿:</label>
                                <div id="filename-template-container" class="filename-template-pill-container">
                                    <span class="template-placeholder-text">여기에 템플릿 요소를 드래그하거나 아래 버튼을 클릭하세요.</span>
                                </div>
                                <div class="available-templates">
                                    <button class="template-add-button" data-template-value="{prefix}">접두사</button>
                                    <button class="template-add-button" data-template-value="{prompt}">프롬프트</button>
                                    <button class="template-add-button" data-template-value="{timestamp}">시간</button>
                                    <button class="template-add-button" data-template-value="{original}">원본파일명</button>
                                    <button class="template-add-button" data-template-value="_">_(언더바)</button>
                                    <button class="template-add-button" data-template-value="-">-(하이픈)</button>
                                </div>
                            </div>
                            <div style="margin-top:10px;">
                                <label for="filename-prefix" style="display: block; margin-bottom: 5px;">파일 이름 접두사:</label>
                                <input type="text" id="filename-prefix" placeholder="예: my_char_" class="styled-input">
                            </div>
                            <div style="margin-top:10px;">
                                <label for="download-subfolder" style="display: block; margin-bottom: 5px;">다운로드 하위 폴더:</label>
                                <input type="text" id="download-subfolder" placeholder="예: NovelAI/Images" class="styled-input">
                                <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 5px;">
                                    (필수 아님) 지정된 경우, 브라우저 다운로드 폴더 내에 이 경로로 저장됩니다.
                                </p>
                            </div>
                            <div class="settings-grid" style="margin-top:10px; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                                <fieldset>
                                    <label for="image-format-select" style="display: block; margin-bottom: 5px;">출력 포맷:</label>
                                    <select id="image-format-select" class="styled-select">
                                        <option value="png">PNG</option>
                                        <option value="webp">WEBP</option>
                                        <option value="jpeg">JPEG</option>
                                    </select>
                                </fieldset>
                                <fieldset id="quality-fieldset" style="display: none;">
                                    <label for="image-quality-select" style="display: block; margin-bottom: 5px;">이미지 품질:</label>
                                    <select id="image-quality-select" class="styled-select">
                                        <option value="quality">최고</option>
                                        <option value="normal">보통</option>
                                        <option value="low">낮은</option>
                                    </select>
                                </fieldset>
                            </div>
                        </div>
                    </details>

                    ${config.isGenerator ? `
                    <details class="settings-fieldset grid-span-all" data-setting-key="generator-settings">
                        <summary><h2 class="section-title">생성 설정</h2></summary>
                        <div>
                            <label class="checkbox-item">
                                <input type="checkbox" id="auto-download-enabled" class="styled-checkbox">
                                <span>자동 생성 시 자동 다운로드</span>
                            </label>
                            <div style="margin-top: 10px;">
                                <label for="generation-interval" style="display: block; margin-bottom: 5px;">생성 간격 (ms):</label>
                                <input type="number" id="generation-interval" value="1000" min="100" class="styled-input">
                            </div>
                        </div>
                    </details>
                    ` : ''}
                    
                    ${config.isConverter ? `
                    <details class="settings-fieldset grid-span-all" data-setting-key="api-keys-settings">
                        <summary><h2 class="section-title">API 설정 (Img2Tag)</h2></summary>
                        <div>
                            <div id="gemini-api-section">
                                <label for="gemini-api-key" style="display: block; margin-bottom: 5px;">Gemini API 키:</label>
                                <input type="password" id="gemini-api-key" class="styled-input" placeholder="Gemini API 키를 입력하세요">
                            </div>
                            <div id="openai-api-section" style="display: none;">
                                <label for="openai-api-key" style="display: block; margin-bottom: 5px;">OpenAI API 키:</label>
                                <input type="password" id="openai-api-key" class="styled-input" placeholder="OpenAI API 키를 입력하세요">
                            </div>
                            <button id="save-api-keys" class="action-button" style="margin-top: 10px;">API 키 저장</button>
                        </div>
                    </details>
                    ` : ''}
                    
                    <details class="settings-fieldset grid-span-all" data-setting-key="ui-settings">
                        <summary><h2 class="section-title">UI 설정</h2></summary>
                        <div>
                            <div style="margin-top: 10px;">
                                <label for="ui-scale-select" style="display: block; margin-bottom: 5px;">UI 배율 조정:</label>
                                <select id="ui-scale-select" class="styled-select">
                                    <option value="70%">70%</option>
                                    <option value="85%">85%</option>
                                    <option value="100%">100% (기본값)</option>
                                    <option value="115%">115%</option>
                                    <option value="130%">130%</option>
                                </select>
                            </div>
                        </div>
                    </details>

                    <details class="settings-fieldset grid-span-all" data-setting-key="data-reset-settings">
                        <summary><h2 class="section-title" style="color: var(--stop-color);">데이터 초기화 (주의)</h2></summary>
                        <div>
                            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 10px;">
                                모든 설정, 작업 내역, API 키, 동의 여부가 영구적으로 삭제됩니다.
                            </p>
                            <button id="reset-all-data" class="action-button" style="background-color: var(--stop-color);">모든 설정과 기록 초기화</button>
                        </div>
                    </details>
                    <p class="footer-credit">Made with ♥️ by _Leo (yvelta1), 3.0.0 Beta</p>
                </div>

                <div id="log-tab-content" class="tab-content">
                    <h2 class="section-title">상세 로그</h2>
                    <div id="log-output-area" class="log-output-area"></div>
                </div>
            </div>
        </div>
        `;
}

/**
 * 토스트 메시지를 표시하고 업데이트합니다.
 * @param {string} message 표시할 메시지
 * @param {string} type 메시지 유형 ('info', 'success', 'error', 'warn')
 * @param {number} duration 메시지 표시 시간 (ms). 0으로 설정하면 자동 사라지지 않음.
 */
function showToast(message, type = 'info', duration = 3000) {
    let toastContainer = document.getElementById('nai-auto-toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'nai-auto-toast-container';
        toastContainer.className = 'nai-auto-toast-container';
        document.body.appendChild(toastContainer);
    }

    let toast = document.getElementById('nai-auto-single-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'nai-auto-single-toast'; // 단일 토스트를 위한 고유 ID
        toast.className = `toast`; // 초기 클래스
        toastContainer.appendChild(toast);
    }

    // 기존 타이머 클리어
    if (toast.dataset.hideTimeout) {
        clearTimeout(parseInt(toast.dataset.hideTimeout));
    }
    
    // 클래스 초기화 및 새 타입 적용
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    // 토스트를 즉시 보이게 설정
    toastContainer.style.transition = 'none'; // 기존 트랜지션 초기화
    toastContainer.style.opacity = '0';
    toastContainer.style.transform = 'translateX(-50%) translateY(-25px) scale(0.9)'; // 초기 숨김 위치
    void toastContainer.offsetHeight; // Reflow 강제
    
    // 애니메이션 시작
    toastContainer.style.transition = 'transform 0.4s cubic-bezier(0.2, 1, 0.3, 1), opacity 0.4s ease';
    toastContainer.style.opacity = '1';
    toastContainer.style.transform = 'translateX(-50%) translateY(0) scale(1)'; // 최종 위치 및 크기

    // 자동 숨김 설정 (duration이 0이 아니면)
    if (duration > 0) {
        const hideTimeout = setTimeout(() => {
            toastContainer.style.opacity = '0';
            toastContainer.style.transform = 'translateX(-50%) translateY(-25px) scale(0.9)'; // 숨김 애니메이션

            toastContainer.addEventListener('transitionend', function handler() {
                // 토스트 컨테이너가 숨겨진 후에 자식 요소들을 제거 (단일 토스트이므로 하나만 제거)
                while (toastContainer.firstChild) {
                    toastContainer.removeChild(toastContainer.firstChild);
                }
                toastContainer.remove(); // 컨테이너 자체도 제거
                toastContainer.removeEventListener('transitionend', handler);
            }, { once: true });
        }, duration);
        toast.dataset.hideTimeout = hideTimeout.toString(); // 타이머 ID 저장
    }
}

function updateStatus(message) {
    const statusBar = uiRoot?.querySelector('#status-bar');
    if (statusBar) {
        statusBar.textContent = message;
    }
}

function updateProgress(current, total) {
    const progressBar = uiRoot?.querySelector('#generation-progress');
    const progressContainer = uiRoot?.querySelector('#progress-container');
    if (progressBar && progressContainer) {
        progressContainer.style.display = total > 0 ? 'block' : 'none';
        progressBar.value = current;
        progressBar.max = total;
    }
}

function addLogMessage(message, type = 'info') {
    const logOutputArea = uiRoot?.querySelector('#log-output-area');
    if (logOutputArea) {
        const timestamp = new Date().toLocaleTimeString('en-GB');
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        logEntry.textContent = `[${timestamp}] ${message}`;
        logOutputArea.appendChild(logEntry);
        logOutputArea.scrollTop = logOutputArea.scrollHeight;
    }
}

function updateConditionalSettingsUI() {
    if (!uiRoot) return;
    const qualityFieldset = uiRoot.querySelector('#quality-fieldset');
    const selectedFormat = uiRoot.querySelector('#image-format-select')?.value;
    if (qualityFieldset) {
        const showQuality = (selectedFormat === 'jpeg' || selectedFormat === 'webp');
        qualityFieldset.style.display = showQuality ? 'block' : 'none';
    }

    // API 섹션 토글 로직 추가
    const geminiApiSection = uiRoot.querySelector('#gemini-api-section');
    const openaiApiSection = uiRoot.querySelector('#openai-api-section');
    const geminiModelSection = uiRoot.querySelector('#model-selection-gemini');
    const openaiModelSection = uiRoot.querySelector('#model-selection-openai');

    const selectedProvider = uiRoot.querySelector('input[name="api-provider"]:checked')?.value;

    if (geminiApiSection) geminiApiSection.style.display = (selectedProvider === 'gemini' || !selectedProvider) ? 'block' : 'none';
    if (openaiApiSection) openaiApiSection.style.display = (selectedProvider === 'openai') ? 'block' : 'none';
    if (geminiModelSection) geminiModelSection.style.display = (selectedProvider === 'gemini' || !selectedProvider) ? 'block' : 'none';
    if (openaiModelSection) openaiModelSection.style.display = (selectedProvider === 'openai') ? 'block' : 'none';
}

const SETTINGS_CONFIG = {
    removeMetadata: { selector: '#remove-metadata', type: 'checkbox', default: true },
    filenamePrefix: { selector: '#filename-prefix', type: 'text', default: "" },
    // filenameTemplate은 이제 배열로 저장됩니다. selector는 더 이상 텍스트 입력 필드가 아닙니다.
    filenameTemplate: { type: 'array', default: [] }, 
    downloadSubfolder: { selector: '#download-subfolder', type: 'text', default: "NaiAutoDownloads" },
    imageFormat: { selector: '#image-format-select', type: 'select', default: 'jpeg' },
    imageQualityPreference: { selector: '#image-quality-select', type: 'select', default: 'quality' },
    uiScale: { selector: '#ui-scale-select', type: 'select', default: '100%' },
    generationInterval: { selector: '#generation-interval', type: 'number', default: 1000 },
    autoDownloadEnabled: { selector: '#auto-download-enabled', type: 'checkbox', default: true },
    apiProvider: { selector: 'input[name="api-provider"]', type: 'radio', default: 'gemini'},
    geminiApiKey: { selector: '#gemini-api-key', type: 'password', default: '' },
    openaiApiKey: { selector: '#openai-api-key', type: 'password', default: ''},
    geminiModel: { selector: 'input[name="gemini-model"]', type: 'radio', default: 'gemini-1.5-flash' },
    openaiModel: { selector: 'input[name="openai-model"]', type: 'radio', default: 'gpt-4o' },
};

function saveSettings(specificSettings = {}) {
    let settingsToStore = {};
    if (Object.keys(specificSettings).length > 0) {
        settingsToStore = specificSettings;
    } else {
        for (const key in SETTINGS_CONFIG) {
            const config = SETTINGS_CONFIG[key];
            if (!uiRoot) continue;

            if (key === 'filenameTemplate') {
                // filenameTemplate은 Pill 요소에서 직접 가져와 배열로 저장
                const templatePills = Array.from(uiRoot.querySelectorAll('#filename-template-container .template-pill'));
                settingsToStore[key] = templatePills.map(pill => pill.dataset.value);
                continue; // 다음 설정으로 넘어감
            }

            const name = key.replace(/([A-Z])/g, "-$1").toLowerCase();
            if (config.type === 'radio') {
                const checkedRadio = uiRoot.querySelector(`input[name="${name}"]:checked`);
                if (checkedRadio) {
                    settingsToStore[key] = checkedRadio.value;
                }
            } else {
                const element = uiRoot.querySelector(config.selector);
                if (element) {
                    switch (config.type) {
                        case 'checkbox':
                            settingsToStore[key] = element.checked;
                            break;
                        case 'number':
                            settingsToStore[key] = parseInt(element.value) || config.default;
                            break;
                        default:
                            settingsToStore[key] = element.value;
                            break;
                    }
                }
            }
        }
    }
    chrome.storage.local.set(settingsToStore, () => {
        if (chrome.runtime.lastError) {
            addLogMessage(`설정 저장 실패: ${chrome.runtime.lastError.message}`, 'error');
            showToast(`설정 저장 실패: ${chrome.runtime.lastError.message}`, 'error');
        } else if (Object.keys(specificSettings).length === 0) {
            addLogMessage('설정이 저장되었습니다.', 'info');
            const isScaleSelectActive = document.activeElement && document.activeElement.id === 'ui-scale-select';
            // 파일명 템플릿 변경 시에도 토스트 메시지 표시
            const isFilenameTemplateChange = Object.keys(specificSettings).includes('filenameTemplate');
            if (!isScaleSelectActive || isFilenameTemplateChange) {
                showToast("설정이 저장되었습니다.", "success");
            }
        }
    });
}


function loadSettings() {
    const settingKeys = Object.keys(SETTINGS_CONFIG);
    chrome.storage.local.get(settingKeys, (result) => {
        if (chrome.runtime.lastError) {
            return addLogMessage(`설정 로드 실패: ${chrome.runtime.lastError.message}`, "error");
        }
        for (const key of settingKeys) {
            const config = SETTINGS_CONFIG[key];
            const value = result[key] ?? config.default;
            if (!uiRoot) continue;
            
            if (key === 'filenameTemplate') {
                renderFilenameTemplatePills(value); // filenameTemplate은 별도 렌더링 함수 호출
                continue;
            }

            const name = key.replace(/([A-Z])/g, "-$1").toLowerCase();
            if (config.type === 'radio') {
                const radioToSelect = uiRoot.querySelector(`input[name="${name}"][value="${value}"]`);
                if (radioToSelect) {
                    radioToSelect.checked = true;
                }
            } else {
                const element = uiRoot.querySelector(config.selector);
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = value;
                    } else {
                        element.value = value;
                    }
                }
            }
        }
        updateConditionalSettingsUI();
        addLogMessage("확장 프로그램 설정 로드 완료.", "info");

        // details 태그의 저장된 open/closed 상태 로드
        uiRoot.querySelectorAll('.settings-fieldset[data-setting-key]').forEach(details => {
            const dataSettingKey = details.dataset.setting-key;
            const key = `fieldset_${dataSettingKey}_open`;
            if (result[key] !== undefined) {
                details.open = result[key];
            } else {
                details.open = false; // 저장된 상태가 없으면 기본적으로 닫힌 상태로 시작 (UX 고려)
            }
        });
    });
}

function createFilename(settings, options) {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.-]/g, '').slice(0, 14);
    const originalName = options.originalFilename ? options.originalFilename.split('.').slice(0, -1).join('.') : 'image';
    let promptPart = "image";
    if (options.altText) {
        const fullPrompt = options.altText;
        promptPart = fullPrompt.substring(0, 100)
                               .replace(/[^a-zA-Z0-9가-힣\s,]/g, '')
                               .replace(/[\s,]+/g, '_')
                               .replace(/^_|_$/g, '')
                               .toLowerCase();
        if (promptPart === "") {
            promptPart = "untitled";
        }
    }
    
    // filenameTemplate이 배열이므로, 이를 문자열로 조합합니다.
    const templateArray = settings.filenameTemplate || [];
    let finalFilename = templateArray.map(item => {
        switch (item) {
            case '{prefix}': return settings.filenamePrefix.trim() ? `${settings.filenamePrefix.trim()}_` : "";
            case '{prompt}': return promptPart;
            case '{timestamp}': return timestamp;
            case '{original}': return originalName;
            case '_': return "_";
            case '-': return "-";
            default: return item; // 예상치 못한 값 방지
        }
    }).join('');

    // 빈 템플릿일 경우 기본값 설정
    if (finalFilename.trim() === '') {
        finalFilename = 'novelai_image';
    }


    // 다운로드 하위 폴더 적용
    if (settings.downloadSubfolder && settings.downloadSubfolder.trim() !== "") {
        let subfolder = settings.downloadSubfolder.trim().replace(/\\/g, '/');
        subfolder = subfolder.replace(/^\/+|\/+$/g, '');
        finalFilename = `${subfolder}/${finalFilename}`;
    }

    return `${finalFilename}.${settings.imageFormat}`;
}


async function processAndDownloadImage(imageUrl, nameOptions) {
    try {
        // 첫 번째 showToast는 "시작" 메시지를 띄우고, 사라지지 않도록 duration을 0으로 설정
        showToast(`이미지 처리 시작: ${nameOptions.originalFilename || '현재 이미지'}...`, 'info', 0); // duration 0으로 설정

        addLogMessage(`이미지 처리 시작: ${nameOptions.originalFilename || 'current image'}`, 'info');
        const defaults = Object.fromEntries(Object.entries(SETTINGS_CONFIG).map(([key, config]) => [key, config.default]));
        const settings = await new Promise(resolve => chrome.storage.local.get(defaults, resolve));
        
        showToast(`이미지 데이터 가져오는 중...`, 'info', 0); 
        addLogMessage('이미지 데이터 가져오는 중...', 'info');
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`이미지 fetch 실패: ${response.status}`);
        }
        const originalBlob = await response.blob();

        const convertToBlob = (sourceBlob, targetFormat, qualityPref) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                const objectURL = URL.createObjectURL(sourceBlob);
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        return reject(new Error("Canvas 컨텍스트를 가져올 수 없습니다."));
                    }
                    ctx.drawImage(img, 0, 0);
                    
                    const mimeType = `image/${targetFormat}`;
                    let quality;
                    if (targetFormat === 'jpeg' || targetFormat === 'webp') {
                        const qualityMap = { 'quality': 1.0, 'normal': 0.85, 'low': 0.75 };
                        quality = qualityMap[qualityPref];
                    }
                    canvas.toBlob(newBlob => {
                        URL.revokeObjectURL(objectURL);
                        if (newBlob) {
                            resolve(newBlob);
                        } else {
                            reject(new Error("Canvas toBlob 변환에 실패했습니다."));
                        }
                    }, mimeType, quality);
                };
                img.onerror = () => {
                    URL.revokeObjectURL(objectURL);
                    reject(new Error("이미지 로드에 실패했습니다."));
                };
                img.src = objectURL;
            });
        };

        let processedBlob;
        const targetFormat = settings.imageFormat || 'jpeg';
        const qualityPref = settings.imageQualityPreference || 'quality';

        if (settings.removeMetadata) {
            showToast('메타데이터 제거 및 포맷 변환 중...', 'info', 0); 
            if (originalBlob.type === 'image/png' || originalBlob.type === 'image/webp' || targetFormat === 'png' || targetFormat === 'webp') {
                addLogMessage('메타데이터 제거를 위해 중간 변환을 수행합니다 (JPEG 경유).', 'info');
                const jpegBlob = await convertToBlob(originalBlob, 'jpeg', 'quality');
                addLogMessage('1단계: JPEG 변환 완료.', 'info');
                processedBlob = await convertToBlob(jpegBlob, targetFormat, qualityPref);
                addLogMessage(`2단계: ${targetFormat.toUpperCase()} 변환 완료.`, 'info');
            } else {
                addLogMessage(`이미지를 ${targetFormat} 포맷으로 변환합니다 (메타데이터 제거, 품질: ${qualityPref}).`, 'info');
                processedBlob = await convertToBlob(originalBlob, targetFormat, qualityPref);
            }
        } else {
            showToast('원본 이미지 데이터를 유지합니다.', 'info', 0); 
            addLogMessage('원본 이미지 데이터를 유지합니다.', 'info');
            processedBlob = originalBlob;
        }
        
        const finalFilename = createFilename(settings, nameOptions);
        addLogMessage(`파일명 생성: ${finalFilename}`, 'info');
        showToast(`파일 저장 준비 중: ${finalFilename}`, 'info', 0); 

        const reader = new FileReader();
        reader.readAsDataURL(processedBlob);
        await new Promise((resolve, reject) => {
            reader.onloadend = async () => {
                try {
                    showToast('브라우저에 다운로드 요청 중...', 'info', 0); 
                    addLogMessage('백그라운드 스크립트에 다운로드 요청...', 'info');
                    const response = await new Promise((res, rej) => {
                        chrome.runtime.sendMessage({ action: 'downloadImage', url: reader.result, filename: finalFilename }, (msg) => {
                            if (chrome.runtime.lastError) {
                                return rej(new Error(chrome.runtime.lastError.message));
                            }
                            if (msg && msg.success) {
                                res(msg);
                            } else {
                                rej(new Error(msg?.error || "알 수 없는 다운로드 오류입니다."));
                            }
                        });
                    });

                    if (typeof window.NaiAuto !== 'undefined') {
                        const historyEntry = { id: `hist_${Date.now()}`, timestamp: new Date().toISOString(), thumbnail: reader.result, filename: finalFilename, prompt: nameOptions.altText || 'N/A', settings: { ...settings } };
                        const data = await new Promise(res => chrome.storage.local.get({ history: [] }, res));
                        const newHistory = [historyEntry, ...data.history].slice(0, 50);
                        await new Promise(res => chrome.storage.local.set({ history: newHistory }, res));
                    }
                    showToast(`다운로드 성공!`, 'success', 3000); // 최종 완료 메시지, 3초 후 사라짐
                    resolve(response);
                } catch (err) {
                    showToast(`다운로드 실패: ${err.message}`, 'error', 5000); // 오류 메시지
                    reject(err);
                }
            };
            reader.onerror = () => {
                showToast("FileReader 읽기에 실패했습니다.", 'error', 5000); // 오류 메시지
                reject(new Error("FileReader 읽기에 실패했습니다."));
            };
        });
        addLogMessage(`이미지 다운로드 성공: ${finalFilename}`, 'success');
    } catch (error) {
        addLogMessage(`다운로드 처리 중 오류: ${error.message}`, 'error');
        console.error("processAndDownloadImage Error:", error);
        // 이미 상위 catch 블록에서 showToast 호출됨
        throw error;
    }
}

function renderHistory() {
    const historyList = uiRoot?.querySelector('#history-list');
    if (!historyList) return;
    chrome.storage.local.get({ history: [] }, (data) => {
        historyList.innerHTML = '';
        if (data.history.length === 0) {
            historyList.innerHTML = `<div class="log-entry" style="text-align: center; padding: 20px; color: var(--text-secondary);">작업 내역이 없습니다.</div>`;
            return;
        }
        data.history.forEach(entry => {
            const item = document.createElement('div');
            item.className = 'preview-item log-entry';
            item.innerHTML = `<img src="${entry.thumbnail}" class="thumbnail"><span class="file-info" title="${entry.filename}">${entry.filename}</span><button class="history-reuse-btn" title="프롬프트를 클립보드에 복사">📋</button>`;
            item.querySelector('.history-reuse-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (entry.prompt && entry.prompt !== 'N/A') {
                    navigator.clipboard.writeText(entry.prompt).then(() => showToast('프롬프트가 클립보드에 복사되었습니다!', 'success')).catch(() => showToast('클립보드 복사 실패', 'error'));
                } else {
                    showToast('복사할 프롬프트가 없습니다.', 'warn');
                }
            });
            historyList.appendChild(item);
        });
    });
}

// 파일명 템플릿 Pill 관련 함수
function createTemplatePill(value) {
    const pill = document.createElement('span');
    pill.className = 'template-pill';
    pill.dataset.value = value; // 실제 값 저장
    
    let displayText = value;
    switch (value) {
        case '{prefix}': displayText = '접두사'; break;
        case '{prompt}': displayText = '프롬프트'; break;
        case '{timestamp}': displayText = '시간'; break;
        case '{original}': displayText = '원본파일명'; break;
    }
    pill.textContent = displayText;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-pill-btn';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.title = '이 요소 제거';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        pill.remove();
        updateFilenameTemplatePlaceholder();
        saveSettings({ filenameTemplate: getFilenameTemplateArray() });
    });
    pill.appendChild(deleteBtn);

    pill.draggable = true;
    pill.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', value);
        e.dataTransfer.effectAllowed = 'move';
        pill.classList.add('draggable');
    });
    pill.addEventListener('dragend', () => {
        pill.classList.remove('draggable');
    });

    return pill;
}

function getFilenameTemplateArray() {
    const container = uiRoot?.querySelector('#filename-template-container');
    if (!container) return [];
    return Array.from(container.querySelectorAll('.template-pill')).map(pill => pill.dataset.value);
}

function renderFilenameTemplatePills(templateArray) {
    const container = uiRoot?.querySelector('#filename-template-container');
    if (!container) return;

    container.innerHTML = ''; // 기존 Pill 모두 제거

    if (templateArray.length === 0) {
        const placeholder = document.createElement('span');
        placeholder.className = 'template-placeholder-text';
        placeholder.textContent = '여기에 템플릿 요소를 드래그하거나 아래 버튼을 클릭하세요.';
        container.appendChild(placeholder);
    } else {
        templateArray.forEach(value => {
            container.appendChild(createTemplatePill(value));
        });
    }
    updateFilenameTemplatePlaceholder();
}

function updateFilenameTemplatePlaceholder() {
    const container = uiRoot?.querySelector('#filename-template-container');
    if (!container) return;

    const pills = container.querySelectorAll('.template-pill');
    const placeholder = container.querySelector('.template-placeholder-text');

    if (pills.length === 0) {
        if (!placeholder) {
            const newPlaceholder = document.createElement('span');
            newPlaceholder.className = 'template-placeholder-text';
            newPlaceholder.textContent = '여기에 템플릿 요소를 드래그하거나 아래 버튼을 클릭하세요.';
            container.appendChild(newPlaceholder);
        }
    } else {
        if (placeholder) {
            placeholder.remove();
        }
    }
}


// Shared UI 초기화
function initializeSharedUI(rootElement, actions) {
    uiRoot = rootElement;
    
    // 이 uiRoot는 메인 확장 프로그램 UI (드래그 가능한 창)를 참조합니다.
    // Shortcut pill과 toast container는 이제 body에 직접 추가되므로 uiRoot에 속하지 않습니다.

    uiRoot.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const tabId = e.currentTarget.dataset.tab;
            if (!uiRoot) return;
            uiRoot.querySelectorAll('.tab-button').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
            uiRoot.querySelectorAll('.tab-content').forEach(content => content.classList.toggle('active', content.id === `${tabId}-tab-content`));
            if (tabId === 'history') {
                renderHistory();
            } else if (tabId === 'shortcuts') { // 단축어 탭이 활성화될 때 renderShortcuts 호출
                // window.NaiAuto.renderShortcuts 함수가 content.js에 정의되어 있으므로, 
                // 해당 객체가 존재하는지 확인하고 호출합니다.
                if (typeof window.NaiAuto !== 'undefined' && typeof window.NaiAuto.renderShortcuts === 'function') {
                    window.NaiAuto.renderShortcuts();
                }
            }
        });
    });

    const settingsContainer = uiRoot.querySelector('#settings-tab-content');
    const debouncedSave = (() => {
        let timeout;
        return () => {
            clearTimeout(timeout);
            timeout = setTimeout(saveSettings, 500);
        };
    })();
    
    settingsContainer?.addEventListener('change', (e) => {
        updateConditionalSettingsUI();
        if (e.target.id === 'ui-scale-select') {
            saveSettings({ uiScale: e.target.value });
        } else {
            debouncedSave();
        }
    });
    
    ['#filename-prefix', '#generation-interval', '#download-subfolder'].forEach(selector => {
        uiRoot.querySelector(selector)?.addEventListener('input', debouncedSave);
    });

    // 파일명 템플릿 Pill 관련 이벤트 리스너 추가
    const filenameTemplateContainer = uiRoot.querySelector('#filename-template-container');
    const availableTemplates = uiRoot.querySelector('.available-templates');

    if (filenameTemplateContainer) {
        filenameTemplateContainer.addEventListener('dragover', (e) => {
            e.preventDefault(); // 드롭 허용
        });
        filenameTemplateContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            const data = e.dataTransfer.getData('text/plain');
            if (data) {
                const newPill = createTemplatePill(data);
                let droppedAfter = null;
                // 드롭된 위치 파악
                const children = Array.from(filenameTemplateContainer.children);
                for (let i = 0; i < children.length; i++) {
                    const childRect = children[i].getBoundingClientRect();
                    if (e.clientX < childRect.right) { // 마우스 X 좌표가 자식 요소의 오른쪽보다 작으면 해당 요소 앞에 삽입
                        droppedAfter = children[i];
                        break;
                    }
                }
                if (droppedAfter && droppedAfter.classList.contains('template-pill')) {
                    filenameTemplateContainer.insertBefore(newPill, droppedAfter);
                } else { // 맨 마지막에 추가 (또는 placeholder 앞에)
                    const placeholder = filenameTemplateContainer.querySelector('.template-placeholder-text');
                    if (placeholder) {
                        filenameTemplateContainer.insertBefore(newPill, placeholder);
                    } else {
                        filenameTemplateContainer.appendChild(newPill);
                    }
                }
                updateFilenameTemplatePlaceholder();
                saveSettings({ filenameTemplate: getFilenameTemplateArray() });
            }
        });
        // 내부 Pill의 드래그 드롭 정렬을 위한 리스너 (선택적 구현)
        filenameTemplateContainer.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('template-pill')) {
                e.dataTransfer.setData('text/plain', e.target.dataset.value);
                e.dataTransfer.effectAllowed = 'move';
                e.target.classList.add('dragging');
            }
        });
        filenameTemplateContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingPill = document.querySelector('.template-pill.dragging');
            if (draggingPill && e.target.classList.contains('template-pill') && e.target !== draggingPill) {
                const rect = e.target.getBoundingClientRect();
                const midX = rect.left + rect.width / 2;
                if (e.clientX < midX) {
                    filenameTemplateContainer.insertBefore(draggingPill, e.target);
                } else {
                    filenameTemplateContainer.insertBefore(draggingPill, e.target.nextSibling);
                }
            }
        });
        filenameTemplateContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            const draggingPill = document.querySelector('.template-pill.dragging');
            if (draggingPill) {
                draggingPill.classList.remove('dragging');
                saveSettings({ filenameTemplate: getFilenameTemplateArray() });
            }
        });
        filenameTemplateContainer.addEventListener('dragend', () => {
            const draggingPill = document.querySelector('.template-pill.dragging');
            if (draggingPill) draggingPill.classList.remove('dragging');
        });
    }

    if (availableTemplates) {
        availableTemplates.addEventListener('click', (e) => {
            if (e.target.classList.contains('template-add-button')) {
                const value = e.target.dataset.templateValue;
                const newPill = createTemplatePill(value);
                const placeholder = filenameTemplateContainer.querySelector('.template-placeholder-text');
                if (placeholder) {
                    filenameTemplateContainer.insertBefore(newPill, placeholder);
                } else {
                    filenameTemplateContainer.appendChild(newPill);
                }
                updateFilenameTemplatePlaceholder();
                saveSettings({ filenameTemplate: getFilenameTemplateArray() });
            }
        });
    }


    uiRoot.querySelector('#save-api-keys')?.addEventListener('click', () => {
        const geminiKey = uiRoot.querySelector('#gemini-api-key').value;
        const openaiKey = uiRoot.querySelector('#openai-api-key').value;
        const settingsToStore = {};
        if (geminiKey) settingsToStore.geminiApiKey = geminiKey;
        if (openaiKey) settingsToStore.openaiApiKey = openaiKey;
        if (Object.keys(settingsToStore).length > 0) {
            chrome.storage.local.set(settingsToStore, () => {
                showToast('API 키가 저장되었습니다.', 'success');
                addLogMessage('API 키가 저장되었습니다.', 'info');
            });
        } else {
            showToast('저장할 API 키를 입력해주세요.', 'warn');
        }
    });

    uiRoot.querySelector('#clear-history')?.addEventListener('click', () => {
        if (window.confirm("정말로 '내역' 탭의 모든 기록을 삭제하시겠습니까?")) {
            chrome.storage.local.set({ history: [] }, () => {
                showToast('작업 내역이 모두 삭제되었습니다.', 'info');
                addLogMessage('작업 내역이 모두 삭제되었습니다.', 'warn');
                renderHistory();
            });
        }
    });

    // 모든 데이터 초기화 버튼 리스너
    uiRoot.querySelector('#reset-all-data')?.addEventListener('click', () => {
        const confirmation = window.confirm(
            "정말로 모든 설정과 기록을 초기화하시겠습니까?\nAPI 키와 동의 내역을 포함한 모든 데이터가 삭제되며, 이 작업은 되돌릴 수 없습니다."
        );
        if (confirmation) {
            chrome.storage.local.clear(() => {
                if (chrome.runtime.lastError) {
                    showToast('초기화 실패: ' + chrome.runtime.lastError.message, 'error');
                    addLogMessage('전체 데이터 초기화에 실패했습니다.', 'error');
                } else {
                    showToast('모든 데이터가 초기화되었습니다. 잠시 후 새로고침됩니다.', 'success', 3000);
                    addLogMessage('모든 데이터가 초기화되었습니다.', 'warn');
                    
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                }
            });
        }
    });

    // API Provider 라디오 버튼 변경 이벤트 리스너 추가
    uiRoot.querySelectorAll('input[name="api-provider"]').forEach(radio => {
        radio.addEventListener('change', updateConditionalSettingsUI);
    });
    
    // Gemini 모델 라디오 버튼 변경 이벤트 리스너 추가
    uiRoot.querySelectorAll('input[name="gemini-model"]').forEach(radio => {
        radio.addEventListener('change', debouncedSave);
    });

    // OpenAI 모델 라디오 버튼 변경 이벤트 리스너 추가
    uiRoot.querySelectorAll('input[name="openai-model"]').forEach(radio => {
        radio.addEventListener('change', debouncedSave);
    });

    // details 태그 (접기/펴기)의 상태를 저장하고 로드하는 로직 추가
    uiRoot.querySelectorAll('.settings-fieldset[data-setting-key]').forEach(details => {
        details.addEventListener('toggle', () => {
            const dataSettingKey = details.dataset.settingKey;
            const key = `fieldset_${dataSettingKey}_open`;
            chrome.storage.local.set({ [key]: details.open });
        });
    });


    const startBtn = uiRoot.querySelector('#start-generation');
    if (startBtn && actions.startGeneration) {
        startBtn.addEventListener('click', actions.startGeneration);
        addLogMessage("start-generation 리스너 부착 완료.", 'info'); 
    } else {
        addLogMessage("start-generation 버튼 또는 액션 함수를 찾을 수 없습니다.", 'warn'); 
    }

    const stopBtn = uiRoot.querySelector('#stop-generation');
    if (stopBtn && actions.stopGeneration) {
        stopBtn.addEventListener('click', actions.stopGeneration);
        addLogMessage("stop-generation 리스너 부착 완료.", 'info'); 
    } else {
        addLogMessage("stop-generation 버튼 또는 액션 함수를 찾을 수 없습니다.", 'warn'); 
    }

    const downloadBtn = uiRoot.querySelector('#download-image');
    if (downloadBtn && actions.downloadImage) {
        downloadBtn.addEventListener('click', actions.downloadImage);
        addLogMessage("download-image 리스너 부착 완료.", 'info'); 
    } else {
        addLogMessage("download-image 버튼 또는 액션 함수를 찾을 수 없습니다.", 'warn'); 
    }

    // Img2Tag 탭의 Interrogate 버튼 리스너
    const interrogateBtn = uiRoot.querySelector('#interrogate-image');
    if (interrogateBtn && actions.interrogateImage) {
        interrogateBtn.addEventListener('click', actions.interrogateImage);
        addLogMessage("interrogate-image 리스너 부착 완료.", 'info'); 
    } else {
    }

    loadSettings(); // loadSettings가 details 상태를 로드

    const mainTab = uiRoot.querySelector('.tab-button[data-tab="main"]');
    if (mainTab) {
        mainTab.click();
    }

    // 초기 로드 시 단축어 탭이 기본으로 선택되지 않더라도 단축어 UI가 주입된 후 바로 렌더링 되도록 호출
    if (uiRoot.querySelector('#shortcuts-tab-content') && typeof window.NaiAuto !== 'undefined' && typeof window.NaiAuto.renderShortcuts === 'function') {
        window.NaiAuto.renderShortcuts();
    }
    
    // 로드 후 파일명 템플릿 UI 업데이트
    updateFilenameTemplatePlaceholder();
}