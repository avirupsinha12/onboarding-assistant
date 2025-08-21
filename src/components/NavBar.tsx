import React from 'react';

export interface NavBarProps {
  projectName?: string;
  progress: number;
  parentStepsCount: number,
  parentStepsDoneCount: number
}

const NavBar: React.FC<NavBarProps> = ({
  projectName = "Ingestion Module",
  progress,
  parentStepsCount = 0,
  parentStepsDoneCount = 0
}) => {
  return (
    <div className="w-full h-14 flex justify-between items-center px-10 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-2.5">
        <div className="text-gray-500 text-sm font-medium font-['Inter_Display']">
          Active Projects
        </div>
        <div className="text-gray-500 text-sm font-medium font-['Inter_Display']">
          /
        </div>
        <div className="text-neutral-600 text-sm font-medium font-['Inter_Display']">
          {projectName}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-gray-400 text-sm font-medium font-['Inter_Display'] leading-relaxed tracking-tight">
          Integration Progress :
        </div>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: parentStepsCount }, (_, index) => (
            <svg key={index} width="2" height="12" viewBox="0 0 2 12" fill="none">
              <path
                d="M1 11L1 0.999999"
                stroke={index < parentStepsDoneCount ? "#59C188" : "#DDDFE3"}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ))}
        </div>
        <div className="text-gray-800 text-sm font-bold font-['JetBrains_Mono'] leading-relaxed tracking-tight">
          {progress}%
        </div>
      </div>
    </div>
  );
};

export default NavBar;