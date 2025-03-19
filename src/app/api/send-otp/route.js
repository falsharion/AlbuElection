import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

export async function POST(req) {
  const { email, matric } = await req.json();
  
  if (!email || !matric) {
    return NextResponse.json({ error: 'Email and matric number are required' }, { status: 400 });
  }

  // Check if the student has already voted
  const { data: studentData, error: studentError } = await supabase
    .from('students')
    .select('has_voted')
    .eq('matric_number', matric.trim())
    .maybeSingle();

  if (studentError) {
    return NextResponse.json({ error: 'Database error checking student status' }, { status: 500 });
  }

  if (!studentData) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  if (studentData.has_voted) {
    return NextResponse.json({ error: 'This student has already voted' }, { status: 403 });
  }

  // Check if an OTP was recently requested (within 5 minutes)
  const { data: lastOtp, error: fetchError } = await supabase
    .from('otps')
    .select('created_at')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError && fetchError.code !== 'PGRST116') {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  if (lastOtp) {
    const lastOtpTime = new Date(lastOtp.created_at);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    if (lastOtpTime > fiveMinutesAgo) {
      return NextResponse.json({ error: 'Please wait 5 minutes before requesting another OTP' }, { status: 429 });
    }
  }

  // Generate OTP & store it in Supabase check here shar
  const otp = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + 7 * 60 * 1000);
  
  const { error: dbError } = await supabase
    .from('otps')
    .insert([{ email, matric, otp, expires_at: expiresAt.toISOString() }]);

  if (dbError) {
    return NextResponse.json({ error: 'Failed to store OTP' }, { status: 500 });
  }

  // Send Email using Nodemailer
  let transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  try {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: 'Your Voting OTP',
      text: `Your OTP is: ${otp}`,
    });
  } catch (emailError) {
    console.error(emailError);
    return NextResponse.json({ error: 'Failed to send OTP email' }, { status: 500 });
  }

  return NextResponse.json({ message: 'OTP sent successfully' });
}