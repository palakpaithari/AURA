
import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, 
  BookHeart, 
  Flame, 
  Headphones, 
  Settings, 
  Sparkles,
  LogOut,
  Shield,
  Telescope,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  X,
  Users,
  Bot
} from 'lucide-react';
import { ViewState, UserProfile } from '../types';
import { NotificationCenter } from './NotificationCenter';

interface LayoutProps {
  user: UserProfile;
  currentView: ViewState['view'];
  setView: (view: ViewState['view']) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const NavItem = ({ 
  icon: Icon, 
  label, 
  isActive, 
  onClick,
  collapsed 
}: { 
  icon: any, 
  label: string, 
  isActive: boolean, 
  onClick: () => void,
  collapsed: boolean
}) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full p-3.5 rounded-2xl transition-all duration-300 group relative ${
      isActive 
        ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' 
        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800/50 hover:text-violet-600 dark:hover:text-violet-300'
    } ${collapsed ? 'justify-center' : 'justify-start'}`}
    title={collapsed ? label : undefined}
  >
    <Icon className={`w-5 h-5 flex-shrink-0 ${collapsed ? '' : 'mr-3'} ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-violet-600 dark:group-hover:text-violet-400'}`} />
    {!collapsed && <span className="font-medium text-sm tracking-wide whitespace-nowrap overflow-hidden transition-all">{label}</span>}
    
    {collapsed && isActive && (
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/20 rounded-l-full" />
    )}
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ user, currentView, setView, onLogout, children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Close mobile menu when view changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentView]);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0f172a] overflow-hidden selection:bg-violet-500 selection:text-white font-sans transition-colors duration-300">
      
      {/* MOBILE OVERLAY BACKDROP */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR (Responsive Drawer) */}
      <aside 
        className={`
            fixed inset-y-0 left-0 z-[60] bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-slate-800/50 flex flex-col p-4 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0
            ${mobileMenuOpen ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full lg:w-72'}
            ${collapsed && !mobileMenuOpen ? 'lg:w-24' : ''}
        `}
      >
        {/* Mobile Close Button */}
        <button 
            onClick={() => setMobileMenuOpen(false)}
            className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full lg:hidden text-slate-500 hover:text-rose-500 transition-colors"
        >
            <X size={20} />
        </button>

        {/* Desktop Collapse Toggle */}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-full shadow-md text-slate-500 hover:text-violet-500 z-50 hidden lg:flex"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className={`mb-10 pt-2 flex items-center gap-3 ${collapsed ? 'justify-center' : 'px-2'}`}>
          <div className="w-10 h-10 min-w-[2.5rem] bg-gradient-to-tr from-violet-600 to-teal-400 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20 animate-pulse-slow">
             <Sparkles className="w-6 h-6 text-white" />
          </div>
          {(!collapsed || mobileMenuOpen) && (
            <div className="animate-fade-in overflow-hidden whitespace-nowrap">
              <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Aura
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-semibold">Student OS</p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
          <NavItem 
            icon={LayoutGrid} 
            label="Dashboard" 
            isActive={currentView === 'dashboard'} 
            onClick={() => setView('dashboard')}
            collapsed={collapsed && !mobileMenuOpen}
          />
          <NavItem 
            icon={Bot} 
            label="AI Companion" 
            isActive={currentView === 'ai_companion'} 
            onClick={() => setView('ai_companion')}
            collapsed={collapsed && !mobileMenuOpen}
          />
          <NavItem 
            icon={BookHeart} 
            label="Reflect" 
            isActive={currentView === 'reflect'} 
            onClick={() => setView('reflect')}
            collapsed={collapsed && !mobileMenuOpen}
          />
          <NavItem 
            icon={Telescope} 
            label="Future" 
            isActive={currentView === 'future'} 
            onClick={() => setView('future')}
            collapsed={collapsed && !mobileMenuOpen}
          />
          <NavItem 
            icon={Flame} 
            label="Campfire" 
            isActive={currentView === 'campfire'} 
            onClick={() => setView('campfire')}
            collapsed={collapsed && !mobileMenuOpen}
          />
          <NavItem 
            icon={Users} 
            label="Communities" 
            isActive={currentView === 'communities'} 
            onClick={() => setView('communities')}
            collapsed={collapsed && !mobileMenuOpen}
          />
          <NavItem 
            icon={Headphones} 
            label="Flow State" 
            isActive={currentView === 'flow'} 
            onClick={() => setView('flow')}
            collapsed={collapsed && !mobileMenuOpen}
          />
          
          {user.role === 'admin' && (
            <div className={`pt-4 mt-4 border-t border-slate-200 dark:border-slate-800/50 ${collapsed && !mobileMenuOpen ? 'flex justify-center' : ''}`}>
                {(!collapsed || mobileMenuOpen) && <p className="px-4 text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider mb-2">Admin Zone</p>}
                <NavItem 
                    icon={Shield} 
                    label="Admin Panel" 
                    isActive={currentView === 'admin_panel'} 
                    onClick={() => setView('admin_panel')} 
                    collapsed={collapsed && !mobileMenuOpen}
                />
            </div>
          )}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-200 dark:border-slate-800/50">
          <button 
            onClick={() => setView('settings')}
            className={`flex items-center w-full p-2 mb-4 text-slate-500 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-300 transition-colors ${collapsed && !mobileMenuOpen ? 'justify-center' : ''}`}
          >
            <Settings className="w-4 h-4" />
            {(!collapsed || mobileMenuOpen) && <span className="ml-3 text-xs font-medium">Preferences</span>}
          </button>
          
          <div className={`glass-panel p-2 rounded-2xl flex items-center ${collapsed && !mobileMenuOpen ? 'justify-center bg-transparent border-0' : 'p-3'}`}>
            <img 
              src={user.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${user.displayName}`} 
              alt="User" 
              className="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
            />
            {(!collapsed || mobileMenuOpen) && (
              <div className="ml-3 flex-1 min-w-0 animate-fade-in">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-200 truncate font-display">{user.displayName}</p>
                <p className="text-xs text-teal-600 dark:text-teal-400 font-medium">Streak: {user.streakDays || 1} 🔥</p>
              </div>
            )}
            {(!collapsed || mobileMenuOpen) && (
              <button onClick={onLogout} className="text-slate-400 hover:text-rose-500 transition-colors p-2">
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-slate-50 dark:bg-[#0f172a] transition-colors duration-300">
        
        {/* STRUCTURAL HEADER - Consumes space, prevents overlap */}
        <header className="flex-none z-40 px-4 py-3 md:px-8 md:py-4 flex justify-between items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/50">
            {/* Mobile Menu Trigger (Three Dots) */}
            <div className="lg:hidden">
                 <button 
                    onClick={() => setMobileMenuOpen(true)}
                    className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300 transition-colors"
                 >
                    <MoreVertical className="w-6 h-6" />
                 </button>
            </div>

            {/* Desktop Spacer / Title could go here */}
            <div className="hidden lg:block"></div>

            {/* Notification Center */}
            <div className="flex items-center gap-3">
                <NotificationCenter user={user} />
            </div>
        </header>

        {/* Ambient Background Elements - Absolute to Main, but z-0 */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
             <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-violet-500/10 dark:bg-violet-900/20 rounded-full blur-[128px]" />
             <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-teal-500/10 dark:bg-teal-900/10 rounded-full blur-[128px]" />
        </div>
        
        {/* Scrollable View Area - Content starts BELOW header */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-4 md:pb-8 pt-4 relative z-10 custom-scrollbar">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
