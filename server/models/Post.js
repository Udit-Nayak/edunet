const mongoose = require("mongoose");
const attachmentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["pdf", "image", "code"],
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  language: {
    type: String,
  },
  size: {
    type: Number, // File size in bytes
  },
});

const postSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["note", "question", "article"],
      required: [true, "Post type is required"],
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [5, "Title must be at least 5 characters"],
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      minlength: [10, "Content must be at least 10 characters"],
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function (tags) {
          return tags.length <= 10;
        },
        message: "Cannot have more than 10 tags",
      },
    },
    attachments: [attachmentSchema],
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
        ref: "User",
      },
    ],

    downvotedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ML Metadata
    mlMetadata: {
      embedding: {
        type: [Number], // 512D vector from TensorFlow Hub
        default: null,
      },
      predictedTags: [
        {
          tag: String,
          confidence: {
            type: Number,
            min: 0,
            max: 1,
          },
        },
      ],
      semanticTopics: {
        type: [String],
        default: [],
      },
      lastEmbeddingUpdate: {
        type: Date,
        default: null,
      },
    },

    // Engagement metrics for ML training
    engagementMetrics: {
      avgTimeSpent: {
        type: Number, // seconds
        default: 0,
      },
      clickThroughRate: {
        type: Number, // 0-1
        default: 0,
      },
      completionRate: {
        type: Number, // 0-1 (how many read to end)
        default: 0,
      },
      totalImpressions: {
        type: Number,
        default: 0,
      },
      totalClicks: {
        type: Number,
        default: 0,
      },
    },

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "published",
    },

    draftCreatedAt: {
      type: Date,
      default: null,
    },

    // For questions only
    acceptedAnswerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Answer",
    },

    answerCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    commentCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    saveCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    savedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Metadata
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
  },
);

postSchema.index({ authorId: 1, createdAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ type: 1, status: 1, createdAt: -1 });
postSchema.index({ title: "text", content: "text", tags: "text" });
postSchema.index({ 'mlMetadata.lastEmbeddingUpdate': 1 });
postSchema.index({ 'mlMetadata.semanticTopics': 1 });
postSchema.index({ 'engagementMetrics.clickThroughRate': -1 });

// TEXT SEARCH INDEX - Add this to Post.js
postSchema.index(
  {
    title: "text",
    content: "text",
    tags: "text",
  },
  {
    weights: {
      title: 10, // Title matches are most important
      tags: 5, // Tag matches are medium importance
      content: 1, // Content matches are least important
    },
    name: "post_text_search",
  },
);

// Virtual for calculating net votes
postSchema.virtual("netVotes").get(function () {
  return this.upvotes - this.downvotes;
});

postSchema.pre("save", async function () {
  if (this.isModified("status")) {
    if (this.status === "draft" && !this.draftCreatedAt) {
      this.draftCreatedAt = new Date();
    } else if (this.status === "published") {
      this.draftCreatedAt = null;
    }
  }
});

// Method to get public post data
// Update the getPublicData method
postSchema.methods.getPublicData = function (requestingUserId = null) {
  const data = {
    _id: this._id,
    type: this.type,
    title: this.title,
    content: this.content,
    authorId: this.authorId,
    tags: this.tags,
    attachments: this.attachments,
    upvotes: this.upvotes,
    downvotes: this.downvotes,
    netVotes: this.netVotes,
    viewCount: this.viewCount,
    status: this.status,
    acceptedAnswerId: this.acceptedAnswerId,
    answerCount: this.answerCount,
    commentCount: this.commentCount,
    isEdited: this.isEdited,
    editedAt: this.editedAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };

  // Only include saveCount if requesting user is the author
  if (
    requestingUserId &&
    this.authorId.toString() === requestingUserId.toString()
  ) {
    data.saveCount = this.saveCount;
  }

  return data;
};

module.exports = mongoose.model("Post", postSchema);
