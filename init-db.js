const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function initDB() {
  // Try multiple pooler regions
  const regions = [
    'aws-0-eu-west-1',
    'aws-0-eu-west-2', 
    'aws-0-us-east-1',
    'aws-0-eu-central-1',
    'aws-0-ap-southeast-1',
  ];

  for (const region of regions) {
    const url = `postgresql://postgres.heotivjrctzmhniffpgd:ilove.mumu047@${region}.pooler.supabase.com:5432/postgres`;
    console.log(`Trying ${region}...`);
    const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000 });
    try {
      await client.connect();
      console.log(`Connected via ${region}!`);

      const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
      await client.query(schema);
      console.log('Schema created successfully');

      const res = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`);
      console.log('Tables:');
      res.rows.forEach(r => console.log(`   - ${r.table_name}`));

      const stats = await client.query('SELECT * FROM system_stats');
      console.log('System stats:');
      stats.rows.forEach(r => console.log(`   - ${r.key}: ${r.value}`));

      await client.end();
      console.log(`\nUse this DATABASE_URL:\n${url}`);
      return;
    } catch (err) {
      console.log(`  Failed: ${err.message}`);
      try { await client.end(); } catch(e) {}
    }
  }
  console.log('All regions failed. The project might use a different pooler format.');
}

initDB();
