import nodemailer from "nodemailer";

export async function sendOTPEmail(email: string, code: string) {
  console.log(`✉️ [SMTP-Mock] Verification code for ${email}: ${code}`);

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || `"UTO Support" <noreply@uto-rides.com>`;

  if (!host || !user || !pass) {
    console.log(
      "⚠️ SMTP environment variables not configured. Skipping real email send. Use code logged above.",
    );
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from,
      to: email,
      subject: "UTO Password Reset Verification Code",
      text: `Your verification code to reset your UTO password is: ${code}. This code is valid for 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; background-color: #ffffff; color: #333333;">
          <h2 style="color: #FBBF24; text-align: center; margin-bottom: 20px;">UTO Password Reset</h2>
          <p>Hello,</p>
          <p>You requested to reset your password. Please use the verification code below to proceed:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; text-align: center; margin: 30px auto; color: #000000; background-color: #F3F4F6; padding: 15px; border-radius: 6px; width: fit-content; min-width: 150px;">
            ${code}
          </div>
          <p>This verification code is valid for 10 minutes. If you did not make this request, you can safely ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #777; text-align: center;">This is an automated message from UTO. Please do not reply.</p>
        </div>
      `,
    });
    console.log(`✅ Verification email successfully sent to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send verification email to ${email}:`, error);
  }
}
