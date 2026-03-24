import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { postAPI } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import PageShell from "../components/common/PageShell";
import VoteButton from "../components/post/VoteButton";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import AnswerList from "../components/answer/AnswerList";
import AnswerForm from "../components/answer/AnswerForm";
import { formatTimeAgo, formatNumber } from "../utils/formatters";
import { FiEye, FiCheckCircle, FiEdit, FiTrash2, FiFile, FiMessageSquare } from "react-icons/fi";
import toast from "react-hot-toast";
import ConfirmDialog from "../components/common/ConfirmDialog";
import MediaViewer from "../components/common/MediaViewer";
import SaveButton from "../components/post/SaveButton";
import SimilarPosts from "../components/post/SimilarPosts";
import { useTimeTracking, useLearningTracking } from "../hooks/useInteractionTracking";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";

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

  useTimeTracking(id, "detail");
  
  const { trackUpvote, trackDownvote, trackSave, trackUnsave, trackAnswer } = useLearningTracking(
    id,
    { source: 'detail', trackClickOnMount: true, page: 'post-detail' }
  );

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
      <PageShell showLeftSidebar={false} showRightSidebar={false}>
        <div className="py-20 flex justify-center">
          <LoadingSpinner size="lg" text="Loading discussion..." />
        </div>
      </PageShell>
    );
  }

  if (error || !post) {
    return (
      <PageShell showLeftSidebar={false} showRightSidebar={false}>
        <div className="py-12">
          <ErrorMessage message={error} onRetry={fetchPost} />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell showLeftSidebar={false} showRightSidebar={false}>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-[1128px] mx-auto w-full">
        
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Post Card */}
          <article className="bg-white rounded-xl shadow-card border border-border p-6 sm:p-8">
            <div className="flex flex-col gap-6">
              
              {/* Header Info */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar 
                    src={post.authorId?.avatar} 
                    name={post.authorId?.username} 
                    size="md" 
                    showRing={post.authorId?.reputation > 500} 
                  />
                  <div className="flex flex-col">
                    <Link
                      to={`/user/${post.authorId?._id}`}
                      className="font-bold text-text-primary hover:text-primary transition-colors text-[15px]"
                    >
                      {post.authorId?.username}
                    </Link>
                    <div className="text-xs text-text-tertiary flex items-center gap-1.5 font-medium mt-0.5">
                      <span>{formatTimeAgo(post.createdAt)}</span>
                      {post.isEdited && <span>• (edited)</span>}
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <FiEye className="w-3 h-3" />
                        {formatNumber(post.viewCount)} views
                      </span>
                    </div>
                  </div>
                </div>

                {isAuthor && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/post/${id}/edit`)}
                      className="text-text-secondary hover:text-primary h-8 w-8 p-0 flex items-center justify-center"
                      title="Edit"
                    >
                      <FiEdit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-text-secondary hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 flex items-center justify-center"
                      title="Delete"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Title & Type Badge */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                      post.type === "question"
                        ? "bg-[#0A66C2]/10 text-[#0A66C2]"
                        : post.type === "note"
                          ? "bg-[#27C93F]/10 text-[#27C93F]"
                          : "bg-[#7B1FA2]/10 text-[#7B1FA2]"
                    }`}
                  >
                    {post.type}
                  </span>
                  {post.type === "question" && post.acceptedAnswerId && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-[#27C93F]/10 text-[#27C93F]">
                      <FiCheckCircle className="w-3.5 h-3.5" />
                      Solved
                    </span>
                  )}
                  {post.subject && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border border-border text-text-secondary">
                      {post.subject}
                    </span>
                  )}
                </div>
                
                <h1 className="text-2xl sm:text-3xl font-sans font-bold text-text-primary leading-snug">
                  {post.title}
                </h1>
              </div>

              {/* Rich Content - TipTap rendering */}
              <div
                className="prose prose-p:text-text-primary prose-p:text-[15px] prose-p:leading-relaxed prose-headings:font-sans prose-headings:font-bold prose-headings:text-text-primary prose-a:text-primary hover:prose-a:text-primary-hover prose-strong:text-text-primary prose-code:text-[#D32F2F] prose-code:bg-bg-secondary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-code:text-sm prose-pre:bg-[#1D1D1D] prose-pre:text-white prose-pre:font-mono prose-pre:text-sm prose-pre:rounded-xl prose-img:rounded-xl prose-img:border prose-img:border-border max-w-none tiptap-content"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />

              {/* Attachments */}
              {post.attachments && post.attachments.length > 0 && (
                <div className="pt-4 border-t border-border flex flex-col gap-3">
                  <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-wider">
                    Attached Files
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {post.attachments.map((attachment, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setMediaViewerIndex(index);
                          setMediaViewerOpen(true);
                        }}
                        className="flex items-center gap-3 p-2 bg-white rounded-lg border border-border hover:border-primary/50 hover:shadow-card transition-all text-left w-full group outline-none"
                      >
                        {attachment.type === "image" ? (
                          <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-border/50">
                            <img
                              src={attachment.url}
                              alt={attachment.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center shrink-0 border border-red-100">
                            <FiFile className="w-6 h-6 text-[#FF5F56]" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <p className="text-[13px] font-bold text-text-primary truncate">
                            {attachment.name}
                          </p>
                          <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mt-0.5">
                            {attachment.type}
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
                <div className="flex flex-wrap gap-2 pt-2">
                  {post.tags.map((tag, index) => (
                    <Link
                      key={index}
                      to={`/tag/${tag}`}
                      className="px-2.5 py-1 bg-bg-secondary text-text-secondary rounded-md text-[13px] font-semibold hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              )}

              {/* Interaction Bar */}
              <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
                <div className="flex items-center gap-2">
                  <VoteButton
                    targetId={post._id}
                    initialVotes={post.netVotes || 0}
                    userVote={post.userVote}
                    onUpvote={postAPI.upvotePost}
                    onDownvote={postAPI.downvotePost}
                    size="lg"
                    onUpvoteTracking={trackUpvote}
                    onDownvoteTracking={trackDownvote}
                  />
                  
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-secondary/50 rounded-full text-text-secondary font-semibold text-[13px]">
                    <FiMessageSquare className="w-4 h-4" />
                    <span>{formatNumber(post.answerCount || 0)}</span>
                    <span className="hidden sm:inline">Answers</span>
                  </div>
                </div>

                <SaveButton
                  postId={post._id}
                  initialSaved={post.isSaved}
                  showCount={isAuthor}
                  saveCount={post.saveCount}
                  onSaveChange={(saved, count) => {
                    setPost({ ...post, isSaved: saved, saveCount: count });
                  }}
                  onSaveTracking={trackSave}
                  onUnsaveTracking={trackUnsave}
                />
              </div>
            </div>
          </article>

          {/* Answers Section */}
          <section className="bg-white rounded-xl shadow-card border border-border p-6 sm:p-8">
            <h2 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
              <FiMessageSquare className="w-5 h-5 text-primary" />
              {post.answerCount || 0} Discussion{post.answerCount !== 1 ? "s" : ""}
            </h2>
            <AnswerList
              postId={id}
              acceptedAnswerId={post.acceptedAnswerId}
              isPostAuthor={isAuthor}
            />
          </section>

          {/* Answer Form */}
          <section className="bg-white rounded-xl shadow-card border border-border p-6 sm:p-8">
            <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
              <Avatar src={user?.avatar} name={user?.username} size="sm" />
              Add your perspective
            </h3>
            <div className="pl-0 sm:pl-10">
              <AnswerForm postId={id} onAnswerCreated={fetchPost} onAnswerTracking={trackAnswer} />
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 md:col-span-2 block">
          <div className="sticky top-20">
            <div className="bg-white rounded-xl shadow-card border border-border p-5">
              <h3 className="text-sm font-bold text-text-tertiary uppercase tracking-wider mb-4">
                Similar Discussions
              </h3>
              <SimilarPosts postId={id} />
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Discussion"
        message="Are you sure you want to delete this post? This action cannot be undone and all associated answers will be removed."
        confirmText="Delete Post"
        cancelText="Cancel"
        type="danger"
      />
    </PageShell>
  );
}
