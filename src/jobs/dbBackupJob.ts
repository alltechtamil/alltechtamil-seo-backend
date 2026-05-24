import cron from 'node-cron';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { Readable, PassThrough } from 'stream';
import fs from 'fs';
import path from 'path';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';
import { transporter } from '../config/mail.config';
import { config } from '../config/env.config';
import logger from '../utils/logger';

/**
 * Generates a timestamped filename for the backup.
 * Format: alltechtamil_backup_2026-05-23_21-00-00.json.gz
 */
const generateBackupFilename = (): string => {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[T:]/g, '-').replace(/\..+/, '');
  return `alltechtamil_backup_${timestamp}.json.gz`;
};

/**
 * Retrieves all user-created table names from the public schema.
 * Excludes Sequelize internal tables (SequelizeMeta, SequelizeData).
 */
const getTableNames = async (): Promise<string[]> => {
  const results = await sequelize.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables 
     WHERE schemaname = 'public' 
     AND tablename NOT LIKE 'Sequelize%'
     ORDER BY tablename`,
    { type: QueryTypes.SELECT }
  );
  return results.map((r) => r.tablename);
};

/**
 * Exports all rows from a single table as an array of objects.
 *
 * @param tableName - PostgreSQL table name
 * @returns Object containing tableName, rowCount, and rows data
 */
const exportTable = async (tableName: string): Promise<{ table: string; rowCount: number; rows: unknown[] }> => {
  const rows = await sequelize.query(`SELECT * FROM "${tableName}"`, {
    type: QueryTypes.SELECT,
  });
  return { table: tableName, rowCount: rows.length, rows };
};

/**
 * Builds the full backup payload by iterating all tables and packaging
 * them into a single JSON structure with metadata.
 */
const buildBackupPayload = async (): Promise<string> => {
  const tables = await getTableNames();
  const backup: {
    metadata: {
      timestamp: string;
      database: string;
      host: string;
      environment: string;
      tableCount: number;
      tables: string[];
    };
    data: Record<string, { rowCount: number; rows: unknown[] }>;
  } = {
    metadata: {
      timestamp: new Date().toISOString(),
      database: config.database.name,
      host: config.database.host,
      environment: config.server.env,
      tableCount: tables.length,
      tables,
    },
    data: {},
  };

  for (const tableName of tables) {
    const { rowCount, rows } = await exportTable(tableName);
    backup.data[tableName] = { rowCount, rows };
    logger.info(`  → Exported table "${tableName}": ${rowCount} rows`);
  }

  return JSON.stringify(backup, null, 2);
};

/**
 * Compresses a JSON string using gzip and writes to disk.
 *
 * @param jsonData - The raw JSON string to compress
 * @param outputPath - Absolute path for the output .json.gz file
 */
const compressAndWrite = async (jsonData: string, outputPath: string): Promise<void> => {
  const readable = Readable.from([jsonData]);
  const gzip = createGzip({ level: 9 }); // Maximum compression
  const output = fs.createWriteStream(outputPath);

  // Use a PassThrough to bridge Readable and gzip cleanly
  const passthrough = new PassThrough();
  readable.pipe(passthrough);

  await pipeline(passthrough, gzip, output);
};

/**
 * Sends the backup file as an email attachment to the admin.
 *
 * @param filePath - Absolute path to the .json.gz backup file
 * @param filename - Human-readable filename for the email attachment
 * @param tableCount - Number of tables exported
 * @param totalRows - Total rows across all tables
 */
const sendBackupEmail = async (
  filePath: string,
  filename: string,
  tableCount: number,
  totalRows: number
): Promise<void> => {
  const timestamp = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const fileSizeBytes = fs.statSync(filePath).size;
  const fileSizeKB = (fileSizeBytes / 1024).toFixed(2);

  await transporter.sendMail({
    from: `"AllTechTamil DB Backup" <${config.mail.from}>`,
    to: config.mail.from,
    subject: `[DB BACKUP] AllTechTamil — ${config.server.env} | ${timestamp}`,
    html: `
      <div style="font-family:Arial,sans-serif;padding:20px;background:#f9f9f9;border-radius:8px;">
        <h2 style="color:#2c3e50;margin-top:0;">🗄️ Weekly Database Backup</h2>
        <table style="border-collapse:collapse;width:100%;max-width:500px;">
          <tr>
            <td style="padding:8px 12px;font-weight:bold;color:#555;">Environment</td>
            <td style="padding:8px 12px;color:#333;">${config.server.env}</td>
          </tr>
          <tr style="background:#f0f0f0;">
            <td style="padding:8px 12px;font-weight:bold;color:#555;">Database</td>
            <td style="padding:8px 12px;color:#333;">${config.database.name}@${config.database.host}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-weight:bold;color:#555;">Tables Exported</td>
            <td style="padding:8px 12px;color:#333;">${tableCount}</td>
          </tr>
          <tr style="background:#f0f0f0;">
            <td style="padding:8px 12px;font-weight:bold;color:#555;">Total Rows</td>
            <td style="padding:8px 12px;color:#333;">${totalRows.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-weight:bold;color:#555;">File Size</td>
            <td style="padding:8px 12px;color:#333;">${fileSizeKB} KB</td>
          </tr>
          <tr style="background:#f0f0f0;">
            <td style="padding:8px 12px;font-weight:bold;color:#555;">Timestamp</td>
            <td style="padding:8px 12px;color:#333;">${timestamp}</td>
          </tr>
        </table>
        <p style="margin-top:20px;color:#999;font-size:12px;">
          This is an automated backup from the AllTechTamil Blogger system. 
          The compressed JSON dump is attached. To restore, decompress with <code>gunzip</code> and parse the JSON.
        </p>
      </div>
    `.trim(),
    attachments: [
      {
        filename,
        path: filePath,
        contentType: 'application/gzip',
      },
    ],
  });
};

/**
 * Core backup execution function.
 * 1. Queries all table data via Sequelize (no pg_dump dependency)
 * 2. Serialises into a structured JSON payload
 * 3. Compresses with gzip (level 9 — max compression)
 * 4. Emails the .json.gz as an attachment
 * 5. Cleans up the local file in a finally block
 */
const executeBackup = async (): Promise<void> => {
  const filename = generateBackupFilename();
  const backupDir = path.join(__dirname, '../../backups');
  const filePath = path.join(backupDir, filename);

  // Ensure backups directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const startTime = Date.now();

  try {
    // Step 1: Export all table data via Sequelize
    logger.info(`CronJob [DBBackup]: Building backup payload from Sequelize...`);
    const jsonData = await buildBackupPayload();

    // Calculate total rows for the email summary
    const parsed = JSON.parse(jsonData);
    const totalRows = Object.values(parsed.data as Record<string, { rowCount: number }>).reduce(
      (sum, table) => sum + table.rowCount,
      0
    );
    const tableCount = parsed.metadata.tableCount;

    // Step 2: Compress and write to disk
    logger.info(`CronJob [DBBackup]: Compressing to ${filename}...`);
    await compressAndWrite(jsonData, filePath);

    const fileSizeKB = (fs.statSync(filePath).size / 1024).toFixed(2);
    logger.info(
      `CronJob [DBBackup]: Backup created (${fileSizeKB} KB, ${tableCount} tables, ${totalRows} rows). Sending email...`
    );

    // Step 3: Email the backup
    await sendBackupEmail(filePath, filename, tableCount, totalRows);
    const duration = Date.now() - startTime;
    logger.info(`CronJob [DBBackup]: Backup emailed successfully in ${duration}ms.`);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`CronJob [DBBackup]: Failed after ${duration}ms: ${(error as Error).message}`, {
      stack: (error as Error).stack,
    });
  } finally {
    // Step 4: Cleanup — always remove the local file to save disk space
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`CronJob [DBBackup]: Cleaned up local backup file: ${filename}`);
      }
    } catch (cleanupError) {
      logger.error(`CronJob [DBBackup]: Failed to cleanup file: ${(cleanupError as Error).message}`);
    }
  }
};

/**
 * Initializes and schedules the Database Backup Cron Job.
 * Default schedule: Every Sunday at midnight (0 0 * * 0)
 * Configurable via CRON_DB_BACKUP_SCHEDULE in .env
 */
export const scheduleDbBackupJob = (): void => {
  const schedule = config.cron.dbBackupSchedule;
  cron.schedule(schedule, async () => {
    logger.info('CronJob [DBBackup]: Starting weekly database backup...');
    await executeBackup();
  });

  logger.info(`Cron schedule initialized: DBBackup (${schedule})`);
};

export default scheduleDbBackupJob;
