import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { postAPI } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import Navbar from "../components/common/Navbar";
import VoteButton from "../components/post/VoteButton";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import AnswerList from "../components/answer/AnswerList";
import AnswerForm from "../components/answer/AnswerForm";
import { formatTimeAgo, formatNumber } from "../utils/formatters";
import { FiEye, FiCheckCircle, FiEdit, FiTrash2, FiFile } from "react-icons/fi";
import toast from "react-hot-toast";
import ConfirmDialog from "../components/common/ConfirmDialog";
import MediaViewer from "../components/common/MediaViewer";
import SaveButton from "../components/post/SaveButton";

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);

  useEffect(() => {
    fetchPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const response = await postAPI.getPostById(id, { incrementView: true });
      setPost(response.data.post);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load post");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await postAPI.deletePost(id);
      toast.success("Post deleted successfully");
      navigate("/feed");
    } catch {
      toast.error("Failed to delete post");
    }
  };

  const isAuthor = user?._id === post?.authorId?._id;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <LoadingSpinner size="lg" text="Loading post..." />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <ErrorMessage message={error} onRetry={fetchPost} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Post Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <img
                  src={
                    post.authorId?.avatar ||
                    `https://ui-avatars.com/api/?name=${post.authorId?.username}&background=random`
                  }
                  alt={post.authorId?.username}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <Link
                    to={`/user/${post.authorId?._id}`}
                    className="font-medium text-gray-900 hover:text-primary-600"
                  >
                    {post.authorId?.username}
                  </Link>
                  <div className="text-sm text-gray-500">
                    {formatTimeAgo(post.createdAt)}
                    {post.isEdited && <span> • (edited)</span>}
                    <span> • </span>
                    <span className="inline-flex items-center space-x-1">
                      <FiEye className="w-3 h-3" />
                      <span>{formatNumber(post.viewCount)} views</span>
                    </span>
                  </div>
                </div>
              </div>

              {isAuthor && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => navigate(`/post/${id}/edit`)}
                    className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded"
                    title="Edit"
                  >
                    <FiEdit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowDeleteDialog(true)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <FiTrash2 className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Type Badge */}
            <div className="flex items-center space-x-2">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  post.type === "question"
                    ? "bg-blue-100 text-blue-700"
                    : post.type === "note"
                      ? "bg-green-100 text-green-700"
                      : "bg-purple-100 text-purple-700"
                }`}
              >
                {post.type === "question" && "❓ Question"}
                {post.type === "note" && "📝 Note"}
                {post.type === "article" && "📄 Article"}
              </span>
              {post.type === "question" && post.acceptedAnswerId && (
                <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                  <FiCheckCircle className="w-4 h-4" />
                  <span>Solved</span>
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900">{post.title}</h1>

            {/* Content */}
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Attachments */}
            {post.attachments && post.attachments.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  Attachments:
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {post.attachments.map((attachment, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setMediaViewerIndex(index);
                        setMediaViewerOpen(true);
                      }}
                      className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-all text-left w-full"
                    >
                      {attachment.type === "image" ? (
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-red-100 rounded flex items-center justify-center flex-shrink-0">
                          <FiFile className="w-8 h-8 text-red-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {attachment.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {attachment.type === "image" ? "Image" : "PDF"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Media Viewer Modal */}
            {mediaViewerOpen && (
              <MediaViewer
                attachments={post.attachments}
                initialIndex={mediaViewerIndex}
                onClose={() => setMediaViewerOpen(false)}
              />
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag, index) => (
                  <Link
                    key={index}
                    to={`/tag/${tag}`}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}

            {/* Vote */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <VoteButton
                targetId={post._id}
                initialVotes={post.netVotes || 0}
                userVote={post.userVote}
                onUpvote={postAPI.upvotePost}
                onDownvote={postAPI.downvotePost}
                size="lg"
              />

              <SaveButton
                postId={post._id}
                initialSaved={post.isSaved}
                showCount={isAuthor}
                saveCount={post.saveCount}
                onSaveChange={(saved, count) => {
                  setPost({ ...post, isSaved: saved, saveCount: count });
                }}
              />

              <div className="text-sm text-gray-600">
                {formatNumber(post.answerCount || 0)} answer
                {post.answerCount !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        </div>

        {/* Answers Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {post.answerCount || 0} Answer{post.answerCount !== 1 ? "s" : ""}
          </h2>
          <AnswerList
            postId={id}
            acceptedAnswerId={post.acceptedAnswerId}
            isPostAuthor={isAuthor}
          />
        </div>

        {/* Answer Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Your Answer
          </h3>
          <AnswerForm postId={id} onAnswerCreated={fetchPost} />
        </div>
      </div>

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
    </div>
  );
}
