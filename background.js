// content/converter 스크립트로부터 메시지를 수신 대기
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 다운로드 요청('downloadImage')을 처리
    if (request.action === 'downloadImage') {
        
        // 비동기 작업(다운로드)을 처리하기 위해 true를 즉시 반환하고,
        // 작업 완료 후 sendResponse 콜백을 호출함.
        (async () => {
            try {
                // 요청에 포함된 data URL과 파일명을 사용하여 다운로드 실행
                const downloadId = await chrome.downloads.download({
                    url: request.url,       // 이미지의 URL
                    filename: request.filename, // 저장될 파일명
                    saveAs: false           // '다른 이름으로 저장' 대화상자 비활성화
                });
                console.log(`다운로드 시작 ID: ${downloadId}`);
                sendResponse({ success: true, downloadId: downloadId });

            } catch (error) {
                console.error("백그라운드 다운로드 API 오류:", error.message);
                sendResponse({ success: false, error: error.message });
            }
        })();
        
        return true;
    }
});

// 단축키 기능이긴 하나 현재로썬 사용하지 않을 것임.
chrome.commands.onCommand.addListener((command) => {
    chrome.tabs.query({active: true, currentWindow: true, url: "https://novelai.net/image*"}, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "command", command: command });
            console.log(`Command received in background: ${command}. Sent to tab ${tabs[0].id}`);
        }
    });
});

console.log("백그라운드 스크립트 로드 성공.");