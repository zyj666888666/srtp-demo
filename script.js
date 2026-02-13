document.addEventListener('DOMContentLoaded', () => {
    // ========== 1. 保留成员A的DOM元素获取 ==========
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

    // ========== 2. 新增：与算法组对接的配置（需替换！） ==========
    // 算法组提供的真实后端接口地址，当前为模拟地址
    const API_URL = 'https://jsonplaceholder.typicode.com/posts'; 
    // 语音合成初始化（播放AI回答）
    const speechSynthesis = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance();
    utterance.lang = 'zh-CN'; // 中文语音
    utterance.rate = 0.9;     // 语速适配老年人
    utterance.volume = 1;     // 最大音量

    // ========== 3. 保留成员A的事件绑定 + 优化 ==========
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    voiceBtn.addEventListener('mousedown', startListening);
    voiceBtn.addEventListener('mouseup', stopListening);
    voiceBtn.addEventListener('touchstart', startListening);
    voiceBtn.addEventListener('touchend', stopListening);

    settingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'block';
    });

    closeModal.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });

    fontSizeSelect.addEventListener('change', (e) => {
        document.querySelectorAll('.message, #userInput').forEach(el => {
            el.style.fontSize = `${e.target.value}px`;
        });
    });

    contrastSelect.addEventListener('change', (e) => {
        if (e.target.value === 'high') {
            document.body.classList.add('high-contrast');
        } else {
            document.body.classList.remove('high-contrast');
        }
    });

    // ========== 4. 核心改造：sendMessage函数（替换模拟逻辑为真实Axios请求） ==========
    async function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;

        // 保留成员A的添加用户消息逻辑
        addMessage(text, 'user');
        userInput.value = '';

        // 保留加载动画
        showLoading();

        try {
            // ========== 新增：Axios调用后端接口 ==========
            const response = await axios.post(API_URL, {
                question: text, // 传给后端的用户问题（和算法组确认参数名）
                timestamp: new Date().getTime()
            }, {
                timeout: 10000, // 10秒超时
                headers: { 'Content-Type': 'application/json' }
            });

            // ========== 新增：解析后端返回的答案（需替换为算法组的真实字段！） ==========
            // 模拟解析（真实场景改为：const botReply = response.data.answer;）
            const botReply = `AI回答：${text} —— 算法组接口就绪后替换为真实返回值`;
            
            // 保留添加AI消息逻辑
            addMessage(botReply, 'bot');
            // 新增：播放AI回答语音
            utterance.text = botReply;
            speechSynthesis.speak(utterance);

        } catch (error) {
            // ========== 新增：错误处理（适配老年用户） ==========
            let errorMsg = '抱歉，暂时无法回答您的问题';
            if (error.code === 'ECONNABORTED') {
                errorMsg = '请求超时啦，检查下网络吧～';
            } else if (error.response) {
                errorMsg = `服务器出错：${error.response.status}`;
            }
            addMessage(errorMsg, 'bot');
        } finally {
            // 保留隐藏加载动画
            hideLoading();
        }
    }

    // ========== 5. 保留成员A的工具函数 ==========
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

    // ========== 6. 优化成员A的语音识别函数（更稳定） ==========
    let recognition;
    function startListening() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('您的浏览器不支持语音识别功能，请使用Chrome/Edge浏览器');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'zh-CN';
        recognition.continuous = true; // 改为连续识别，适配长语音
        recognition.interimResults = true; // 实时返回识别结果

        // 优化：实时更新输入框内容
        recognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            userInput.value = transcript;
        };

        // 优化：识别错误处理
        recognition.onerror = (e) => {
            console.error('语音识别错误：', e.error);
            stopListening();
        };

        recognition.start();
        voiceBtn.textContent = '🎙️ 正在录音...';
    }

    function stopListening() {
        if (recognition) {
            recognition.stop();
            voiceBtn.innerHTML = '<img src="images/mic.png" alt="语音输入" class="icon"> 按住说话';
        }
    }
});