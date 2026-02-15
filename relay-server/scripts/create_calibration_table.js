const db = require('../src/config/db.config');

async function migrate() {
    try {
        console.log("Ensuring 'users' table exists...");
        await db.query(`
            CREATE TABLE IF NOT EXISTS \`users\` (
              \`id\` INT NOT NULL AUTO_INCREMENT,
              \`username\` VARCHAR(50) NOT NULL,
              \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (\`id\`),
              UNIQUE INDEX \`username_UNIQUE\` (\`username\` ASC)
            ) ENGINE = InnoDB;
        `);

        // Ensure default user exists
        await db.query(`INSERT IGNORE INTO \`users\` (\`id\`, \`username\`) VALUES (1, 'Guest')`);

        console.log("Creating 'calibration_profiles' table...");

        await db.query(`
            CREATE TABLE IF NOT EXISTS \`calibration_profiles\` (
              \`id\` INT NOT NULL AUTO_INCREMENT,
              \`user_id\` INT NOT NULL,
              \`profile_name\` VARCHAR(100) NOT NULL,
              \`calibration_data\` JSON NOT NULL,
              \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (\`id\`),
              INDEX \`fk_profiles_users_idx\` (\`user_id\` ASC),
              CONSTRAINT \`fk_profiles_users\`
                FOREIGN KEY (\`user_id\`)
                REFERENCES \`users\` (\`id\`)
                ON DELETE CASCADE
                ON UPDATE CASCADE
            ) ENGINE = InnoDB;
        `);

        console.log("Migration successful.");
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
}

migrate();
