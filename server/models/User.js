const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      sparse: true,
      unique: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },

    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      match: [
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores",
      ],
    },

    password: {
      type: String,
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },

    // Profile Info
    avatar: {
      type: String,
      default: function () {
        return `https://ui-avatars.com/api/?name=${this.username}&background=random`;
      },
    },

    bio: {
      type: String,
      maxlength: [500, "Bio cannot exceed 500 characters"],
      default: "",
    },

    college: {
      type: String,
      default: "",
    },

    yearOfStudy: {
      type: Number,
      min: 1,
      max: 6,
    },

    interests: {
      type: [String],
      default: [],
    },

    // Gamification
    reputation: {
      type: Number,
      default: 0,
      min: 0,
    },

    badges: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Badge",
      },
    ],

    // Streak tracking
    currentStreak: {
      type: Number,
      default: 0,
    },

    longestStreak: {
      type: Number,
      default: 0,
    },

    lastActiveDate: {
      type: Date,
      default: null,
    },

    // Milestones
    postMilestones: {
      type: [Number],
      default: [],
    },

    streakMilestones: {
      type: [Number],
      default: [],
    },

    // Reputation history
    reputationHistory: [
      {
        points: Number,
        reason: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Social
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    savedPosts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],

    // Auth
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

userSchema.index({ reputation: -1 });

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  if (this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) {
    throw new Error("No password set for this user");
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.getPublicProfile = function () {
  return {
    _id: this._id,
    username: this.username,
    email: this.email,
    avatar: this.avatar,
    bio: this.bio,
    college: this.college,
    yearOfStudy: this.yearOfStudy,
    interests: this.interests,
    reputation: this.reputation,
    badges: this.badges,
    followersCount: this.followers.length,
    followingCount: this.following.length,
    authProvider: this.authProvider,
    isEmailVerified: this.isEmailVerified,
    createdAt: this.createdAt,
    lastActive: this.lastActive,
    // New gamification fields
    currentStreak: this.currentStreak || 0,
    longestStreak: this.longestStreak || 0,
  };
};

module.exports = mongoose.model("User", userSchema);
