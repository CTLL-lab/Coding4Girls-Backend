import { executeQuery } from '../includes/db';
import { QueryResult } from 'pg';
import {
  AppendChallengeToTheEndOfOrderArray,
  RemoveChallengeFromOrder
} from './lobby';

export interface Challenge {
  id?: string;
  name: string;
  description: string;
  lobbyid: string;
  variables: object;
  minigame: string;
  miniGameCategory: string;
  snapTemplate?: string;
  page?: string;
  solved?: string;
  tag?: string;
}

/**
 * Fetches the challenge from the database
 * @export
 * @param {string} challengeID
 * @returns
 */
export async function GetChallenge(challengeID: string): Promise<Challenge> {
  let r;
  try {
    r = await executeQuery(
      'SELECT id,name,lobbyid,variables,minigame,description,minigame_category,tag FROM challenge WHERE challenge.id = $1',
      [challengeID]
    );
  } catch (err) {
    throw err;
  }
  if (r.rowCount == 0) {
    throw new ChallengeNotFound();
  }
  return r.rows[0];
}

export async function GetChallengeLevels(challengeID: string) {
  let levels;
  try {
    levels = await executeQuery(
      'SELECT * FROM challenge_levels WHERE challengeid = $1',
      [challengeID]
    );
  } catch (err) {
    throw err;
  }
  if (levels.rowCount == 0) {
    throw new ChallengeNotFound();
  }
  return levels.rows;
}

export async function ChangeChallengeLevel(challengeID: string, level: any) {
  try {
    const lvl = await executeQuery(
      'UPDATE challenge_levels SET instructions = $1, snap = $2, snap_solution = $3, ord = $4, solution_enabled = $7 WHERE challengeid = $5 AND id = $6',
      [
        level['instructions'],
        level['snap'],
        level['snapSolution'],
        level['order'],
        challengeID,
        level['id'],
        level['solutionEnabled']
      ]
    );
  } catch (err) {
    throw err;
  }
  return true;
}

export async function CreateChallengeLevel(challengeID: string, level: any) {
  try {
    const lvl = await executeQuery(
      'INSERT INTO challenge_levels (instructions,snap,snap_solution, ord,challengeid, solution_enabled) VALUES ($1,$2,$3,$4,$5,$6);',
      [
        level['instructions'],
        level['snap'],
        level['snapSolution'],
        level['order'],
        challengeID,
        level['solutionEnabled']
      ]
    );
  } catch (err) {
    throw err;
  }
  return true;
}

export async function DeleteChallengeLevel(
  challengeID: string,
  levelID: string
) {
  let r;
  try {
    r = await executeQuery(
      'DELETE FROM challenge_levels WHERE id =$1 AND challengeid = $2',
      [levelID, challengeID]
    );
    return true;
  } catch (err) {
    throw err;
  }
}

export async function CreateNewChallenge(challenge: Challenge) {
  let r;
  try {
    r = await executeQuery(
      'INSERT INTO challenge(name,lobbyid,minigame,description,variables,minigame_category,tag) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id;',
      [
        challenge.name,
        challenge.lobbyid,
        challenge.minigame,
        challenge.description,
        challenge.variables,
        challenge.miniGameCategory,
        challenge.tag
      ]
    );
  } catch (err) {
    throw err;
  }
  AppendChallengeToTheEndOfOrderArray(challenge.lobbyid, r.rows[0]['id']);
  if (r.rowCount == 0) {
    throw new ChallengeNotCreated();
  }
  return r.rows[0]['id'];
}

export async function CloneChallenge(
  challengeID: string,
  lobbyID: string
): Promise<string> {
  let r;
  try {
    r = await executeQuery(
      'INSERT INTO challenge(name,minigame,description,variables,minigame_category,lobbyid,tag) SELECT name,minigame,description,variables,minigame_category,$2,tag FROM challenge WHERE id = $1 RETURNING id;',
      [challengeID, lobbyID]
    );
    const newID = r.rows[0].id;

    await executeQuery(
      'INSERT INTO challenge_levels (instructions, snap,snap_solution, challengeid, ord)  (SELECT instructions, snap,snap_solution, $1, ord FROM challenge_levels WHERE challengeid = $2);',
      [newID, challengeID]
    );

    return newID;
  } catch (err) {
    console.error(err);
    throw err;
  }
}
export async function UpdateChallenge(challenge: Challenge) {
  let r;
  try {
    r = await executeQuery(
      'UPDATE challenge SET name = $2, minigame = $3, description = $4,variables = $5, minigame_category=$6, tag=$7 WHERE id = $1',
      [
        challenge.id,
        challenge.name,
        challenge.minigame,
        challenge.description,
        challenge.variables,
        challenge.miniGameCategory,
        challenge.tag
      ]
    );
  } catch (err) {
    throw err;
  }
  if (r.rowCount == 0) {
    throw new ChallengeNotFound();
  }
  return true;
}

export async function GetChallengePage(challengeID: string, levelID: string) {
  try {
    let r: QueryResult;
    r = await executeQuery(
      'SELECT challenge_levels.instructions FROM challenge_levels WHERE challenge_levels.challengeid = $1 AND challenge_levels.id = $2',
      [challengeID, levelID]
    );
    return r.rows[0]['instructions'];
  } catch (err) {
    throw err;
  }
}

export async function GetChallengeSnapTemplate(
  challengeID: string,
  levelID: string
) {
  try {
    let r: QueryResult;
    r = await executeQuery(
      'SELECT challenge_levels.snap FROM challenge_levels WHERE challenge_levels.id = $2 AND challenge_levels.challengeid=$1',
      [challengeID, levelID]
    );
    return r.rows[0]['snap'];
  } catch (err) {
    throw err;
  }
}

export async function GetChallengeSnapSolution(
  challengeID: string,
  levelID: string
) {
  try {
    let r: QueryResult;
    r = await executeQuery(
      'SELECT challenge_levels.snap_solution FROM challenge_levels WHERE challenge_levels.id = $2 AND challenge_levels.challengeid=$1',
      [challengeID, levelID]
    );
    return r.rows[0]['snap_solution'];
  } catch (err) {
    throw err;
  }
}

export async function GetChallengeLobbyID(
  challengeID: string
): Promise<number> {
  try {
    let r: QueryResult;
    r = await executeQuery(
      'SELECT challenge.lobbyid FROM challenge WHERE challenge.id = $1',
      [challengeID]
    );
    if (r.rowCount > 0) {
      return r.rows[0]['lobbyid'];
    } else {
      return undefined;
    }
  } catch (err) {
    throw err;
  }
}

export async function DeleteChallenge(challengeID: string) {
  let r;
  try {
    r = await executeQuery(
      'DELETE FROM challenge WHERE challenge.id =$1 RETURNING lobbyid',
      [challengeID]
    );

    if (r.rowCount > 0) {
      RemoveChallengeFromOrder(r.rows[0]['lobbyid'], challengeID);
      return true;
    } else {
      return false;
    }
  } catch (err) {
    throw err;
  }
}

export async function UpdateChallengePage(challengeID: string, page: string) {
  let r;
  try {
    r = await executeQuery(
      'UPDATE challenge SET page_after = $2 WHERE id = $1',
      [challengeID, JSON.stringify(page)]
    );
  } catch (err) {
    throw err;
  }
  if (r.rowCount == 0) {
    throw new ChallengeNotFound();
  }
  return true;
}

export async function UpdateChallengeSnapTemplate(
  challengeID: string,
  snapTemplate: string
) {
  let r;
  try {
    r = await executeQuery(
      'UPDATE challenge SET snap_template = $2 WHERE id = $1',
      [challengeID, snapTemplate]
    );
  } catch (err) {
    throw err;
  }
  if (r.rowCount == 0) {
    throw new ChallengeNotFound();
  }
  return true;
}

export class ChallengeNotFound implements Error {
  name: string;
  message: string;
  stack?: string;
  constructor(message?: string) {
    this.name = 'ChallengeNotFoundError';
    this.message = message;
  }
}

export class ChallengeNotCreated implements Error {
  name: string;
  message: string;
  stack?: string;
  constructor(message?: string) {
    this.name = 'ChallengeNotCreatedError';
    this.message = message;
  }
}
