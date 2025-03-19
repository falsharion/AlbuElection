"use client"
import React from 'react';
import Lottie from 'lottie-react';
import Link from 'next/link';

export default function AlreadyVotedPage() {
  const [animationData, setAnimationData] = React.useState(null);

  React.useEffect(() => {
    fetch('/lottie/already-voted.json')
      .then(response => response.json())
      .then(data => setAnimationData(data))
      .catch(error => console.error('Error loading animation:', error));
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-red-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8">
        <div className="mb-6 flex justify-center">
          {animationData ? (
            <Lottie 
              animationData={animationData}
              loop={true}
              className="w-48 h-48"
            />
          ) : (
            <div className="w-48 h-48 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-24 h-24 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
            </div>
          )}
        </div>
        
        <h1 className="text-3xl font-bold text-center text-blue-950 mb-4">Already Voted</h1>
        
        <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-6">
          <p className="text-lg text-gray-800">
            You have already cast your vote in this election. Each student is allowed to vote only once.
          </p>
        </div>
        
        <div className="border-t border-gray-200 pt-6">
          <p className="text-gray-600 mb-8">
            If you believe this is an error, please contact the 
            <a href="mailto:falomosharl@gmail.com" className="text-blue-600 hover:text-blue-800 font-medium ml-1">
              election administrators
            </a>.
          </p>
          
          <div className="flex justify-center">
          <Link 
  href="/" 
  className="inline-block bg-blue-950 hover:bg-gradient-to-r hover:from-blue-600 hover:to-blue-800 text-white font-medium py-3 px-8 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-1"
>
  Return to Home
</Link>
          </div>
        </div>
      </div>
    </div>
  );
}