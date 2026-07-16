import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { postAPI } from '../services/api';
import PageShell from '../components/common/PageShell';
import PostCard from '../components/post/PostCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { Bookmark } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function SavedPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSavedPosts();
  }, []);

  const fetchSavedPosts = async () => {
    try {
      setLoading(true);
      const response = await postAPI.getSavedPosts({ limit: 50 });
      setPosts(response.data.posts || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load saved posts');
    } finally {
      setLoading(false);
    }
  };

  const handlePostUnsaved = (postId) => {
    // Remove the post from the list when it's unsaved
    setPosts(posts.filter((post) => post._id !== postId));
  };

  return (
    <PageShell>
      <div className="flex flex-col gap-4 pb-12">
        {/* Header */}
        <div className="rounded-lg border border-border bg-white p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Bookmark className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Saved Posts</h1>
              <p className="mt-1 text-sm text-text-secondary">
                {posts.length} {posts.length === 1 ? 'post' : 'posts'} saved for later
              </p>
            </div>
          </div>
        </div>

        {/* Posts List */}
        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="py-20 flex justify-center">
              <LoadingSpinner size="lg" text="Loading saved posts..." />
            </div>
          ) : error ? (
            <ErrorMessage
              message={error}
              onRetry={fetchSavedPosts}
            />
          ) : posts.length === 0 ? (
            <div className="rounded-lg border border-border bg-white px-4 py-16 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-bg-secondary">
                <Bookmark className="h-8 w-8 text-text-tertiary" />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-1">No saved posts yet</h3>
              <p className="text-text-secondary mb-6 max-w-sm mx-auto">
                Save posts to read later by clicking the bookmark icon on any post.
              </p>
              <Button onClick={() => navigate('/feed')} variant="primary">
                Explore Posts
              </Button>
            </div>
          ) : (
            <>
              {posts.map((post, index) => (
                <PostCard
                  key={post._id}
                  post={post}
                  position={index + 1}
                  source="saved"
                  onUnsave={handlePostUnsaved}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}
