import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Compass, Bookmark, FileText, Settings, HelpCircle, StickyNote, Newspaper } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../ui/Avatar';
import { RepBadge } from '../ui/Badge';
import { Tag } from '../ui/Tag';
import { postAPI } from '../../services/api';

const NavItem = ({ path, icon, label, isActive }) => {
  const active = isActive(path);
  return (
    <Link
      to={path}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150 ${
        active
          ? 'bg-primary-light font-medium text-primary'
          : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
      }`}
    >
      {React.cloneElement(icon, { className: 'h-4 w-4' })}
      {label}
    </Link>
  );
};

const TypeIcon = ({ type }) => {
  if (type === 'question') return <HelpCircle className="h-3 w-3" />;
  if (type === 'note') return <StickyNote className="h-3 w-3" />;
  return <Newspaper className="h-3 w-3" />;
};

const SavedPostItem = ({ post }) => (
  <Link
    to={`/post/${post._id}`}
    className="group flex flex-col gap-1 rounded-lg px-3 py-2 text-sm transition-colors duration-150 hover:bg-bg-secondary"
  >
    <span className="truncate text-xs font-medium leading-tight text-text-primary">
      {post.title}
    </span>
    <span className="flex items-center gap-1 text-[10px] capitalize text-text-tertiary">
      <TypeIcon type={post.type} />
      {post.type}
    </span>
  </Link>
);

export default function LeftSidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
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
      setSavedPosts([]);
    } finally {
      setLoadingSaved(false);
    }
  };

  return (
    <aside className="custom-scrollbar sticky top-14 hidden h-[calc(100vh-56px)] w-64 flex-col gap-4 overflow-y-auto px-3 py-4 md:flex">
      {user && (
        <Link to={`/user/${user._id || user.id}`} className="block">
          <div className="mb-2 flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-bg-primary p-3 shadow-card transition-colors duration-150 hover:border-primary hover:bg-bg-secondary">
            <Avatar
              src={user.avatar}
              alt={user.username}
              size="md"
              showRing={user.reputation > 500}
            />
            <div className="flex min-w-0 flex-col overflow-hidden">
              <span className="truncate border-none text-sm font-semibold text-text-primary">{user.username}</span>
              <div className="mt-0.5">
                <RepBadge score={user.reputation || 0} isTopContributor={user.reputation > 500} />
              </div>
            </div>
          </div>
        </Link>
      )}

      <nav className="flex flex-col gap-1">
        <NavItem path="/feed" icon={<Compass />} label="Explore All" isActive={isActive} />
        <NavItem path="/saved" icon={<Bookmark />} label="Saved Posts" isActive={isActive} />
        <NavItem path="/dashboard" icon={<FileText />} label="My Dashboard" isActive={isActive} />
        <NavItem path="/settings" icon={<Settings />} label="Settings" isActive={isActive} />
      </nav>

      <div className="my-2 h-px bg-border" />

      {savedPosts.length > 0 && (
        <>
          <div className="flex flex-col gap-1">
            <div className="mb-1 flex items-center justify-between px-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                Recently Saved
              </h3>
              <Link to="/saved" className="text-[10px] font-semibold text-primary hover:text-primary-hover">
                View All
              </Link>
            </div>
            {loadingSaved ? (
              <div className="px-3 py-2 text-xs text-text-tertiary">Loading...</div>
            ) : (
              savedPosts.slice(0, 5).map((post) => (
                <SavedPostItem key={post._id} post={post} />
              ))
            )}
          </div>
          <div className="my-2 h-px bg-border" />
        </>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          Trending Tags
        </h3>
        <div className="flex flex-wrap gap-1.5 px-3">
          {['machine-learning', 'calculus', 'data-structures', 'quantum', 'reactjs'].map((tag) => (
            <Tag key={tag} onClick={() => navigate(`/tag/${tag}`)}>
              {tag}
            </Tag>
          ))}
        </div>
      </div>
    </aside>
  );
}
