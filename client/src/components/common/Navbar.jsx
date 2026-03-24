import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useAuth } from '../../hooks/useAuth';
import { authAPI } from '../../services/api';
import { logout as logoutAction } from '../../redux/slices/authSlice';
import toast from 'react-hot-toast';
import { 
  Home, 
  PlusCircle, 
  LogOut, 
} from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Avatar } from '../ui/Avatar';
import NotificationDropdown from './NotificationDropdown';
import SearchBar from '../search/SearchBar';

export default function Navbar() {
  const { user, isAuthenticated } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      dispatch(logoutAction());
      toast.success('Logged out successfully');
      navigate('/');
    } catch {
      toast.error('Logout failed');
    }
  };

  const isActive = (path) => location.pathname === path;

  // Icon Button Style
  

  const renderNavItem = (path, icon, label) => {
    const active = isActive(path);
    const content = (
      <Link
        to={path}
        className={`flex items-center gap-2 h-14 border-b-[3px] transition-colors duration-150 px-2 group ${
          active 
            ? 'border-primary text-primary' 
            : 'border-transparent text-text-secondary hover:text-text-primary'
        }`}
      >
        {React.cloneElement(icon, { 
          className: `w-5 h-5 ${active ? 'text-primary' : 'text-text-secondary group-hover:text-text-primary'}` 
        })}
        <span className={`text-xs font-semibold ${active ? 'block' : 'hidden md:group-hover:block'}`}>
          {label}
        </span>
      </Link>
    );

    if (active) return content;

    return (
      <Tooltip.Provider delayDuration={200}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            {content}
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="md:hidden bg-bg-primary text-text-primary text-xs font-semibold px-2 py-1 rounded shadow-md border border-border"
              sideOffset={5}
            >
              {label}
              <Tooltip.Arrow className="fill-bg-primary" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  };

  return (
    <nav className="h-14 sticky top-0 z-50 bg-bg-primary border-b border-border flex items-center justify-between px-6 shadow-sm">
      {/* Logo */}
      <Link to={isAuthenticated ? "/feed" : "/"} className="flex items-center flex-shrink-0">
        <span className="font-sans font-bold text-accent-orange text-xl tracking-tight">E</span>
        <span className="font-sans font-bold text-[#1D1D1D] text-xl tracking-tight">dunet</span>
      </Link>

      {/* Center Nav Items */}
      {isAuthenticated && (
        <div className="hidden md:flex items-center h-full gap-6 flex-1 max-w-3xl mx-8">
          {renderNavItem('/feed', <Home />, 'Feed')}
          <div className="flex-1 min-w-[280px] max-w-xl">
            <SearchBar variant="navbar" />
          </div>
          {renderNavItem('/create-post', <PlusCircle />, 'Create')}
        </div>
      )}

      {/* Right Cluster */}
      <div className="flex items-center gap-2 h-full">
        {isAuthenticated ? (
          <>
            <NotificationDropdown />
            
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="rounded-full overflow-hidden hover:opacity-80 transition-opacity ml-2 outline-none" aria-label="User menu">
                  <Avatar src={user?.avatar} alt="Profile" size="sm" showRing={user?.reputation > 500} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="w-48 bg-white rounded-lg shadow-dropdown border border-border p-1 z-50 mr-4 mt-2" align="end">
                  <DropdownMenu.Item className="text-sm px-3 py-2 cursor-pointer hover:bg-bg-secondary rounded-md outline-none" onClick={() => navigate(`/user/${user?._id || user?.id}`)}>
                    Profile
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className="text-sm px-3 py-2 cursor-pointer hover:bg-bg-secondary rounded-md outline-none" onClick={() => navigate('/edit-profile')}>
                    Edit Profile
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className="text-sm px-3 py-2 cursor-pointer hover:bg-bg-secondary rounded-md outline-none" onClick={() => navigate('/settings')}>
                    Settings
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="h-px bg-border my-1" />
                  <DropdownMenu.Item className="text-sm px-3 py-2 cursor-pointer hover:bg-bg-secondary rounded-md text-accent-red font-medium outline-none flex items-center gap-2" onSelect={handleLogout}>
                    <LogOut className="w-4 h-4" />
                    Logout
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-semibold text-text-secondary hover:text-primary transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="bg-primary hover:bg-primary-hover text-white rounded-pill px-5 py-2 text-sm font-semibold transition-all">
              Join Free
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}