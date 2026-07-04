'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  BookOpen, 
  BarChart3, 
  Sparkles, 
  Calendar as CalendarIcon, 
  Sliders, 
  LogOut, 
  Menu, 
  X, 
  Calculator,
  User,
  Database,
  WifiOff,
  MonitorSmartphone
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout, isLocalMode } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Trade Journal', href: '/journal', icon: BookOpen },
    { name: 'Statistics', href: '/statistics', icon: BarChart3 },
    { name: 'AI Reviews', href: '/ai-reviews', icon: Sparkles },
    { name: 'Calendar View', href: '/calendar', icon: CalendarIcon },
    { name: 'MT5 Sync', href: '/mt5-sync', icon: MonitorSmartphone },
    { name: 'Calculators & Tools', href: '/tools', icon: Calculator },
    { name: 'Settings', href: '/settings', icon: Sliders },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const navLinks = (
    <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              isActive
                ? 'bg-gradient-to-r from-indigo-600/30 to-violet-600/20 text-indigo-400 border-l-2 border-indigo-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile Header Bar */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-[#0d0f17]/90 border-b border-slate-800/50 backdrop-blur-md fixed top-0 left-0 right-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
            TM
          </div>
          <span className="font-semibold text-lg tracking-wider bg-gradient-to-r from-indigo-200 to-violet-400 bg-clip-text text-transparent">
            TradeMind
          </span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Sidebar overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-[#0d0f17] border-r border-slate-800/50 z-50 flex flex-col transition-transform duration-300 transform md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 flex items-center justify-between border-b border-slate-800/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white">
              TM
            </div>
            <span className="font-semibold text-lg tracking-wider text-white">TradeMind</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {navLinks}

        {/* User Info mobile */}
        <div className="p-4 border-t border-slate-800/50 bg-slate-900/20 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-semibold shadow-inner">
              {user?.displayName ? user.displayName[0].toUpperCase() : <User className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate">{user?.displayName || 'Trader'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/40 text-[10px]">
            {isLocalMode ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-amber-500/90 font-medium">Offline (Local Storage)</span>
              </>
            ) : (
              <>
                <Database className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500/90 font-medium">Cloud Connected</span>
              </>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0d0f17] border-r border-slate-850/40 fixed top-0 bottom-0 left-0 z-30 shadow-2xl">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800/30">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/35 relative overflow-hidden group">
            <span className="relative z-10 font-extrabold text-sm tracking-wider">TM</span>
            <div className="absolute inset-0 bg-gradient-to-tr from-violet-600 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wider bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              TradeMind
            </h1>
            <span className="text-[10px] text-slate-500 font-semibold tracking-widest uppercase">
              AI Journal v1.0
            </span>
          </div>
        </div>

        {navLinks}

        {/* User Info desktop */}
        <div className="p-4 border-t border-slate-800/30 bg-slate-950/20 m-4 rounded-2xl border border-slate-800/40 space-y-3 shadow-inner">
          <div className="flex items-center gap-3">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-xl border border-slate-700 object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-semibold shadow-inner">
                {user?.displayName ? user.displayName[0].toUpperCase() : <User className="w-5 h-5" />}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate">{user?.displayName || 'Trader'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/50 text-[10px] text-slate-400">
            {isLocalMode ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                <span className="text-amber-500/90 font-semibold">Offline (Local Storage)</span>
              </>
            ) : (
              <>
                <Database className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500/90 font-semibold">Cloud Database</span>
              </>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
export default Sidebar;
