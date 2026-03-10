document.addEventListener('DOMContentLoaded', () => {
    // ========== 1. DOM元素获取 ==========
    const chatHistory = document.getElementById('chatHistory');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const voiceBtn = document.getElementById('voiceBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeModal = document.querySelector('.close');
    const fontSizeSelect = document.getElementById('fontSize');
    const contrastSelect = document.getElementById('contrast');
    const loading = document.getElementById('loading');

    // ========== 2. 配置项 ==========
    const API_URL = 'https://jsonplaceholder.typicode.com/posts'; 
    const speechSynthesis = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance();
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;     
    utterance.volume = 1;    

    // 语音识别核心状态管理
    let recognition = null;        // 识别实例
    let isListening = false;       // 是否正在识别
    let finalTranscript = '';      // 最终识别结果（已确认的）
    let interimTranscript = '';    // 临时识别结果（实时变化的）

    // ========== 3. 事件绑定 ==========
    // 发送按钮
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // 语音按钮 - 按住说话（PC+移动端兼容）
    voiceBtn.addEventListener('mousedown', startListening);
    voiceBtn.addEventListener('mouseup', stopListening);
    voiceBtn.addEventListener('mouseleave', stopListening); // 鼠标离开也停止
    voiceBtn.addEventListener('touchstart', (e) => {
        e.preventDefault(); // 阻止移动端默认触摸行为
        startListening();
    });
    voiceBtn.addEventListener('touchend', stopListening);

    // 设置弹窗
    settingsBtn.addEventListener('click', () => settingsModal.style.display = 'block');
    closeModal.addEventListener('click', () => settingsModal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) settingsModal.style.display = 'none';
    });

    // 字体/对比度设置
    fontSizeSelect.addEventListener('change', (e) => {
        document.querySelectorAll('.message, #userInput').forEach(el => {
            el.style.fontSize = `${e.target.value}px`;
        });
    });
    contrastSelect.addEventListener('change', (e) => {
        document.body.classList.toggle('high-contrast', e.target.value === 'high');
    });

    // ========== 4. 核心函数：语音识别（实时更新） ==========
    function startListening() {
        // 兼容性检测
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('您的浏览器不支持语音识别，请使用Chrome/Edge浏览器');
            return;
        }

        // 避免重复创建识别实例
        if (isListening) return;
        isListening = true;

        // 初始化识别实例
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'zh-CN';
        recognition.continuous = true; // 连续识别（关键：不停顿也能识别）
        recognition.interimResults = true; // 启用临时结果（实时更新关键）
        recognition.maxAlternatives = 1; // 只取最优识别结果
        recognition.continuous = true; // 持续监听，直到手动停止

        // 实时识别结果处理（核心：边说边更更新）
        recognition.onresult = (event) => {
            interimTranscript = '';
            // 遍历所有识别结果（包括临时和最终）
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                // event.results[i].isFinal 表示该段识别结果是否确认（非临时）
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript = transcript;
                }
            }
            // 实时更新输入框：最终结果 + 临时结果（边说边显）
            userInput.value = finalTranscript + interimTranscript;
        };

        // 识别错误处理
        recognition.onerror = (e) => {
            console.error('语音识别错误：', e.error);
            stopListening();
        };

        // 识别结束自动重启（保证按住期间持续识别）
        recognition.onend = () => {
            if (isListening) {
                recognition.start();
            }
        };

        // 启动识别
        recognition.start();
        voiceBtn.innerHTML = '<img src="images/mic.png" alt="语音输入" class="icon"> 正在录音...';
        // 重置识别结果
        finalTranscript = '';
        interimTranscript = '';
    }

    function stopListening() {
        if (!isListening || !recognition) return;
        
        // 停止识别
        isListening = false;
        recognition.stop();
        recognition = null;

        // 恢复按钮样式
        voiceBtn.innerHTML = '<img src="images/mic.png" alt="语音输入" class="icon"> 按住说话';
        
        // 最终结果回填（如果有临时结果，合并到最终结果）
        if (interimTranscript) {
            finalTranscript += interimTranscript;
            userInput.value = finalTranscript;
        }
    }

    // ========== 5. 发送消息函数 ==========
    async function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;

        addMessage(text, 'user');
        userInput.value = '';
        showLoading();

        try {
            const response = await axios.post(API_URL, {
                question: text,
                timestamp: new Date().getTime()
            }, {
                timeout: 10000,
                headers: { 'Content-Type': 'application/json' }
            });

            const botReply = `AI回答：${text} —— 算法组接口就绪后替换为真实返回值`;
            addMessage(botReply, 'bot');
            utterance.text = botReply;
            speechSynthesis.speak(utterance);

        } catch (error) {
            let errorMsg = '抱歉，暂时无法回答您的问题';
            if (error.code === 'ECONNABORTED') {
                errorMsg = '请求超时啦，检查下网络吧～';
            } else if (error.response) {
                errorMsg = `服务器出错：${error.response.status}`;
            }
            addMessage(errorMsg, 'bot');
        } finally {
            hideLoading();
        }
    }

    // ========== 6. 工具函数 ==========
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.textContent = text;
        chatHistory.appendChild(messageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    function showLoading() {
        loading.classList.remove('hidden');
    }

    function hideLoading() {
        loading.classList.add('hidden');
    }
});
