import { Router, Response } from 'express';
import authenticated, {
  userMemberOfTheLobbyOrFullyPriviledged
} from '../includes/auth-guard';
import {
  GetUserLobbies,
  GetLobbySolutionForUser,
  AddLobbySolutionForUser,
  SolutionAlreadyCreated,
  AddChallengeSolutionForUser,
  joinLobbyByCode,
  UserAlreadyMemberOfLobbyException,
  ChangeLobbySolutionForUser,
  LeaveLobby,
  ChangeChallengeSolutionForUser,
  AddOneCoinToUser,
  GetUserCustomizationImages,
  AddUserCustomizationImage,
  ChangeUserCustomizationImage,
  TriedToJoinPublicLobbyException,
  ChangeUserColorScheme,
  GetUserColorScheme
} from '../models/user';
import { CreateSuccessResponse } from '../models/response';
import { GetChallengeSolutionForUser } from '../models/user';
import { check } from 'express-validator/check';
import { validateRequest } from '../includes/validation';
import {
  CodeNotInUseException,
  GetLobbyChallenges,
  GetLobbyChallengesWithCompletionStatus
} from '../models/lobby';
import { executeQuery } from '../includes/db';
import {
  GetChallengeLobbyID,
  GetChallengeSnapTemplate
} from '../models/challenge';

var router = Router();

router.get('/lobbies', authenticated, async (req, res) => {
  try {
    Promise.all([
      GetUserLobbies(req['user'].id),
      executeQuery('SELECT lastlobby FROM users WHERE id = $1', [
        req['user'].id
      ])
    ]).then(x => {
      res.json(
        CreateSuccessResponse({
          lobbies: x[0],
          lobbiesCount: x[0].length,
          lastEntered: x[1].rows[0]['lastlobby']
        })
      );
    });
  } catch (err) {
    console.error(err);
  }
});

router.get('/lobbies/:lobbyID/challenges', authenticated, async (req, res) => {
  try {
    const challenges = await GetLobbyChallengesWithCompletionStatus(
      req.params.lobbyID,
      req['user'].id
    );
    res.json(
      CreateSuccessResponse({
        challenges: challenges,
        totalCount: challenges.length
      })
    );
  } catch (err) {
    console.error(err);
  }
});

router.post('/lobbies/:lobbyID/entered', authenticated, (req, res) => {
  Promise.all([
    executeQuery(
      'UPDATE lobby_members SET entered = true WHERE lobbyid = $1 AND userid=$2',
      [req.params.lobbyID, req['user'].id]
    ),
    executeQuery('UPDATE users SET lastlobby = $1 WHERE id = $2', [
      req.params.lobbyID,
      req['user'].id
    ])
  ])
    .then(x => {
      res.sendStatus(200);
    })
    .catch(err => {
      console.error(err);

      res.sendStatus(500);
    });
});

router.post(
  '/lobbies',
  authenticated,
  [
    check('code')
      .exists()
      .isString()
  ],
  validateRequest,
  async (req, res) => {
    try {
      if (req.body.code != undefined) {
        try {
          const r = await joinLobbyByCode(req.user.id, req.body.code);
          if (r) {
            res.status(201).send();
            return;
          }
          res.status(500).send();
        } catch (err) {
          if (err instanceof UserAlreadyMemberOfLobbyException) {
            res.status(409).send();
          }
          if (err instanceof TriedToJoinPublicLobbyException) {
            res.status(428).send();
          }
          if (err instanceof CodeNotInUseException) {
            res.status(404).send();
            return;
          }
          res.status(500).send();
        }
      }
    } catch (err) {
      console.error(err);
    }
  }
);

router.delete('/lobbies/:lobbyID', authenticated, async (req, res) => {
  try {
    const r = await LeaveLobby(req['user'].id, req.params.lobbyID);
    if (r) {
      res.status(200).send();
      return;
    } else {
      res.status(500).send();
    }
  } catch (err) {
    res.status(404).send();
  }
});

router.get(
  '/challenges/:challengeID/solution/:levelID*',
  authenticated,
  async (req, res) => {
    try {
      const solution = await GetChallengeSolutionForUser(
        req.params.challengeID,
        req.params.levelID,
        req['user'].id
      );
      if (solution) {
        if (req.params[0] && req.params[0] == '/unity') {
          res.json(solution['snap_solution']);
        } else {
          res.json(
            CreateSuccessResponse({
              solution
            })
          );
        }
      } else {
        GetChallengeSnapTemplate(req.params.challengeID, req.params.levelID)
          .then(x => {
            if (req.params[0] && req.params[0] == '/unity') {
              res.json(x);
            } else {
              res.json(
                CreateSuccessResponse({
                  x
                })
              );
            }
          })
          .catch(x => {
            res.sendStatus(404);
          });
      }
    } catch (err) {
      console.error(err);
    }
  }
);

router.post(
  '/challenges/:challengeID/solution/:levelID',
  authenticated,
  [check('snap').exists(), check('details').optional()],
  validateRequest,
  userMemberOfTheLobbyOrFullyPriviledged,
  lobbyNotPublic,
  async (req, res) => {
    try {
      const solution = await AddChallengeSolutionForUser(
        req.params.challengeID,
        req['user'].id,
        req.body.snap,
        req.body.details,
        req.params.levelID
      );
      AddOneCoinToUser(req['user'].id);
      res.sendStatus(201);
    } catch (err) {
      if (err instanceof SolutionAlreadyCreated) {
        // if solution exists, then try to update it
        try {
          const solution = await ChangeChallengeSolutionForUser(
            req.params.challengeID,
            req['user'].id,
            req.body.snap,
            req.body.details,
            req.params.levelID
          );
          AddOneCoinToUser(req['user'].id);
          res.sendStatus(201);
          return;
        } catch (err) {
          console.log(err);
          res.sendStatus(500);
        }
      } else {
        console.log(err);
        res.sendStatus(500);
      }
    }
  }
);

router.get('/lobbies/:lobbyID/solution', authenticated, async (req, res) => {
  try {
    const solution = await GetLobbySolutionForUser(
      req.params.lobbyID,
      req['user'].id
    );
    res.json(
      CreateSuccessResponse({
        solution
      })
    );
  } catch (err) {
    if (err instanceof SolutionAlreadyCreated) {
      res.sendStatus(409);
    } else {
      console.log(err);
      res.sendStatus(500);
    }
  }
});

router.post(
  '/lobbies/:lobbyID/solution',
  authenticated,
  [check('snap').exists()],
  validateRequest,
  userMemberOfTheLobbyOrFullyPriviledged,
  lobbyNotPublic,
  async (req, res) => {
    try {
      const solution = await AddLobbySolutionForUser(
        req.params.lobbyID,
        req['user'].id,
        req.body.snap
      );
      AddOneCoinToUser(req['user'].id);
      res.sendStatus(201);
    } catch (err) {
      if (err instanceof SolutionAlreadyCreated) {
        // if solution exists, then try to update it
        try {
          // console.log('solution exists');
          const solution = await ChangeLobbySolutionForUser(
            req.params.lobbyID,
            req['user'].id,
            req.body.snap
          );
          AddOneCoinToUser(req['user'].id);
          res.sendStatus(201);
          return;
        } catch (err) {
          console.log(err);
          res.sendStatus(500);
        }
      } else {
        console.log(err);
        res.sendStatus(500);
      }
    }
  }
);

router.put(
  '/lobbies/:lobbyID/solution',
  authenticated,
  [check('snap').exists()],
  validateRequest,
  userMemberOfTheLobbyOrFullyPriviledged,
  lobbyNotPublic,
  async (req, res) => {
    try {
      const solution = await AddLobbySolutionForUser(
        req.params.lobbyID,
        req['user'].id,
        req.body.snap
      );
      AddOneCoinToUser(req['user'].id);
      res.sendStatus(201);
    } catch (err) {
      if (err instanceof SolutionAlreadyCreated) {
        res.sendStatus(409);
      } else {
        console.log(err);
        res.sendStatus(500);
      }
    }
  }
);

router.get('/language', authenticated, (req, res) => {
  executeQuery('SELECT language FROM users WHERE id = $1', [req['user'].id])
    .then(x => {
      res.json(CreateSuccessResponse({ lang: x.rows[0].language }));
    })
    .catch(x => {
      console.error(x);
      res.sendStatus(500);
    });
});

router.post(
  '/language',
  authenticated,
  [check('lang').exists()],
  validateRequest,
  (req, res) => {
    executeQuery('UPDATE users SET language = $1 WHERE id = $2', [
      req.body.lang,
      req['user'].id
    ])
      .then(x => {
        res.sendStatus(200);
      })
      .catch(x => {
        console.error(x);
        res.sendStatus(500);
      });
  }
);

router.get('/coins', authenticated, (req, res) => {
  executeQuery('SELECT coins FROM users WHERE users.id = $1', [req['user'].id])
    .then(x => {
      if (x.rowCount > 0) {
        res.send(CreateSuccessResponse({ coins: x.rows[0].coins }));
      } else {
        res.sendStatus(404);
      }
    })
    .catch(x => {
      console.log(x);
      res.sendStatus(500);
    });
});

router.post('/coins', authenticated, (req, res) => {
  executeQuery(
    'UPDATE users SET coins = $2 WHERE users.id = $1 RETURNING coins;',
    [req['user'].id, req.body['coins']]
  )
    .then(x => {
      if (x.rowCount > 0) {
        res.send(CreateSuccessResponse({ coins: x.rows[0].coins }));
      } else {
        res.sendStatus(404);
      }
    })
    .catch(x => {
      console.log(x);
      res.sendStatus(500);
    });
});

router.get('/lobbies/images', authenticated, (req, res) => {
  GetUserCustomizationImages(req['user'].id)
    .then(x => {
      res.send(CreateSuccessResponse({ images: x }));
    })
    .catch(x => {
      console.error(x);
      res.sendStatus(500);
    });
});

router.post(
  '/lobbies/images',
  [check('image').exists()],
  validateRequest,
  authenticated,
  (req, res) => {
    AddUserCustomizationImage(req['user'].id, req.body['image'])
      .then(x => {
        console.log(x);
        if (x) {
          res.sendStatus(201);
        } else {
          res.sendStatus(401);
        }
      })
      .catch(x => {
        console.error(x);
        res.sendStatus(500);
      });
  }
);

router.put(
  '/lobbies/images/:imageIndex',
  [check('image').exists()],
  validateRequest,
  authenticated,
  (req, res) => {
    console.log(req.params['imageIndex']);
    ChangeUserCustomizationImage(
      req['user'].id,
      req.params['imageIndex'],
      req.body['image']
    )
      .then(x => {
        console.log(x);
        if (x) {
          res.sendStatus(201);
        } else {
          res.sendStatus(401);
        }
      })
      .catch(x => {
        console.error(x);
        res.sendStatus(500);
      });
  }
);

router.get('/colorscheme', authenticated, (req, res) => {
  GetUserColorScheme(req['user'].id)
    .then(x => {
      res.send(
        CreateSuccessResponse({ colorscheme: x.rows[0]['colorscheme'] })
      );
    })
    .catch(() => {
      res.send(500);
    });
});

router.put(
  '/colorscheme',
  authenticated,
  [check('colorscheme').exists()],
  validateRequest,
  (req, res: Response) => {
    ChangeUserColorScheme(req['user'].id, req.body['colorscheme'])
      .then(() => {
        res.send(200);
      })
      .catch(() => {
        res.send(500);
      });
  }
);

function lobbyNotPublic(req, res, next) {
  let lobbyID = req.params['lobbyID'];

  //if lobbyID not in url parameters
  if (!lobbyID) {
    // get it from the challengeID
    GetChallengeLobbyID(req.params['challengeID']).then(x => {
      // x is the lobbyID
      if (x == undefined) {
        res.status(401).send();
        return;
      } else {
        executeQuery(
          'SELECT id FROM lobby WHERE lobby.id = $1 AND lobby.public = FALSE',
          [x]
        ).then(qres => {
          if (qres.rowCount > 0) {
            next();
          } else {
            res.sendStatus(200);
          }
        });
      }
    });
  }

  // if lobbyID is in the url, just do the request
  if (lobbyID) {
    executeQuery(
      'SELECT id FROM lobby WHERE lobby.id = $1 AND lobby.public = FALSE',
      [lobbyID]
    ).then(x => {
      if (x.rowCount > 0) {
        next();
      } else {
        res.sendStatus(200);
      }
    });
  }
}

module.exports = router;
