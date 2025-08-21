import React from 'react';

export interface FAQsProps {
  faqs: string[];
}

const FAQs: React.FC<FAQsProps> = ({
    faqs = []
}) => {
    return (
        <div className="self-stretch h-9 py-1.5 inline-flex justify-between items-center w-[670px]">
                <div className="flex-1 justify-start text-gray-800 text-sm font-['Inter'] leading-normal">
                  What is DPIP architecture?
                </div>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path 
                    d="M6.75 13.5L11.25 9L6.75 4.5" 
                    stroke="#464D53" 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
    )
};

export default FAQs;