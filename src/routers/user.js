const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const router = new express.Router();
const User = require('../models/user');
const auth = require('../middleware/auth.js');

const upload = multer({
  limits: {
    fileSize: 1000000
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)){
      return cb(new Error('Only jpg, jpeg or png files are allowed'));
    }
    cb(undefined, true);
  }
});

router.post('/users', async (req, res) => {
  const user = new User(req.body);

  try {
    await user.save();
    const token = await user.generateToken();

    res.status(201).send({ user, token });
  } catch (error) {
    res.status(400).send(error);
  }
});

router.post('/users/login', async (req, res) => {
  try {
    const user = await User.findByCredentials(req.body.email, req.body.password);
    const token = await user.generateToken();

    res.send({ user, token });
  } catch (error) {
    res.status(400).send(error.message);
  }
});

router.post('/users/logout', auth, async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter((token) =>{
      return token.token !== req.token
    });
    await req.user.save();

    res.send();
  } catch (error) {
    res.status(500).send();
  }
});

router.post('/users/logoutall', auth, async (req, res) => {
  try{
    req.user.tokens = [];
    await req.user.save();

    res.send();
  } catch (error) {
    res.status(500).send();
  }
});

router.post('/users/me/avatar', auth, upload.single('avatar'), async (req, res) => {
  const buffer = await sharp(req.file.buffer).resize({ width: 250, height: 250 }).png().toBuffer();
  req.user.avatar = buffer;
  await req.user.save();
  res.send();
}, (error, req, res, next) => {
  res.status(400).send({ error: error.message });
});

router.get('/users/me', auth, async (req, res) => {
  try {
    res.send(req.user);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.delete('/users/me', auth, async (req, res) => {
  try {
    await req.user.remove();

    res.send(req.user);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.delete('/users/me/avatar', auth, async (req, res) => {
  req.user.avatar = undefined;
  await req.user.save();
  res.send();
}, (error, req, res, next) => {
  res.status(400).send({ error: error.message });
});

router.patch('/users/me', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates =  ['name', 'email', 'password', 'age'];
  const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).send({ error: 'Invalid update'})
  }

  try {
    const user = req.user;

    updates.forEach((update) => user[update] = req.body[update]);
    await user.save();

    if (!user) {
      return res.status(404).send();
    }

    res.send(user);
  } catch (error) {
    res.status(400).send(error);
  }
});

router.get('/users/:id/avatar', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user || !user.avatar) {
      throw new Error()
    }

    res.set('Content-Type', 'image/png');
    res.send(user.avatar);
  } catch (err) {
    res.status(404).send();
  }
});

module.exports = router;