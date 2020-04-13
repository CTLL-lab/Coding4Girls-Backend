import { Pool, PoolClient, QueryResult } from 'pg';
import {
  databasePASSWORD,
  databaseDB,
  databaseURL,
  databaseUSER,
  databasePORT
} from '../config';
import { Router } from 'express';

const dbpool = new Pool({
  user: databaseUSER,
  host: databaseURL,
  database: databaseDB,
  password: databasePASSWORD,
  port: databasePORT
});

export async function getDBClient() {
  return dbpool.connect();
}

export async function executeQuery(
  query: string,
  params: any[]
): Promise<QueryResult> {
  let client: PoolClient;
  try {
    client = await getDBClient();
  } catch (err) {
    console.error('Failed to get client:', err);
    throw new Error();
  }
  try {
    const result = await client.query(query, params);
    client.release();
    return result;
  } catch (err) {
    console.error('Error in query:', err);
    console.error('Returning client');
    client.release();
    throw err;
  }
}

module.exports;
