package storage

import (
	"context"
	"io"
	"os"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type S3Storage struct {
	client     *s3.Client
	bucketName string
	publicBase string
}

func NewS3Storage() (*S3Storage, error) {
	endpoint := os.Getenv("S3_ENDPOINT")
	accessKey := os.Getenv("S3_ACCESS_KEY_ID")
	secretKey := os.Getenv("S3_SECRET_ACCESS_KEY")
	bucketName := os.Getenv("S3_BUCKET_NAME")
	region := os.Getenv("S3_REGION")
	if region == "" {
		region = "auto"
	}
	publicBase := os.Getenv("S3_PUBLIC_BASE_URL")

	// 1. Configure custom resolver to point to MinIO or R2 endpoint
	customResolver := aws.EndpointResolverWithOptionsFunc(func(service, reg string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			URL:           endpoint,
			SigningRegion: region,
		}, nil
	})

	// 2. Load AWS Config with custom credentials & custom resolver
	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion(region),
		config.WithEndpointResolverWithOptions(customResolver),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
	)
	if err != nil {
		return nil, err
	}

	// 3. Instantiate S3 Client (force path-style for R2 and MinIO compatibility)
	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.UsePathStyle = true
	})

	return &S3Storage{
		client:     client,
		bucketName: bucketName,
		publicBase: publicBase,
	}, nil
}

// UploadFile uploads a file stream to S3/R2 bucket
func (s *S3Storage) UploadFile(ctx context.Context, key string, file io.Reader, contentType string) error {
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucketName),
		Key:         aws.String(key),
		Body:        file,
		ContentType: aws.String(contentType),
	})
	return err
}

// GetPublicURL returns the accessible edge CDN URL for a given object key
func (s *S3Storage) GetPublicURL(key string) string {
	if s.publicBase != "" {
		base := strings.TrimSuffix(s.publicBase, "/")
		return base + "/" + strings.TrimPrefix(key, "/")
	}
	// Fallback/Dev URL path style
	endpoint := strings.TrimSuffix(os.Getenv("S3_ENDPOINT"), "/")
	return endpoint + "/" + s.bucketName + "/" + strings.TrimPrefix(key, "/")
}
