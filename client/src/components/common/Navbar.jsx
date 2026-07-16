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
  User,
  Settings,
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
    <nav className="sticky top-0 z-50 h-14 border-b border-border bg-bg-primary/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex h-full w-full max-w-[1440px] items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link to={isAuthenticated ? "/feed" : "/"} className="flex flex-shrink-0 items-center rounded-md focus-visible:ring-2 focus-visible:ring-primary/40">
          <span className="font-sans text-xl font-bold tracking-normal text-accent-orange">E</span>
          <span className="font-sans text-xl font-bold tracking-normal text-text-primary">dunet</span>
        </Link>

        {/* Center Nav Items */}
        {isAuthenticated && (
          <div className="hidden h-full flex-1 items-center gap-6 md:mx-8 md:flex md:max-w-3xl">
            {renderNavItem('/feed', <Home />, 'Feed')}
            <div className="min-w-[260px] max-w-xl flex-1">
              <SearchBar variant="navbar" />
            </div>
            {renderNavItem('/create-post', <PlusCircle />, 'Create')}
          </div>
        )}

        {/* Right Cluster */}
        <div className="flex h-full items-center gap-2">
          {isAuthenticated ? (
            <>
              <NotificationDropdown />
              
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="ml-1 rounded-full outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-primary/40" aria-label="User menu">
                    <Avatar src={user?.avatar} alt="Profile" size="sm" showRing={user?.reputation > 500} />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content className="z-50 mr-4 mt-2 w-52 rounded-lg border border-border bg-white p-1 shadow-dropdown" align="end">
                    <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-text-primary outline-none hover:bg-bg-secondary" onClick={() => navigate(`/user/${user?._id || user?.id}`)}>
                      <User className="h-4 w-4 text-text-secondary" />
                      Profile
                    </DropdownMenu.Item>
                    <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-text-primary outline-none hover:bg-bg-secondary" onClick={() => navigate('/settings')}>
                      <Settings className="h-4 w-4 text-text-secondary" />
                      Settings
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className="my-1 h-px bg-border" />
                    <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-accent-red outline-none hover:bg-accent-red/10" onSelect={handleLogout}>
                      <LogOut className="h-4 w-4" />
                      Logout
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-sm font-semibold text-text-secondary transition-colors hover:text-primary">
                Sign In
              </Link>
              <Link to="/register" className="rounded-pill bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-hover">
                Join Free
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
