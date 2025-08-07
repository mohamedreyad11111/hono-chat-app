import { Hono } from 'hono'
import { cors } from 'hono/cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const app = new Hono()

// CORS middleware
app.use('*', cors())

// Serve static HTML files
app.get('/', (c) => {
  return c.html(getLoginPage())
})

app.get('/register', (c) => {
  return c.html(getRegisterPage())
})

app.get('/chat', (c) => {
  return c.html(getChatPage())
})

// Authentication middleware
const authMiddleware = async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  
  if (!token) {
    return c.json({ error: 'No token provided' }, 401)
  }

  try {
    const decoded = jwt.verify(token, c.env.JWT_SECRET)
    c.set('user', decoded)
    await next()
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401)
  }
}

// Register endpoint
app.post('/api/register', async (c) => {
  try {
    const { username, email, password } = await c.req.json()
    
    if (!username || !email || !password) {
      return c.json({ error: 'All fields are required' }, 400)
    }

    if (password.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters' }, 400)
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    
    const stmt = c.env.DB.prepare(`
      INSERT INTO users (username, email, password) 
      VALUES (?, ?, ?)
    `)
    
    const result = await stmt.bind(username, email, hashedPassword).run()
    
    if (!result.success) {
      return c.json({ error: 'Username or email already exists' }, 400)
    }

    const token = jwt.sign(
      { id: result.meta.last_row_id, username, email },
      c.env.JWT_SECRET,
      { expiresIn: '24h' }
    )

    return c.json({ 
      message: 'Registration successful', 
      token,
      user: { id: result.meta.last_row_id, username, email }
    })
  } catch (error) {
    console.error('Registration error:', error)
    return c.json({ error: 'Registration failed' }, 500)
  }
})

// Login endpoint
app.post('/api/login', async (c) => {
  try {
    const { email, password } = await c.req.json()
    
    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400)
    }

    const stmt = c.env.DB.prepare('SELECT * FROM users WHERE email = ?')
    const user = await stmt.bind(email).first()
    
    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    
    if (!isValidPassword) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      c.env.JWT_SECRET,
      { expiresIn: '24h' }
    )

    return c.json({ 
      message: 'Login successful', 
      token,
      user: { id: user.id, username: user.username, email: user.email }
    })
  } catch (error) {
    console.error('Login error:', error)
    return c.json({ error: 'Login failed' }, 500)
  }
})

// Get messages endpoint
app.get('/api/messages', authMiddleware, async (c) => {
  try {
    const stmt = c.env.DB.prepare(`
      SELECT id, username, message, created_at 
      FROM messages 
      ORDER BY created_at DESC 
      LIMIT 50
    `)
    
    const { results } = await stmt.all()
    return c.json(results.reverse())
  } catch (error) {
    console.error('Get messages error:', error)
    return c.json({ error: 'Failed to fetch messages' }, 500)
  }
})

// Send message endpoint
app.post('/api/messages', authMiddleware, async (c) => {
  try {
    const { message } = await c.req.json()
    const user = c.get('user')
    
    if (!message || message.trim() === '') {
      return c.json({ error: 'Message cannot be empty' }, 400)
    }

    const stmt = c.env.DB.prepare(`
      INSERT INTO messages (user_id, username, message) 
      VALUES (?, ?, ?)
    `)
    
    const result = await stmt.bind(user.id, user.username, message.trim()).run()
    
    if (!result.success) {
      return c.json({ error: 'Failed to send message' }, 500)
    }

    return c.json({ 
      message: 'Message sent successfully',
      data: {
        id: result.meta.last_row_id,
        username: user.username,
        message: message.trim(),
        created_at: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Send message error:', error)
    return c.json({ error: 'Failed to send message' }, 500)
  }
})

// Verify token endpoint
app.get('/api/verify', authMiddleware, (c) => {
  const user = c.get('user')
  return c.json({ valid: true, user })
})

// HTML Pages
function getLoginPage() {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تسجيل الدخول</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .container {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 400px;
        }
        
        h1 {
            text-align: center;
            margin-bottom: 2rem;
            color: #333;
        }
        
        .form-group {
            margin-bottom: 1rem;
        }
        
        label {
            display: block;
            margin-bottom: 0.5rem;
            color: #555;
            font-weight: 500;
        }
        
        input {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #ddd;
            border-radius: 5px;
            font-size: 1rem;
            transition: border-color 0.3s;
        }
        
        input:focus {
            outline: none;
            border-color: #667eea;
        }
        
        button {
            width: 100%;
            padding: 0.75rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 1rem;
            cursor: pointer;
            transition: transform 0.2s;
        }
        
        button:hover {
            transform: translateY(-2px);
        }
        
        .link {
            text-align: center;
            margin-top: 1rem;
        }
        
        .link a {
            color: #667eea;
            text-decoration: none;
        }
        
        .error {
            background: #fee;
            color: #c33;
            padding: 0.75rem;
            border-radius: 5px;
            margin-bottom: 1rem;
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>تسجيل الدخول</h1>
        <div class="error" id="error"></div>
        
        <form id="loginForm">
            <div class="form-group">
                <label for="email">البريد الإلكتروني:</label>
                <input type="email" id="email" required>
            </div>
            
            <div class="form-group">
                <label for="password">كلمة المرور:</label>
                <input type="password" id="password" required>
            </div>
            
            <button type="submit">دخول</button>
        </form>
        
        <div class="link">
            <a href="/register">إنشاء حساب جديد</a>
        </div>
    </div>

    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('error');
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    window.location.href = '/chat';
                } else {
                    errorDiv.textContent = data.error;
                    errorDiv.style.display = 'block';
                }
            } catch (error) {
                errorDiv.textContent = 'حدث خطأ في الاتصال';
                errorDiv.style.display = 'block';
            }
        });
    </script>
</body>
</html>`
}

function getRegisterPage() {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>إنشاء حساب</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .container {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 400px;
        }
        
        h1 {
            text-align: center;
            margin-bottom: 2rem;
            color: #333;
        }
        
        .form-group {
            margin-bottom: 1rem;
        }
        
        label {
            display: block;
            margin-bottom: 0.5rem;
            color: #555;
            font-weight: 500;
        }
        
        input {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #ddd;
            border-radius: 5px;
            font-size: 1rem;
            transition: border-color 0.3s;
        }
        
        input:focus {
            outline: none;
            border-color: #667eea;
        }
        
        button {
            width: 100%;
            padding: 0.75rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 1rem;
            cursor: pointer;
            transition: transform 0.2s;
        }
        
        button:hover {
            transform: translateY(-2px);
        }
        
        .link {
            text-align: center;
            margin-top: 1rem;
        }
        
        .link a {
            color: #667eea;
            text-decoration: none;
        }
        
        .error {
            background: #fee;
            color: #c33;
            padding: 0.75rem;
            border-radius: 5px;
            margin-bottom: 1rem;
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>إنشاء حساب جديد</h1>
        <div class="error" id="error"></div>
        
        <form id="registerForm">
            <div class="form-group">
                <label for="username">اسم المستخدم:</label>
                <input type="text" id="username" required>
            </div>
            
            <div class="form-group">
                <label for="email">البريد الإلكتروني:</label>
                <input type="email" id="email" required>
            </div>
            
            <div class="form-group">
                <label for="password">كلمة المرور:</label>
                <input type="password" id="password" required minlength="6">
            </div>
            
            <button type="submit">إنشاء حساب</button>
        </form>
        
        <div class="link">
            <a href="/">تسجيل الدخول</a>
        </div>
    </div>

    <script>
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('error');
            
            if (password.length < 6) {
                errorDiv.textContent = 'كلمة المرور يجب أن تكون على الأقل 6 أحرف';
                errorDiv.style.display = 'block';
                return;
            }
            
            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    window.location.href = '/chat';
                } else {
                    errorDiv.textContent = data.error;
                    errorDiv.style.display = 'block';
                }
            } catch (error) {
                errorDiv.textContent = 'حدث خطأ في الاتصال';
                errorDiv.style.display = 'block';
            }
        });
    </script>
</body>
</html>`
}

function getChatPage() {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>المحادثة</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f0f2f5;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .user-info {
            font-weight: 500;
        }
        
        .logout-btn {
            background: rgba(255,255,255,0.2);
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 5px;
            cursor: pointer;
            transition: background 0.3s;
        }
        
        .logout-btn:hover {
            background: rgba(255,255,255,0.3);
        }
        
        .chat-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            max-width: 800px;
            margin: 0 auto;
            width: 100%;
            padding: 1rem;
        }
        
        .messages {
            flex: 1;
            background: white;
            border-radius: 10px;
            padding: 1rem;
            margin-bottom: 1rem;
            overflow-y: auto;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            min-height: 400px;
        }
        
        .message {
            margin-bottom: 1rem;
            padding: 0.75rem;
            border-radius: 10px;
            background: #f8f9fa;
            border-left: 3px solid #667eea;
        }
        
        .message.own {
            background: #e3f2fd;
            border-left: 3px solid #2196f3;
            margin-left: 2rem;
        }
        
        .message-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.5rem;
            font-size: 0.875rem;
            color: #666;
        }
        
        .username {
            font-weight: 600;
            color: #333;
        }
        
        .message-text {
            color: #333;
            line-height: 1.4;
        }
        
        .input-area {
            display: flex;
            gap: 0.5rem;
            background: white;
            padding: 1rem;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        #messageInput {
            flex: 1;
            padding: 0.75rem;
            border: 2px solid #ddd;
            border-radius: 25px;
            font-size: 1rem;
            outline: none;
        }
        
        #messageInput:focus {
            border-color: #667eea;
        }
        
        #sendBtn {
            padding: 0.75rem 1.5rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            font-weight: 500;
            transition: transform 0.2s;
        }
        
        #sendBtn:hover {
            transform: scale(1.05);
        }
        
        .empty-state {
            text-align: center;
            color: #999;
            padding: 2rem;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="user-info">مرحباً، <span id="username"></span></div>
        <button class="logout-btn" id="logoutBtn">تسجيل الخروج</button>
    </div>
    
    <div class="chat-container">
        <div class="messages" id="messages">
            <div class="empty-state">لا توجد رسائل بعد. كن أول من يبدأ المحادثة!</div>
        </div>
        
        <div class="input-area">
            <input type="text" id="messageInput" placeholder="اكتب رسالتك هنا..." maxlength="500">
            <button id="sendBtn">إرسال</button>
        </div>
    </div>

    <script>
        let currentUser = null;
        let messages = [];
        
        // Check authentication
        function checkAuth() {
            const token = localStorage.getItem('token');
            const user = localStorage.getItem('user');
            
            if (!token || !user) {
                window.location.href = '/';
                return false;
            }
            
            currentUser = JSON.parse(user);
            document.getElementById('username').textContent = currentUser.username;
            return true;
        }
        
        // Logout function
        function logout() {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
        }
        
        // Format date
        function formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleString('ar-EG', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit'
            });
        }
        
        // Render messages
        function renderMessages() {
            const messagesContainer = document.getElementById('messages');
            
            if (messages.length === 0) {
                messagesContainer.innerHTML = '<div class="empty-state">لا توجد رسائل بعد. كن أول من يبدأ المحادثة!</div>';
                return;
            }
            
            messagesContainer.innerHTML = messages.map(msg => {
                const isOwn = msg.username === currentUser.username;
                return \`
                    <div class="message \${isOwn ? 'own' : ''}">
                        <div class="message-header">
                            <span class="username">\${msg.username}</span>
                            <span class="time">\${formatDate(msg.created_at)}</span>
                        </div>
                        <div class="message-text">\${msg.message}</div>
                    </div>
                \`;
            }).join('');
            
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        // Load messages
        async function loadMessages() {
            const token = localStorage.getItem('token');
            
            try {
                const response = await fetch('/api/messages', {
                    headers: {
                        'Authorization': \`Bearer \${token}\`
                    }
                });
                
                if (response.ok) {
                    messages = await response.json();
                    renderMessages();
                } else if (response.status === 401) {
                    logout();
                }
            } catch (error) {
                console.error('Error loading messages:', error);
            }
        }
        
        // Send message
        async function sendMessage() {
            const messageInput = document.getElementById('messageInput');
            const message = messageInput.value.trim();
            
            if (!message) return;
            
            const token = localStorage.getItem('token');
            
            try {
                const response = await fetch('/api/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': \`Bearer \${token}\`
                    },
                    body: JSON.stringify({ message })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    messages.push(result.data);
                    renderMessages();
                    messageInput.value = '';
                } else if (response.status === 401) {
                    logout();
                } else {
                    const error = await response.json();
                    alert(error.error);
                }
            } catch (error) {
                console.error('Error sending message:', error);
                alert('حدث خطأ في إرسال الرسالة');
            }
        }
        
        // Initialize
        if (checkAuth()) {
            loadMessages();
            
            // Auto-refresh messages every 3 seconds
            setInterval(loadMessages, 3000);
            
            // Event listeners
            document.getElementById('logoutBtn').addEventListener('click', logout);
            document.getElementById('sendBtn').addEventListener('click', sendMessage);
            document.getElementById('messageInput').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });
        }
    </script>
</body>
</html>`
}

export default app