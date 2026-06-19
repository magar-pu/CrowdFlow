package main

import(
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

type Response struct{
	Status	string `json:"status"`
	Message string `json:"message"`
}

func healthCheck(w http.ResponseWriter, r *http.Request){
	w.Header().Set("Content-Type", "application/json")
	response:= Response{
		Status: "ok",
		Message: "CrowdFlow API is running",
	}

	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding response: %s", err)
	}
}

func main(){
	
	http.HandleFunc("/api/health", healthCheck)

	fmt.Println("Starting server on :8080")

	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("Error starting server: %s", err)
	}
}
