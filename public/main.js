document.addEventListener('DOMContentLoaded', () => {
    const FADE_TIME = 150;
    const TYPING_TIMER_LENGTH = 400;
    const COLORS = [
        '#FF5733',
        '#33FF57',
        '#3357FF',
        '#8A2BE2',
        '#33FFF6',
        '#F6FF33',
        '#20B2AA',
        '#7FFF00',
        '#808080',
        '#FF1493'
    ];
    const usernameInput = document.querySelector('.username_input');
    const roomInput = document.querySelector('.room_input');
    const messages = document.querySelector('.messages');
    const inputMessage = document.querySelector('.input_message');
    const loginPage = document.querySelector('.login.page');
    const chatPage = document.querySelector('.chat.page');
    let username, room;
    let connected = false;
    let typing = false;
    let lastTypingTime;
    let currentInput = usernameInput;
    const socket = io();
    function log(message, options = {}) {
        const li = document.createElement('li');
        li.className = 'log';
        li.textContent = message;
        addMessageElement(li, options);
    }
    function addMessageElement(el, options = {}) {
        if (options.fade) {
            el.style.opacity = 0;
            setTimeout(() => {
                el.style.transition = `opacity ${FADE_TIME}ms`;
                el.style.opacity = 1;
            }, 0);
        }
        if (options.prepend) {
            messages.insertBefore(el, messages.firstChild);
        } else {
            messages.appendChild(el);
        }
        messages.scrollTop = messages.scrollHeight;
    }
    function addParticipantsMessage(data) {
        log(`there are ${data.numUsers} participants`);
    }
    function setUsername() {
        username = usernameInput.value.trim();
        room = roomInput.value.trim();
        if (username && room) {
            loginPage.style.display = 'none';
            chatPage.style.display = 'block';
            currentInput = inputMessage;
            socket.emit('join room', room);
            socket.emit('add user', username);
        }
    }
    function sendMessage() {
        let message = inputMessage.value;
        message = cleanInput(message);
        if (message && connected) {
            inputMessage.value = '';
            addChatMessage({ username, message });
            socket.emit('new message', message);
        }
    }
    function addChatMessage(data, options = {}) {
        document.querySelectorAll('.typing.message').forEach(el => {
            if (el.dataset.username === data.username) el.remove();
        });
        const usernameSpan = document.createElement('span');
        usernameSpan.className = 'username';
        usernameSpan.textContent = data.username;
        usernameSpan.style.color = getUsernameColor(data.username);
        const messageBodySpan = document.createElement('span');
        messageBodySpan.className = 'message_body';
        messageBodySpan.textContent = data.message;
        const li = document.createElement('li');
        li.className = 'message';
        if (data.typing) li.classList.add('typing');
        li.dataset.username = data.username;
        li.appendChild(usernameSpan);
        li.appendChild(messageBodySpan);
        addMessageElement(li, options);
    }
    function addChatTyping(data) {
        data.typing = true;
        data.message = 'is typing';
        addChatMessage(data);
    }
    function removeChatTyping(data) {
        document.querySelectorAll('.typing.message').forEach(el => {
            if (el.dataset.username === data.username) {
                el.style.transition = `opacity ${FADE_TIME}ms`;
                el.style.opacity = 0;
                setTimeout(() => el.remove(), FADE_TIME);
            }
        });
    }
    function cleanInput(input) {
        const tempDiv = document.createElement('div');
        tempDiv.textContent = input;
        return tempDiv.innerHTML;
    }
    function updateTyping() {
        if (connected) {
            if (!typing) {
                typing = true;
                socket.emit('typing');
            }
            lastTypingTime = new Date().getTime();
            setTimeout(() => {
                const timeDiff = new Date().getTime() - lastTypingTime;
                if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
                    socket.emit('stop typing');
                    typing = false;
                }
            }, TYPING_TIMER_LENGTH);
        }
    }
    function getUsernameColor(username) {
        let hash = 7;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + (hash << 5) - hash;
        }
        const index = Math.abs(hash % COLORS.length);
        return COLORS[index];
    }
    document.addEventListener('keydown', event => {
        if (event.key === "Enter") {
            if (username) {
                sendMessage();
                socket.emit('stop typing');
                typing = false;
            } else {
                setUsername();
            }
        }
    });
    inputMessage.addEventListener('input', updateTyping);
    socket.on('login', data => {
        connected = true;
        log(`Welcome to roomId: ${data.roomId}`, { prepend: true });
        addParticipantsMessage(data);
    });
    socket.on('new message', data => {
        addChatMessage(data);
    });
    socket.on('user joined', data => {
        log(`${data.username} joined`);
        addParticipantsMessage(data);
    });
    socket.on('user left', data => {
        log(`${data.username} left`);
        addParticipantsMessage(data);
        removeChatTyping(data);
    });
    socket.on('typing', data => {
        addChatTyping(data);
    });
    socket.on('stop typing', data => {
        removeChatTyping(data);
    });
    socket.on('disconnect', () => {
        log('you have been disconnected');
    });
    socket.on('reconnect', () => {
        log('you have been reconnected');
        if (username) {
            socket.emit('add user', username);
        }
    });
    socket.on('reconnect_error', () => {
        log('attempt to reconnect has failed');
    });
});
