const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    type: {
      type: String,
      enum: [
        'post_upvote',
        'post_downvote',
        'answer_upvote',
        'answer_downvote',
        'comment_upvote',
        'new_answer',
        'new_comment_on_post',
        'new_comment_on_answer',
        'reply_to_comment',
        'answer_accepted',
        'mention',
      ],
      required: true,
    },
    
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
    },
    
    answer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Answer',
    },
    
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
    },
    
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    
    message: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// Auto-delete old read notifications after 30 days
notificationSchema.index(
  { createdAt: 1 },
  { 
    expireAfterSeconds: 1 * 24 * 60 * 60,
    partialFilterExpression: { isRead: true }
  }
);

module.exports = mongoose.model('Notification', notificationSchema);