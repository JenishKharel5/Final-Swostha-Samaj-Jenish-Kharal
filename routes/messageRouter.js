const express = require('express');
const router = express.Router();
const Message = require('../models/message-model');
const isLoggedIn = require('../middlewares/isLoggedIn');
const checkRole = require('../middlewares/checkRole');
const emailService = require('../utils/emailService');

// View message details (accessible to staff and the message sender)
router.get('/:id', isLoggedIn, async (req, res) => {
  try {
    const id = req.params.id;
    const message = await Message.getContactById(id);
    
    if (!message) {
      req.flash('error', 'Message not found.');
      return res.redirect(req.user.role === 'staff' ? '/staff/view-messages' : '/contact');
    }

    // Check if user has permission to view this message
    const isStaff = req.user.role === 'staff';
    const isSender = message.email === req.user.email;
    
    if (!isStaff && !isSender) {
      req.flash('error', 'You do not have permission to view this message.');
      return res.redirect('/contact');
    }

    res.render('message-details', { 
      user: req.user,
      message,
      isStaff,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Error loading message details:', error);
    req.flash('error', 'Error loading message details.');
    res.redirect(req.user.role === 'staff' ? '/staff/view-messages' : '/contact');
  }
});

// Submit new message (accessible to everyone)
router.post('/', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
      req.flash('error', 'All fields are required.');
      return res.redirect('/contact');
    }

    await Message.createContact({ name, email, message });
    req.flash('success', 'Your message has been sent successfully!');
    res.redirect('/contact');
  } catch (error) {
    console.error('Error submitting message:', error);
    req.flash('error', 'Failed to send message. Please try again.');
    res.redirect('/contact');
  }
});

// Delete message (accessible to staff and the message sender)
router.post('/:id/delete', isLoggedIn, async (req, res) => {
  try {
    const id = req.params.id;
    const message = await Message.getContactById(id);
    
    if (!message) {
      req.flash('error', 'Message not found.');
      return res.redirect(req.user.role === 'staff' ? '/staff/view-messages' : '/contact');
    }

    // Check if user has permission to delete this message
    const isStaff = req.user.role === 'staff';
    const isSender = message.email === req.user.email;
    
    if (!isStaff && !isSender) {
      req.flash('error', 'You do not have permission to delete this message.');
      return res.redirect('/contact');
    }

    await Message.deleteContact(id);
    req.flash('success', 'Message deleted successfully.');
    res.redirect(req.user.role === 'staff' ? '/staff/view-messages' : '/contact');
  } catch (error) {
    console.error('Error deleting message:', error);
    req.flash('error', 'Failed to delete message.');
    res.redirect(req.user.role === 'staff' ? '/staff/view-messages' : '/contact');
  }
});

// Reply to message (staff only)
router.post('/:id/reply', isLoggedIn, checkRole(['staff']), async (req, res) => {
  try {
    const id = req.params.id;
    const { reply } = req.body;
    
    if (!reply || reply.trim().length === 0) {
      req.flash('error', 'Reply message cannot be empty.');
      return res.redirect(`/message/${id}`);
    }

    const message = await Message.getContactById(id);
    if (!message) {
      req.flash('error', 'Message not found.');
      return res.redirect('/staff/view-messages');
    }

    await emailService.sendReplyToContact(
      message.email,
      message.name,
      reply,
      req.user.fullname || 'Staff'
    );

    req.flash('success', 'Reply sent successfully!');
    res.redirect(`/message/${id}`);
  } catch (error) {
    console.error('Error sending reply:', error);
    req.flash('error', 'Failed to send reply.');
    res.redirect(`/message/${id}`);
  }
});

module.exports = router; 