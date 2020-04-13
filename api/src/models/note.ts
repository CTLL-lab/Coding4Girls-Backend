import { executeQuery } from '../includes/db';

export async function CreateANewNoteForLobby(note, lobbyID) {
  let res;
  try {
    res = await executeQuery(
      'INSERT INTO brainstorm_notes (content,contenttype,notetext,x,y,z,width,height,locked,color,lobbyid,id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
      [
        note['content'],
        note['type'],
        note['text'],
        note['position']['x'],
        note['position']['y'],
        note['position']['z'],
        note['size']['width'],
        note['size']['height'],
        note['locked'],
        note['color'],
        lobbyID,
        note['id']
      ]
    );
  } catch (err) {
    if (err.constraint == 'code_unique') {
      throw new NoteIDAlreadyInUse(
        'Code ' + note['id'] + ' is already in use!'
      );
    }
    throw err;
  }
  return res.rowCount > 0 ? true : false;
}

export async function CloneNoteForLobby(noteID, lobbyID) {
  let res;
  let newID =
    '_' +
    Math.random()
      .toString(36)
      .substr(2, 15);
  try {
    res = await executeQuery(
      'INSERT INTO brainstorm_notes (content,contenttype,notetext,x,y,z,width,height,locked,color,lobbyid,id) SELECT content,contenttype,notetext,x,y,z,width,height,locked,color,$2,$3 FROM brainstorm_notes WHERE id = $1',
      [noteID, lobbyID, newID]
    );
  } catch (err) {
    if (err.constraint == 'code_unique') {
      throw new NoteIDAlreadyInUse('Code ' + newID + ' is already in use!');
    }
    throw err;
  }
  return res.rowCount > 0 ? true : false;
}

export async function GetAllNotesForLobby(lobbyID) {
  try {
    let r;
    r = await executeQuery(
      'SELECT * FROM brainstorm_notes WHERE lobbyid = $1;',
      [lobbyID]
    );
    return r.rows;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function MoveNote(note) {
  try {
    const r = await executeQuery(
      'UPDATE brainstorm_notes SET x = $1, y =$2, z= $3 WHERE brainstorm_notes.id = $4',
      [
        note['position']['x'],
        note['position']['y'],
        note['position']['z'],
        note['id']
      ]
    );
    if (r.rowCount > 0) {
      return true;
    } else {
      return false;
    }
  } catch (err) {
    throw err;
  }
}

export function UpdateZValueOfNotes(notes: Array<any>) {
  notes.forEach(x => {
    try {
      executeQuery(
        'UPDATE brainstorm_notes SET z = $1 WHERE brainstorm_notes.id = $2',
        [x['z'], x['id']]
      );
    } catch (err) {
      throw err;
    }
  });
}

export function DeleteNote(note) {
  return executeQuery('DELETE FROM brainstorm_notes WHERE id =$1', [
    note['id']
  ]);
}

export function UpdateNote(note) {
  return executeQuery(
    'UPDATE brainstorm_notes SET content = $1, contenttype = $2 ,notetext=$3,x = $4,y=$5,z=$6,width=$7,height=$8,locked=$9,color=$10 WHERE id=$11;',
    [
      note['content'],
      note['type'],
      note['text'],
      note['position']['x'],
      note['position']['y'],
      note['position']['z'],
      note['size']['width'],
      note['size']['height'],
      note['locked'],
      note['color'],
      note['id']
    ]
  );
}

export class NoteIDAlreadyInUse implements Error {
  name: string = 'NoteIDAlreadyInUse';
  message: string;
  stack?: string;
  constructor(message: string) {}
}
