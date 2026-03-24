import React from 'react';
import Navbar from './Navbar';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import BottomNavbar from './BottomNavbar';

export default function PageShell({ children, showLeftSidebar = true, showRightSidebar = true, rightSidebarProps = {} }) {
  return (
    <div className="min-h-screen bg-bg-secondary w-full select-auto">
      <Navbar />
      
      <div className="w-full flex gap-4 px-4 pt-4 pb-20 md:pb-8">
        {showLeftSidebar && <LeftSidebar />}
        
        <main className="flex-1 min-w-0">
          {children}
        </main>
        
        {showRightSidebar && <RightSidebar {...rightSidebarProps} />}
      </div>

      <BottomNavbar />
    </div>
  );
}
