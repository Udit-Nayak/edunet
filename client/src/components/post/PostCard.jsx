import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useInteractionTracking, useViewportTracking, useListItemTracking } from "../../hooks/useInteractionTracking";
import { formatTimeAgo, formatNumber, truncateText } from "../../utils/formatters";
import VoteButton from "./VoteButton";
import { postAPI } from "../../services/api";
import { MessageSquare, Eye, CheckCircle, MoreVertical, Image, Share2, FileText } from "lucide-react";
import ConfirmDialog from "../common/ConfirmDialog";
import toast from "react-hot-toast";
import MediaViewer from "../common/MediaViewer";
import SaveButton from "./SaveButton";
import { Card } from "../ui/Card";
import { Avatar } from "../ui/Avatar";
import { TypeBadge, RepBadge } from "../ui/Badge";
import { Tag, SubjectBadge } from "../ui/Tag";
import { getProxiedMediaUrl } from "../../utils/media";

export default function PostCard({ post, onDelete, position = 0, source = "feed", onUnsave }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const cardRef = useRef(null);
  const { trackView, trackClick, trackTagClick } = useInteractionTracking();

  useListItemTracking(post._id, position, {
    source,
    page: "feed",
    sortBy: source === "feed" ? "recommended" : undefined,
  });

  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);

  const isAuthor = user?._id === post.authorId?._id;
  const isDraft = post.status === "draft";

  useViewportTracking(cardRef, post._id, (postId) => {
    if (user) {
      trackView(postId, source, position);
    }
  });

  const handleSaveChange = (isSaved) => {
    if (!isSaved && onUnsave) {
      onUnsave(post._id);
    }
  };

  const handlePostClick = (e) => {
    if (
      e.target.closest("button") ||
      e.target.closest("a") ||
      e.target.closest(".interactive-area")
    ) {
      return;
    }

    trackClick(post._id, source, position);
    navigate(isDraft ? `/post/${post._id}/edit` : `/post/${post._id}`);
  };

  const handleTagClick = (e, tag) => {
    e.stopPropagation();
    e.preventDefault();
    trackTagClick(post._id, tag);
    navigate(`/tag/${tag}`);
  };

  const getPlainText = (html) => {
    if (!html) return "";
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const handlePublish = async () => {
    try {
      await postAPI.publishDraft(post._id);
      toast.success("Draft published successfully!");
      if (onDelete) {
        onDelete(post._id);
      }
      window.location.reload();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to publish draft");
    }
  };

  const handleDelete = async () => {
    try {
      await postAPI.deletePost(post._id);
      toast.success(isDraft ? "Draft deleted successfully" : "Post deleted successfully");
      if (onDelete) {
        onDelete(post._id);
      }
    } catch {
      toast.error("Failed to delete post");
    }
  };

  const handleShare = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const link = `${window.location.origin}/post/${post._id}`;

    if (!navigator.clipboard?.writeText) {
      toast.error("Copy is unavailable in this browser");
      return;
    }

    navigator.clipboard
      .writeText(link)
      .then(() => toast.success("Link copied to clipboard"))
      .catch(() => toast.error("Unable to copy link"));
  };

  return (
    <>
      <div ref={cardRef}>
        <Card
          hoverable
          onClick={handlePostClick}
          className={`group my-2 flex w-full cursor-pointer flex-row gap-3 p-4 text-left sm:gap-4 sm:p-5 ${isDraft ? "border-accent-orange bg-orange-50/30" : ""}`}
          title={isDraft ? "Click to edit this draft" : ""}
        >
          <div className="interactive-area flex w-10 shrink-0 flex-col items-center">
            <VoteButton
              targetId={post._id}
              initialVotes={post.netVotes || 0}
              userVote={post.userVote}
              onUpvote={postAPI.upvotePost}
              onDownvote={postAPI.downvotePost}
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="mb-1.5 flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <TypeBadge type={post.type} />
                {post.subject && (
                  <SubjectBadge subjectColor={post.subjectColor || "#0A66C2"}>
                    {post.subject}
                  </SubjectBadge>
                )}
                {isDraft && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-accent-orange">
                    <FileText className="h-3 w-3" />
                    Draft
                  </span>
                )}
                {post.isEdited && !isDraft && (
                  <span className="text-xs italic text-text-secondary">(edited)</span>
                )}
              </div>

              {isAuthor && (
                <div className="interactive-area relative hidden shrink-0 sm:block">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setShowMenu(!showMenu);
                    }}
                    className="rounded-full p-1 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
                    aria-label="Open post actions"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 z-10 mt-2 w-40 overflow-hidden rounded-lg border border-border bg-white py-1 shadow-dropdown">
                      {isDraft && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePublish();
                            setShowMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm font-medium text-accent-green hover:bg-bg-secondary"
                        >
                          Publish Draft
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/post/${post._id}/edit`);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-secondary"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteDialog(true);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-accent-red hover:bg-bg-secondary"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <h2 className="mb-1 mt-0.5 line-clamp-2 pr-2 text-base font-semibold leading-snug text-text-primary transition-colors group-hover:text-primary sm:pr-4">
              {post.title}
            </h2>
            <p className="line-clamp-2 text-sm leading-6 text-text-secondary">
              {truncateText(getPlainText(post.content), 200)}
            </p>

            {post.attachments && post.attachments.length > 0 && (
              <div className="interactive-area mt-3">
                {post.attachments.length === 1 ? (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMediaViewerIndex(0);
                      setMediaViewerOpen(true);
                    }}
                    className="group/media relative w-full text-left"
                  >
                    {post.attachments[0].type === "image" ? (
                      <img
                        src={getProxiedMediaUrl(post.attachments[0].url)}
                        alt={post.attachments[0].name}
                        className="h-48 w-full rounded-lg border border-border object-cover transition-opacity group-hover/media:opacity-90 sm:h-64"
                      />
                    ) : (
                      <div className="flex items-center space-x-3 rounded-lg border border-border bg-bg-secondary p-4 transition-colors hover:bg-bg-tertiary">
                        <Image className="h-6 w-6 text-text-secondary" />
                        <div className="min-w-0 flex-1 text-left">
                          <p className="truncate text-sm font-medium text-text-primary">
                            {post.attachments[0].name}
                          </p>
                          <p className="text-xs text-text-secondary">PDF Document</p>
                        </div>
                      </div>
                    )}
                  </button>
                ) : (
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
                        className="group/media relative text-left"
                      >
                        {attachment.type === "image" ? (
                          <>
                            <img
                              src={getProxiedMediaUrl(attachment.url)}
                              alt={attachment.name}
                              className="h-24 w-full rounded-lg border border-border object-cover transition-opacity group-hover/media:opacity-90 sm:h-32"
                            />
                            {index === 3 && post.attachments.length > 4 && (
                              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/60">
                                <span className="text-xl font-bold text-white">
                                  +{post.attachments.length - 4}
                                </span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex h-24 w-full items-center justify-center rounded-lg border border-border bg-bg-secondary transition-colors group-hover/media:bg-bg-tertiary sm:h-32">
                            <Image className="h-6 w-6 text-text-secondary" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {post.tags && post.tags.length > 0 && (
              <div className="interactive-area mt-3 flex flex-wrap gap-1.5">
                {post.tags.slice(0, 5).map((tag, index) => (
                  <Tag key={index} onClick={(e) => handleTagClick(e, tag)}>
                    {tag}
                  </Tag>
                ))}
                {post.tags.length > 5 && (
                  <span className="self-center px-2 py-1 text-xs text-text-tertiary">
                    +{post.tags.length - 5}
                  </span>
                )}
              </div>
            )}

            <div className="interactive-area mt-4 flex w-full flex-col gap-3 text-xs text-text-tertiary sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <Link
                  to={`/user/${post.authorId?._id}`}
                  className="flex min-w-0 items-center gap-1.5 transition-opacity hover:opacity-80"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Avatar
                    src={post.authorId?.avatar}
                    alt={post.authorId?.username}
                    size="xs"
                    showRing={post.authorId?.reputation > 500}
                  />
                  <span className="truncate pr-1 font-medium text-text-primary">
                    {post.authorId?.username}
                  </span>
                </Link>
                <div className="hidden shrink-0 sm:block">
                  <RepBadge score={post.authorId?.reputation || 0} isTopContributor={post.authorId?.reputation > 500} />
                </div>
                <span className="hidden sm:inline">•</span>
                <span className="shrink-0">{formatTimeAgo(post.createdAt)}</span>
              </div>

              <div className="ml-0 flex shrink-0 items-center gap-1 sm:ml-auto sm:gap-3">
                {post.type === "question" && post.acceptedAnswerId && (
                  <div className="mr-1 flex flex-row items-center space-x-1 text-accent-green sm:mr-2">
                    <CheckCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Solved</span>
                  </div>
                )}

                <Link
                  to={`/post/${post._id}`}
                  className="flex items-center gap-1.5 rounded p-1.5 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-primary"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Open discussion"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>{formatNumber(post.answerCount || 0)}</span>
                </Link>

                <div className="hidden items-center gap-1.5 p-1.5 text-text-secondary sm:flex">
                  <Eye className="h-4 w-4" />
                  <span>{formatNumber(post.viewCount || 0)}</span>
                </div>

                <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                  <SaveButton
                    postId={post._id}
                    initialSaved={post.isSaved}
                    showCount={false}
                    saveCount={post.saveCount}
                    onSaveChange={handleSaveChange}
                    className="rounded-full p-1.5 text-text-secondary transition-colors hover:bg-bg-secondary"
                  />
                </div>

                <button
                  onClick={handleShare}
                  className="rounded-full p-1.5 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-primary"
                  title="Copy link"
                  aria-label="Copy post link"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {mediaViewerOpen && (
        <MediaViewer
          attachments={post.attachments}
          initialIndex={mediaViewerIndex}
          onClose={() => setMediaViewerOpen(false)}
        />
      )}

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title={isDraft ? "Delete Draft" : "Delete Post"}
        message={isDraft ? "Are you sure you want to delete this draft? This action cannot be undone." : "Are you sure you want to delete this post? This action cannot be undone."}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </>
  );
}
