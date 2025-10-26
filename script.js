(function () {
    const baseUrl = 'http://150.5.160.10:8085';
    const apiPath = '/api/chat';
    const modelName = 'qwen2.5vl:72b';

    const userInputEl = document.getElementById('userInput');
    const sendBtnEl = document.getElementById('sendBtn');
    const voiceBtnEl = document.getElementById('voiceBtn');
    const requestViewEl = document.getElementById('requestView');
    // 移除 responseViewEl，因為現在使用聊天界面
    const statusEl = document.getElementById('status');
    const fileNameEl = document.getElementById('fileName');

    let selectedImageBase64 = null;


    // Function to get selected images from sources list
    function getImagesFromSources() {
        const sourcesList = document.getElementById('sourcesList');
        const selectedSources = sourcesList.querySelectorAll('.source-item.selected');
        const images = [];
        
        console.log('檢查選中的來源數量:', selectedSources.length);
        
        selectedSources.forEach(sourceItem => {
            const preview = sourceItem.querySelector('.source-preview img');
            if (preview) {
                const dataUrl = preview.src;
                const commaIdx = dataUrl.indexOf(',');
                if (commaIdx >= 0) {
                    const base64 = dataUrl.slice(commaIdx + 1);
                    images.push(base64);
                    console.log('找到圖片來源:', sourceItem.querySelector('.source-name').textContent);
                }
            }
        });
        
        console.log('準備發送的圖片數量:', images.length);
        return images;
    }
    
    // Function to toggle source selection
    window.toggleSourceSelection = function(sourceItem) {
        sourceItem.classList.toggle('selected');
        console.log('切換來源選擇狀態:', sourceItem.querySelector('.source-name').textContent, 
                   '選中狀態:', sourceItem.classList.contains('selected'));
        updateSourceSelectionStatus();
    }
    
    // Function to update source selection status
    window.updateSourceSelectionStatus = function() {
        const sourcesList = document.getElementById('sourcesList');
        const selectedSources = sourcesList.querySelectorAll('.source-item.selected');
        const statusEl = document.getElementById('status');
        
        if (selectedSources.length > 0) {
            const sourceNames = Array.from(selectedSources).map(item => {
                const nameEl = item.querySelector('.source-name');
                return nameEl ? nameEl.textContent : '未知來源';
            });
            statusEl.className = 'status';
            statusEl.textContent = `已選擇 ${selectedSources.length} 個來源: ${sourceNames.join(', ')}`;
        } else {
            statusEl.className = 'status';
            statusEl.textContent = '未選擇來源';
        }
    }

    // Function to clear all source selections
    function clearSourceSelection() {
        const sourcesList = document.getElementById('sourcesList');
        const selectedSources = sourcesList.querySelectorAll('.source-item.selected');
        
        // 移除所有選中狀態
        selectedSources.forEach(sourceItem => {
            sourceItem.classList.remove('selected');
        });
        
        // 更新狀態顯示
        updateSourceSelectionStatus();
        
        console.log('已清除所有來源選擇狀態');
    }

    // Function to clear all sources from the list
    function clearSourcesList() {
        const sourcesList = document.getElementById('sourcesList');
        
        // 清空所有來源項目
        sourcesList.innerHTML = '<p class="no-sources">這裡會顯示已儲存的來源</p>';
        
        // 清除選擇狀態
        updateSourceSelectionStatus();
        
        console.log('已清空來源列表');
    }
    // 暴露給全局（供外部/其他區域安全呼叫）
    window._clearSourcesList = clearSourcesList;

    // HTML 轉義，避免舊資料或回應中含HTML造成不一致或XSS
    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // Function to add message to chat
    function addMessageToChat(content, isUser = false, images = [], timestamp = null) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : 'ai'}`;
        // 保存原始內容以便持久化（避免格式丟失）
        messageDiv.dataset.raw = String(content);
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = isUser ? '👤' : '🤖';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        // 添加圖片預覽
        if (images && images.length > 0) {
            const imageContainer = document.createElement('div');
            imageContainer.style.marginBottom = '8px';
            images.forEach((imageData, index) => {
                const img = document.createElement('img');
                img.src = `data:image/jpeg;base64,${imageData}`;
                img.style.width = '100px';
                img.style.height = '100px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '8px';
                img.style.marginRight = '8px';
                img.style.marginBottom = '4px';
                imageContainer.appendChild(img);
            });
            messageContent.appendChild(imageContainer);
        }
        
        // 添加文字內容
        const textContent = document.createElement('div');
        textContent.className = 'message-text';
        
        // 如果是 AI 消息，處理 Markdown 格式和 ASCII 藝術
        if (!isUser) {
            // 簡單的 Markdown 處理
            let formattedContent = content
                .replace(/### (.*)/g, '<h3 style="color: #4CAF50; margin: 16px 0 8px 0; font-size: 16px; font-weight: bold;">$1</h3>')
                .replace(/## (.*)/g, '<h2 style="color: #4CAF50; margin: 20px 0 10px 0; font-size: 18px; font-weight: bold;">$1</h2>')
                .replace(/# (.*)/g, '<h1 style="color: #4CAF50; margin: 24px 0 12px 0; font-size: 20px; font-weight: bold;">$1</h1>')
                .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #FFD700; font-weight: bold;">$1</strong>')
                .replace(/\*(.*?)\*/g, '<em style="color: #87CEEB; font-style: italic;">$1</em>')
                .replace(/\n\n/g, '</p><p style="margin: 12px 0; line-height: 1.6;">')
                .replace(/\n/g, '<br>');
            
            // 檢測並處理 ASCII 藝術圖案
            if (isASCIIArt(formattedContent)) {
                // 將 ASCII 藝術包裝在特殊的容器中
                formattedContent = `<div style="
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    line-height: 1.2;
                    background-color: #1a1a1a;
                    border: 1px solid #333;
                    border-radius: 4px;
                    padding: 12px;
                    margin: 12px 0;
                    white-space: pre;
                    overflow-x: auto;
                    color: #00ff00;
                    text-shadow: 0 0 5px #00ff00;
                ">${formattedContent}</div>`;
            } else {
                // 包裝在段落中
                formattedContent = '<p style="margin: 12px 0; line-height: 1.6;">' + formattedContent + '</p>';
            }
            
            textContent.innerHTML = formattedContent;
        } else {
            // 使用純文字，保持一致格式且避免HTML注入
            textContent.textContent = content;
        }
        
        messageContent.appendChild(textContent);
        
        // 如果是 AI 消息，處理 MathJax 渲染
        if (!isUser && window.MathJax) {
            // 延遲執行 MathJax 渲染，確保 DOM 元素已經添加
            setTimeout(() => {
                MathJax.typesetPromise([textContent]).catch((err) => {
                    console.log('MathJax rendering error:', err);
                    // 如果 MathJax 渲染失敗，顯示原始內容
                    textContent.innerHTML = content.replace(/\n/g, '<br>');
                });
            }, 100);
        }
        
        // 添加時間戳（保存ISO在data屬性，顯示用本地時間）
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        const ts = timestamp ? new Date(timestamp) : new Date();
        timeDiv.dataset.ts = ts.toISOString();
        timeDiv.textContent = ts.toLocaleTimeString();
        messageContent.appendChild(timeDiv);
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        chatMessages.appendChild(messageDiv);
        
        // 滾動到底部
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Function to send message
    async function sendMessage() {
        // 未登入時禁止發送，提示先登入
        if (!window.currentUserId) {
            alert('請先登入用戶後才可使用對話功能。');
            const loginModal = document.getElementById('loginModal');
            if (loginModal) loginModal.style.display = 'block';
            return;
        }
        const userText = (userInputEl.value || '').trim();
        const sourceImages = getImagesFromSources();
        
        console.log('發送訊息 - 文字:', userText);
        console.log('發送訊息 - 圖片數量:', sourceImages.length);
        
        if (!userText && sourceImages.length === 0) {
            addMessageToChat('請輸入文字或上傳圖片後再發送。', false);
            return;
        }

        // 添加用戶消息到聊天（固定時間戳）
        const userTs = new Date().toISOString();
        addMessageToChat(userText, true, sourceImages, userTs);

        const userMessage = { role: 'user', content: userText };
        if (sourceImages.length > 0) {
            userMessage.images = sourceImages;
            console.log('已添加圖片到訊息中');
        }

        const payload = {
            model: modelName,
            messages: [userMessage],
            stream: false
        };

        requestViewEl.value = JSON.stringify(payload, null, 2);

        // 清空輸入框
        userInputEl.value = '';
        
        // 保持來源選擇狀態，不清除 selected class
        statusEl.className = 'status';
        statusEl.textContent = '發送中...';

        try {
            const res = await fetch(baseUrl + apiPath, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                throw new Error('HTTP ' + res.status + ': ' + res.statusText);
            }

            const data = await res.json();

            const content = data && data.message && typeof data.message.content === 'string'
                ? data.message.content
                : JSON.stringify(data);

            // 添加 AI 回應到聊天（固定時間戳）
            const aiTs = new Date().toISOString();
            addMessageToChat(content, false, [], aiTs);

            // 清除所有來源的選擇狀態，讓用戶可以重新選擇
            clearSourceSelection();
        } catch (err) {
            statusEl.className = 'status error';
            statusEl.textContent = '失敗';

            let errorMsg = String(err && err.message ? err.message : err);

            if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
                errorMsg += '\n\n可能的解決方案：\n1. 檢查 ngrok URL 是否正確\n2. 確認 Ollama 服務器正在運行\n3. 嘗試在瀏覽器中直接訪問 ngrok URL\n4. 檢查是否有 ngrok 瀏覽器警告頁面';
            } else if (errorMsg.includes('CORS') || errorMsg.includes('cross-origin')) {
                errorMsg += '\n\nCORS 錯誤解決方案：\n1. 嘗試使用本地 HTTP 服務器運行此頁面\n2. 檢查 Ollama 是否支援 CORS';
            }

            // 添加錯誤消息到聊天
            addMessageToChat(errorMsg.replace(/\n/g, '<br>'), false);

            // 清除所有來源的選擇狀態，讓用戶可以重新選擇
            clearSourceSelection();

            console.error('Request failed:', err);
        }
    }

    // Event listener for send button
    sendBtnEl.addEventListener('click', function () {
        sendMessage();
    });

    // 語音輸入功能
    let recognition = null;
    let isRecording = false;

    // 初始化語音識別
    function initSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'zh-TW'; // 設定為繁體中文
            
            recognition.onstart = function() {
                isRecording = true;
                voiceBtnEl.classList.add('recording');
                voiceBtnEl.textContent = '🔴';
                statusEl.textContent = '正在聆聽...';
                statusEl.className = 'status';
            };
            
            recognition.onresult = function(event) {
                const transcript = event.results[0][0].transcript;
                userInputEl.value = transcript;
                statusEl.textContent = '語音識別完成';
                statusEl.className = 'status success';
            };
            
            recognition.onerror = function(event) {
                console.error('語音識別錯誤:', event.error);
                statusEl.textContent = '語音識別失敗: ' + event.error;
                statusEl.className = 'status error';
            };
            
            recognition.onend = function() {
                isRecording = false;
                voiceBtnEl.classList.remove('recording');
                voiceBtnEl.textContent = '🎤';
                if (statusEl.textContent === '正在聆聽...') {
                    statusEl.textContent = '未選擇來源';
                    statusEl.className = 'status';
                }
            };
        } else {
            console.log('此瀏覽器不支援語音識別');
            voiceBtnEl.style.display = 'none';
        }
    }

    // 語音按鈕事件監聽
    voiceBtnEl.addEventListener('click', function() {
        if (!window.currentUserId) {
            alert('請先登入用戶後才可使用語音功能。');
            const loginModal = document.getElementById('loginModal');
            if (loginModal) loginModal.style.display = 'block';
            return;
        }

        if (!recognition) {
            alert('您的瀏覽器不支援語音識別功能');
            return;
        }

        if (isRecording) {
            recognition.stop();
        } else {
            recognition.start();
        }
    });

    // 初始化語音識別
    initSpeechRecognition();

    // Function to add image to sources list
    function addImageToSources(fileName, dataUrl) {
        const sourcesList = document.getElementById('sourcesList');
        const noSourcesMsg = sourcesList.querySelector('.no-sources');
        
        // 移除"未選擇檔案"的提示
        if (noSourcesMsg) {
            noSourcesMsg.remove();
        }
        
        // 創建圖片來源項目
        const sourceItem = document.createElement('div');
        sourceItem.className = 'source-item image-source';
        sourceItem.innerHTML = `
            <div class="source-preview">
                <img src="${dataUrl}" alt="${fileName}" class="source-image">
            </div>
            <div class="source-info">
                <div class="source-name">${fileName}</div>
                <div class="source-type">圖片</div>
                <div class="source-actions">
                    <button class="source-action-btn" onclick="event.stopPropagation(); viewImageSource('${dataUrl}', '${fileName}')">查看</button>
                    <button class="source-action-btn" onclick="event.stopPropagation(); removeImageSource(this)">刪除</button>
                </div>
            </div>
        `;
        
        // 添加點擊事件
        sourceItem.addEventListener('click', function(event) {
            // 如果點擊的是按鈕，不觸發選擇
            if (event.target.classList.contains('source-action-btn')) {
                return;
            }
            toggleSourceSelection(this);
        });
        
        // 添加到來源列表
        sourcesList.appendChild(sourceItem);
        
        // 不保存到localStorage，讓照片在刷新後消失
    }
    
    // 移除 localStorage 保存功能，讓照片在刷新後消失
    
    // 移除載入功能，讓照片在刷新後消失
    
    // 檢測是否為 ASCII 藝術圖案
    function isASCIIArt(content) {
        // 移除 HTML 標籤
        const textOnly = content.replace(/<[^>]*>/g, '');
        
        // 檢查是否包含多行且每行都有相同的字符模式
        const lines = textOnly.split('\n').filter(line => line.trim().length > 0);
        
        if (lines.length < 3) return false;
        
        // 檢查是否包含 ASCII 藝術常見的字符
        const asciiChars = /[•|─┌┐└┘├┤┬┴┼╔╗╚╝╠╣╦╩╬═║]/;
        const hasAsciiChars = lines.some(line => asciiChars.test(line));
        
        // 檢查是否有重複的字符模式
        const hasRepeatingPattern = lines.some(line => {
            const chars = line.split('');
            const uniqueChars = new Set(chars);
            return uniqueChars.size <= 3 && chars.length > 5;
        });
        
        // 檢查是否有多行且每行長度相似
        const lineLengths = lines.map(line => line.length);
        const avgLength = lineLengths.reduce((a, b) => a + b, 0) / lineLengths.length;
        const lengthVariation = lineLengths.every(len => Math.abs(len - avgLength) < 5);
        
        return hasAsciiChars || (hasRepeatingPattern && lengthVariation && lines.length >= 3);
    }
    
    // 聊天室管理
    // 產生全局唯一聊天ID，避免因相同名稱或重啟而覆蓋DB記錄
    function generateChatId() {
        const ts = Date.now();
        const rand = Math.random().toString(36).slice(2, 8);
        return `chat-${ts}-${rand}`;
    }

    let currentChatId = generateChatId();
    let chatHistory = [];
    // 使用全局變量，確保IIFE內外一致
    window.currentUserId = window.currentUserId || null; // 當前登入用戶ID

    // 頁面切換功能
    window.showExplorePage = function() {
        document.getElementById('sourcesPage').classList.remove('active');
        document.getElementById('explorePage').classList.add('active');
        loadChatHistory();
    };

    window.showSourcesPage = function() {
        document.getElementById('explorePage').classList.remove('active');
        document.getElementById('sourcesPage').classList.add('active');
    };

    // 從數據庫載入聊天歷史
    async function loadChatHistory() {
        if (!window.currentUserId) {
            console.log('用戶未登入，無法載入聊天歷史');
            setExploreNoLoginMessage();
            return;
        }

        try {
            const response = await fetch(`http://150.5.160.10:8085/api/chat/list/${window.currentUserId}`);
            const data = await response.json();
            
            if (data.success) {
                chatHistory = data.chats.map(chat => ({
                    id: chat.chatId,
                    title: chat.title,
                    messages: [], // 暫時為空，點擊時再載入詳細內容
                    createdAt: chat.createdAt,
                    updatedAt: chat.updatedAt
                }));
                
                displayChatHistory();
            } else {
                console.error('載入聊天歷史失敗:', data.message);
                displayChatHistory();
            }
        } catch (error) {
            console.error('載入聊天歷史錯誤:', error);
            displayChatHistory();
        }
    }

    // 未登入時在探索列表顯示提示
    function setExploreNoLoginMessage() {
        const chatHistoryEl = document.getElementById('chatHistory');
        if (chatHistoryEl) {
            chatHistoryEl.innerHTML = '<p class="no-history">請先登入以查看聊天記錄</p>';
        }
    }
    // 暴露給全局（供外部呼叫，如登出流程）
    window._setExploreNoLoginMessage = setExploreNoLoginMessage;

    // 顯示聊天歷史
    function displayChatHistory() {
        const chatHistoryEl = document.getElementById('chatHistory');
        const noHistoryEl = chatHistoryEl.querySelector('.no-history');
        
        if (chatHistory.length === 0) {
            if (noHistoryEl) {
                noHistoryEl.textContent = window.currentUserId ? '暫無歷史對話' : '請先登入以查看聊天記錄';
            }
            return;
        }

        if (noHistoryEl) {
            noHistoryEl.remove();
        }

        chatHistoryEl.innerHTML = '';
        
        chatHistory.forEach(chat => {
            const historyItem = document.createElement('div');
            historyItem.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;
            historyItem.onclick = (e) => {
                // 如果點擊的是刪除按鈕，避免觸發載入
                if (e.target && e.target.classList.contains('history-delete-btn')) return;
                loadChat(chat.id);
            };
            
            historyItem.innerHTML = `
                <div class="history-title-row">
                  <div class="history-title">${chat.title}</div>
                  <button class="history-delete-btn" title="刪除此聊天" onclick="deleteChatFromExplore(event, '${chat.id}')">🗑</button>
                </div>
                <div class="history-preview">點擊載入對話內容</div>
                <div class="history-time">${new Date(chat.updatedAt).toLocaleString()}</div>
            `;
            
            chatHistoryEl.appendChild(historyItem);
        });
        // 列表載入時同步更新標籤
        updateCurrentChatLabel();
    }

    // 從探索列表刪除聊天
    window.deleteChatFromExplore = async function(event, chatId) {
        event.stopPropagation();
        if (!window.currentUserId) {
            alert('請先登入再刪除聊天');
            return;
        }
        const ok = confirm('確定刪除此聊天嗎？');
        if (!ok) return;
        try {
            const resp = await fetch(`http://150.5.160.10:8085/api/chat/${window.currentUserId}/${chatId}`, { method: 'DELETE' });
            const data = await resp.json();
            if (data.success) {
                chatHistory = chatHistory.filter(c => c.id !== chatId);
                displayChatHistory();
                // 如果刪除的是當前聊天，清空畫面
                if (currentChatId === chatId) {
                    document.getElementById('chatMessages').innerHTML = '';
                    clearSourcesList();
                }
            } else {
                alert('刪除失敗：' + (data.message || '未知錯誤'));
            }
        } catch (err) {
            console.error('刪除聊天錯誤:', err);
            alert('刪除失敗，請稍後再試');
        }
    }

    // 載入指定聊天
    async function loadChat(chatId) {
        if (!window.currentUserId) {
            console.log('用戶未登入，無法載入聊天');
            return;
        }

        currentChatId = chatId;
        
        // 清空當前聊天顯示
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '';
        
        // 清空來源列表，讓用戶重新選擇圖片
        clearSourcesList();
        
        try {
            // 從數據庫載入聊天詳細內容
            const response = await fetch(`http://150.5.160.10:8085/api/chat/${window.currentUserId}/${chatId}`);
            const data = await response.json();
            
            if (data.success) {
                const chat = data.chat;
                
                // 載入聊天消息
                chat.messages.forEach(message => {
                    addMessageToChat(message.content, message.isUser, message.images || []);
                });
                // 更新目前聊天室標籤（以資料庫中的標題為準）
                if (chat && chat.title) {
                    const entry = chatHistory.find(c => c.id === chatId);
                    if (entry) entry.title = chat.title;
                }
                updateCurrentChatLabel();
                
                console.log('聊天載入成功:', chatId);
            } else {
                console.error('載入聊天失敗:', data.message);
                addMessageToChat('載入聊天失敗: ' + data.message, false);
            }
        } catch (error) {
            console.error('載入聊天錯誤:', error);
            addMessageToChat('載入聊天時發生錯誤', false);
        }
        
        // 更新歷史列表的活動狀態（防禦：event 可能不存在）
        const items = document.querySelectorAll('.history-item');
        items.forEach(item => item.classList.remove('active'));
        if (window.event && window.event.target) {
            const activeItem = window.event.target.closest('.history-item');
            if (activeItem) activeItem.classList.add('active');
        }
    }

    // 創建新聊天
    window.createNewChat = function() {
        // 保存當前聊天到歷史
        saveCurrentChat();
        
        // 創建新聊天
        const newChatId = generateChatId();
        currentChatId = newChatId;
        
        const newChat = {
            id: newChatId,
            title: `新對話`,
            messages: [],
            createdAt: new Date().toISOString()
        };
        
        chatHistory.push(newChat);
        
        // 清空當前聊天顯示
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '';
        
        // 清空來源列表，讓用戶重新上傳圖片
        clearSourcesList();
        
        // 清空輸入框
        document.getElementById('userInput').value = '';
        
        // 更新歷史列表
        loadChatHistory();
        
        // 在新的聊天室顯示歡迎訊息
        addMessageToChat('歡迎來到新的聊天室！👋\n\n你可以上傳圖片或輸入問題開始對話。', false, [], new Date().toISOString());

        // 更新標籤顯示
        updateCurrentChatLabel();

        console.log('創建新聊天:', newChatId);
    };

    // 保存當前聊天到數據庫
    async function saveCurrentChat() {
        if (!window.currentUserId) {
            console.log('用戶未登入，無法保存聊天');
            return;
        }

        const chatMessages = document.getElementById('chatMessages');
        const messages = Array.from(chatMessages.querySelectorAll('.message')).map(messageEl => {
            const isUser = messageEl.classList.contains('user');
            const contentEl = messageEl.querySelector('.message-content');
            // 優先使用建立時保存的原始內容，避免只拿到渲染後的純文字
            const rawFromDataset = messageEl.dataset && messageEl.dataset.raw ? messageEl.dataset.raw : null;
            const content = rawFromDataset != null ? rawFromDataset : (contentEl ? contentEl.textContent : '');
            
            // 提取圖片（如果有）
            const images = [];
            const imgEls = messageEl.querySelectorAll('img[src^="data:image"]');
            imgEls.forEach(img => {
                const src = img.src;
                const commaIdx = src.indexOf(',');
                if (commaIdx >= 0) {
                    images.push(src.slice(commaIdx + 1));
                }
            });
            
            return {
                content: content,
                isUser: isUser,
                images: images
            };
        });

        // 生成聊天標題
        const firstUserMessage = messages.find(m => m.isUser);
        const title = firstUserMessage ? 
            firstUserMessage.content.substring(0, 20) + (firstUserMessage.content.length > 20 ? '...' : '') : 
            '新對話';

        try {
            // 保存到數據庫
            const response = await fetch('http://150.5.160.10:8085/api/chat/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: window.currentUserId,
                    chatId: currentChatId,
                    title: title,
                    messages: messages
                })
            });

            const data = await response.json();
            
            if (data.success) {
                console.log('聊天已保存到數據庫:', currentChatId);
                // 同步本地標題並更新標籤與列表
                const entry = chatHistory.find(c => c.id === currentChatId);
                if (entry) entry.title = title;
                updateCurrentChatLabel();
                displayChatHistory();
            } else {
                console.error('保存聊天失敗:', data.message);
            }
        } catch (error) {
            console.error('保存聊天錯誤:', error);
        }
    }

    // 顯示目前聊天室標籤
    function updateCurrentChatLabel() {
        const label = document.getElementById('currentChatLabel');
        if (!label) return;
        const entry = chatHistory.find(c => c.id === currentChatId);
        const title = entry && entry.title ? entry.title : '新對話';
        label.textContent = `（目前：${title}）`;
    }
    // 暴露給全局（供外部/其他區域安全呼叫）
    window._updateCurrentChatLabel = updateCurrentChatLabel;

    // 刪除當前聊天
    window.deleteCurrentChat = async function() {
        if (!window.currentUserId) {
            alert('請先登入再刪除聊天');
            return;
        }
        if (!currentChatId) {
            alert('沒有可刪除的聊天');
            return;
        }

        const confirmDelete = confirm('確定要刪除此聊天記錄嗎？此操作無法撤銷。');
        if (!confirmDelete) return;

        try {
            const resp = await fetch(`http://150.5.160.10:8085/api/chat/${window.currentUserId}/${currentChatId}`, {
                method: 'DELETE'
            });
            const data = await resp.json();

            if (data.success) {
                // 從本地列表移除
                chatHistory = chatHistory.filter(c => c.id !== currentChatId);

                // 清空聊天視圖與來源
                document.getElementById('chatMessages').innerHTML = '';
                clearSourcesList();

                // 切到探索列表，刷新列表
                showExplorePage();
                await loadChatHistory();

                // 重置當前聊天ID：若還有其他聊天，選第一個；否則建立新唯一ID
                if (chatHistory.length > 0) {
                    currentChatId = chatHistory[0].id;
                } else {
                    currentChatId = generateChatId();
                    chatHistory.push({ id: currentChatId, title: `新對話`, messages: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
                }

                alert('聊天已刪除');
            } else {
                alert('刪除失敗：' + (data.message || '未知錯誤'));
            }
        } catch (err) {
            console.error('刪除聊天錯誤:', err);
            alert('刪除失敗，請稍後再試');
        }
    }

    // 修改 addMessageToChat 函數，自動保存到當前聊天
    const originalAddMessageToChat = addMessageToChat;
    addMessageToChat = function(content, isUser = false, images = [], timestamp = null) {
        // 保留原始函數的完整簽名（含 timestamp），避免時間丟失
        originalAddMessageToChat(content, isUser, images, timestamp);
        
        // 自動保存到當前聊天
        setTimeout(() => {
            saveCurrentChat();
        }, 100);
    };

    // 產生相似練習題
    window.generateSimilarQuestions = async function() {
        try {
            const outputEl = document.getElementById('similarQuestionsOutput');
            if (outputEl) {
                outputEl.style.display = 'block';
                outputEl.innerHTML = '<em>分析中...</em>';
            }

            // 收集目前聊天文字內容（不含圖片Base64）
            const chatMessagesEl = document.getElementById('chatMessages');
            const messages = Array.from(chatMessagesEl.querySelectorAll('.message')).map(el => {
                const isUser = el.classList.contains('user');
                const text = (el.querySelector('.message-content')?.innerText || '').trim();
                return { role: isUser ? 'user' : 'assistant', content: text };
            }).filter(m => m.content.length > 0);

            if (messages.length === 0) {
                if (outputEl) outputEl.textContent = '目前沒有可分析的對話內容。請先與AI進行對話。';
                return;
            }

            // 構造提示，請模型依據最近對話推薦相似練習題（5題，含題目與簡要解析）
            const sysPrompt = '你是一位擅長出題的老師，請根據使用者與AI的最近對話內容，判斷當前主題/題目重點，並產生5題相似練習題，每題包含：題目、選項（若適用）、正確答案與簡要解析。輸出使用繁體中文，清晰分點。';
            const recentContext = messages.slice(-10); // 取最近10則
            const userPrompt = '請根據以上對話內容產生相似練習題。';

            const payload = {
                model: 'qwen2.5vl:72b',
                messages: [
                    { role: 'system', content: sysPrompt },
                    ...recentContext,
                    { role: 'user', content: userPrompt }
                ],
                stream: false
            };

            const res = await fetch('http://150.5.160.10:8085/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            const content = data?.message?.content || '未取得模型回應';

            // 結果僅顯示在對話框（作為 AI 訊息）
            addMessageToChat(content, false);

            // 完成後清空並隱藏框
            if (outputEl) {
                outputEl.textContent = '';
                outputEl.style.display = 'none';
            }
        } catch (err) {
            console.error('相似題推薦錯誤:', err);
            const outputEl = document.getElementById('similarQuestionsOutput');
            if (outputEl) {
                outputEl.style.display = 'block';
                outputEl.textContent = '產生失敗，請稍後再試。';
            }
        }
    }

    // 移除頁面載入時的調用，讓照片在刷新後消失
    document.addEventListener('DOMContentLoaded', function() {
        updateSourceSelectionStatus();
        
        // 初始化第一個聊天
        if (isLoggedIn || window.currentUserId) {
            const initialChat = {
                id: currentChatId,
                title: '新對話',
                messages: [],
                createdAt: new Date().toISOString()
            };
            chatHistory.push(initialChat);
        } else {
            setExploreNoLoginMessage();
        }
        updateCurrentChatLabel();
    });
})();

// Global function to trigger file upload
function triggerFileUpload() {
    document.getElementById('fileUpload').click();
}


// Global function to trigger camera capture
function triggerCameraCapture() {
    document.getElementById('cameraInput').click();
}

// File upload handler
document.addEventListener('DOMContentLoaded', function() {
    const fileUploadEl = document.getElementById('fileUpload');
    const cameraInputEl = document.getElementById('cameraInput');
    
    fileUploadEl.addEventListener('change', function(event) {
        const files = Array.from(event.target.files);
        
        files.forEach(file => {
            handleFileUpload(file);
        });
        
        // 清空input，允許重複選擇相同檔案
        event.target.value = '';
    });
    
    // Camera input handler
    cameraInputEl.addEventListener('change', function(event) {
        const file = event.target.files && event.target.files[0];
        if (file) {
            handleCameraCapture(file);
        }
        // 清空input，允許重複拍照
        event.target.value = '';
    });
});

// Function to handle file upload
function handleFileUpload(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const dataUrl = e.target.result;
        addFileToSources(file, dataUrl);
    };
    
    reader.onerror = function() {
        console.error('讀取檔案失敗:', file.name);
        alert(`讀取檔案失敗: ${file.name}`);
    };
    
    // 根據檔案類型選擇讀取方式
    if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
    } else if (file.type.startsWith('text/')) {
        reader.readAsText(file);
    } else {
        // 對於其他檔案類型，使用DataURL
        reader.readAsDataURL(file);
    }
}

// Function to handle camera capture
function handleCameraCapture(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const dataUrl = e.target.result;
        
        // 為相機拍照生成文件名
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `camera-${timestamp}.jpg`;
        
        // 更新文件名顯示（防禦：元素可能不存在）
        const fileNameEl = document.getElementById('fileName');
        if (fileNameEl) {
            fileNameEl.textContent = fileName;
        }
        
        // 創建一個模擬的File對象用於添加到來源列表
        const cameraFile = {
            name: fileName,
            type: 'image/jpeg',
            size: file.size,
            lastModified: Date.now()
        };
        
        // 添加到來源列表
        addFileToSources(cameraFile, dataUrl);

        // 顯示來源頁並確保側欄可見（特別是手機/平板）
        if (typeof showSourcesPage === 'function') {
            showSourcesPage();
        }
        try {
            const isMobileOrTablet = window.innerWidth < 1024;
            if (isMobileOrTablet && typeof openSidebar === 'function') {
                openSidebar();
            }
        } catch (e) {
            // 忽略可視化輔助錯誤
        }
        
        // 滾動來源列表到底部，確保新項可見
        const sourcesList = document.getElementById('sourcesList');
        if (sourcesList) {
            sourcesList.scrollTop = sourcesList.scrollHeight;
        }
        
        // 顯示拍照的圖片預覽
        showCameraPreview(dataUrl, fileName);
        
        console.log('相機拍照成功:', fileName);
    };
    
    reader.onerror = function() {
        console.error('讀取相機圖片失敗:', file.name);
        alert('讀取相機圖片失敗，請重試');
    };
    
    reader.readAsDataURL(file);
}

// Function to show camera preview
function showCameraPreview(dataUrl, fileName) {
    // 創建相機預覽模態框
    const modal = document.createElement('div');
    modal.className = 'camera-preview-modal';
    modal.innerHTML = `
        <div class="camera-preview-content">
            <div class="camera-preview-header">
                <h3>📷 拍照成功</h3>
                <span class="close" onclick="closeCameraPreview()">&times;</span>
            </div>
            <div class="camera-preview-body">
                <img src="${dataUrl}" alt="${fileName}" class="camera-preview-image">
                <div class="camera-preview-info">
                    <p><strong>文件名:</strong> ${fileName}</p>
                    <p><strong>狀態:</strong> 已準備用於AI對話</p>
                </div>
            </div>
            <div class="camera-preview-actions">
                <button class="camera-action-btn" onclick="closeCameraPreview()">關閉</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

// Function to close camera preview
function closeCameraPreview() {
    const modal = document.querySelector('.camera-preview-modal');
    if (modal) {
        modal.remove();
    }
}

// Function to add file to sources list
function addFileToSources(file, dataUrl) {
    const sourcesList = document.getElementById('sourcesList');
    const noSourcesMsg = sourcesList.querySelector('.no-sources');
    
    // 移除"未選擇檔案"的提示
    if (noSourcesMsg) {
        noSourcesMsg.remove();
    }
    
    // 創建檔案來源項目
    const sourceItem = document.createElement('div');
    sourceItem.className = 'source-item file-source';
    
    // 根據檔案類型選擇圖標和預覽
    const fileIcon = getFileIcon(file.type, file.name);
    const previewContent = getFilePreview(file, dataUrl);
    
    sourceItem.innerHTML = `
        <div class="source-preview">
            ${previewContent}
        </div>
        <div class="source-info">
            <div class="source-name">${file.name}</div>
            <div class="source-type">${getFileTypeLabel(file.type)}</div>
            <div class="source-size">${formatFileSize(file.size)}</div>
            <div class="source-actions">
                <button class="source-action-btn" onclick="event.stopPropagation(); viewFileSource('${dataUrl}', '${file.name}', '${file.type}')">查看</button>
                <button class="source-action-btn" onclick="event.stopPropagation(); downloadFileSource('${dataUrl}', '${file.name}')">下載</button>
                <button class="source-action-btn" onclick="event.stopPropagation(); removeFileSource(this)">刪除</button>
            </div>
        </div>
    `;
    
    // 在設置innerHTML後再添加點擊事件
    sourceItem.addEventListener('click', function(event) {
        // 如果點擊的是按鈕，不觸發選擇
        if (event.target.classList.contains('source-action-btn')) {
            return;
        }
        toggleSourceSelection(this);
    });
    
    // 添加到來源列表
    sourcesList.appendChild(sourceItem);
    
    // 不保存到localStorage，讓文件在刷新後消失
}

// Function to get file icon based on type
function getFileIcon(fileType, fileName) {
    if (fileType.startsWith('image/')) {
        return '🖼️';
    } else if (fileType.startsWith('video/')) {
        return '🎬';
    } else if (fileType.startsWith('audio/')) {
        return '🎵';
    } else if (fileType.includes('pdf')) {
        return '📄';
    } else if (fileType.includes('word') || fileType.includes('document')) {
        return '📝';
    } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
        return '📊';
    } else if (fileType.includes('powerpoint') || fileType.includes('presentation')) {
        return '📽️';
    } else if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('archive')) {
        return '📦';
    } else if (fileType.startsWith('text/')) {
        return '📄';
    } else {
        return '📎';
    }
}

// Function to get file preview content
function getFilePreview(file, dataUrl) {
    if (file.type.startsWith('image/')) {
        return `<img src="${dataUrl}" alt="${file.name}" class="source-image">`;
    } else {
        const icon = getFileIcon(file.type, file.name);
        return `<div class="file-icon">${icon}</div>`;
    }
}

// Function to get file type label
function getFileTypeLabel(fileType) {
    const typeMap = {
        'image/': '圖片',
        'video/': '影片',
        'audio/': '音訊',
        'application/pdf': 'PDF',
        'text/': '文字',
        'application/zip': '壓縮檔',
        'application/x-rar-compressed': '壓縮檔'
    };
    
    for (const [prefix, label] of Object.entries(typeMap)) {
        if (fileType.startsWith(prefix)) {
            return label;
        }
    }
    
    return '檔案';
}

// Function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 移除文件保存功能，讓文件在刷新後消失

// 移除文件載入功能，讓文件在刷新後消失

// Function to view file source
function viewFileSource(dataUrl, fileName, fileType) {
    if (fileType.startsWith('image/')) {
        // 使用現有的圖片查看器
        viewImageSource(dataUrl, fileName);
    } else if (fileType.startsWith('text/')) {
        // 創建文字查看器
        const modal = document.createElement('div');
        modal.className = 'file-viewer-modal';
        modal.innerHTML = `
            <div class="file-viewer-content">
                <div class="file-viewer-header">
                    <h3>${fileName}</h3>
                    <span class="close" onclick="closeFileViewer()">&times;</span>
                </div>
                <div class="file-viewer-body">
                    <pre class="file-content">${dataUrl}</pre>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'block';
    } else {
        // 其他檔案類型顯示下載提示
        alert(`此檔案類型無法預覽，請使用下載功能查看：${fileName}`);
    }
}

// Function to download file source
function downloadFileSource(dataUrl, fileName) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Function to close file viewer
function closeFileViewer() {
    const modal = document.querySelector('.file-viewer-modal');
    if (modal) {
        modal.remove();
    }
}

// Function to remove file source
function removeFileSource(button, fileId) {
    if (confirm('確定要刪除這個檔案來源嗎？')) {
        // 從DOM中移除
        const sourceItem = button.closest('.source-item');
        sourceItem.remove();
        
        // 移除localStorage操作，因為不再保存文件
        
        // 檢查是否還有來源，如果沒有則顯示提示
        const sourcesList = document.getElementById('sourcesList');
        if (sourcesList.children.length === 0) {
            sourcesList.innerHTML = '<p class="no-sources">這裡會顯示已儲存的來源</p>';
        }
    }
}

// Global functions for image source management
function viewImageSource(dataUrl, fileName) {
    // 創建圖片查看模態框
    const modal = document.createElement('div');
    modal.className = 'image-viewer-modal';
    modal.innerHTML = `
        <div class="image-viewer-content">
            <div class="image-viewer-header">
                <h3>${fileName}</h3>
                <span class="close" onclick="closeImageViewer()">&times;</span>
            </div>
            <div class="image-viewer-body">
                <img src="${dataUrl}" alt="${fileName}" class="viewer-image">
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

function closeImageViewer() {
    const modal = document.querySelector('.image-viewer-modal');
    if (modal) {
        modal.remove();
    }
}

function removeImageSource(button, imageId) {
    if (confirm('確定要刪除這個圖片來源嗎？')) {
        // 從DOM中移除
        const sourceItem = button.closest('.source-item');
        sourceItem.remove();
        
        // 移除localStorage操作，因為不再保存圖片
        
        // 檢查是否還有來源，如果沒有則顯示提示
        const sourcesList = document.getElementById('sourcesList');
        if (sourcesList.children.length === 0) {
            sourcesList.innerHTML = '<p class="no-sources">這裡會顯示已儲存的來源</p>';
        }
    }
}

// 圖標選擇器功能
let currentEditingCard = null;

function openIconSelector(cardType) {
    currentEditingCard = cardType;
    document.getElementById('iconSelectorModal').style.display = 'block';
}

function closeIconSelector() {
    document.getElementById('iconSelectorModal').style.display = 'none';
    currentEditingCard = null;
}

function selectIcon(icon) {
    if (currentEditingCard) {
        const iconElement = document.getElementById(`icon-${currentEditingCard}`);
        if (iconElement) {
            iconElement.textContent = icon;
            // 保存到localStorage
            localStorage.setItem(`workspace-icon-${currentEditingCard}`, icon);
        }
        closeIconSelector();
    }
}

// 頁面載入時恢復保存的圖標
document.addEventListener('DOMContentLoaded', function() {
    const cardTypes = ['audio-summary', 'video-summary', 'mind-map', 'report'];
    
    cardTypes.forEach(cardType => {
        const savedIcon = localStorage.getItem(`workspace-icon-${cardType}`);
        if (savedIcon) {
            const iconElement = document.getElementById(`icon-${cardType}`);
            if (iconElement) {
                iconElement.textContent = savedIcon;
            }
        }
    });
    
    // 初始化動態 tooltips
    initDynamicTooltips();
});

// 動態 tooltip 系統
function initDynamicTooltips() {
    const workspaceItems = document.querySelectorAll('.workspace-item');
    
    workspaceItems.forEach(item => {
        const tooltipText = item.getAttribute('data-tooltip');
        if (!tooltipText) return;
        
        let tooltipElement = null;
        
        item.addEventListener('mouseenter', function(e) {
            // 創建 tooltip 元素
            tooltipElement = document.createElement('div');
            tooltipElement.className = 'dynamic-tooltip';
            tooltipElement.textContent = tooltipText;
            
            // 設置樣式
            tooltipElement.style.cssText = `
                position: fixed;
                background-color: #2d2d2d;
                color: #e0e0e0;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                white-space: normal;
                text-align: center;
                line-height: 1.4;
                border: 1px solid #4a4a4a;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                z-index: 999999;
                max-width: 200px;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            
            // 計算位置
            const rect = item.getBoundingClientRect();
            const tooltipWidth = 200; // 最大寬度
            const tooltipHeight = 60; // 估算高度
            
            let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            let top = rect.bottom + 8;
            
            // 確保 tooltip 不會超出視窗
            if (left < 8) left = 8;
            if (left + tooltipWidth > window.innerWidth - 8) {
                left = window.innerWidth - tooltipWidth - 8;
            }
            if (top + tooltipHeight > window.innerHeight - 8) {
                top = rect.top - tooltipHeight - 8;
            }
            
            tooltipElement.style.left = left + 'px';
            tooltipElement.style.top = top + 'px';
            
            // 添加到頁面
            document.body.appendChild(tooltipElement);
            
            // 顯示 tooltip
            setTimeout(() => {
                if (tooltipElement) {
                    tooltipElement.style.opacity = '1';
                }
            }, 10);
        });
        
        item.addEventListener('mouseleave', function() {
            if (tooltipElement) {
                tooltipElement.style.opacity = '0';
                setTimeout(() => {
                    if (tooltipElement && tooltipElement.parentNode) {
                        tooltipElement.parentNode.removeChild(tooltipElement);
                    }
                    tooltipElement = null;
                }, 300);
            }
        });
    });
}

// 登入功能
let isLoggedIn = false;

function toggleLoginModal() {
    const modal = document.getElementById('loginModal');
    if (isLoggedIn) {
        // 如果已登入，顯示登出選項
        if (confirm('確定要登出嗎？')) {
            logout();
        }
    } else {
        // 如果未登入，顯示登入模態框
        modal.style.display = 'block';
    }
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}

async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    if (!username || !password) {
        alert('請填寫完整的登入信息！');
        return;
    }
    
    try {
        // 發送登入請求到後端API
        const response = await fetch('http://150.5.160.10:8085/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            isLoggedIn = true;
            
            // 保存登入狀態
            const loginData = {
                username: result.user.username,
                email: result.user.email,
                fullName: result.user.fullName,
                userId: result.user.id,
                isLoggedIn: true,
                loginTime: new Date().toISOString()
            };
            
            if (rememberMe) {
                localStorage.setItem('userLogin', JSON.stringify(loginData));
            } else {
                sessionStorage.setItem('userLogin', JSON.stringify(loginData));
            }
            
            // 更新按鈕狀態
            updateLoginButton();
            
            // 設置當前用戶ID（全局）
            window.currentUserId = result.user.id;
            
            // 關閉模態框
            closeLoginModal();
            
            // 顯示成功消息
            alert(`歡迎回來，${result.user.username}！`);
            
            console.log('用戶登入成功:', result.user);
            // 透過已暴露的頁面切換方法載入聊天歷史
            if (typeof window.showExplorePage === 'function') {
                window.showExplorePage();
            }
            if (typeof window._updateCurrentChatLabel === 'function') {
                window._updateCurrentChatLabel();
            }
        } else {
            alert(`登入失敗：${result.message}`);
        }
        
    } catch (error) {
        console.error('登入錯誤:', error);
        alert('登入失敗，請檢查網絡連接或稍後再試');
    }
}

function logout() {
    isLoggedIn = false;
    window.currentUserId = null; // 清除當前用戶ID（全局）
    
    // 清除存儲的登入信息
    localStorage.removeItem('userLogin');
    sessionStorage.removeItem('userLogin');
    
    // 清空聊天歷史
    chatHistory = [];
    
    // 更新按鈕狀態
    updateLoginButton();
    
    // 清空界面：對話、來源與探索列表
    const chatMessagesEl = document.getElementById('chatMessages');
    if (chatMessagesEl) chatMessagesEl.innerHTML = '';
    if (typeof window._clearSourcesList === 'function') {
        window._clearSourcesList();
    } else {
        clearSourcesList();
    }
    if (typeof window._setExploreNoLoginMessage === 'function') {
        window._setExploreNoLoginMessage();
    } else {
        setExploreNoLoginMessage();
    }
    if (typeof window._updateCurrentChatLabel === 'function') {
        window._updateCurrentChatLabel();
    } else {
        updateCurrentChatLabel();
    }

    alert('已成功登出！');
    console.log('用戶已登出');
}

function updateLoginButton() {
    const loginBtn = document.getElementById('loginBtn');
    if (isLoggedIn) {
        loginBtn.textContent = '登出';
        loginBtn.classList.add('logged-in');
    } else {
        loginBtn.textContent = '登入';
        loginBtn.classList.remove('logged-in');
    }
}

function switchToRegister() {
    closeLoginModal();
    document.getElementById('registerModal').style.display = 'block';
}

function closeRegisterModal() {
    document.getElementById('registerModal').style.display = 'none';
}

function switchToLogin() {
    closeRegisterModal();
    document.getElementById('loginModal').style.display = 'block';
}

function showTerms() {
    alert('服務條款內容將在此顯示');
}

function showPrivacy() {
    alert('隱私政策內容將在此顯示');
}

async function handleRegister(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const registerData = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password'),
        confirmPassword: formData.get('confirmPassword'),
        fullName: formData.get('fullName')
    };
    
    // 前端驗證
    if (registerData.password !== registerData.confirmPassword) {
        alert('密碼和確認密碼不匹配！');
        return;
    }
    
    if (registerData.password.length < 6) {
        alert('密碼長度至少6位！');
        return;
    }
    
    if (!document.getElementById('agreeTerms').checked) {
        alert('請同意服務條款和隱私政策！');
        return;
    }
    
    try {
        // 發送註冊請求到後端API
        const response = await fetch('http://150.5.160.10:8085/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(registerData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`註冊成功！歡迎 ${result.user.username}！`);
            closeRegisterModal();
            // 自動登入
            await handleAutoLogin(registerData.username, registerData.password);
        } else {
            alert(`註冊失敗：${result.message}`);
        }
        
    } catch (error) {
        console.error('註冊錯誤:', error);
        alert('註冊失敗，請檢查網絡連接或稍後再試');
    }
}

async function handleAutoLogin(username, password) {
    try {
        const response = await fetch('http://150.5.160.10:8085/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            isLoggedIn = true;
            window.currentUserId = result.user.id; // 設置當前用戶ID（全局）
            
            // 保存登入狀態
            localStorage.setItem('userLogin', JSON.stringify({
                username: result.user.username,
                email: result.user.email,
                fullName: result.user.fullName,
                userId: result.user.id,
                isLoggedIn: true,
                loginTime: new Date().toISOString()
            }));
            
            updateLoginButton();
            console.log('自動登入成功:', result.user.username);
        }
        
    } catch (error) {
        console.error('自動登入錯誤:', error);
    }
}

// 頁面載入時檢查登入狀態
document.addEventListener('DOMContentLoaded', function() {
    // 檢查localStorage和sessionStorage中的登入狀態
    const localLogin = localStorage.getItem('userLogin');
    const sessionLogin = sessionStorage.getItem('userLogin');
    
    if (localLogin || sessionLogin) {
        const loginData = JSON.parse(localLogin || sessionLogin);
        if (loginData.isLoggedIn) {
            isLoggedIn = true;
            // 從儲存恢復全局用戶ID
            if (loginData.userId) {
                window.currentUserId = loginData.userId;
            }
            updateLoginButton();
            console.log('用戶已登入:', loginData.username);
        }
    }
});

// 點擊模態框外部關閉
window.onclick = function(event) {
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const iconModal = document.getElementById('iconSelectorModal');
    
    if (event.target === loginModal) {
        closeLoginModal();
    }
    if (event.target === registerModal) {
        closeRegisterModal();
    }
    if (event.target === iconModal) {
        closeIconSelector();
    }
}

