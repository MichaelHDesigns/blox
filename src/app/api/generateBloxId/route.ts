import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

export async function POST(request: Request) {
  try {
    const { dynamic_id, wallet_address } = await request.json();

    // Function to generate a new Blox ID as an incrementing integer
    async function generateBloxId(): Promise<number> {
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });

      // Get the current max Blox ID
      const [rows] = await connection.execute('SELECT MAX(blox_id) AS max_id FROM users');
      const maxId = rows[0]?.max_id || 0;

      await connection.end();

      return maxId + 1;
    }

    // Function to check if a Blox ID already exists for the dynamic_id
    async function getBloxIdForDynamicId(dynamic_id: string): Promise<number | null> {
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });

      const [rows] = await connection.execute('SELECT blox_id FROM users WHERE dynamic_id = ?', [dynamic_id]);
      await connection.end();

      if (rows.length > 0) {
        return rows[0]?.blox_id || null;
      }

      return null;
    }

    // Function to save the Blox ID for the user
    async function saveBloxId(dynamic_id: string, blox_id: number, wallet_address: string) {
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });

      await connection.execute(
        'INSERT INTO users (dynamic_id, blox_id, wallet_address) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE wallet_address = VALUES(wallet_address)',
        [dynamic_id, blox_id, wallet_address]
      );

      await connection.end();
    }

    let bloxId = await getBloxIdForDynamicId(dynamic_id);

    if (!bloxId) {
      bloxId = await generateBloxId();
      await saveBloxId(dynamic_id, bloxId, wallet_address);
    }

    // Return the generated or existing Blox ID
    return NextResponse.json({ blox_id: bloxId });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}