// popup.js
document.addEventListener('DOMContentLoaded', () => {
    const openButton = document.getElementById('open-converter');

    if (openButton) {
        openButton.addEventListener('click', () => {
            console.log("변환기 새 창에서 열기 버튼 클릭됨.");
            
            // converter.html을 팝업창 형태로 염
            chrome.windows.create({
                url: "converter.html",
                type: "popup",
                width: 380,  
                height: 650, 
            }, (newWindow) => { // 예외 설정
                if (chrome.runtime.lastError) {
                    console.error("새 창 생성 오류:", chrome.runtime.lastError.message);
                } else {
                    console.log("새 창 생성 성공:", newWindow.id);
                }
            });
        });
    } else {
        console.error("오류: 'open-converter' ID를 가진 버튼을 찾을 수 없습니다.");
    }
});