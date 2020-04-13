import { Router } from 'express';
import authenticated from '../includes/auth-guard';
import { check } from 'express-validator/check';
import { addMetric } from '../models/metric';

var router = Router();

router.post(
  '/',
  authenticated,
  [
    check('cpu').exists(),
    check('gpu').exists(),
    check('os').exists(),
    check('scene').exists(),
    check('avg_fps').exists()
  ],
  (req, res) => {
    addMetric(
      req.body['cpu'],
      req.body['gpu'],
      req.body['ram'],
      req.body['vram'],
      req.body['os'],
      req.body['cores'],
      req.body['scene'],
      req.body['avg_fps']
    )
      .then(x => {
        if (x) {
          res.send(200);
        } else {
          res.send(400);
        }
      })
      .catch(err => {
        console.error(err);
        res.send(500);
      });
  }
);

module.exports = router;
