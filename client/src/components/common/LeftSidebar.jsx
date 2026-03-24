import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass, Bookmark, FileText, Settings } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../ui/Avatar';
import { RepBadge } from '../ui/Badge';
import { Tag } from '../ui/Tag';
import { postAPI } from '../../services/api';

// Define components outside to avoid recreation on every render
const NavItem = ({ path, icon, label, isActive }) => {
  const active = isActive(path);
  return (
    <Link
      to={path}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
        active 
          ? 'bg-primary-light text-primary font-medium' 
          : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
      }`}
    >
      {React.cloneElement(icon, { className: 'w-4 h-4' })}
      {label}
    </Link>
  );
};

const SavedPostItem = ({ post }) => (
  <Link
    to={`/post/${post._id}`}
    className="flex flex-col gap-1 px-3 py-2 rounded-lg text-sm transition-colors duration-150 hover:bg-bg-secondary group"
  >
    <span className="text-text-primary font-medium truncate text-xs leading-tight">
      {post.title}
    </span>
    <span className="text-text-tertiary text-[10px]">
      {post.type === 'question' ? '❓' : post.type === 'note' ? '📝' : '📄'} {post.type}
    </span>
  </Link>
);

export default function LeftSidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const [savedPosts, setSavedPosts] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(true);

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    fetchSavedPosts();
  }, []);

  const fetchSavedPosts = async () => {
    try {
      setLoadingSaved(true);
      const response = await postAPI.getSavedPosts({ limit: 5 });
      setSavedPosts(response.data.posts || []);
    } catch {
      // Failed to load saved posts - show empty state
      setSavedPosts([]);
    } finally {
      setLoadingSaved(false);
    }
  };

  return (
    <aside className="w-64 sticky top-14 h-[calc(100vh-56px)] overflow-y-auto py-4 px-3 flex-col gap-4 custom-scrollbar hidden md:flex">
      {/* User Mini-Profile Card */}
      {user && (
        <Link to={`/user/${user._id}`} className="block">
          <div className="bg-bg-primary border border-border rounded-lg shadow-card p-3 flex items-center gap-3 mb-2 hover:bg-bg-secondary hover:border-primary transition-colors duration-150 cursor-pointer">
            <Avatar 
              src={user.avatar} 
              alt={user.username} 
              size="md" 
              showRing={user.reputation > 500} 
            />
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold text-text-primary truncate border-none">{user.username}</span>
              <div className="mt-0.5">
                <RepBadge score={user.reputation || 0} isTopContributor={user.reputation > 500} />
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Main Nav Links */}
      <nav className="flex flex-col gap-1">
        <NavItem path="/feed" icon={<Compass />} label="Explore All" isActive={isActive} />
        <NavItem path="/saved" icon={<Bookmark />} label="Saved Posts" isActive={isActive} />
        <NavItem path="/dashboard" icon={<FileText />} label="My Dashboard" isActive={isActive} />
        <NavItem path="/settings" icon={<Settings />} label="Settings" isActive={isActive} />
      </nav>

      <div className="h-px bg-border my-2"></div>

      {/* Saved Posts Section */}
      {savedPosts.length > 0 && (
        <>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between px-3 mb-1">
              <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">
                Recently Saved
              </h3>
              <Link 
                to="/saved" 
                className="text-[10px] font-semibold text-primary hover:text-primary-hover"
              >
                View All
              </Link>
            </div>
            {loadingSaved ? (
              <div className="px-3 py-2 text-xs text-text-tertiary">Loading...</div>
            ) : (
              <>
                {savedPosts.slice(0, 5).map((post) => (
                  <SavedPostItem key={post._id} post={post} />
                ))}
              </>
            )}
          </div>
          <div className="h-px bg-border my-2"></div>
        </>
      )}

      {/* Trending Tags Section */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide px-3 mb-1">
          Trending Tags
        </h3>
        <div className="flex flex-wrap gap-1.5 px-3">
          <Tag onClick={() => {}}>machine-learning</Tag>
          <Tag onClick={() => {}}>calculus</Tag>
          <Tag onClick={() => {}}>data-structures</Tag>
          <Tag onClick={() => {}}>quantum</Tag>
          <Tag onClick={() => {}}>reactjs</Tag>
        </div>
      </div>
    </aside>
  );
}
