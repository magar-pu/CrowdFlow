package response

import (
	"encoding/json"
	"net/http"
)

// StandardResponse wraps all API payloads
type StandardResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   *APIError   `json:"error,omitempty"`
}

// APIError details failures for client debugging
type APIError struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

// JSON sends a successful API response
func JSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(StandardResponse{
		Success: true,
		Data:    data,
	})
}

// Error sends a standardized error payload
func Error(w http.ResponseWriter, statusCode int, errCode string, errMsg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(StandardResponse{
		Success: false,
		Error: &APIError{
			Code:    errCode,
			Message: errMsg,
		},
	})
}
