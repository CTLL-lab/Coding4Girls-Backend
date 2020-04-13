import { Router } from 'express';
import authenticated from '../includes/auth-guard';
import { executeQuery } from '../includes/db';
import { imgur_api_key } from '../config';

var request = require('request');
var redis = require('redis');
var multer = require('multer');
var router = Router();

const ClientID = imgur_api_key;
const imgurAPI = 'https://api.imgur.com/3';

router.get('/:imageID', (req, res) => {
  // create a redis client to facilitate the cache
  let redisClient = redis.createClient('//10.0.0.20:6379');
  // try to fetch first from the cache
  redisClient.get(req.params.imageID, async (err, imageReq) => {
    // if cache is empty
    if (imageReq == null) {
      // check if the image should be shown in the first place
      // if the user didnt upload the image through our endpoint
      // we shouldnt proxy the request
      const dbRes = await executeQuery(
        'SELECT * FROM uploaded_images WHERE id = $1',
        [req.params.imageID]
      );
      if (dbRes.rowCount == 0) {
        res.sendStatus(401);
        return;
      }
      // ask imgur website
      request.get(
        // encoding set to null because library was trying to parse body
        // as string but it is an image
        { url: 'https://i.imgur.com/' + req.params.imageID, encoding: null },
        (err, r, body) => {
          if (err == null) {
            res.setHeader('content-type', r.headers['content-type']);
            res.setHeader('content-length', r.headers['content-length']);
            res.setHeader('accept-ranges', 'bytes');
            // we send the image as a buffer
            // because otherwise it will be interpreted as text from express
            res.send(Buffer.from(body));
            // store the image object to redis
            // alongside with its headers
            redisClient.set(
              req.params.imageID,
              JSON.stringify({
                body: body,
                'content-type': r.headers['content-type'],
                'content-length': r.headers['content-length'],
              })
            );
          } else {
            // if we can't fetch from imgur
            console.error(err);
            res.sendStatus(500);
          }
        }
      );
    } else {
      // if image is in cache
      imageReq = JSON.parse(imageReq);
      res.setHeader('content-type', imageReq['content-type']);
      res.setHeader('content-length', imageReq['content-length']);
      res.send(Buffer.from(imageReq.body));
    }
  });
});

router.post('', authenticated, multer().single('image'), (req, res) => {
  request.post(
    {
      url: imgurAPI + '/image',
      headers: {
        Authorization: 'Client-ID ' + ClientID,
      },
      formData: {
        image: req['file']['buffer'],
      },
    },
    (err, r) => {
      if (err == null) {
        try {
          const newBody = JSON.parse(r.body);
          const fileName = newBody['data']['link'].split(
            'https://i.imgur.com/'
          )[1];
          executeQuery('INSERT INTO uploaded_images (id) VALUES ($1)', [
            fileName,
          ]).then((_) => {});
          newBody['data']['link'] = newBody['data']['link'].replace(
            'https://i.imgur.com',
            'https://api.coding4girls.e-ce.uth.gr/images'
          );
          res.json(newBody);
        } catch (err) {
          console.error(err);
          res.status(400).end();
        }
      } else {
        res.status(500).end();
      }
    }
  );
});

module.exports = router;
