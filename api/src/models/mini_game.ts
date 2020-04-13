import { executeQuery } from '../includes/db';

export interface MiniGame {
  id?: string;
  name: string;
  variables?: Array<string>;
}

export async function GetMiniGame(id: string) {
  let r;
  try {
    r = await executeQuery(
      'SELECT * FROM mini_games WHERE mini_games.id = $1',
      [id]
    );
  } catch (err) {
    console.error(err);
    throw err;
  }
  if (r.rowCount == 0) {
    throw new MiniGameNotFound();
  }
  return r.rows[0];
}

export async function GetAllMiniGames() {
  let r;
  try {
    r = await executeQuery('SELECT * FROM mini_games', []);
  } catch (err) {
    throw err;
  }
  return r.rows;
}

export class MiniGameNotFound implements Error {
  name: string;
  message: string;
  stack?: string;
  constructor(message?: string) {
    this.name = 'MiniGameNotFoundError';
    this.message = message;
  }
}
