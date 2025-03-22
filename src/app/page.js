// 'use client';


'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import * as yup from 'yup';
import Image from 'next/image';
import logger from '@/utils/logger';

const emailSchema = yup
  .string()
  .email()
  .test('is-babcock', 'Input your school email', (value) => value && value.endsWith('@student.babcock.edu.ng'));

export default function HomePage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [matric, setMatric] = useState('');
  const [studentName, setStudentName] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [isVotingOpen, setIsVotingOpen] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkVotingStatus = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'voting_open')
          .single();
          
        if (error) throw error;
        setIsVotingOpen(data.value);
      } catch (error) {
        logger.error('Error fetching voting status:', error);
        setIsVotingOpen(false); // Default to closed if there's an error
      } finally {
        setIsLoading(false);
      }
    };
    
    checkVotingStatus();
  }, []);

  useEffect(() => {
    if (cooldown > 0) {
      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [cooldown]);

  const checkMatric = async () => {
    setCheckLoading(true);
    setError('');
    setHasVoted(false);
  
    // Convert matric to uppercase to match database format
    const formattedMatric = matric.trim().toUpperCase();
  
    const { data, error } = await supabase
      .from('students')
      .select('name, has_voted')
      .eq('matric_number', formattedMatric)
      .maybeSingle();
  
    setCheckLoading(false);
  
    if (error || !data) {
      setError("This matric number can't be found");
      setStudentName('');
      return false;
    } else {
      setStudentName(data.name);
  
      if (data.has_voted) {
        setHasVoted(true);
        setError("You have already voted in this election");
        return false;
      }
  
      return true;
    }
  };

  const handleSendOTP = async () => {
    if (cooldown > 0) return;
  
    setError('');
    try {
      await emailSchema.validate(email);
    } catch (err) {
      setError(err.message);
      return;
    }
  
    const validMatric = await checkMatric();
    if (!validMatric) return;
  
    setLoading(true);
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, matric: matric.trim().toUpperCase() }),
      });
  
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to send OTP. Please try again.');
      }
  
      setOtpSent(true);
      setCooldown(3600); // Set cooldown for 1 hour (3600 seconds)
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleVerifyOTP = async () => {
    setError('');
    if (!otp) {
      setError('Please enter the OTP.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to verify OTP. Please try again.');
      }

      router.push('/vote');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Loading state while checking voting status
  if (isLoading) {
    return (
      <div className="max-w-md text-black mx-auto mt-10 p-4 px-6 flex flex-col items-center justify-center">
        <Image
          src="/albulogo.jpg"
          alt="Election Logo"
          className='m-auto pb-4'
          width={180}
          height={100}
          priority
        />
        <div className="flex items-center justify-center mt-8">
          <svg className="animate-spin h-8 w-8 text-blue-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <p className="mt-4 text-gray-600">Loading election system...</p>
      </div>
    );
  }

  // Voting closed UI
  if (!isVotingOpen) {
    return (
      <div className="max-w-md text-black mx-auto mt-10 p-4 px-6">
        <Image
          src="/albulogo.jpg"
          alt="Election Logo"
          className='m-auto pb-4'
          width={180}
          height={100}
          priority
        />
        <div className="bg-blue-50 border-l-4 border-blue-800 p-4 rounded-md mt-8">
          <div className="flex items-center">
            <svg className="h-6 w-6 text-blue-800 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-xl font-bold text-blue-900">Voting Not Yet Open</h1>
          </div>
          <p className="mt-2 text-gray-700">The election voting period has not started yet. Please check back later.</p>
          <p className="mt-2 text-sm text-gray-600">Thank you for your patience.</p>
        </div>
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">For more information about the upcoming election, please contact the election committee.</p>
        </div>
      </div>
    );
  }

  // Voting open UI (original content)
  return (
    <div className="max-w-md text-black mx-auto mt-10 p-4 px-6">
      <Image
        src="/albulogo.jpg"
        alt="Election Logo"
        className='m-auto pb-4'
        width={180}
        height={100}
        priority
      />
      <h1 className="text-xl font-bold mb-4">Sign In</h1>
      <p className='text-gray-500 text-sm pb-5'>Note: Check your inbox or spam folder of your Babcock email for the otp after requesting </p>
      {error && <p className="text-red-500 mb-4">{error}</p>}

      <div className="mb-6">
        <label className="inline-block px-2 py-1 mb-2 text-xs font-semibold tracking-wide text-blue-950 uppercase bg-blue-50 rounded-md">
          Email Address
        </label>
        <div className="relative">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block transition-all duration-200 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
            placeholder="example@student.babcock.edu.ng"
            disabled={hasVoted}
            required
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <label className="inline-block px-2 py-1 mb-2 text-xs font-semibold tracking-wide text-blue-950 uppercase bg-blue-50 rounded-md">
          Matric Number
        </label>
        <div className="flex">
          <div className="relative flex-grow">
            <input
              type="text"
              value={matric}
              onChange={(e) => setMatric(e.target.value)}
              className="w-full px-4 pl-8 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block transition-all duration-200"
              placeholder="Enter matric number"
              required
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path>
              </svg>
            </div>
          </div>
          <button
            onClick={checkMatric}
            className="ml-0 px-5 py-2.5 bg-blue-950 hover:bg-blue-800 text-white text-sm font-medium rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
            disabled={checkLoading}
          >
            {checkLoading ? (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : null}
            {checkLoading ? 'Checking...' : 'Check'}
          </button>
        </div>
      </div>

      {studentName && (
        <div className="mb-4">
          <label className="inline-block px-2 py-1 mb-2 text-xs font-semibold tracking-wide text-blue-950 uppercase bg-blue-50 rounded-md">Name</label>
          <input
            type="text"
            value={studentName}
            readOnly
            className="w-full px-4 uppercase py-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block transition-all duration-200 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
          />
        </div>
      )}

      {!otpSent && !hasVoted && studentName && (
        <button
          onClick={handleSendOTP}
          className="bg-blue-800 rounded-lg text-white px-4 py-2 w-full"
          disabled={loading || cooldown > 0 || hasVoted}
        >
          {cooldown > 0 ? `Retry in ${cooldown}s` : (loading ? 'Sending OTP...' : 'Send OTP')}
        </button>
      )}

      {otpSent && !hasVoted && (
        <div className="mb-6">
          <label className="inline-block px-2 py-1 mb-2 text-xs font-semibold tracking-wide text-blue-950 uppercase bg-blue-50 rounded-md">
            Enter OTP
          </label>
          <div className="relative">
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full px-4 pl-8 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block transition-all duration-200"
              placeholder="Enter the OTP received"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
            </div>
          </div>
          <button
            onClick={handleVerifyOTP}
            className="mt-4 w-full px-5 py-2.5 bg-blue-950 hover:bg-blue-800 text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center"
            disabled={loading}
          >
            {loading && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </div>
      )}

      {hasVoted && (
        <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          <p className="font-medium">You have already voted in this election.</p>
          <p className="text-sm mt-1">Each student is allowed to vote only once.</p>
        </div>
      )}
    </div>
  );
}