import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useInteractionTracking, useViewportTracking, useListItemTracking } from "../../hooks/useInteractionTracking";
import { formatTimeAgo, formatNumber, truncateText } from "../../utils/formatters";
import VoteButton from "./VoteButton";
import { postAPI } from "../../services/api";
import { MessageSquare, Eye, CheckCircle, MoreVertical, Image, Bookmark, Share2 } from "lucide-react";
import ConfirmDialog from "../common/ConfirmDialog";
import toast from "react-hot-toast";
import MediaViewer from "../common/MediaViewer";
import SaveButton from './SaveButton';

// UI Components
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { TypeBadge, RepBadge } from '../ui/Badge';
import { Tag, SubjectBadge } from '../ui/Tag';
import { getProxiedMediaUrl } from '../../utils/media';

export default function PostCard({ post, onDelete, position = 0, source = 'feed', onUnsave }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const cardRef = useRef(null);
  const { trackView, trackClick, trackTagClick } = useInteractionTracking();
  
  // Phase 9: Track impressions for continuous learning
  useListItemTracking(post._id, position, {
    source,
    page: 'feed',
    sortBy: source === 'feed' ? 'recommended' : undefined
  });
  
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);

  const isAuthor = user?._id === post.authorId?._id;
  const isDraft = post.status === 'draft';

  // Track when post becomes visible in viewport
  useViewportTracking(cardRef, post._id, (postId) => {
    if(user){
      trackView(postId, source, position);
    }
  });

  // Handle save/unsave changes
  const handleSaveChange = (isSaved) => {
    if (!isSaved && onUnsave) {
      // If post was unsaved and we're on saved posts page, notify parent
      onUnsave(post._id);
    }
  };

  // Handle post click with tracking
  const handlePostClick = (e) => {
    // Don't track if clicking on interactive elements
    if (
      e.target.closest('button') || 
      e.target.closest('a') || 
      e.target.closest('.interactive-area') // A class we can add to non-navigable areas
    ) {
      return;
    }

    trackClick(post._id, source, position);
    
    if (isDraft) {
      navigate(`/post/${post._id}/edit`);
    } else {
      navigate(`/post/${post._id}`);
    }
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
    navigator.clipboard.writeText(`${window.location.origin}/post/${post._id}`);
    toast.success("Link copied to clipboard");
  };

  return (
    <>
      <div ref={cardRef}>
        <Card 
          hoverable 
          onClick={handlePostClick} 
          className={`flex flex-row gap-3 p-4 cursor-pointer w-full text-left my-2 ${isDraft ? 'border-accent-orange bg-orange-50/30' : ''}`}
          title={isDraft ? 'Click to edit this draft' : ''}
        >
          {/* Left Column: Vote Controls */}
          <div className="w-10 flex flex-col items-center shrink-0 interactive-area">
            <VoteButton
              targetId={post._id}
              initialVotes={post.netVotes || 0}
              userVote={post.userVote}
              onUpvote={postAPI.upvotePost}
              onDownvote={postAPI.downvotePost}
            />
          </div>

          {/* Right Column: Main Content */}
          <div className="flex-1 min-w-0 flex flex-col">
            
            {/* Row 1: Badges & Right Menu */}
            <div className="flex items-start justify-between mb-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <TypeBadge type={post.type} />
                {post.subject && (
                  <SubjectBadge subjectColor={post.subjectColor || '#0A66C2'}>
                    {post.subject}
                  </SubjectBadge>
                )}
                {isDraft && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-accent-orange font-medium">
                    📝 Draft
                  </span>
                )}
                {post.isEdited && !isDraft && (
                  <span className="text-xs text-text-secondary italic">(edited)</span>
                )}
              </div>

              {isAuthor && (
                <div className="relative interactive-area shrink-0 hidden sm:block">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setShowMenu(!showMenu);
                    }}
                    className="p-1 rounded-full hover:bg-bg-secondary text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-dropdown border border-border py-1 z-10">
                      {isDraft && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePublish();
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-bg-secondary text-sm text-accent-green font-medium"
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
                        className="w-full text-left px-4 py-2 hover:bg-bg-secondary text-sm text-text-primary"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteDialog(true);
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-bg-secondary text-sm text-accent-red"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Row 2: Title & Excerpt */}
            <h2 className="text-base font-semibold text-text-primary group-hover:text-primary transition-colors line-clamp-2 mt-0.5 mb-1 pr-4">
              {post.title}
            </h2>
            <p className="text-sm text-text-secondary line-clamp-2">
              {truncateText(getPlainText(post.content), 200)}
            </p>

            {/* Attachments Preview - Included here if present */}
            {post.attachments && post.attachments.length > 0 && (
              <div className="mt-3 interactive-area">
                {post.attachments.length === 1 ? (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMediaViewerIndex(0);
                      setMediaViewerOpen(true);
                    }}
                    className="relative group w-full text-left"
                  >
                    {post.attachments[0].type === "image" ? (
                      <img
                        src={post.attachments[0].url}
                        alt={post.attachments[0].name}
                        className="w-full h-48 sm:h-64 object-cover rounded-lg border border-border group-hover:opacity-90 transition-opacity"
                      />
                    ) : (
                      <div className="flex items-center space-x-3 p-4 bg-bg-secondary rounded-lg border border-border hover:bg-bg-tertiary transition-colors">
                        <Image className="w-6 h-6 text-text-secondary" />
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
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
                        className="relative group text-left"
                      >
                        {attachment.type === "image" ? (
                          <>
                            <img
                              src={getProxiedMediaUrl(attachment.url)}
                              alt={attachment.name}
                              className="w-full h-24 sm:h-32 object-cover rounded-lg border border-border group-hover:opacity-90 transition-opacity"
                            />
                            {index === 3 && post.attachments.length > 4 && (
                              <div className="absolute inset-0 bg-black bg-opacity-60 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xl font-bold">
                                  +{post.attachments.length - 4}
                                </span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="w-full h-24 sm:h-32 bg-bg-secondary rounded-lg border border-border flex items-center justify-center group-hover:bg-bg-tertiary transition-colors">
                            <Image className="w-6 h-6 text-text-secondary" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Row 4: Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5 interactive-area">
                {post.tags.slice(0, 5).map((tag, index) => (
                  <Tag key={index} onClick={(e) => handleTagClick(e, tag)}>
                    {tag}
                  </Tag>
                ))}
                {post.tags.length > 5 && (
                  <span className="text-xs px-2 py-1 text-text-tertiary self-center">
                    +{post.tags.length - 5}
                  </span>
                )}
              </div>
            )}

            {/* Row 5: Meta Bar */}
            <div className="flex items-center flex-wrap gap-2 mt-3.5 text-xs text-text-tertiary interactive-area w-full">
              {/* Left Side: Avatar & Info */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <Link
                  to={`/user/${post.authorId?._id}`}
                  className="flex items-center gap-1.5 hover:opacity-80 transition-opacity shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Avatar 
                    src={post.authorId?.avatar} 
                    alt={post.authorId?.username} 
                    size="xs" 
                    showRing={post.authorId?.reputation > 500} 
                  />
                  <span className="font-medium text-text-primary pr-1">
                    {post.authorId?.username}
                  </span>
                </Link>
                <div className="shrink-0 hidden sm:block">
                  <RepBadge score={post.authorId?.reputation || 0} isTopContributor={post.authorId?.reputation > 500} />
                </div>
                <span className="hidden sm:inline">•</span>
                <span className="shrink-0">{formatTimeAgo(post.createdAt)}</span>
              </div>

              {/* Right Side: Actions */}
              <div className="flex items-center gap-1 sm:gap-3 shrink-0 ml-auto">
                {post.type === "question" && post.acceptedAnswerId && (
                  <div className="flex flex-row items-center space-x-1 text-accent-green mr-1 sm:mr-2">
                    <CheckCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">Solved</span>
                  </div>
                )}
                
                <Link
                  to={`/post/${post._id}`}
                  className="flex items-center gap-1.5 p-1.5 rounded hover:bg-bg-secondary text-text-secondary hover:text-primary transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{formatNumber(post.answerCount || 0)}</span>
                </Link>

                <div className="hidden sm:flex items-center gap-1.5 p-1.5 text-text-secondary">
                  <Eye className="w-4 h-4" />
                  <span>{formatNumber(post.viewCount || 0)}</span>
                </div>

                <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                  <SaveButton 
                    postId={post._id}
                    initialSaved={post.isSaved}
                    showCount={false}
                    saveCount={post.saveCount}
                    onSaveChange={handleSaveChange}
                    className="p-1.5 rounded-full hover:bg-bg-secondary text-text-secondary transition-colors"
                  />
                </div>

                <button 
                  onClick={handleShare}
                  className="p-1.5 rounded-full hover:bg-bg-secondary text-text-secondary transition-colors"
                  title="Copy link"
                >
                  <Share2 className="w-4 h-4" />
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