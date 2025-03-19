import React from 'react';

const Loading = () => {
  return (
    <div className="flex items-center justify-center h-screen w-full">
      <div className="relative flex items-center justify-center">
        <div className="w-20 h-20 border-4 border-gray-200 rounded-full"></div>
        <div className="w-20 h-20 border-4 border-t-blue-900 border-r-transparent border-b-transparent border-l-transparent rounded-full absolute top-0 left-0 animate-spin"></div>
        <span className="text-gray-700 font-medium absolute">Loading</span>
      </div>
    </div>
  );
};

export default Loading;