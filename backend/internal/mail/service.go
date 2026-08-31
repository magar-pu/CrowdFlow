package mail

import (
	"fmt"
	"log"
	"strings"

	"github.com/resend/resend-go/v2"
)

type Service interface {
	SendOTP(toEmail string, code string, purpose string) error
	SendPasswordReset(toEmail string, resetURL string) error
	// bookingURL points at the /booking/<order_uuid> or
	// /booking/<order_uuid>/t/<ticket_uuid> page — link only, per plan
	// decision 24: no QR image, no attachment. The QR itself is generated
	// entirely client-side from the ticket's vaulted secret_key once the
	// recipient opens the link, so it never has to travel through email.
	SendETicket(toEmail string, eventTitle string, dateVenue string, bookingURL string, ticketTier string) error
}

type resendService struct {
	client    *resend.Client
	fromEmail string
	apiKey    string
}

func NewService(apiKey string, fromEmail string) Service {
	if fromEmail == "" {
		fromEmail = "CrowdFlow <onboarding@resend.dev>"
	}
	var client *resend.Client
	if apiKey != "" {
		client = resend.NewClient(apiKey)
	}
	return &resendService{
		client:    client,
		fromEmail: fromEmail,
		apiKey:    apiKey,
	}
}

func (s *resendService) SendOTP(toEmail string, code string, purpose string) error {
	subject := fmt.Sprintf("[CrowdFlow] Kode OTP: %s (%s)", code, strings.Title(purpose))
	html := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px;">
  <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #e5e7eb;">
    <h2 style="color: #0b132b; margin-top: 0;">Verifikasi Akun CrowdFlow</h2>
    <p style="color: #4b5563;">Gunakan kode OTP berikut untuk memverifikasi <strong>%s</strong> Anda:</p>
    <div style="background: #eff6ff; border: 1px dashed #3b82f6; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #2563eb;">%s</span>
    </div>
    <p style="font-size: 13px; color: #6b7280;">Kode OTP ini berlaku selama 10 menit. Jangan bagikan kode ini kepada siapapun.</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
    <p style="font-size: 12px; color: #9ca3af; text-align: center;">&copy; CrowdFlow - Next-Generation Event Ticketing Platform</p>
  </div>
</body>
</html>
`, purpose, code)

	return s.sendMail(toEmail, subject, html)
}

func (s *resendService) SendPasswordReset(toEmail string, resetURL string) error {
	subject := "[CrowdFlow] Permintaan Reset Password"
	html := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px;">
  <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #e5e7eb;">
    <h2 style="color: #0b132b; margin-top: 0;">Reset Password CrowdFlow</h2>
    <p style="color: #4b5563;">Kami menerima permintaan untuk mereset password akun CrowdFlow Anda.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="%s" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 9999px; font-weight: bold; display: inline-block;">Reset Password Saya</a>
    </div>
    <p style="font-size: 13px; color: #6b7280;">Atau buka tautan berikut di browser Anda:<br/><a href="%s" style="color: #2563eb;">%s</a></p>
    <p style="font-size: 13px; color: #6b7280; margin-top: 20px;">Jika Anda tidak merasa meminta reset password, abaikan email ini.</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
    <p style="font-size: 12px; color: #9ca3af; text-align: center;">&copy; CrowdFlow - Next-Generation Event Ticketing Platform</p>
  </div>
</body>
</html>
`, resetURL, resetURL, resetURL)

	return s.sendMail(toEmail, subject, html)
}

func (s *resendService) SendETicket(toEmail string, eventTitle string, dateVenue string, bookingURL string, ticketTier string) error {
	subject := fmt.Sprintf("[CrowdFlow] E-Tiket Resmi: %s", eventTitle)
	html := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px;">
  <div style="max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <div style="background-color: #0b132b; color: #ffffff; padding: 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px; font-weight: bold;">CrowdFlow E-Ticket</h1>
      <p style="margin: 4px 0 0 0; color: #60a5fa; font-size: 14px;">Pembelian Berhasil & Terverifikasi</p>
    </div>
    <div style="padding: 24px;">
      <h2 style="color: #0b132b; margin: 0 0 8px 0; font-size: 20px;">%s</h2>
      <p style="color: #6b7280; margin: 0 0 16px 0; font-size: 14px;">📅 %s</p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: center;">
        <span style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold; margin-bottom: 16px;">TIER: %s</span>
        <div style="margin: 16px 0;">
          <a href="%s" style="display: inline-block; background-color: #0b132b; color: #ffffff; padding: 12px 28px; border-radius: 9999px; font-weight: bold; text-decoration: none; font-size: 15px;">Buka Tiket Saya</a>
        </div>
        <p style="font-size: 12px; color: #64748b; margin: 12px 0 0 0; word-break: break-all;">%s</p>
        <p style="font-size: 12px; color: #64748b; margin: 8px 0 0 0;">Tautan ini menampilkan QR Code Anda yang selalu berotasi — tunjukkan langsung dari HP Anda kepada petugas gate saat masuk lokasi event.</p>
      </div>

      <p style="font-size: 13px; color: #6b7280;">Tautan ini adalah kredensial tiket Anda — jangan bagikan ke orang lain. Setiap peserta menerima tautannya masing-masing.</p>
    </div>
    <div style="background-color: #f1f5f9; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="font-size: 12px; color: #94a3b8; margin: 0;">&copy; CrowdFlow - Next-Generation Event Ticketing Platform</p>
    </div>
  </div>
</body>
</html>
`, eventTitle, dateVenue, ticketTier, bookingURL, bookingURL)

	return s.sendMail(toEmail, subject, html)
}

func (s *resendService) sendMail(to string, subject string, html string) error {
	if s.client == nil {
		log.Printf("[MAIL MOCK] Sending email to: %s | Subject: %s", to, subject)
		return nil
	}

	params := &resend.SendEmailRequest{
		From:    s.fromEmail,
		To:      []string{to},
		Subject: subject,
		Html:    html,
	}

	res, err := s.client.Emails.Send(params)
	if err != nil {
		log.Printf("[MAIL ERROR] Failed to send email to %s via Resend: %v", to, err)
		return err
	}

	log.Printf("[MAIL SUCCESS] Email sent to %s via Resend (ID: %s)", to, res.Id)
	return nil
}
