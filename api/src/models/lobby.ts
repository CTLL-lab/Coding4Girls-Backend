import { executeQuery } from '../includes/db';
import { QueryResult } from 'pg';
import { UserMinimum } from './user';
import { Challenge, CloneChallenge } from './challenge';
import {
  CreateANewNoteForLobby,
  GetAllNotesForLobby,
  CloneNoteForLobby
} from './note';

export interface Lobby {
  id?: string;
  name: string;
  description: string;
  code?: string;
  outcome: string;
  createdby?: string;
  createdat?: string;
  members?: Array<UserMinimum>;
  locked?: boolean;
  snapTemplate: string;
  instructions: any;
  finishPage?: any;
  notes?: Array<any>;
  public?: boolean;
  tag: string;
  language: string;
}

export async function CreateNewLobby(lobby: Lobby): Promise<boolean> {
  let res;
  try {
    res = await executeQuery(
      'INSERT INTO lobby (name,description,code,outcome,createdby,snap_template,page_before,public,tag,language,page_after) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id;',
      [
        lobby.name,
        lobby.description,
        lobby.code.toLowerCase(),
        lobby.outcome,
        lobby.createdby,
        lobby.snapTemplate,
        lobby.instructions,
        lobby.public,
        lobby.tag,
        lobby.language,
        lobby.finishPage
      ]
    );
    if (
      res.rows &&
      res.rows.length > 0 &&
      lobby.notes &&
      lobby.notes.length > 0
    ) {
      const lobbyID = res.rows[0]['id'];
      lobby.notes.map(x => {
        CreateANewNoteForLobby(x, lobbyID);
      });
    }
  } catch (err) {
    if (err.constraint == 'code_unique') {
      throw new CodeInUseException(
        'Code ' + lobby.code + ' is already in use!'
      );
    }
    throw err;
  }
  return res.rowCount > 0 ? true : false;
}

export async function GetAllLobbies(
  page: string,
  limit: string,
  creatorID: number = -1
) {
  try {
    let r;
    if (creatorID == -1) {
      r = await executeQuery(
        'SELECT * FROM lobby ORDER BY id OFFSET $1 LIMIT $2;',
        [Number(page) * Number(limit), limit]
      );
    } else {
      r = await executeQuery(
        'SELECT * FROM lobby WHERE lobby.createdby = $3 ORDER BY id OFFSET $1 LIMIT $2;',
        [Number(page) * Number(limit), limit, creatorID]
      );
    }
    return r.rows;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function GetPublicLobbies(page: string, limit: string) {
  try {
    let r;
    let totalResultLobbies;
    r = await executeQuery(
      'SELECT lobby.id,lobby.name,lobby.code,lobby.description,lobby.createdby,lobby.outcome,lobby.ord,ARRAY_AGG(DISTINCT challenge.tag) as challengetags,lobby.tag,lobby.language FROM lobby LEFT JOIN challenge ON challenge.lobbyid = lobby.id WHERE public = TRUE GROUP BY lobby.id ORDER BY id DESC OFFSET $1 LIMIT $2;',
      [Number(page) * Number(limit), limit]
    );
    totalResultLobbies = await executeQuery(
      'SELECT count(*) FROM lobby WHERE public = TRUE;',
      []
    );
    return { lobbies: r.rows, totalCount: totalResultLobbies.rows[0]['count'] };
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function SearchForLobby(
  query: string,
  page: string,
  limit: string,
  creatorID: number = -1
) {
  let res;
  try {
    if (creatorID != -1) {
      res = await executeQuery(
        'SELECT id,name FROM lobby WHERE (lobby.name ILIKE $1 OR lobby.description ILIKE $1) AND lobby.createdby = $4 ORDER BY id OFFSET $2 LIMIT $3;',
        ['%' + query + '%', Number(page) * Number(limit), limit, creatorID]
      );
    } else {
      res = await executeQuery(
        'SELECT id,name FROM lobby WHERE lobby.name ILIKE $1 OR lobby.description ILIKE $1 ORDER BY id OFFSET $2 LIMIT $3;',
        ['%' + query + '%', Number(page) * Number(limit), limit]
      );
    }
  } catch (err) {
    console.error(err);
  }
  return res.rows;
}

export async function SearchForPublicLobby(
  query: string,
  page: string,
  limit: string,
  language: string = undefined,
  tag: string = undefined
) {
  let res;
  let totalResultLobbies;
  try {
    if (language && query && tag) {
      res = await executeQuery(
        'SELECT id,name,description,language,tag FROM lobby WHERE public = TRUE AND (lobby.name ILIKE $1 OR lobby.description ILIKE $1) AND language = $4 AND (tag ILIKE $5) ORDER BY id OFFSET $2 LIMIT $3;',
        [
          '%' + query + '%',
          Number(page) * Number(limit),
          limit,
          language,
          '%' + tag + '%'
        ]
      );
      totalResultLobbies = await executeQuery(
        'SELECT count(*) FROM lobby WHERE public = TRUE AND (lobby.name ILIKE $1 OR lobby.description ILIKE $1) AND language = $2 AND (tag ILIKE $3);',
        ['%' + query + '%', language, '%' + tag + '%']
      );
    } else if (language && query) {
      res = await executeQuery(
        'SELECT id,name,description,language,tag FROM lobby WHERE public = TRUE AND (lobby.name ILIKE $1 OR lobby.description ILIKE $1) AND language = $4 ORDER BY id OFFSET $2 LIMIT $3;',
        ['%' + query + '%', Number(page) * Number(limit), limit, language]
      );
      totalResultLobbies = await executeQuery(
        'SELECT count(*) FROM lobby WHERE public = TRUE AND (lobby.name ILIKE $1 OR lobby.description ILIKE $1) AND language = $2;',
        ['%' + query + '%', language]
      );
    } else if (language && tag) {
      res = await executeQuery(
        'SELECT id,name,description,language,tag FROM lobby WHERE public = TRUE AND (lobby.tag ILIKE $1) AND language = $4 ORDER BY id OFFSET $2 LIMIT $3;',
        ['%' + tag + '%', Number(page) * Number(limit), limit, language]
      );
      totalResultLobbies = await executeQuery(
        'SELECT count(*) FROM lobby WHERE public = TRUE AND (lobby.tag ILIKE $1) AND language = $2;',
        ['%' + tag + '%', language]
      );
    } else if (query && tag) {
      res = await executeQuery(
        'SELECT id,name,description,language,tag FROM lobby WHERE public = TRUE AND (lobby.name ILIKE $1 OR lobby.description ILIKE $1) AND tag ILIKE $4 ORDER BY id OFFSET $2 LIMIT $3;',
        [
          '%' + query + '%',
          Number(page) * Number(limit),
          limit,
          '%' + tag + '%'
        ]
      );
      totalResultLobbies = await executeQuery(
        'SELECT count(*) FROM lobby WHERE public = TRUE AND (lobby.name ILIKE $1 OR lobby.description ILIKE $1) AND tag ILIKE $2;',
        ['%' + query + '%', '%' + tag + '%']
      );
    } else if (query) {
      res = await executeQuery(
        'SELECT id,name,description,language,tag FROM lobby WHERE public = TRUE AND (lobby.name ILIKE $1 OR lobby.description ILIKE $1 OR lobby.tag ILIKE $1) ORDER BY id OFFSET $2 LIMIT $3;',
        ['%' + query + '%', Number(page) * Number(limit), limit]
      );
      totalResultLobbies = await executeQuery(
        'SELECT count(*) FROM lobby WHERE public = TRUE AND (lobby.name ILIKE $1 OR lobby.description ILIKE $1 OR lobby.tag ILIKE $1);',
        ['%' + query + '%']
      );
    } else if (language) {
      console.log(language);
      res = await executeQuery(
        'SELECT id,name,description,language,tag FROM lobby WHERE public = TRUE AND language = $1 ORDER BY id OFFSET $2 LIMIT $3;',
        [language, Number(page) * Number(limit), limit]
      );
      totalResultLobbies = await executeQuery(
        'SELECT count(*) FROM lobby WHERE public = TRUE AND language = $1;',
        [language]
      );
    } else if (tag) {
      res = await executeQuery(
        'SELECT id,name,description,language,tag FROM lobby WHERE public = TRUE AND lobby.tag ILIKE $1 ORDER BY id OFFSET $2 LIMIT $3;',
        ['%' + tag + '%', Number(page) * Number(limit), limit]
      );
      totalResultLobbies = await executeQuery(
        'SELECT count(*) FROM lobby WHERE public = TRUE AND lobby.tag ILIKE $1;',
        ['%' + tag + '%']
      );
    }
  } catch (err) {
    console.error(err);
  }
  return { lobbies: res.rows, totalCount: totalResultLobbies.rows[0]['count'] };
}

export async function GetLobby(lobbyID: string): Promise<Lobby> {
  let r;
  try {
    r = await Promise.all([
      executeQuery(
        'SELECT lobby.*, users.username AS creatorusername FROM lobby LEFT JOIN users ON users.id = lobby.createdby WHERE lobby.id = $1 ;',
        [lobbyID]
      ),
      executeQuery('SELECT DISTINCT tag FROM challenge WHERE lobbyid = $1;', [
        lobbyID
      ])
    ]);
  } catch (err) {
    throw err;
  }
  if (r[0].rowCount > 0) {
    const res = r[0].rows[0];
    res['challengetags'] = r[1].rows.map(x => x.tag);

    // Deletes the null value
    res['challengetags'] = res['challengetags'].filter(Boolean);

    return res;
  } else {
    return null;
  }
}

export async function GetLobbyCreatorID(lobbyID: string): Promise<number> {
  let r;
  if (lobbyID == undefined) {
    return null;
  }
  try {
    r = await executeQuery('SELECT createdby FROM lobby WHERE lobby.id = $1', [
      lobbyID
    ]);
  } catch (err) {
    throw err;
  }
  if (r.rowCount > 0) {
    return Number(r.rows[0]['createdby']);
  } else {
    return null;
  }
}

export async function ChangeLobby(lobby: Lobby) {
  try {
    const currentLobby = await GetLobby(lobby.id);
    if (!currentLobby) {
      return false;
    }
    if (lobby.public && currentLobby.public == false) {
      executeQuery(
        'DELETE FROM challenge_solutions WHERE challenge_solutions.challenge_id IN (SELECT challenge.id FROM challenge_solutions JOIN challenge ON challenge_solutions.challenge_id = challenge.id WHERE lobbyid = $1)',
        [lobby.id]
      );
      executeQuery(
        'DELETE FROM lobby_solutions WHERE lobby_solutions.lobby_id = $1',
        [lobby.id]
      );
    }
    const r = await executeQuery(
      'UPDATE lobby SET name = $1, description = $2, createdby = $3, createdat = $4, outcome = $5, code=$6, tag=$7, public=$9, language=$10  WHERE lobby.id = $8',
      [
        lobby.name,
        lobby.description,
        lobby.createdby != undefined ? lobby.createdby : currentLobby.createdby,
        lobby.createdat != undefined ? lobby.createdat : currentLobby.createdat,
        lobby.outcome,
        lobby.code != undefined ? lobby.code : currentLobby.code,
        lobby.tag != undefined ? lobby.tag : null,
        lobby.id,
        lobby.public != undefined ? lobby.public : false,
        lobby.language != undefined ? lobby.language : 'en'
      ]
    );
    if (r.rowCount > 0) {
      return true;
    } else {
      return false;
    }
  } catch (err) {
    if (err.constraint == 'code_unique') {
      throw new CodeInUseException(
        'Code ' + lobby.code + ' is already in use!'
      );
    }
    throw err;
  }
}

export async function DeleteLobby(lobbyID: string) {
  let r;
  try {
    r = await executeQuery('DELETE FROM lobby WHERE lobby.id =$1', [lobbyID]);
    if (r.rowCount > 0) {
      return true;
    } else {
      return false;
    }
  } catch (err) {
    throw err;
  }
}

export async function GetLobbyMembers(lobbyID: string) {
  try {
    const r = await executeQuery(
      'SELECT users.id,username,role FROM users JOIN lobby_members ON lobby_members.userid = users.id WHERE lobby_members.lobbyid = $1;',
      [lobbyID]
    );
    const users: UserMinimum[] = r.rows;
    return users;
  } catch (err) {
    throw err;
  }
}

/**
 * Returns the challenges of a lobby.
 * Returns an array of challenges that contain
 * id, name, variables, minigame, description
 * @export
 * @param {string} lobbyID
 * @returns {Promise<Challenge[]>}
 */
export async function GetLobbyChallenges(
  lobbyID: string
): Promise<Challenge[]> {
  try {
    const r = await executeQuery(
      'SELECT id,name,variables,minigame,description FROM challenge WHERE challenge.lobbyid = $1',
      [lobbyID]
    );
    const challenges: Challenge[] = r.rows;
    return challenges;
  } catch (err) {
    throw err;
  }
}

export async function GetLobbyChallengesWithCompletionStatus(
  lobbyID: string,
  userID: string
): Promise<Challenge[]> {
  try {
    const r = await executeQuery(
      'SELECT challenge.id,name,variables,minigame,description,every(CASE WHEN user_id IS NULL THEN FALSE ELSE TRUE END) as solved,challenge_levels.challengeid FROM challenge_levels LEFT JOIN (SELECT challenge_id,user_id,level_id FROM challenge_solutions WHERE user_id = $2) AS ca ON ca.level_id = challenge_levels.id JOIN challenge ON challenge.id = challenge_levels.challengeid WHERE lobbyid = $1 GROUP BY challenge_levels.challengeid, challenge.id;',
      [lobbyID, userID]
    );
    const challenges: Challenge[] = r.rows;
    return challenges;
  } catch (err) {
    throw err;
  }
}

export async function GetLobbyChallengesOrder(
  lobbyID: string
): Promise<number[]> {
  try {
    const r = await executeQuery('SELECT lobby.ord FROM lobby WHERE id = $1', [
      lobbyID
    ]);
    return r.rowCount > 0 ? r.rows[0].ord : [];
  } catch (err) {
    throw err;
  }
}

export async function ChangeLobbyChallengesOrder(
  lobbyID: string,
  newOrder: String[]
) {
  try {
    const r = await executeQuery('UPDATE lobby SET ord = $2 WHERE id = $1', [
      lobbyID,
      newOrder
    ]);
    if (r.rowCount > 0) {
      return true;
    }
    return false;
  } catch (err) {
    throw err;
  }
}

export async function GetLobbyIDFromCode(code: string) {
  let r;
  try {
    r = await executeQuery('SELECT id FROM lobby WHERE lobby.code =$1', [code]);
  } catch (error) {
    throw error;
  }
  if (r.rowCount > 0) {
    return r.rows[0].id;
  } else {
    throw new CodeNotInUseException();
  }
}

export async function GetLobbyPage(lobbyID: string) {
  try {
    let r: QueryResult;
    r = await executeQuery(
      'SELECT lobby.page_before FROM lobby WHERE lobby.id = $1',
      [lobbyID]
    );
    if (r.rowCount == 0) {
      throw new LobbyNotFound();
    }
    return r.rows[0]['page_before'];
  } catch (err) {
    throw err;
  }
}

export async function GetLobbyFinishPage(lobbyID: string) {
  let r: QueryResult;
  r = await executeQuery(
    'SELECT lobby.page_after FROM lobby WHERE lobby.id = $1',
    [lobbyID]
  );
  if (r.rowCount == 0) {
    throw new LobbyNotFound();
  }
  return r.rows[0]['page_after'];
}

export async function GetLobbySnapTemplate(lobbyID: string) {
  try {
    let r: QueryResult;
    r = await executeQuery(
      'SELECT lobby.snap_template FROM lobby WHERE lobby.id = $1',
      [lobbyID]
    );
    return r.rows[0]['snap_template'];
  } catch (err) {
    throw err;
  }
}

export async function GetLobbyChallengesSolutions(lobbyID: string) {
  try {
    let r: QueryResult;
    r = await executeQuery(
      'SELECT challenge_solutions.last_update,challenge_levels.id as level_id,challenge_levels.ord as order,challenge.name, challenge.id AS challengeID , challenge.minigame_category, users.id AS userID, users.username, users.fname, users.lname FROM lobby_members JOIN challenge ON challenge.lobbyid = lobby_members.lobbyid LEFT JOIN users ON users.id = lobby_members.userid LEFT JOIN challenge_levels ON challenge_levels.challengeid = challenge.id LEFT JOIN challenge_solutions ON challenge_solutions.challenge_id = challenge.id AND challenge_solutions.user_id = users.id WHERE lobby_members.lobbyid = $1;',
      [lobbyID]
    );
    return r.rows;
  } catch (err) {
    throw err;
  }
}

export async function GetLobbySolutions(lobbyID: string) {
  try {
    let r: QueryResult;
    r = await executeQuery(
      'SELECT lobby_solutions.last_update, users.id AS userID, users.username, users.fname, users.lname FROM lobby_members LEFT JOIN users ON users.id = lobby_members.userid LEFT JOIN lobby_solutions ON lobby_solutions.lobby_id = lobby_members.lobbyid AND lobby_solutions.user_id = users.id  WHERE lobby_members.lobbyid = $1;',
      [lobbyID]
    );
    return r.rows;
  } catch (err) {
    throw err;
  }
}

export async function UpdateLobbySnapTemplate(
  lobbyID: string,
  snapTemplate: string
) {
  let r;
  try {
    r = await executeQuery(
      'UPDATE lobby SET snap_template = $2 WHERE id = $1',
      [lobbyID, snapTemplate]
    );
  } catch (err) {
    throw err;
  }
  if (r.rowCount == 0) {
    throw new LobbyNotFound();
  }
  return true;
}

export async function UpdateLobbyInstructionsPage(
  lobbyID: string,
  page: string
) {
  let r;
  try {
    r = await executeQuery('UPDATE lobby SET page_before = $2 WHERE id = $1', [
      lobbyID,
      page
    ]);
  } catch (err) {
    throw err;
  }
  if (r.rowCount == 0) {
    throw new LobbyNotFound();
  }
  return true;
}

export async function UpdateLobbyInstructionsPages(
  lobbyID: string,
  pageBefore: string,
  pageAfter: string
) {
  let r;
  try {
    r = await executeQuery(
      'UPDATE lobby SET page_before = $2, page_after = $3 WHERE id = $1',
      [lobbyID, pageBefore, pageAfter]
    );
  } catch (err) {
    throw err;
  }
  if (r.rowCount == 0) {
    throw new LobbyNotFound();
  }
  return true;
}

export async function AppendChallengeToTheEndOfOrderArray(
  lobbyID: string,
  challengeID: string
) {
  let r;
  try {
    r = await executeQuery('SELECT ord FROM lobby WHERE id = $1', [lobbyID]);
    let order: Array<number> = [];
    if (r.rows[0]['ord'] == null) {
      order = [];
    } else {
      order = r.rows[0]['ord'];
    }
    order.push(Number(challengeID));
    r = await executeQuery('UPDATE lobby set ord = $2 where lobby.id = $1;', [
      lobbyID,
      order
    ]);
  } catch (err) {
    throw err;
  }
  return r.rowCount > 0 ? true : false;
}

export async function RemoveChallengeFromOrder(
  lobbyID: string,
  challengeID: string
) {
  let r;
  try {
    r = await executeQuery(
      'UPDATE lobby SET ord = array_remove((SELECT ord FROM lobby WHERE id = $1),$2) WHERE lobby.id = $1;',
      [lobbyID, challengeID]
    );
  } catch (err) {
    throw err;
  }
  return r.rowCount > 0 ? true : false;
}

export async function CloneLobbyWithNewCodeAndCreator(
  lobbyID: string,
  code: string,
  createdby: string,
  name: string,
  description: string,
  tag: string
) {
  let res;
  try {
    res = await executeQuery(
      'INSERT INTO lobby (outcome,snap_template,page_before, code, createdby,name,description,tag) SELECT outcome,snap_template,page_before,$1,$2,$4,$5,$6 FROM lobby WHERE id = $3 RETURNING id;',
      [code, createdby, lobbyID, name, description, tag]
    );
    if (res.rows && res.rows.length > 0) {
      const newLobbyID = res.rows[0]['id'];
      const notes = await GetAllNotesForLobby(lobbyID);
      if (notes.length > 0) {
        notes.map(x => {
          CloneNoteForLobby(x.id, newLobbyID);
        });
      }
      const x = await executeQuery('SELECT ord FROM lobby WHERE id = $1', [
        lobbyID
      ]);
      const ord = x.rows[0].ord;
      if (x.rows[0].ord) {
        for (let i = 0; i < ord.length; i++) {
          const newID = await CloneChallenge(ord[i], newLobbyID);
          try {
            const r = await executeQuery(
              'UPDATE lobby SET ord = ord || $2::INTEGER WHERE id = $1',
              [newLobbyID, Number(newID)]
            );
          } catch (err) {
            console.error(err);
          }
        }
      }
    }
  } catch (err) {
    console.error(err);
    if (err.constraint == 'code_unique') {
      throw new CodeInUseException('Code ' + code + ' is already in use!');
    }
    throw err;
  }
}

export async function IsLobbyPublic(lobbyID: string) {
  try {
    const res = await executeQuery('SELECT public FROM lobby WHERE id = $1', [
      lobbyID
    ]);
    return Boolean(res.rows[0]['public']);
  } catch (err) {
    throw err;
  }
}

export class CodeNotInUseException implements Error {
  name: string;
  message: string;
  stack?: string;
  constructor(message?: string) {
    this.name = 'CodeNotInUseException';
    this.message = message;
  }
}

export class CodeInUseException implements Error {
  name: string;
  message: string;
  stack?: string;
  constructor(message?: string) {
    this.name = 'CodeInUseException';
    this.message = message;
  }
}

export class LobbyNotFound implements Error {
  name: string;
  message: string;
  stack?: string;
  constructor(message?: string) {
    this.name = 'LobbyNotFoundError';
    this.message = message;
  }
}
