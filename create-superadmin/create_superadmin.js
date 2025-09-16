// create_superadmin.js
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    // 👇 Update the connection string if needed (right now it's your DB settings)
    const pool = new Pool({
      connectionString: 'postgresql://postgres:123@localhost:5432/civic_db'
    });

    // Defaults — you can override by passing arguments
    const email = process.argv[2] || 'superadmin@civic.com';
    const password = process.argv[3] || 'SuperAdmin@123';
    const department = 'ALL';

    const passwordHash = await bcrypt.hash(password, 10);

    const insertQuery = `
      INSERT INTO admins (email, password_hash, department)
      VALUES ($1, $2, $3)
      RETURNING id, email, department;
    `;
    const { rows } = await pool.query(insertQuery, [email, passwordHash, department]);

    console.log('✅ Super admin created:', rows[0]);
    await pool.end();
  } catch (err) {
    console.error('❌ Error creating super admin:', err.message || err);
    process.exit(1);
  }
})();
