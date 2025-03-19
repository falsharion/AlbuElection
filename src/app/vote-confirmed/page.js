"use client"
import React from 'react';
import Lottie from 'lottie-react';
import voteSuccessAnimation from '../../../public/lottie/vot-success.json';

const VoteConfirmationPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <Lottie 
            animationData={voteSuccessAnimation}
            loop={true}
            className="w-64 h-64 mx-auto"
          />
        </div>
        
        <h1 className="text-3xl font-bold text-indigo-950 mb-4">Vote Confirmed!</h1>
        
        <p className="text-gray-700 text-lg mb-6">
          Your vote has been successfully captured and recorded. Thank you for voting!
        </p>
        
        <div className="border-t border-gray-200 pt-4">
          <p className="text-gray-500">
            You can safely close this tab now.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VoteConfirmationPage;