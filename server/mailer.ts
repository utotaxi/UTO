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

export interface BookingConfirmationEmailParams {
  email: string;
  bookingReference: string;
  passengerName: string;
  pickupDate: string;
  pickupTime: string;
  pickupAddress: string;
  dropoffAddress: string;
  vehicleType: string;
  passengers: number;
  estimatedFare: string | number;
  paymentMethod: string;
  ridePin?: string;
  notes?: string;
}

export async function sendBookingConfirmationEmail(params: BookingConfirmationEmailParams) {
  const {
    email,
    bookingReference,
    passengerName,
    pickupDate,
    pickupTime,
    pickupAddress,
    dropoffAddress,
    vehicleType,
    passengers,
    estimatedFare,
    paymentMethod,
    ridePin,
    notes,
  } = params;

  console.log(`✉️ [SMTP] Sending booking confirmation email for ${bookingReference} to ${email}`);

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER || "bookings@utotransfer.co.uk";
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  const from = process.env.SMTP_FROM || `"UTO Transfer" <${user}>`;

  if (!pass) {
    console.log(
      "⚠️ SMTP password not configured (SMTP_PASS / GMAIL_APP_PASSWORD). Skipping real email send.",
    );
    return false;
  }

  const fareDisplay =
    typeof estimatedFare === "number"
      ? estimatedFare.toFixed(2)
      : String(estimatedFare);

  const text = `Hi ${passengerName},
Thank you for choosing UTO.
Your booking has been successfully confirmed.

Booking Details:
Booking Reference: ${bookingReference}
Pickup Date: ${pickupDate}
Pickup Time: ${pickupTime}
Pickup Address: ${pickupAddress}
Destination: ${dropoffAddress}
Vehicle Type: ${vehicleType}
Passengers: ${passengers}
Estimated Fare: £${fareDisplay}
Payment Method: ${paymentMethod}
Special Requirements: ${notes || "None"}
${ridePin ? `\nYour Ride PIN (share with your driver to start the ride): ${ridePin}\n` : ""}
Cancellation & Refund Policy:
You may cancel your booking free of charge up to 3 hours before your scheduled pickup time. Cancellations made less than 3 hours before pickup may be subject to cancellation charges.

Thank you for travelling with UTO.
Kind regards,
UTO Customer Support`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e1e8ed; color: #374151;">
      <div style="background: linear-gradient(135deg, #111827 0%, #1f2937 100%); padding: 24px 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">UTO</h1>
        <p style="color: #9ca3af; margin: 4px 0 0 0; font-size: 13px;">Reliable transfers, anytime.</p>
      </div>
      <div style="padding: 32px; font-size: 15px; line-height: 1.6;">
        <p>Hi ${passengerName},</p>
        <p>Thank you for choosing UTO.<br>Your booking has been successfully confirmed.</p>

        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <div style="font-weight: 700; font-size: 16px; color: #111827; margin-bottom: 14px; border-bottom: 2px solid #3b82f6; padding-bottom: 6px; display: inline-block;">Booking Details</div>
          
          <div style="margin-bottom: 12px;">
            <div style="font-weight: 600; color: #4b5563; font-size: 13px; text-transform: uppercase;">Booking Reference</div>
            <div style="font-size: 15px; font-weight: 700; color: #2563eb;">${bookingReference}</div>
          </div>

          <div style="margin-bottom: 12px;">
            <div style="font-weight: 600; color: #4b5563; font-size: 13px; text-transform: uppercase;">Pickup Date & Time</div>
            <div style="font-size: 15px; color: #111827;">${pickupDate} at ${pickupTime}</div>
          </div>

          <div style="margin-bottom: 12px;">
            <div style="font-weight: 600; color: #4b5563; font-size: 13px; text-transform: uppercase;">Pickup Address</div>
            <div style="font-size: 15px; color: #111827;">${pickupAddress}</div>
          </div>

          <div style="margin-bottom: 12px;">
            <div style="font-weight: 600; color: #4b5563; font-size: 13px; text-transform: uppercase;">Destination</div>
            <div style="font-size: 15px; color: #111827;">${dropoffAddress}</div>
          </div>

          <div style="margin-bottom: 12px;">
            <div style="font-weight: 600; color: #4b5563; font-size: 13px; text-transform: uppercase;">Vehicle Type</div>
            <div style="font-size: 15px; color: #111827;">${vehicleType}</div>
          </div>

          <div style="margin-bottom: 12px;">
            <div style="font-weight: 600; color: #4b5563; font-size: 13px; text-transform: uppercase;">Passengers</div>
            <div style="font-size: 15px; color: #111827;">${passengers}</div>
          </div>

          <div style="margin-bottom: 12px;">
            <div style="font-weight: 600; color: #4b5563; font-size: 13px; text-transform: uppercase;">Estimated Fare</div>
            <div style="font-size: 15px; font-weight: 700; color: #111827;">£${fareDisplay}</div>
          </div>

          <div style="margin-bottom: 12px;">
            <div style="font-weight: 600; color: #4b5563; font-size: 13px; text-transform: uppercase;">Payment Method</div>
            <div style="font-size: 15px; color: #111827;">${paymentMethod}</div>
          </div>

          ${notes ? `
          <div style="margin-bottom: 12px;">
            <div style="font-weight: 600; color: #4b5563; font-size: 13px; text-transform: uppercase;">Notes / Flight Number</div>
            <div style="font-size: 15px; color: #111827;">${notes}</div>
          </div>` : ""}
        </div>

        ${ridePin ? `
        <div style="background-color:#eff6ff; border-left: 4px solid #2563eb; color:#1e3a8a; padding: 16px; border-radius: 4px; margin: 24px 0; text-align:center;">
          <div style="font-weight:700; margin-bottom:6px; color:#1e40af;">Your Ride PIN</div>
          <p style="margin:0 0 8px 0;">Share this PIN with your driver to start the ride.</p>
          <p style="margin:0; font-size:30px; font-weight:700; letter-spacing:6px; color:#1e3a8a;">${ridePin}</p>
        </div>` : ""}

        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; margin: 24px 0; font-size: 14px; color: #1e40af;">
          <div style="font-weight: 700; margin-bottom: 6px; color: #1e3a8a;">Cancellation & Refund Policy</div>
          <p style="margin: 0 0 8px 0;">You may cancel your booking free of charge up to 3 hours before your scheduled pickup time.</p>
          <p style="margin: 0;">To cancel your booking, please use the UTO app or contact our support team.</p>
        </div>

        <p>Thank you for choosing UTO.</p>
      </div>
      <div style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280;">
        <p style="margin: 4px 0;">Thank you for travelling with UTO.</p>
        <p style="margin: 4px 0;">Kind regards,<br><strong>UTO Customer Support</strong></p>
      </div>
    </div>
  `;

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
      subject: `Booking Confirmation - UTO Transfer (${bookingReference})`,
      text,
      html,
    });
    console.log(`✅ Booking confirmation email successfully sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send booking confirmation email to ${email}:`, error);
    return false;
  }
}

