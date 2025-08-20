import React from 'react';

export interface NavBarProps {
  projectName?: string;
  onBackClick: () => void;
  progress: number;
}

const NavBar: React.FC<NavBarProps> = ({
  projectName = "BBPS",
  onBackClick,
  progress
}) => {
  const s = projectName
  return (
    <div className="w-full h-14 flex justify-between items-center px-10 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-2.5">
        <div className="text-gray-500 text-sm font-medium font-['Inter_Display']">Active Projects</div>
        <div className="text-gray-500 text-sm font-medium font-['Inter_Display']">/</div>
        <div className="text-neutral-600 text-sm font-medium font-['Inter_Display']">Ingestion Module</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-gray-400 text-sm font-medium font-['Inter_Display'] leading-relaxed tracking-tight">Integration Progress :</div>
        <div className="flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="2" height="12" viewBox="0 0 2 12" fill="none">
  <path d="M1 11L1 0.999999" stroke="#DDDFE3" stroke-width="2" stroke-linecap="round"/>
</svg>
          <svg xmlns="http://www.w3.org/2000/svg" width="2" height="12" viewBox="0 0 2 12" fill="none">
  <path d="M1 11L1 0.999999" stroke="#DDDFE3" stroke-width="2" stroke-linecap="round"/>
</svg>
          <svg xmlns="http://www.w3.org/2000/svg" width="2" height="12" viewBox="0 0 2 12" fill="none">
  <path d="M1 11L1 0.999999" stroke="#DDDFE3" stroke-width="2" stroke-linecap="round"/>
</svg>
          <svg xmlns="http://www.w3.org/2000/svg" width="2" height="12" viewBox="0 0 2 12" fill="none">
  <path d="M1 11L1 0.999999" stroke="#DDDFE3" stroke-width="2" stroke-linecap="round"/>
</svg>
          <svg xmlns="http://www.w3.org/2000/svg" width="2" height="12" viewBox="0 0 2 12" fill="none">
  <path d="M1 11L1 0.999999" stroke="#DDDFE3" stroke-width="2" stroke-linecap="round"/>
</svg>
          <svg xmlns="http://www.w3.org/2000/svg" width="2" height="12" viewBox="0 0 2 12" fill="none">
  <path d="M1 11L1 0.999999" stroke="#DDDFE3" stroke-width="2" stroke-linecap="round"/>
</svg>
          <svg xmlns="http://www.w3.org/2000/svg" width="2" height="12" viewBox="0 0 2 12" fill="none">
  <path d="M1 11L1 0.999999" stroke="#DDDFE3" stroke-width="2" stroke-linecap="round"/>
</svg>
          <svg xmlns="http://www.w3.org/2000/svg" width="2" height="12" viewBox="0 0 2 12" fill="none">
  <path d="M1 11L1 0.999999" stroke="#DDDFE3" stroke-width="2" stroke-linecap="round"/>
</svg>
          <svg xmlns="http://www.w3.org/2000/svg" width="2" height="12" viewBox="0 0 2 12" fill="none">
  <path d="M1 11L1 0.999999" stroke="#DDDFE3" stroke-width="2" stroke-linecap="round"/>
</svg>
          <svg xmlns="http://www.w3.org/2000/svg" width="2" height="12" viewBox="0 0 2 12" fill="none">
  <path d="M1 11L1 0.999999" stroke="#DDDFE3" stroke-width="2" stroke-linecap="round"/>
</svg>
        </div>
        <div className="text-gray-800 text-sm font-bold font-['JetBrains_Mono'] leading-relaxed tracking-tight">{progress}%</div>
      </div>
    </div>
  );
};

export default NavBar;