const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// Search users
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json([]);
    }

    const users = await User.find({
      username: { $regex: q, $options: 'i' },
      _id: { $ne: req.user?._id }
    })
    .select('username profilePicture followers following')
    .limit(10);

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user profile
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .populate('followers', 'username')
      .populate('following', 'username');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      ...user.toObject(),
      followersCount: user.followers.length,
      followingCount: user.following.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Follow user
router.post('/:username/follow', auth, async (req, res) => {
  try {
    const userToFollow = await User.findOne({ username: req.params.username });
    if (!userToFollow || userToFollow._id.equals(req.user._id)) {
      return res.status(400).json({ error: 'Cannot follow this user' });
    }

    const alreadyFollowing = req.user.following.some(followingId => 
      followingId.equals(userToFollow._id)
    );

    if (!alreadyFollowing) {
      req.user.following.push(userToFollow._id);
      userToFollow.followers.push(req.user._id);
      
      await req.user.save();
      await userToFollow.save();
    }

    res.json({ message: 'Followed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unfollow user
router.delete('/:username/follow', auth, async (req, res) => {
  try {
    const userToUnfollow = await User.findOne({ username: req.params.username });
    if (!userToUnfollow) {
      return res.status(404).json({ error: 'User not found' });
    }

    req.user.following = req.user.following.filter(id => 
      !id.equals(userToUnfollow._id)
    );
    userToUnfollow.followers = userToUnfollow.followers.filter(id => 
      !id.equals(req.user._id)
    );

    await req.user.save();
    await userToUnfollow.save();

    res.json({ message: 'Unfollowed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
