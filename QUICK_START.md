# 快速開始指南

## 🚀 5分鐘設置BytePlus RDS

### 步驟1：註冊BytePlus賬號
1. 前往：https://www.byteplus.com/
2. 點擊"註冊"或"Sign Up"
3. 完成郵箱驗證

### 步驟2：創建PostgreSQL實例
1. 登入控制台：https://console.byteplus.com/
2. 搜索"RDS"或"數據庫"
3. 點擊"創建實例"
4. 選擇PostgreSQL
5. 填寫基本信息：
   - 實例名稱：`ai-workspace-db`
   - 數據庫名：`aiworkspace`
   - 用戶名：`admin`
   - 密碼：`設置一個強密碼`
6. 點擊"創建"

### 步驟3：獲取連接信息
1. 等待實例創建完成（5-10分鐘）
2. 進入實例詳情頁面
3. 找到"連接信息"部分
4. 記錄以下信息：
   - 主機地址（Host）
   - 端口（Port，通常是5432）
   - 數據庫名稱
   - 用戶名
   - 密碼

### 步驟4：配置安全組
1. 在實例詳情頁面找到"安全組"
2. 點擊"編輯規則"
3. 添加入站規則：
   - 類型：PostgreSQL
   - 端口：5432
   - 源：0.0.0.0/0

### 步驟5：更新代碼配置
1. 編輯 `user-api.js` 文件
2. 找到第14-22行的數據庫配置
3. 替換為你的實際信息：

```javascript
const pool = new Pool({
  user: 'admin',                    // 你的用戶名
  host: 'your-host-address',        // 你的主機地址
  database: 'aiworkspace',          // 你的數據庫名
  password: 'your-password',        // 你的密碼
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
});
```

### 步驟6：測試連接
```bash
npm install
npm run test-db
```

如果看到"✅ 數據庫連接成功！"，說明配置正確。

### 步驟7：啟動應用
```bash
npm start
```

然後在另一個終端運行：
```bash
npm run proxy
```

### 步驟8：打開瀏覽器
訪問：http://localhost:3000

## 🔧 故障排除

### 連接被拒絕
- 檢查安全組是否開放5432端口
- 確認實例狀態為"運行中"

### SSL錯誤
- 確保 `ssl: { rejectUnauthorized: false }` 配置正確

### 找不到實例
- 確認選擇了正確的地域
- 等待實例完全啟動

## 📞 需要幫助？

1. 查看詳細指南：`BYTEPLUS_SETUP_GUIDE.md`
2. 運行測試：`npm run test-db`
3. 檢查控制台日誌
4. 聯繫BytePlus技術支持

## 💰 費用說明

- BytePlus通常提供免費試用額度
- 最低配置實例費用很低
- 建議先使用最低配置測試
