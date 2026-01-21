const Notification = require("../models/Notification");
class NotificationService {
  async createNotification({
    recipient,
    sender,
    type,
    post,
    answer,
    comment,
    message,
  }) {
    try {
      if (recipient.toString() === sender.toString()) {
        return null;
      }
      const recentNotification = await Notification.findOne({
        recipient,
        sender,
        type,
        post,
        answer,
        comment,
        message,
        createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) },
      });
      if (recentNotification) {
        return recentNotification;
      }

      const notification = await Notification.create({
        recipient,
        sender,
        type,
        post,
        answer,
        comment,
        message,
      });

      return notification;
    } catch (error) {
      console.error("Create notification error:", error);
      return null;
    }
  }

  async notifyPostUpvote(postAuthorId, voterId, postId) {
    return await this.createNotification({
      recipient: postAuthorId,
      sender: voterId,
      type: "post_upvote",
      post: postId,
      message: "upvoted your post",
    });
  }

  async notifyAnswerUpvote(answerAuthorId, voterId, answerId, postId) {
    return await this.createNotification({
      recipient: answerAuthorId,
      sender: voterId,
      type: "answer_upvote",
      post: postId,
      answer: answerId,
      message: "upvotes your answer",
    });
  }

  async notifyCommentUpvote(commentAutherId, voterId, commentId, postId) {
    return await this.createNotification({
      recipient: commentAutherId,
      sender: voterId,
      type: "comment_upvote",
      post: postId,
      comment: commentId,
      message: "upvoted your comment",
    });
  }

  async notifyNewAnswer(postAuthorId, answerAuthorId, postId, answerId) {
    return await this.createNotification({
      recipient: postAuthorId,
      sender: answerAuthorId,
      type: "new_answer",
      post: postId,
      answer: answerId,
      message: "answered your question",
    });
  }

  async notifyNewCommentOnPost(
    postAuthorId,
    commentAutherId,
    postId,
    commentId,
  ) {
    return await this.createNotification({
      recipient: postAuthorId,
      sender: commentAutherId,
      type: "new_comment_on_post",
      post: postId,
      comment: commentId,
      message: "commented on your post",
    });
  }

  async notifyNewCommentOnAnswer(
    answerAuthorId,
    commentAutherId,
    postId,
    answerId,
    commentId,
  ) {
    return await this.createNotification({
      recipient: answerAuthorId,
      sender: commentAutherId,
      type: "new_comment_on_answer",
      post: postId,
      answer: answerId,
      comment: commentId,
      message: "commented on your answer",
    });
  }

  async notifyReplyToComment(answerAuthorId, postAuthorId, postId, answerId) {
    return await this.createNotification({
      recipient: answerAuthorId,
      sender: postAuthorId,
      type: "answer_accepted",
      post: postId,
      answer: answerId,
      message: "accepted your answer",
    });
  }

  async notifyAnswerAccepted(answerAuthorId, postAuthorId, postId, answerId) {
    return await this.createNotification({
      recipient: answerAuthorId,
      sender: postAuthorId,
      type: 'answer_accepted',
      post: postId,
      answer: answerId,
      message: 'accepted your answer',
    });
  }

  async getUserNotification(
    userId,
    { page = 1, limit = 20, unreadOnly = false },
  ) {
    try {
      const query = { recipient: userId };

      if (unreadOnly) {
        query.isRead = false;
      }
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("sender", "username avatar")
        .populate("post", "title type")
        .populate("answer", "content")
        .populate("comment", "content")
        .lean();

      const total = await Notification.countDocuments(query);
      const unreadCount = await Notification.countDocuments({
        recipient: userId,
        isRead: false,
      });

      return {
        notifications,
        unreadCount,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit),
        },
      };
    } catch (error) {
      console.error("Get Notification error:", error);
      throw error;
    }
  }

  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { isRead: true },
        { new: true },
      );
      return notification;
    } catch (error) {
      console.error("Mark as read error:", error);
      throw error;
    }
  }

  async markAllAsRead(userId) {
    try {
      await Notification.updateMany(
        { recipient: userId, isRead: false },
        { isRead: true },
      );
      return true;
    } catch (error) {
      console.error("Mark all as read error:", error);
      throw error;
    }
  }

  async deleteNotification(notificationId, userId) {
    try {
      await Notification.findOneAndDelete({
        _id: notificationId,
        recipient: userId,
      });
      return true;
    } catch (error) {
      console.error("Delete notification error:", error);
      throw error;
    }
  }

  async getUnreadCount(userId) {
    try {
      const count = await Notification.countDocuments({
        recipient: userId,
        isRead: false,
      });
      return count;
    } catch (error) {
      console.error("Get unread count error:", error);
      return 0;
    }
  }
}

module.exports = new NotificationService();
