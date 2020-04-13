import { executeQuery } from '../includes/db';
import { QueryResult } from 'pg';
import { GetLobbyIDFromCode, CodeNotInUseException } from './lobby';

export interface UserMinimum {
  id: string;
  username: string;
  role: string;
}
export async function updateLastSeenForUser(userID: string) {
  executeQuery('UPDATE users SET lastseen = NOW() WHERE users.id = $1', [
    userID
  ]);
}

export async function findUserByUsernameOrEmail(
  param: string
): Promise<{ id: string; username: string; password: string; role: string }> {
  const res = await executeQuery(
    'SELECT id, username, password, role FROM users WHERE username = $1 or email = $1',
    [param]
  );
  if (res.rowCount == 0) {
    return null;
  } else {
    return res.rows[0];
  }
}

export async function createNewUser(
  username: string,
  passwordHash: string,
  fname: string = '',
  lname: string = '',
  role: string = 'student',
  email: string = null
) {
  /*
    @ Returns true if user registered successfully
    @ or false if it failed
    */

  let res;
  res = await executeQuery(
    'INSERT INTO users (username, password, email, fname, lname, role) VALUES ($1,$2,$3,$4,$5, $6)',
    [username, passwordHash, email, fname, lname, role]
  );
  return res.rowCount > 0;
}

export async function hasUserResetPasswordToken(userID: string) {
  let res;
  try {
    res = await executeQuery(
      'SELECT * FROM users_reset_password WHERE user_id = $1',
      [userID]
    );
  } catch (err) {
    throw err;
  }
  if (res.rowCount == 0) {
    return false;
  }
  return true;
}

async function isUserResetPasswordTokenValid(
  userID: string,
  activation_token: string
) {
  let res;
  try {
    res = await executeQuery(
      'SELECT user_id FROM users_reset_password WHERE user_id = $1 AND reset_token = $2',
      [userID, activation_token]
    );
  } catch (err) {
    throw err;
  }
  if (res.rowCount == 0) {
    return false;
  }
  return true;
}

export async function isUserActivated(userID: string) {
  let res;
  try {
    res = await executeQuery(
      'SELECT * FROM users_activation WHERE user_id = $1',
      [userID]
    );
  } catch (err) {
    throw err;
  }
  if (res.rowCount == 0) {
    return true;
  }
  return false;
}

export async function activateUser(userID: string, activationToken: string) {
  /*
    @ Returns true if the user activated successfully
    @ false is user/key not found
    @ throws error in error
  */

  try {
    const res = await executeQuery(
      'DELETE FROM users_activation WHERE user_id = $1 AND activation_token = $2',
      [userID, activationToken]
    );
    if (res.rowCount > 0) {
      return true;
    } else {
      return false;
    }
  } catch (err) {
    throw err;
  }
}

export async function changeUserPassword(userID: string, newPassword: string) {
  let res;
  try {
    res = await executeQuery('UPDATE users SET password = $2 WHERE id = $1', [
      userID,
      newPassword
    ]);
    if (res.rowCount > 0) {
      return true;
    } else {
      return false;
    }
  } catch (err) {
    throw err;
  }
}

export async function changeUserPasswordUsingEmailAndResetToken(
  email: string,
  newPassword: string,
  reset_token: string
) {
  const user = await findUserByUsernameOrEmail(email);
  const isTokenValid = await isUserResetPasswordTokenValid(
    user.id,
    reset_token
  );
  if (isTokenValid) {
    deleteResetToken(reset_token);
    const result = await changeUserPassword(user.id, newPassword);
    return result;
  }
  return false;
}

export async function GetChallengeSolutionForUser(
  challengeID: string,
  levelID: string,
  userID: string
) {
  try {
    let r: QueryResult;
    r = await executeQuery(
      'SELECT challenge_solutions.* FROM challenge_solutions WHERE challenge_solutions.challenge_id = $1 AND challenge_solutions.user_id = $2 AND challenge_solutions.level_id = $3',
      [challengeID, userID, levelID]
    );
    if (r.rowCount > 0) {
      return r.rows[0];
    } else {
      return undefined;
    }
  } catch (err) {
    throw err;
  }
}

export async function GetLobbySolutionForUser(lobbyID: string, userID: string) {
  try {
    let r: QueryResult;
    r = await executeQuery(
      'SELECT lobby_solutions.* FROM lobby_solutions WHERE lobby_solutions.lobby_id = $1 AND lobby_solutions.user_id = $2',
      [lobbyID, userID]
    );
    if (r.rowCount > 0) {
      return r.rows[0];
    } else {
      return undefined;
    }
  } catch (err) {
    throw err;
  }
}

export async function AddLobbySolutionForUser(
  lobbyID: string,
  userID: string,
  snap: string
) {
  let r;
  try {
    r = await executeQuery(
      'INSERT INTO lobby_solutions(user_id,lobby_id, snap_solution) VALUES($1,$2,$3)',
      [userID, lobbyID, snap]
    );
  } catch (err) {
    if (err.code == 23505) {
      throw new SolutionAlreadyCreated();
    }
    throw err;
  }
  if (r.rowCount == 0) {
    throw new Error('Lobby solution was not created');
  }
  return true;
}

export async function AddChallengeSolutionForUser(
  challengeID: string,
  userID: string,
  snap: string,
  details: any,
  levelID: string
) {
  let r;
  try {
    r = await executeQuery(
      'INSERT INTO challenge_solutions(user_id,challenge_id, snap_solution,details, level_id) VALUES($1,$2,$3,$4,$5)',
      [userID, challengeID, snap, details, levelID]
    );
  } catch (err) {
    if (err.code == 23505) {
      throw new SolutionAlreadyCreated();
    }
    throw err;
  }
  if (!r || r.rowCount == 0) {
    throw new Error('Challenge solution was not created');
  }
  return true;
}

export async function ChangeLobbySolutionForUser(
  lobbyID: string,
  userID: string,
  snap: string
) {
  let r;
  try {
    r = await executeQuery(
      'UPDATE lobby_solutions SET snap_solution = $3, times_updated = times_updated + 1, last_update = NOW() WHERE user_id = $1 AND lobby_id = $2',
      [userID, lobbyID, snap]
    );
  } catch (err) {
    throw err;
  }
  if (r.rowCount == 0) {
    throw new Error('Lobby solution was not updated');
  }
  return true;
}

export async function ChangeChallengeSolutionForUser(
  challengeID: string,
  userID: string,
  snap: string,
  details: any,
  levelID: string
) {
  let r;
  try {
    r = await executeQuery(
      'UPDATE challenge_solutions SET details = $4, snap_solution = $3, times_updated = times_updated + 1, last_update = NOW() WHERE user_id = $1 AND challenge_id = $2 AND level_id = $5',
      [userID, challengeID, snap, details, levelID]
    );
  } catch (err) {
    throw err;
  }
  if (r.rowCount == 0) {
    throw new Error('Challenge solution was not updated');
  }
  return true;
}

async function deleteResetToken(reset_token: string) {
  try {
    const res = await executeQuery(
      'DELETE FROM users_reset_password WHERE reset_token = $1',
      [reset_token]
    );
    if (res.rowCount > 0) {
      return true;
    } else {
      return false;
    }
  } catch (err) {
    throw err;
  }
}

/**
 * Returns true if the user is the creator or member of a given lobby
 *
 * @export
 * @param {string} userID
 * @param {string} lobbyID
 * @returns {Promise<boolean>}
 */
export async function isUserMemberOfLobby(
  userID: string,
  lobbyID: string
): Promise<boolean> {
  try {
    let r = await executeQuery(
      'SELECT * FROM lobby_members WHERE userid = $1 AND lobbyid = $2',
      [userID, lobbyID]
    );
    if (r.rowCount > 0) {
      return true;
    } else {
      r = await executeQuery(
        'SELECT * FROM lobby WHERE lobby.id = $2 AND lobby.createdby = $1;',
        [userID, lobbyID]
      );
      if (r.rowCount > 0) {
        return true;
      } else {
        return false;
      }
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function GetUserLobbies(userID: string) {
  const promises = Promise.all([
    executeQuery(
      'SELECT lobby.id,lobby.name,lobby.code,lobby.description,lobby.createdby,lobby.outcome,lobby.ord, lobby_members.entered,ARRAY_AGG(DISTINCT challenge.tag) AS challengetags,lobby.tag,lobby.language,lobby.createdat, lobby.public AS public_course FROM lobby LEFT JOIN lobby_members ON lobby.id = lobby_members.lobbyid LEFT JOIN challenge ON challenge.lobbyid = lobby.id  WHERE (userid = $1) GROUP BY lobby.id,lobby_members.entered ORDER BY lobby.createdat DESC;',
      [userID]
    ),
    executeQuery(
      'SELECT lobby.id,lobby.name,lobby.code,lobby.description,lobby.createdby,lobby.outcome,lobby.ord,ARRAY_AGG(DISTINCT challenge.tag) as challengetags,lobby.tag,lobby.language,lobby.createdat, lobby.public AS public_course FROM lobby LEFT JOIN challenge ON challenge.lobbyid = lobby.id WHERE createdby = $1 AND lobby.public = FALSE GROUP BY lobby.id ORDER BY lobby.createdat DESC;',
      [userID]
    )
  ]);
  const res = await promises;

  return res[0].rows.concat(res[1].rows);
}
export async function joinLobbyByID(userID: string, lobbyID: string) {
  const res = await executeQuery(
    'SELECT id FROM lobby WHERE id = $1 AND createdby = $2',
    [lobbyID, userID]
  );
  if (res.rowCount > 0) {
    throw new UserAlreadyMemberOfLobbyException();
  }

  //  const isLobbyPublicQuery = await executeQuery(
  //    'SELECT public FROM lobby WHERE id = $1',
  //    [lobbyID]
  //  );
  //  if (isLobbyPublicQuery.rows[0]['public']) {
  //    throw new TriedToJoinPublicLobbyException();
  //  }

  try {
    const res = await executeQuery(
      'INSERT INTO lobby_members (userid,lobbyid) VALUES($1,$2);',
      [userID, lobbyID]
    );
    return res.rowCount > 0 ? true : false;
  } catch (err) {
    if (err.code == 23505) {
      throw new UserAlreadyMemberOfLobbyException();
    }
  }
}

export async function joinLobbyByCode(userID: string, code: string) {
  let lobbyID: string;
  try {
    lobbyID = await GetLobbyIDFromCode(code);
  } catch (err) {
    throw err;
  }
  try {
    const res = await joinLobbyByID(userID, lobbyID);
    return res;
  } catch (err) {
    throw err;
  }
}

export async function LeaveLobby(userID: string, lobbyID: string) {
  let r;
  try {
    r = await executeQuery(
      'DELETE FROM lobby_members WHERE userid = $1 AND lobbyid = $2',
      [userID, lobbyID]
    );
  } catch (err) {
    console.error(err);
  }
  if (r.rowCount > 0) {
    return true;
  } else {
    throw new UserNotMemberOfLobbyException();
  }
}

export function AddOneCoinToUser(userID: string) {
  executeQuery('UPDATE users SET coins= coins + 1 WHERE id =$1;', [
    userID
  ]).catch(x => {
    console.error('Error while adding coin to user', userID, x);
  });
}

export async function RemoveOneCoinFromUser(userID: string): Promise<boolean> {
  try {
    await executeQuery('UPDATE users SET coins= coins - 1 WHERE id =$1;', [
      userID
    ]);
    return true;
  } catch (err) {
    console.error('Error while removing coin from user', userID, err);
    return false;
  }
}

export async function GetUserCustomizationImages(userID: string) {
  try {
    const res = await executeQuery(
      'SELECT images FROM user_lobby_customization WHERE userid=$1;',
      [userID]
    );
    if (res.rowCount > 0) {
      return res.rows[0]['images'];
    } else {
      return [];
    }
  } catch (err) {
    throw err;
  }
}

export async function AddUserCustomizationImage(
  userID: string,
  imageURL: string
) {
  try {
    const areCoinsNonNegative = await RemoveOneCoinFromUser(userID);
    if (!areCoinsNonNegative) {
      return false;
    }
    const r = await executeQuery(
      'UPDATE user_lobby_customization SET images= images || ARRAY[$2] WHERE userid =$1;',
      [userID, imageURL]
    );
    return true;
  } catch (err) {
    throw err;
  }
}

export async function ChangeUserCustomizationImage(
  userID: string,
  imageIndex: number,
  imageURL: string
) {
  try {
    const areCoinsNonNegative = await RemoveOneCoinFromUser(userID);
    if (!areCoinsNonNegative) {
      return false;
    }
    const r = await executeQuery(
      'UPDATE user_lobby_customization SET images[$3] = $2  WHERE userid = $1;',
      [userID, String(imageURL), Number(imageIndex) + 1]
    );
    return true;
  } catch (err) {
    throw err;
  }
}

export function GetUserColorScheme(userID: string) {
  return executeQuery('SELECT colorscheme FROM users WHERE id = $1', [userID]);
}

export function ChangeUserColorScheme(userID: string, colorScheme: string) {
  return executeQuery('UPDATE users SET colorscheme = $1 WHERE id = $2', [
    colorScheme,
    userID
  ]);
}

export class UserAlreadyMemberOfLobbyException implements Error {
  name: string;
  message: string;
  stack?: string;
  constructor(message?: string) {
    this.name = 'UserAlreadyMemberOfLobbyException';
    this.message = message;
  }
}
export class UserNotMemberOfLobbyException implements Error {
  name: string;
  message: string;
  stack?: string;
  constructor(message?: string) {
    this.name = 'UserNotMemberOfLobbyException';
    this.message = message;
  }
}

export class SolutionAlreadyCreated implements Error {
  name: string;
  message: string;
  stack?: string;
  constructor(message?: string) {
    this.name = 'SolutionAlreadyCreated';
    this.message = message;
  }
}

export class TriedToJoinPublicLobbyException implements Error {
  name: string;
  message: string;
  stack?: string;
  constructor(message?: string) {
    this.name = 'TriedToJoinPublicLobbyException';
    this.message = message;
  }
}
