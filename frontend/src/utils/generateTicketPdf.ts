import { PurchasedTicket } from "@/types/ticket";

export function generateTicketPdf(ticket: PurchasedTicket, orderAmount?: number, userEmail?: string) {
  const formattedDate = new Date(ticket.starts_at || Date.now()).toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow pop-ups in your browser to download or print your PDF ticket.");
    return;
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(ticket.qr_payload || ticket.ticket_id)}`;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>CrowdFlow E-Ticket - ${ticket.event_title}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background: #f8fafc;
          color: #0f172a;
          margin: 0;
          padding: 40px 20px;
          display: flex;
          justify-content: center;
        }
        .ticket-container {
          width: 100%;
          max-width: 620px;
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          overflow: hidden;
          margin: 0 auto;
        }
        .header {
          background: #090d16;
          color: #ffffff;
          padding: 24px 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .logo span {
          color: #3b82f6;
        }
        .badge {
          background: rgba(59, 130, 246, 0.2);
          border: 1px solid rgba(59, 130, 246, 0.4);
          color: #60a5fa;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .content {
          padding: 32px;
        }
        .event-category {
          font-size: 11px;
          font-weight: 700;
          color: #2563eb;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 6px;
        }
        .event-title {
          font-size: 24px;
          font-weight: 800;
          margin: 0 0 20px 0;
          color: #0f172a;
          line-height: 1.2;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          padding: 20px 0;
          border-top: 1px solid #f1f5f9;
          border-bottom: 1px solid #f1f5f9;
          margin-bottom: 24px;
        }
        .info-item label {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: block;
          margin-bottom: 4px;
          font-weight: 600;
        }
        .info-item value {
          font-size: 13.5px;
          font-weight: 700;
          color: #0f172a;
          display: block;
        }
        .seat-box {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          text-align: center;
          margin-bottom: 24px;
        }
        .seat-col {
          border-right: 1px solid #e2e8f0;
        }
        .seat-col:last-child {
          border-right: none;
        }
        .seat-label {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .seat-val {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
        }
        .qr-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: #fafafa;
          border: 2px dashed #cbd5e1;
          border-radius: 16px;
          margin-bottom: 24px;
        }
        .qr-img {
          width: 180px;
          height: 180px;
          margin-bottom: 12px;
        }
        .ticket-id {
          font-family: monospace;
          font-size: 13px;
          color: #334155;
          letter-spacing: 2px;
          font-weight: 700;
        }
        .footer-note {
          font-size: 11px;
          color: #64748b;
          text-align: center;
          line-height: 1.5;
          background: #f1f5f9;
          padding: 12px 16px;
          border-radius: 8px;
        }
        .print-btn-container {
          text-align: center;
          margin-top: 24px;
        }
        .print-btn {
          background: #0f172a;
          color: #ffffff;
          border: none;
          padding: 12px 28px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .print-btn:hover {
          background: #1e293b;
        }
        @media print {
          body {
            background: #ffffff;
            padding: 0;
          }
          .ticket-container {
            border: none;
            box-shadow: none;
          }
          .print-btn-container {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div style="width: 100%; max-width: 620px;">
        <div class="ticket-container">
          <div class="header">
            <div class="logo">Crowd<span>Flow</span></div>
            <div class="badge">OFFICIAL E-TICKET</div>
          </div>
          <div class="content">
            <div class="event-category">${ticket.event_category_label || "EVENT TICKET"}</div>
            <h1 class="event-title">${ticket.event_title}</h1>

            <div class="info-grid">
              <div class="info-item">
                <label>Waktu & Tanggal</label>
                <value>${formattedDate}</value>
              </div>
              <div class="info-item">
                <label>Lokasi / Venue</label>
                <value>${ticket.venue_name}, ${ticket.venue_city}</value>
              </div>
              <div class="info-item">
                <label>Email Pembeli</label>
                <value>${userEmail || "Pembeli Terverifikasi"}</value>
              </div>
              <div class="info-item">
                <label>Status Tiket</label>
                <value style="color: #16a34a;">TERBIT & TERVERIFIKASI</value>
              </div>
            </div>

            <div class="seat-box">
              <div class="seat-col">
                <div class="seat-label">SECTION</div>
                <div class="seat-val">${ticket.section || "GA"}</div>
              </div>
              <div class="seat-col">
                <div class="seat-label">ROW</div>
                <div class="seat-val">${ticket.row || "-"}</div>
              </div>
              <div class="seat-col">
                <div class="seat-label">SEAT</div>
                <div class="seat-val">${ticket.seat_number || "-"}</div>
              </div>
            </div>

            <div class="qr-section">
              <img class="qr-img" src="${qrUrl}" alt="QR Code Ticket" />
              <div class="ticket-id">${ticket.ticket_code || ticket.ticket_id}</div>
            </div>

            <div class="footer-note">
              🔒 <strong>CrowdFlow Verified E-Ticket:</strong> Tunjukkan halaman PDF / QR ini kepada petugas di gate venue. 
              Dokumen ini merupakan bukti kepemilikan sah tiket CrowdFlow.
            </div>
          </div>
        </div>

        <div class="print-btn-container">
          <button class="print-btn" onclick="window.print()">Simpan PDF / Cetak Tiket</button>
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 600);
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
