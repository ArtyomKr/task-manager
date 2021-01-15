const express = require('express');
const router = new express.Router();
const auth = require('../middleware/auth.js');
const Task = require('../models/task');

router.post('/tasks', auth, async (req, res) => {
  const task = new Task({
    ...req.body,
    author: req.user._id
  });

  try {
    await task.save();
    res.status(201).send(task);
  } catch (error) {
    res.status(400).send(error);
  }
});

router.get('/tasks', auth, async (req, res) => {
  const searchParams = { author: req.user._id };
  const sort = {};
  if (req.query.completed) {
    searchParams.completed = req.query.completed === 'true';
  }
  if (req.query.sortBy){
    const sortParams = req.query.sortBy.split(':');
    sort[sortParams[0]] = sortParams[1] === 'desc'? -1 : 1;
  }

  try {
    const tasks = await Task.find(searchParams, null, { limit: parseInt(req.query.limit), skip: parseInt(req.query.skip), sort });
    res.send(tasks);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.get('/tasks/:id', auth, async (req, res) => {
  const _id = req.params.id;

  try {
    const task = await Task.findOne({ _id, author: req.user._id });

    if (!task) {
      return res.status(404).send();
    }

    res.send(task);
  } catch (error) {
    res.status(400).send(error);
  }
});

router.delete('/tasks/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, author: req.user._id });

    if(!task){
      return res.status(404).send();
    }

    res.send(task);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.patch('/tasks/:id', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['completed', 'description'];
  const isValidOperation = updates.every((update) => allowedUpdates.includes(update) );

  if (!isValidOperation) {
    return res.status(400).send({ error: 'Invalid update'})
  }

  try {
    const task = await Task.findOne({ _id: req.params.id, author: req.user._id });

    if (!task) {
      return res.status(404).send()
    }

    updates.forEach((update) => task[update] = req.body[update]);
    await task.save();

    res.send(task);
  } catch (error) {
    res.status(400).send(error);
  }
});

module.exports = router;