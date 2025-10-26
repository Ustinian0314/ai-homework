const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const cors = require('cors');
const app = express();
const port = 3001;

// 中間件
app.use(cors());
app.use(express.json());

// PostgreSQL 數據庫連接配置
const pool = new Pool({
  user: 'ad-user-01',              // 你的數據庫用戶名
  host: '150.5.148.44',            // 你的BytePlus RDS主機地址
  database: 'Ai_Homeworksystem',       // 請替換為你的數據庫名稱
  password: 'Ad37033703',       // 請替換為你的數據庫密碼
  port: 5432                      // PostgreSQL默認端口
});

// 測試數據庫連接
pool.on('connect', () => {
  console.log('已連接到PostgreSQL數據庫');
});

pool.on('error', (err) => {
  console.error('PostgreSQL連接錯誤:', err);
});

// 創建用戶表（如果不存在）
async function createUsersTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT true
    );
  `;
  
  try {
    await pool.query(query);
    console.log('用戶表已創建或已存在');
  } catch (err) {
    console.error('創建用戶表時出錯:', err);
  }
}

// 創建聊天記錄表（如果不存在）
async function createChatsTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS chats (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      chat_id VARCHAR(100) NOT NULL,
      title VARCHAR(200) NOT NULL,
      messages JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, chat_id)
    );
  `;
  
  try {
    await pool.query(query);
    console.log('聊天記錄表已創建或已存在');
  } catch (err) {
    console.error('創建聊天記錄表時出錯:', err);
  }
}

// 初始化數據庫
createUsersTable();
createChatsTable();

// 用戶註冊API
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword, fullName } = req.body;
    
    // 驗證輸入
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: '請填寫所有必填字段' 
      });
    }
    
    if (password !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: '密碼和確認密碼不匹配' 
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: '密碼長度至少6位' 
      });
    }
    
    // 檢查用戶名和郵箱是否已存在
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: '用戶名或郵箱已存在' 
      });
    }
    
    // 加密密碼
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // 插入新用戶
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash, full_name) VALUES ($1, $2, $3, $4) RETURNING id, username, email, full_name, created_at',
      [username, email, passwordHash, fullName || null]
    );
    
    const newUser = result.rows[0];
    
    res.status(201).json({
      success: true,
      message: '註冊成功',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        fullName: newUser.full_name,
        createdAt: newUser.created_at
      }
    });
    
  } catch (err) {
    console.error('註冊錯誤:', err);
    res.status(500).json({ 
      success: false, 
      message: '服務器錯誤，請稍後再試' 
    });
  }
});

// 用戶登入API
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: '請填寫用戶名和密碼' 
      });
    }
    
    // 查找用戶（支持用戶名或郵箱登入）
    const result = await pool.query(
      'SELECT id, username, email, password_hash, full_name, is_active FROM users WHERE (username = $1 OR email = $1) AND is_active = true',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: '用戶名或密碼錯誤' 
      });
    }
    
    const user = result.rows[0];
    
    // 驗證密碼
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: '用戶名或密碼錯誤' 
      });
    }
    
    res.json({
      success: true,
      message: '登入成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name
      }
    });
    
  } catch (err) {
    console.error('登入錯誤:', err);
    res.status(500).json({ 
      success: false, 
      message: '服務器錯誤，請稍後再試' 
    });
  }
});

// 獲取用戶信息API
app.get('/api/user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT id, username, email, full_name, created_at FROM users WHERE id = $1 AND is_active = true',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '用戶不存在' 
      });
    }
    
    const user = result.rows[0];
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        createdAt: user.created_at
      }
    });
    
  } catch (err) {
    console.error('獲取用戶信息錯誤:', err);
    res.status(500).json({ 
      success: false, 
      message: '服務器錯誤，請稍後再試' 
    });
  }
});

// 保存聊天記錄API
app.post('/api/chat/save', async (req, res) => {
  try {
    const { userId, chatId, title, messages } = req.body;
    
    if (!userId || !chatId || !title) {
      return res.status(400).json({
        success: false,
        message: '缺少必要參數'
      });
    }
    
    // 檢查用戶是否存在
    const userResult = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND is_active = true',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用戶不存在'
      });
    }
    
    // 插入或更新聊天記錄
    const result = await pool.query(`
      INSERT INTO chats (user_id, chat_id, title, messages, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, chat_id)
      DO UPDATE SET
        title = EXCLUDED.title,
        messages = EXCLUDED.messages,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, [userId, chatId, title, JSON.stringify(messages)]);
    
    res.json({
      success: true,
      message: '聊天記錄已保存',
      chatId: result.rows[0].id
    });
    
  } catch (err) {
    console.error('保存聊天記錄錯誤:', err);
    res.status(500).json({
      success: false,
      message: '服務器錯誤，請稍後再試'
    });
  }
});

// 獲取用戶聊天記錄列表API
app.get('/api/chat/list/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(`
      SELECT chat_id, title, created_at, updated_at
      FROM chats 
      WHERE user_id = $1 
      ORDER BY updated_at DESC
    `, [userId]);
    
    const chats = result.rows.map(row => ({
      chatId: row.chat_id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    res.json({
      success: true,
      chats: chats
    });
    
  } catch (err) {
    console.error('獲取聊天記錄列表錯誤:', err);
    res.status(500).json({
      success: false,
      message: '服務器錯誤，請稍後再試'
    });
  }
});

// 獲取特定聊天記錄API
app.get('/api/chat/:userId/:chatId', async (req, res) => {
  try {
    const { userId, chatId } = req.params;
    
    const result = await pool.query(`
      SELECT chat_id, title, messages, created_at, updated_at
      FROM chats 
      WHERE user_id = $1 AND chat_id = $2
    `, [userId, chatId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '聊天記錄不存在'
      });
    }
    
    const chat = result.rows[0];
    
    res.json({
      success: true,
      chat: {
        chatId: chat.chat_id,
        title: chat.title,
        messages: chat.messages,
        createdAt: chat.created_at,
        updatedAt: chat.updated_at
      }
    });
    
  } catch (err) {
    console.error('獲取聊天記錄錯誤:', err);
    res.status(500).json({
      success: false,
      message: '服務器錯誤，請稍後再試'
    });
  }
});

// 刪除聊天記錄API
app.delete('/api/chat/:userId/:chatId', async (req, res) => {
  try {
    const { userId, chatId } = req.params;
    
    const result = await pool.query(`
      DELETE FROM chats 
      WHERE user_id = $1 AND chat_id = $2
      RETURNING id
    `, [userId, chatId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '聊天記錄不存在'
      });
    }
    
    res.json({
      success: true,
      message: '聊天記錄已刪除'
    });
    
  } catch (err) {
    console.error('刪除聊天記錄錯誤:', err);
    res.status(500).json({
      success: false,
      message: '服務器錯誤，請稍後再試'
    });
  }
});

// 健康檢查API
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API服務正常運行',
    timestamp: new Date().toISOString()
  });
});

// 啟動服務器
app.listen(port, () => {
  console.log(`用戶API服務運行在 http://localhost:${port}`);
});

module.exports = app;
