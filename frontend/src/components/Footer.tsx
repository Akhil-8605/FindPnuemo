import React from 'react';
import { Activity, FileText } from 'lucide-react';
import { AppRoute } from './Navbar';

interface FooterProps {
  onNavigate?: (route: AppRoute) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="border-t-2 border-black bg-white py-6 text-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-[#52525B]">
        <div>
          © 2026 FindPneumo · Developed by Team LowIQBots
        </div>

        <div>
          AI CHEST SCREENING SYSTEM FOR PNEUMONIA
        </div>
      </div>
    </footer>
  );
};
