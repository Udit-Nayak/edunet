import React from 'react';
import { Home, Compass, Plus, Bookmark, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

// Define NavItem outside the component to avoid recreation on every render
const NavItem = ({ path, icon, isActive }) => {
  const active = isActive(path);
  return (
    <Link
      to={path}
      className={`flex flex-col items-center justify-center w-12 h-12 relative ${
        active ? 'text-primary' : 'text-text-secondary'
      } transition-colors hover:text-primary`}
      aria-current={active ? 'page' : undefined}
    >
      {React.cloneElement(icon, { className: 'w-6 h-6' })}
    </Link>
  );
};

export default function BottomNavbar() {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const isActive = (path) => location.pathname === path;

  if (!isAuthenticated) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-14 items-center justify-around border-t border-border bg-bg-primary px-2 shadow-[0_-1px_3px_rgba(0,0,0,0.05)] lg:hidden">
      <NavItem path="/feed" icon={<Home />} isActive={isActive} />
      <NavItem path="/personalized" icon={<Compass />} isActive={isActive} />
      
      {/* Create Post FAB style inline item */}
      <Link 
        to="/create-post"
        className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white shadow-md transform -translate-y-2 hover:bg-primary-hover active:scale-95 transition-all"
      >
        <Plus className="w-5 h-5" />
      </Link>
      
      <NavItem path="/saved" icon={<Bookmark />} isActive={isActive} />
      <NavItem path={`/user/${user?.id || user?._id}`} icon={<User />} isActive={isActive} />
    </nav>
  );
}
