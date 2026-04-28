const express = require('express');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Post = require('../models/Post');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|wmv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images and videos are allowed'));
  }
});

// Upload post
router.post('/upload', auth, upload.single('media'), async (req, res) => {
  try {
    const { content } = req.body;
    const mediaType = req.file ? 
      req.file.mimetype.startsWith('video') ? 'video' : 'image' : null;
    
    const post = new Post({
      user: req.user._id,
      content,
      mediaUrl: req.file ? `/uploads/${req.file.filename}` : null,
      mediaType
    });

    await post.save();
    await post.populate('user', 'username profilePicture');

    res.status(201).json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get home feed (posts from followed users)
router.get('/feed', auth, async (req, res) => {
  try {
    const posts = await Post.find({
      user: { $in: req.user.following },
      expiresAt: { $gt: new Date() }
    })
    .sort({ createdAt: -1 })
    .populate('user', 'username profilePicture')
    .limit(20);

    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user posts
router.get('/user/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const posts = await Post.find({
      user: user._id,
      expiresAt: { $gt: new Date() }
    })
    .sort({ createdAt: -1 })
    .populate('user', 'username profilePicture');

    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
