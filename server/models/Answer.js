const mongoose = require('mongoose');



const answerSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },

    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    content: {
      type: String,
      required: [true, 'Answer content is required'],
      minlength: [10, 'Answer must be at least 10 characters'],
    },

    upvotes: {
      type: Number,
      default: 0,
      min: 0,
    },

    downvotes: {
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

    downvotedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    commentCount:{
      type:Number,
      default:0,
      min:0,
    },


    isAccepted: {
      type: Boolean,
      default: false,
    },

    isEdited: {
      type: Boolean,
      default: false,
    },

    editedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
answerSchema.index({ postId: 1, createdAt: -1 });
answerSchema.index({ authorId: 1, createdAt: -1 });

// Virtual for net votes
answerSchema.virtual('netVotes').get(function () {
  return this.upvotes - this.downvotes;
});

// Method to get public answer data
answerSchema.methods.getPublicData = function () {
  return {
    _id: this._id,
    postId: this.postId,
    authorId: this.authorId,
    content: this.content,
    upvotes: this.upvotes,
    downvotes: this.downvotes,
    netVotes: this.netVotes,
    commentCount: this.commentCount, 
    isAccepted: this.isAccepted,
    isEdited: this.isEdited,
    editedAt: this.editedAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('Answer', answerSchema);
