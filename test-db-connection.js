// 數據庫連接測試腳本
// 運行此腳本來測試你的BytePlus RDS連接

const { Pool } = require('pg');

// 使用與user-api.js相同的配置
const pool = new Pool({
  user: 'ad-user-01',              // 你的數據庫用戶名
  host: '150.5.148.44',            // 你的BytePlus RDS主機地址
  database: 'Ai_Homeworksystem',       // 請替換為你的數據庫名稱
  password: 'Ad37033703',       // 請替換為你的數據庫密碼
  port: 5432                      // PostgreSQL默認端口
});

async function testConnection() {
  console.log('正在測試數據庫連接...');
  console.log('配置信息：');
  console.log('- 主機:', pool.options.host);
  console.log('- 端口:', pool.options.port);
  console.log('- 數據庫:', pool.options.database);
  console.log('- 用戶:', pool.options.user);
  console.log('');

  try {
    // 測試連接
    const client = await pool.connect();
    console.log('✅ 數據庫連接成功！');
    
    // 測試查詢
    const result = await client.query('SELECT version()');
    console.log('✅ 查詢測試成功！');
    console.log('PostgreSQL版本:', result.rows[0].version);
    
    // 檢查是否存在users表
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ users表已存在');
    } else {
      console.log('ℹ️  users表不存在，將在首次運行API時自動創建');
    }
    
    client.release();
    console.log('');
    console.log('🎉 所有測試通過！你的數據庫配置正確。');
    console.log('現在可以運行: npm start');
    
  } catch (error) {
    console.error('❌ 數據庫連接失敗！');
    console.error('錯誤信息:', error.message);
    console.log('');
    console.log('請檢查以下項目：');
    console.log('1. 確認BytePlus RDS實例正在運行');
    console.log('2. 檢查主機地址是否正確');
    console.log('3. 檢查用戶名和密碼是否正確');
    console.log('4. 檢查安全組是否開放5432端口');
    console.log('5. 檢查網絡連接');
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 運行測試
testConnection();
