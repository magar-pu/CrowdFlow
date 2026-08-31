package nik

import "testing"

func TestEncryptDecryptRoundTrip(t *testing.T) {
	t.Setenv("NIK_ENC_KEY", "MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=") // 32 raw bytes, base64

	want := "3174012509900001"
	ciphertext, err := Encrypt(want)
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}
	if string(ciphertext) == want {
		t.Fatal("ciphertext must not equal plaintext")
	}

	got, err := Decrypt(ciphertext)
	if err != nil {
		t.Fatalf("Decrypt: %v", err)
	}
	if got != want {
		t.Fatalf("got %q, want %q", got, want)
	}
}

func TestValid(t *testing.T) {
	cases := map[string]bool{
		"3174012509900001":  true,
		"317401250990000":   false, // 15 digits
		"31740125099000012": false, // 17 digits
		"317401250990000a":  false,
		"":                  false,
	}
	for in, want := range cases {
		if got := Valid(in); got != want {
			t.Errorf("Valid(%q) = %v, want %v", in, got, want)
		}
	}
}
