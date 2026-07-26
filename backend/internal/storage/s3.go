package storage

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type S3Storage struct {
	client        *s3.Client
	presignClient *s3.PresignClient
	publicBucket  string
	privateBucket string
	publicBase    string
	// publicEndpoint is the host a BROWSER can reach. See NewS3Storage.
	publicEndpoint string
}

// NewS3Storage builds the storage client.
//
// Two endpoints are deliberately kept apart:
//
//   - S3_ENDPOINT is where the BACKEND talks to object storage. Under docker
//     compose that is the compose service name (http://minio:9000) — inside the
//     backend container "localhost" is the container itself, so a localhost
//     endpoint makes every PutObject fail with "connection refused".
//   - S3_PUBLIC_ENDPOINT is the host a BROWSER can reach (http://localhost:9000
//     in local dev). Presigned URLs are handed to the browser, so they must be
//     signed for this host.
//
// They cannot be reconciled after the fact: SigV4 signs the Host header, so
// string-replacing the host in a finished presigned URL invalidates it. The
// only correct fix is to sign against the public host from the start, which is
// why there is a second client below. Presigning performs no network call, so
// that client never needs to reach the address it signs for.
//
// With a real S3/R2 endpoint both values are the same, and S3_PUBLIC_ENDPOINT
// can simply be omitted.
func NewS3Storage() (*S3Storage, error) {
	endpoint := os.Getenv("S3_ENDPOINT")
	accessKey := os.Getenv("S3_ACCESS_KEY_ID")
	secretKey := os.Getenv("S3_SECRET_ACCESS_KEY")
	publicBucket := os.Getenv("S3_PUBLIC_BUCKET_NAME")
	privateBucket := os.Getenv("S3_PRIVATE_BUCKET_NAME")
	region := os.Getenv("S3_REGION")
	if region == "" {
		region = "auto"
	}
	publicBase := os.Getenv("S3_PUBLIC_BASE_URL")

	publicEndpoint := os.Getenv("S3_PUBLIC_ENDPOINT")
	if publicEndpoint == "" {
		publicEndpoint = endpoint
	}

	newClient := func(url string) (*s3.Client, error) {
		resolver := aws.EndpointResolverWithOptionsFunc(func(service, reg string, options ...interface{}) (aws.Endpoint, error) {
			return aws.Endpoint{
				URL:           url,
				SigningRegion: region,
			}, nil
		})

		cfg, err := config.LoadDefaultConfig(context.TODO(),
			config.WithRegion(region),
			config.WithEndpointResolverWithOptions(resolver),
			config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
		)
		if err != nil {
			return nil, err
		}

		// Path-style addressing for R2 and MinIO compatibility.
		return s3.NewFromConfig(cfg, func(o *s3.Options) {
			o.UsePathStyle = true
		}), nil
	}

	client, err := newClient(endpoint)
	if err != nil {
		return nil, err
	}

	presignSource := client
	if publicEndpoint != endpoint {
		presignSource, err = newClient(publicEndpoint)
		if err != nil {
			return nil, err
		}
	}

	return &S3Storage{
		client:         client,
		presignClient:  s3.NewPresignClient(presignSource),
		publicBucket:   publicBucket,
		privateBucket:  privateBucket,
		publicBase:     publicBase,
		publicEndpoint: publicEndpoint,
	}, nil
}

// ValidateImage reads the first 512 bytes of a file to check the mime type and sniffs size
func ValidateImage(file io.ReadSeeker, maxBytes int64) (string, error) {
	// Check size by seeking to the end of the file
	size, err := file.Seek(0, io.SeekEnd)
	if err != nil {
		return "", fmt.Errorf("failed to determine file size: %w", err)
	}
	if size > maxBytes {
		return "", fmt.Errorf("file size %d exceeds limit of %d bytes", size, maxBytes)
	}

	// Seek back to start
	_, err = file.Seek(0, io.SeekStart)
	if err != nil {
		return "", fmt.Errorf("failed to reset file reader pointer: %w", err)
	}

	// Sniff content type using first 512 bytes
	buff := make([]byte, 512)
	n, err := file.Read(buff)
	if err != nil && err != io.EOF {
		return "", fmt.Errorf("failed to read file header: %w", err)
	}

	// Reset read pointer again so subsequent uploads can read the full stream
	_, err = file.Seek(0, io.SeekStart)
	if err != nil {
		return "", fmt.Errorf("failed to reset file reader pointer after sniffing: %w", err)
	}

	contentType := http.DetectContentType(buff[:n])
	if !strings.HasPrefix(contentType, "image/") {
		return "", fmt.Errorf("invalid file type: detected %s", contentType)
	}

	return contentType, nil
}

// UploadPublicFile uploads a file stream to the public S3/R2 bucket with aggressive cache controls
func (s *S3Storage) UploadPublicFile(ctx context.Context, key string, file io.Reader, contentType string) error {
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:       aws.String(s.publicBucket),
		Key:          aws.String(key),
		Body:         file,
		ContentType:  aws.String(contentType),
		CacheControl: aws.String("public, max-age=31536000"), // Cache aggressively for 1 year
	})
	return err
}

// UploadPrivateFile uploads a file stream to the private S3/R2 bucket. No cache-control is set;
// objects here are only ever reachable via a short-lived presigned URL, never a public CDN path.
func (s *S3Storage) UploadPrivateFile(ctx context.Context, key string, file io.Reader, contentType string) error {
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.privateBucket),
		Key:         aws.String(key),
		Body:        file,
		ContentType: aws.String(contentType),
	})
	return err
}

// DeletePrivateFile removes an object from the private bucket. Used when a document
// is replaced or deleted, so the superseded file does not linger in storage after
// the row that pointed at it is gone.
func (s *S3Storage) DeletePrivateFile(ctx context.Context, key string) error {
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.privateBucket),
		Key:    aws.String(key),
	})
	return err
}

// GetPublicURL returns the accessible edge CDN URL for a given object key in the public bucket
func (s *S3Storage) GetPublicURL(key string) string {
	if s.publicBase != "" {
		base := strings.TrimSuffix(s.publicBase, "/")
		return base + "/" + strings.TrimPrefix(key, "/")
	}
	// Fallback/Dev URL path style. Must use the browser-reachable host, not the
	// container-internal one, since this URL is rendered in a page.
	endpoint := strings.TrimSuffix(s.publicEndpoint, "/")
	return endpoint + "/" + s.publicBucket + "/" + strings.TrimPrefix(key, "/")
}

// GetPresignedURL returns a short-lived signed URL granting temporary read access to an object
// in the private bucket. Use this for sensitive documents (KTP, permits, etc.) instead of GetPublicURL.
func (s *S3Storage) GetPresignedURL(ctx context.Context, key string, expiry time.Duration) (string, error) {
	req, err := s.presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.privateBucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(expiry))
	if err != nil {
		return "", err
	}
	return req.URL, nil
}

