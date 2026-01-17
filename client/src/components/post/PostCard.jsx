import { Link, useNavigate } from "react-router-dom";
import {
  formatTimeAgo,
  formatNumber,
  truncateText,
} from "../../utils/formatters";
import VoteButton from "./VoteButton";
import { postAPI } from "../../services/api";
import {
  FiMessageSquare,
  FiEye,
  FiCheckCircle,
  FiMoreVertical,
  FiImage,
} from "react-icons/fi";
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import ConfirmDialog from "../common/ConfirmDialog";
import toast from "react-hot-toast";
import MediaViewer from "../common/MediaViewer";

export default function PostCard({ post, onDelete }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);

  const isAuthor = user?._id === post.authorId?._id;

  const getTypeColor = (type) => {
    switch (type) {
      case "question":
        return "bg-blue-100 text-blue-700";
      case "note":
        return "bg-green-100 text-green-700";
      case "article":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "question":
        return "❓";
      case "note":
        return "📝";
      case "article":
        return "📄";
      default:
        return "📌";
    }
  };

  // Strip HTML tags for preview
  const getPlainText = (html) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const handleDelete = async () => {
    try {
      await postAPI.deletePost(post._id);
      toast.success("Post deleted successfully");
      if (onDelete) {
        onDelete(post._id);
      }
    } catch {
      toast.error("Failed to delete post");
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <img
                src={
                  post.authorId?.avatar ||
                  `https://ui-avatars.com/api/?name=${post.authorId?.username}&background=random`
                }
                alt={post.authorId?.username}
                className="w-10 h-10 rounded-full flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <Link
                    to={`/user/${post.authorId?._id}`}
                    className="font-medium text-gray-900 hover:text-primary-600 truncate"
                  >
                    {post.authorId?.username}
                  </Link>
                  <span className="text-gray-500">•</span>
                  <span className="text-sm text-gray-500">
                    {formatTimeAgo(post.createdAt)}
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(post.type)}`}
                  >
                    {getTypeIcon(post.type)} {post.type}
                  </span>
                  {post.isEdited && (
                    <span className="text-xs text-gray-500">(edited)</span>
                  )}
                </div>
              </div>
            </div>

            {isAuthor && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <FiMoreVertical className="w-5 h-5 text-gray-500" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                    <button
                      onClick={() => {
                        navigate(`/post/${post._id}/edit`);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteDialog(true);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <Link to={`/post/${post._id}`} className="block">
            <h2 className="text-xl font-semibold text-gray-900 mb-2 hover:text-primary-600 transition-colors">
              {post.title}
            </h2>
            <p className="text-gray-600 mb-3 line-clamp-3">
              {truncateText(getPlainText(post.content), 200)}
            </p>
          </Link>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {post.tags.slice(0, 5).map((tag, index) => (
                <Link
                  key={index}
                  to={`/tag/${tag}`}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  #{tag}
                </Link>
              ))}
              {post.tags.length > 5 && (
                <span className="text-xs px-2 py-1 text-gray-500">
                  +{post.tags.length - 5} more
                </span>
              )}
            </div>
          )}

          {/* Attachments Preview */}
          {post.attachments && post.attachments.length > 0 && (
            <div className="mb-3">
              {post.attachments.length === 1 ? (
                // Single attachment - show larger preview
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMediaViewerIndex(0);
                    setMediaViewerOpen(true);
                  }}
                  className="relative group w-full"
                >
                  {post.attachments[0].type === "image" ? (
                    <img
                      src={post.attachments[0].url}
                      alt={post.attachments[0].name}
                      className="w-full h-64 object-cover rounded-lg border border-gray-200 group-hover:opacity-90 transition-opacity"
                    />
                  ) : (
                    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                      <FiImage className="w-6 h-6 text-gray-500" />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-gray-900">
                          {post.attachments[0].name}
                        </p>
                        <p className="text-xs text-gray-500">PDF Document</p>
                      </div>
                    </div>
                  )}
                </button>
              ) : (
                // Multiple attachments - show grid
                <div className="grid grid-cols-2 gap-2">
                  {post.attachments.slice(0, 4).map((attachment, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMediaViewerIndex(index);
                        setMediaViewerOpen(true);
                      }}
                      className="relative group"
                    >
                      {attachment.type === "image" ? (
                        <>
                          <img
                            src={attachment.url}
                            alt={attachment.name}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 group-hover:opacity-90 transition-opacity"
                          />
                          {index === 3 && post.attachments.length > 4 && (
                            <div className="absolute inset-0 bg-black bg-opacity-60 rounded-lg flex items-center justify-center">
                              <span className="text-white text-2xl font-bold">
                                +{post.attachments.length - 4}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-32 bg-red-100 rounded-lg border border-gray-200 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                          <FiImage className="w-8 h-8 text-red-600" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <VoteButton
              targetId={post._id}
              initialVotes={post.netVotes || 0}
              userVote={post.userVote}
              onUpvote={postAPI.upvotePost}
              onDownvote={postAPI.downvotePost}
              size="md"
            />

            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <Link
                to={`/post/${post._id}`}
                className="flex items-center space-x-1 hover:text-primary-600"
              >
                <FiMessageSquare className="w-4 h-4" />
                <span>{formatNumber(post.answerCount || 0)} answers</span>
              </Link>

              <div className="flex items-center space-x-1">
                <FiEye className="w-4 h-4" />
                <span>{formatNumber(post.viewCount || 0)} views</span>
              </div>

              {post.type === "question" && post.acceptedAnswerId && (
                <div className="flex items-center space-x-1 text-green-600">
                  <FiCheckCircle className="w-4 h-4" />
                  <span>Solved</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Media Viewer Modal */}
      {mediaViewerOpen && (
        <MediaViewer
          attachments={post.attachments}
          initialIndex={mediaViewerIndex}
          onClose={() => setMediaViewerOpen(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </>
  );
}
