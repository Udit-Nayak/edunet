const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    postId: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      index: true,
    },

    answerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Answer',
      index: true,
    },

    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },

    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    content: {
      type: String,
      required: [true, 'Comment content is required'],
      minlength: [1, 'Comment must be at least 1 character'],
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },

    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    upvotes: {
      type: Number,
      default: 0,
      min: 0,
    },

    upvotedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    isEdited: {
      type: Boolean,
      default: false,
    },

    editedAt: {
      type: Date,
    },

    // For nested comments (max 3 levels)
    depth: {
      type: Number,
      default: 0,
      max: 2, // 0, 1, 2 (3 levels total)
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
commentSchema.index({ postId: 1, createdAt: -1 });
commentSchema.index({ answerId: 1, createdAt: -1 });
commentSchema.index({ authorId: 1, createdAt: -1 });
commentSchema.index({ parentCommentId: 1 });

// Custom validation: either postId or answerId must be present
commentSchema.pre('validate', function() {
  if (!this.postId && !this.answerId) {
    this.invalidate('postId', 'Either postId or answerId must be provided');
    this.invalidate('answerId', 'Either postId or answerId must be provided');
  }
});

// Method to get public comment data
commentSchema.methods.getPublicData = function () {
  return {
    _id: this._id,
    postId: this.postId,
    answerId: this.answerId,
    parentCommentId: this.parentCommentId,
    authorId: this.authorId,
    content: this.content,
    mentions: this.mentions,
    upvotes: this.upvotes,
    isEdited: this.isEdited,
    editedAt: this.editedAt,
    depth: this.depth,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('Comment', commentSchema);