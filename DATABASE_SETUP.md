# BytePlus RDS PostgreSQL 數據庫設置指南

## 1. 獲取數據庫連接信息

從你的BytePlus控制台獲取以下信息：
- 主機地址 (Host)
- 端口 (Port) - 通常是 5432
- 數據庫名稱 (Database Name)
- 用戶名 (Username)
- 密碼 (Password)

## 2. 配置數據庫連接

編輯 `user-api.js` 文件，更新以下配置：

```javascript
const pool = new Pool({
  user: 'ad-user-01',           // 替換為你的數據庫用戶名
  host: '150.5.148.44',               // 替換為你的BytePlus RDS主機地址
  database: 'Ai_Homeworksystem',       // 替換為你的數據庫名稱
  password: 'Ad37033703',       // 替換為你的數據庫密碼
  port: 5432,                      // PostgreSQL默認端口
  ssl: {
    rejectUnauthorized: false      // 對於雲端數據庫可能需要SSL
  }
});
```

## 3. 數據庫表結構

系統會自動創建以下表：

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);
```

## 4. 啟動服務

1. 運行 `start-all.bat` 啟動所有服務
2. 或者分別運行：
   - `npm start` - 啟動用戶API服務
   - `npm run proxy` - 啟動代理服務

## 5. API 端點

- `POST /api/register` - 用戶註冊
- `POST /api/login` - 用戶登入
- `GET /api/user/:id` - 獲取用戶信息
- `GET /api/health` - 健康檢查

## 6. 安全注意事項

1. 密碼使用 bcrypt 加密存儲
2. 支持用戶名或郵箱登入
3. 包含基本的輸入驗證
4. 建議在生產環境中使用環境變量存儲敏感信息

## 7. 故障排除

如果遇到連接問題：
1. 檢查防火牆設置
2. 確認BytePlus RDS實例正在運行
3. 驗證連接信息是否正確
4. 檢查SSL設置是否合適
