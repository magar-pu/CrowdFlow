package main

import (
	"bytes"
	"context"
	"database/sql"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"crowdflow-backend/internal/storage"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func parseEnv(content string) {
	for _, line := range strings.Split(content, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			k := strings.TrimSpace(parts[0])
			v := strings.TrimSpace(parts[1])
			v = strings.Trim(v, `"'`)
			os.Setenv(k, v)
		}
	}
}

func main() {
	// Load .env manually
	if content, err := os.ReadFile(".env"); err == nil {
		parseEnv(string(content))
	} else if content, err := os.ReadFile("../.env"); err == nil {
		parseEnv(string(content))
	}

	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		dsn = "postgres://postgres:postgres@localhost:5432/crowdflow?sslmode=disable"
	}
	// If running on host, map host.docker.internal to localhost
	dsn = strings.Replace(dsn, "host.docker.internal", "localhost", 1)

	fmt.Printf("Connecting to DB: %s\n", dsn)
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("sql.Open failed: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("db.Ping failed: %v", err)
	}
	fmt.Println("Connected to database successfully!")

	// Initialize S3Storage
	// Force S3_ENDPOINT to localhost if running on host
	os.Setenv("S3_ENDPOINT", strings.Replace(os.Getenv("S3_ENDPOINT"), "host.docker.internal", "localhost", 1))
	s3Store, err := storage.NewS3Storage()
	if err != nil {
		log.Fatalf("Failed to initialize S3Storage: %v", err)
	}
	fmt.Println("S3 Storage initialized successfully!")

	ctx := context.Background()

	// 1. Migrate Event Cover Images
	fmt.Println("Scanning events for external cover images...")
	rows, err := db.QueryContext(ctx, "SELECT id, event_name, cover_image_url FROM events")
	if err != nil {
		log.Fatalf("Failed to query events: %v", err)
	}
	defer rows.Close()

	type EventItem struct {
		ID    int
		Name  string
		Cover string
	}
	var eventsToMigrate []EventItem
	for rows.Next() {
		var ev EventItem
		var cover sql.NullString
		if err := rows.Scan(&ev.ID, &ev.Name, &cover); err != nil {
			log.Fatalf("Scan event failed: %v", err)
		}
		ev.Cover = cover.String
		if ev.Cover != "" && strings.HasPrefix(ev.Cover, "http") && !strings.Contains(ev.Cover, "localhost:9000") {
			eventsToMigrate = append(eventsToMigrate, ev)
		}
	}
	rows.Close()

	fmt.Printf("Found %d events with external cover images to migrate.\n", len(eventsToMigrate))
	for _, ev := range eventsToMigrate {
		fmt.Printf("Migrating cover for event '%s' (URL: %s)...\n", ev.Name, ev.Cover)
		newURL, err := migrateImageToMinIO(ctx, s3Store, ev.Cover, fmt.Sprintf("events/covers/%d", ev.ID))
		if err != nil {
			fmt.Printf("Failed to migrate event %d cover: %v\n", ev.ID, err)
			continue
		}
		_, err = db.ExecContext(ctx, "UPDATE events SET cover_image_url = $1 WHERE id = $2", newURL, ev.ID)
		if err != nil {
			fmt.Printf("Failed to update event %d DB: %v\n", ev.ID, err)
			continue
		}
		fmt.Printf("Successfully migrated event %d. New URL: %s\n", ev.ID, newURL)
	}

	// 2. Migrate User Avatar Pics
	fmt.Println("Scanning user profiles for external avatars...")
	rowsAvatars, err := db.QueryContext(ctx, "SELECT user_id, avatar_pic FROM user_profiles")
	if err != nil {
		log.Fatalf("Failed to query user profiles: %v", err)
	}
	defer rowsAvatars.Close()

	type UserProfileItem struct {
		UserID int
		Avatar string
	}
	var avatarsToMigrate []UserProfileItem
	for rowsAvatars.Next() {
		var p UserProfileItem
		var avatar sql.NullString
		if err := rowsAvatars.Scan(&p.UserID, &avatar); err != nil {
			log.Fatalf("Scan user profile failed: %v", err)
		}
		p.Avatar = avatar.String
		if p.Avatar != "" && strings.HasPrefix(p.Avatar, "http") && !strings.Contains(p.Avatar, "localhost:9000") {
			avatarsToMigrate = append(avatarsToMigrate, p)
		}
	}
	rowsAvatars.Close()

	fmt.Printf("Found %d user profiles with external avatars to migrate.\n", len(avatarsToMigrate))
	for _, p := range avatarsToMigrate {
		fmt.Printf("Migrating avatar for user ID %d (URL: %s)...\n", p.UserID, p.Avatar)
		newURL, err := migrateImageToMinIO(ctx, s3Store, p.Avatar, fmt.Sprintf("users/avatars/%d", p.UserID))
		if err != nil {
			fmt.Printf("Failed to migrate user %d avatar: %v\n", p.UserID, err)
			continue
		}
		_, err = db.ExecContext(ctx, "UPDATE user_profiles SET avatar_pic = $1 WHERE user_id = $2", newURL, p.UserID)
		if err != nil {
			fmt.Printf("Failed to update user %d DB: %v\n", p.UserID, err)
			continue
		}
		fmt.Printf("Successfully migrated user %d avatar. New URL: %s\n", p.UserID, newURL)
	}

	fmt.Println("All external database images migrated to local MinIO storage successfully!")
}

func migrateImageToMinIO(ctx context.Context, s3Store *storage.S3Storage, extURL string, baseKey string) (string, error) {
	// Rewrite minio container hostname to localhost for host resolution
	downloadURL := strings.Replace(extURL, "minio:9000", "localhost:9000", 1)
	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Get(downloadURL)
	if err != nil {
		return "", fmt.Errorf("HTTP GET failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("HTTP GET returned status %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read body: %w", err)
	}

	// Sniff content type
	contentType := http.DetectContentType(data)
	ext := ".jpg"
	if strings.Contains(contentType, "png") {
		ext = ".png"
	} else if strings.Contains(contentType, "webp") {
		ext = ".webp"
	}

	objectKey := baseKey + ext
	bodyReader := bytes.NewReader(data)

	// Upload
	err = s3Store.UploadPublicFile(ctx, objectKey, bodyReader, contentType)
	if err != nil {
		return "", fmt.Errorf("UploadPublicFile failed: %w", err)
	}

	return s3Store.GetPublicURL(objectKey), nil
}
