

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import * as jose from 'jose';
import logger from '@/utils/logger';

export async function POST(req) {
  try {
    const { email, otp } = await req.json();
    
    logger.log('Received verification request:', { email, otp });
    
    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }
    
    // Trim inputs to avoid whitespace mismatches
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();
    
    logger.log('Cleaned inputs:', { cleanEmail, cleanOtp });
    
    // Retrieve the OTP record for this email and OTP
    const { data, error } = await supabase
      .from('otps')
      .select('*')
      .eq('email', cleanEmail)
      .eq('otp', cleanOtp)
      .maybeSingle();
    
    logger.log('OTP verification result:', { data, error });
    
    if (error) {
      logger.error('OTP verification error:', error);
      return NextResponse.json({
        error: 'Database error during verification',
        details: error
      }, { status: 500 });
    }
    
    if (!data) {
      return NextResponse.json({
        error: 'Invalid OTP. Please check and try again.'
      }, { status: 400 });
    }
    
    // Check if the OTP is expired
    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    
    if (now > expiresAt) {
      return NextResponse.json({
        error: 'OTP has expired. Please request a new OTP in the next 1 hour by refreshing, you can close this page for now.'
      }, { status: 400 });
    }
    
    // Get the student's matric number from OTP record or look it up
    let matricNumber = data.matric; // Assuming we stored matric with OTP
    
    if (!matricNumber) {
      // If the matric number is not stored with the OTP,
      // we need to look it up from the students table
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('matric_number')
        .eq('email', cleanEmail)
        .maybeSingle();
      
      if (studentError || !studentData) {
        logger.error('Error retrieving student data:', studentError);
        return NextResponse.json({
          error: 'Could not verify student information'
        }, { status: 500 });
      }
      
      matricNumber = studentData.matric_number;
    }
    
    // Delete the OTP record (prevent reuse)
    const { error: deleteError } = await supabase
      .from('otps')
      .delete()
      .eq('id', data.id);
    
    if (deleteError) {
      logger.error('Error deleting OTP:', deleteError);
    } else {
      logger.log('OTP deleted successfully');
    }
    
    // Create a JWT token with jose library
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-production'
    );
    
    const token = await new jose.SignJWT({
      email: cleanEmail,
      matric: matricNumber,
      verified: true
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret);
    
    logger.log('Generated JWT token (partial):', token.substring(0, 20) + '...');
    
    // Create the response
    const response = NextResponse.json({
      message: 'OTP verified successfully',
      success: true
    });
    
    // Set the cookie properly
    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60, // 1 hour in seconds
      path: '/',
    });
    
    return response;
  } catch (error) {
    logger.error('Unexpected verification error:', error);
    return NextResponse.json({
      error: 'Server error during verification',
      details: error.message
    }, { status: 500 });
  }
}
