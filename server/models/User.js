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

    // LinkedIn-style Professional Profile
    headline: {
      type: String,
      maxlength: [120, "Headline cannot exceed 120 characters"],
      default: "",
    },

    location: {
      city: String,
      state: String,
      country: String,
    },

    website: {
      type: String,
      default: "",
    },

    socialLinks: {
      linkedin: String,
      github: String,
      twitter: String,
      portfolio: String,
    },

    education: [
      {
        institution: {
          type: String,
          required: true,
        },
        degree: String,
        fieldOfStudy: String,
        startDate: Date,
        endDate: Date,
        currentlyStudying: {
          type: Boolean,
          default: false,
        },
        grade: String,
        description: String,
      },
    ],

    experience: [
      {
        title: {
          type: String,
          required: true,
        },
        company: {
          type: String,
          required: true,
        },
        location: String,
        startDate: Date,
        endDate: Date,
        currentlyWorking: {
          type: Boolean,
          default: false,
        },
        description: String,
        employmentType: {
          type: String,
          enum: ["Full-time", "Part-time", "Internship", "Freelance", "Contract", ""],
          default: "",
        },
      },
    ],

    projects: [
      {
        title: {
          type: String,
          required: true,
        },
        description: String,
        technologies: [String],
        startDate: Date,
        endDate: Date,
        currentlyWorking: {
          type: Boolean,
          default: false,
        },
        projectUrl: String,
        githubUrl: String,
      },
    ],

    skills: [
      {
        name: {
          type: String,
          required: true,
        },
        level: {
          type: String,
          enum: ["Beginner", "Intermediate", "Advanced", "Expert", ""],
          default: "",
        },
        endorsements: {
          type: Number,
          default: 0,
        },
      },
    ],

    certifications: [
      {
        name: {
          type: String,
          required: true,
        },
        issuingOrganization: String,
        issueDate: Date,
        expirationDate: Date,
        credentialId: String,
        credentialUrl: String,
      },
    ],

    languages: [
      {
        name: {
          type: String,
          required: true,
        },
        proficiency: {
          type: String,
          enum: ["Elementary", "Limited Working", "Professional", "Full Professional", "Native", ""],
          default: "",
        },
      },
    ],

    publications: [
      {
        title: {
          type: String,
          required: true,
        },
        publisher: String,
        publicationDate: Date,
        description: String,
        url: String,
      },
    ],

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

    userInteractions: {
      viewedPosts: [
        {
          postId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
          },
          timestamp: {
            type: Date,
            default: Date.now,
          },
          timeSpent: {
            type: Number,
            default: 0,
          },
          scrollDepth: {
            type: Number,
            default: 0,
          },
        },
      ],
      upvotedPosts: [
        {
          postId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
          },
          timestamp: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      downvotedPosts: [
        {
          postId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
          },
          timestamp: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      clickedTags: [
        {
          tag: String,
          count: {
            type: Number,
            default: 1,
          },
          lastClicked: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      searchHistory: [
        {
          query: String,
          timestamp: {
            type: Date,
            default: Date.now,
          },
          clickedResults: [
            {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Post",
            },
          ],
        },
      ],
    },

    mlProfile: {
      embedding: {
        type: [Number], // Will store 512D vector later
        default: null,
      },
      lastUpdated: {
        type: Date,
        default: null,
      },
      interests: {
        type: [String],
        default: [],
      },
      topTags: [
        {
          tag: String,
          score: Number,
        },
      ],
    },
  },

  { timestamps: true },
);

userSchema.index({ reputation: -1 });

userSchema.index({ "mlProfile.lastUpdated": 1 });
userSchema.index({ "userInteractions.viewedPosts.postId": 1 });

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
    // Gamification fields
    currentStreak: this.currentStreak || 0,
    longestStreak: this.longestStreak || 0,
    // Professional profile fields
    headline: this.headline,
    location: this.location,
    website: this.website,
    socialLinks: this.socialLinks,
    education: this.education,
    experience: this.experience,
    projects: this.projects,
    skills: this.skills,
    certifications: this.certifications,
    languages: this.languages,
    publications: this.publications,
  };
};
module.exports = mongoose.model("User", userSchema);
