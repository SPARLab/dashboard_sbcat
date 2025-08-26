import React from 'react';

interface DisclaimerModalProps {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function DisclaimerModal({ 
  id, 
  isOpen, 
  onClose, 
  title, 
  children 
}: DisclaimerModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      id={`${id}-overlay`}
      className="fixed top-[68px] bottom-0 left-0 right-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        id={`${id}-content`}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div id={`${id}-header`} className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id={`${id}-title`} className="text-xl font-semibold text-gray-900">
            {title}
          </h2>
          <button
            id={`${id}-close-button`}
            onClick={onClose}
            className="bg-gray-300 hover:bg-gray-400 text-gray-700 hover:text-gray-800 transition-colors rounded-md p-2 focus:outline-none focus:ring-0 active:outline-none"
            style={{
              outline: 'none',
              border: 'none',
              boxShadow: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              appearance: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
            aria-label="Close disclaimer"
            onMouseDown={(e) => e.preventDefault()}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div id={`${id}-body`} className="p-6">
          {children}
        </div>

        {/* Footer */}
        <div id={`${id}-footer`} className="flex justify-end p-6 border-t border-gray-200">
          <button
            id={`${id}-understand-button`}
            onClick={onClose}
            className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 hover:text-gray-800 rounded-md transition-colors font-medium focus:outline-none focus:ring-0 active:outline-none"
            style={{
              outline: 'none',
              border: 'none',
              boxShadow: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              appearance: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
