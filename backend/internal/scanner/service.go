package scanner

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"crowdflow-backend/internal/nik"
	"crowdflow-backend/internal/ticketqr"
)

// ErrGateNotGranted and ErrGateRequired are request-shape failures — they
// happen before any ticket is even looked at, so they are plain errors the
// handler turns into 400/403, never a CheckInResponse.status value.
var (
	ErrGateRequired   = errors.New("gate_id is required: this account is granted more than one gate")
	ErrGateNotGranted = errors.New("this account is not granted the requested gate")
)

type ScannerService struct {
	repo Repository
}

func NewService(repo Repository) *ScannerService {
	return &ScannerService{repo: repo}
}

// resolveGate implements CONTRACT.md section 2's gate_id rule: the requested
// gate must be one the staff member is granted; an omitted gate_id is only
// accepted when the staff member is granted exactly one gate.
func (s *ScannerService) resolveGate(staffID int, requested *int) (*int, error) {
	grants, err := s.repo.StaffGateGrants(staffID)
	if err != nil {
		return nil, err
	}

	if requested == nil {
		if len(grants) == 1 {
			return &grants[0], nil
		}
		return nil, ErrGateRequired
	}

	for _, g := range grants {
		if g == *requested {
			return requested, nil
		}
	}
	return nil, ErrGateNotGranted
}

// CheckIn implements the frozen contract's fixed check order (CONTRACT.md
// section 3). Reordering these steps changes which error a buyer sees first
// and, for step 5 vs 6, whether a misrouted staffer can burn a valid ticket —
// do not reorder without re-reading that section.
func (s *ScannerService) CheckIn(eventID int, staffID int, req *CheckInRequest) (*CheckInResponse, error) {
	gateID, err := s.resolveGate(staffID, req.GateID)
	if err != nil {
		return nil, err
	}

	// 1. Parse.
	payload, ok := ticketqr.Parse(req.QrPayload)
	if !ok {
		return &CheckInResponse{Status: "INVALID", Message: "QR code could not be read"}, nil
	}

	// 2. Load ticket + tier.
	t, err := s.repo.FindTicketByID(payload.TicketID)
	if err != nil {
		return &CheckInResponse{Status: "INVALID", Message: "Ticket not found"}, nil
	}

	// 3. Event match.
	if t.EventID != eventID {
		return &CheckInResponse{Status: "WRONG_EVENT", Message: "This ticket belongs to a different event"}, nil
	}

	// 4. Freshness + TOTP, via the single canonical CF1 implementation.
	switch ticketqr.Verify(payload, t.SecretKey, time.Now().Unix()) {
	case ticketqr.Invalid:
		return &CheckInResponse{Status: "INVALID", Message: "Ticket QR is not valid"}, nil
	case ticketqr.Expired:
		return &CheckInResponse{Status: "EXPIRED", Message: "QR code has expired or is stale — ask the attendee to refresh it"}, nil
	}

	// 5. Staff tier grant — BEFORE the status check. A staffer at the wrong
	// gate/tier must be told WRONG_TIER and the ticket must never be burned.
	granted, err := s.repo.StaffHasTierGrant(staffID, t.TierID)
	if err != nil {
		return nil, err
	}
	if !granted {
		s.logScan(staffID, eventID, "WRONG_TIER", fmt.Sprintf("Staff not authorised for tier %s on ticket %s", t.TierName, t.TicketID))
		return &CheckInResponse{Status: "WRONG_TIER", TicketID: t.TicketID, TierID: t.TierID, TierName: t.TierName, Message: "You are not authorised to admit this ticket's tier"}, nil
	}

	// 6. Ticket status.
	switch strings.ToLower(t.TicketStatus) {
	case "used":
		checkedAt, gateName, err := s.repo.OriginalCheckIn(t.TicketID)
		resp := &CheckInResponse{
			Status:   "ALREADY_USED",
			TicketID: t.TicketID,
			OrderID:  t.OrderID,
			TierID:   t.TierID,
			TierName: t.TierName,
			Attendee: s.buildAttendee(t),
			Message:  "This ticket has already been scanned",
		}
		if err == nil {
			resp.CheckInTime = checkedAt.Format("15:04:05")
			resp.GateName = gateName
		}
		s.logScan(staffID, eventID, "ALREADY_USED", fmt.Sprintf("Duplicate scan for ticket %s", t.TicketID))
		return resp, nil
	case "cancelled":
		return &CheckInResponse{Status: "CANCELLED", TicketID: t.TicketID, Message: "This ticket has been cancelled"}, nil
	case "refunded":
		return &CheckInResponse{Status: "REFUNDED", TicketID: t.TicketID, Message: "This ticket has been refunded"}, nil
	}

	// 7. Mark used + insert check-in, one transaction, both errors checked.
	if err := s.repo.MarkUsedAndInsertCheckin(t.TicketID, eventID, gateID, staffID); err != nil {
		return nil, err
	}

	seatLabel := "General Seating"
	if t.EventSeatsID != nil {
		if label, err := s.repo.SeatLabel(*t.EventSeatsID); err == nil {
			seatLabel = label
		}
	}

	gateName := ""
	if gateID != nil {
		gateName, _ = s.repo.GateName(*gateID)
	}

	s.logScan(staffID, eventID, "VALID", fmt.Sprintf("Check-in: %s (%s) - %s", t.AttendeeName, t.TierName, seatLabel))

	return &CheckInResponse{
		Status:      "VALID",
		TicketID:    t.TicketID,
		OrderID:     t.OrderID,
		TierID:      t.TierID,
		TierName:    t.TierName,
		SeatLabel:   seatLabel,
		Attendee:    s.buildAttendee(t),
		CheckInTime: time.Now().Format("15:04:05"),
		GateName:    gateName,
		Message:     "Check-in successful",
	}, nil
}

// buildAttendee decrypts NIK only for the caller of this function, which is
// only ever reached on VALID or ALREADY_USED (CONTRACT.md section 2).
func (s *ScannerService) buildAttendee(t *ticketForCheckIn) *AttendeeInfo {
	nikPlain := ""
	if len(t.AttendeeNikEnc) > 0 {
		if plain, err := nik.Decrypt(t.AttendeeNikEnc); err == nil {
			nikPlain = plain
		}
	}
	dob := ""
	if t.AttendeeDob != nil {
		dob = t.AttendeeDob.Format("2006-01-02")
	}
	return &AttendeeInfo{
		FullName: t.AttendeeName,
		Nik:      nikPlain,
		Phone:    t.AttendeePhone,
		Dob:      dob,
	}
}

func (s *ScannerService) logScan(staffID, eventID int, action, detail string) {
	_ = s.repo.LogScan(staffID, eventID, action, detail)
}

// Reject records a manual ID-mismatch rejection (CONTRACT.md section 3b). It
// MUST NOT touch ticket_status and MUST NOT insert a VALID checkin row — the
// ticket stays fully live so a genuine holder can still enter. This is a
// separate endpoint on purpose, so the machine-decided CheckInResponse.status
// enum never gains a human judgement call.
func (s *ScannerService) Reject(eventID int, staffID int, req *RejectRequest) error {
	if strings.TrimSpace(req.TicketID) == "" {
		return fmt.Errorf("ticket_id is required")
	}
	if strings.TrimSpace(req.Reason) == "" {
		return fmt.Errorf("reason is required")
	}
	detail := fmt.Sprintf("Manual rejection for ticket %s: %s — %s", req.TicketID, req.Reason, req.Note)
	return s.repo.LogScan(staffID, eventID, "REJECTED_"+req.Reason, detail)
}

func (s *ScannerService) GetDashboard(eventID int) (*DashboardResponse, error) {
	return s.repo.GetDashboardStats(eventID)
}

func (s *ScannerService) GetOwnScanLog(staffID int) ([]*ScanLogEntry, error) {
	return s.repo.OwnScanLog(staffID, 100)
}

// ──────────── Gate CRUD ────────────

func (s *ScannerService) CreateGate(eventID int, name string) (*EventGate, error) {
	if name == "" {
		return nil, fmt.Errorf("gate name is required")
	}
	return s.repo.CreateGate(eventID, name)
}

func (s *ScannerService) ListGates(eventID int) ([]*EventGate, error) {
	return s.repo.ListGates(eventID)
}

func (s *ScannerService) DeleteGate(gateID int, eventID int) error {
	return s.repo.DeleteGate(gateID, eventID)
}
