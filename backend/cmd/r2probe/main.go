// Temporary diagnostic. Reports which R2 operations the configured credential
// is permitted to perform. Never prints the secret. Delete after use.
package main

import (
	"bufio"
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/smithy-go"
)

func loadEnv(path string) map[string]string {
	m := map[string]string{}
	f, err := os.Open(path)
	if err != nil {
		return m
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if k, v, ok := strings.Cut(line, "="); ok {
			m[strings.TrimSpace(k)] = strings.TrimSpace(v)
		}
	}
	return m
}

func report(op string, err error) {
	if err == nil {
		fmt.Printf("  %-34s OK\n", op)
		return
	}
	var ae smithy.APIError
	if errors.As(err, &ae) {
		fmt.Printf("  %-34s FAIL  %s: %s\n", op, ae.ErrorCode(), ae.ErrorMessage())
		return
	}
	fmt.Printf("  %-34s FAIL  %v\n", op, err)
}

func main() {
	env := loadEnv(".env")
	if len(env) == 0 {
		env = loadEnv("backend/.env")
	}
	get := func(k string) string {
		if v := os.Getenv(k); v != "" {
			return v
		}
		return env[k]
	}

	endpoint := get("S3_ENDPOINT")
	ak := get("S3_ACCESS_KEY_ID")
	sk := get("S3_SECRET_ACCESS_KEY")
	priv := get("S3_PRIVATE_BUCKET_NAME")
	pub := get("S3_PUBLIC_BUCKET_NAME")
	region := get("S3_REGION")
	if region == "" {
		region = "auto"
	}

	mask := func(s string) string {
		if len(s) < 8 {
			return "(unset/short)"
		}
		return s[:6] + "…(len " + fmt.Sprint(len(s)) + ")"
	}
	fmt.Printf("endpoint       %s\nregion         %s\naccess key id  %s\nsecret         %s\nprivate bucket %q\npublic bucket  %q\n\n",
		endpoint, region, mask(ak), mask(sk), priv, pub)

	resolver := aws.EndpointResolverWithOptionsFunc(func(service, reg string, o ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{URL: endpoint, SigningRegion: region}, nil
	})
	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion(region),
		config.WithEndpointResolverWithOptions(resolver),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(ak, sk, "")),
	)
	if err != nil {
		fmt.Println("config error:", err)
		os.Exit(1)
	}
	cl := s3.NewFromConfig(cfg, func(o *s3.Options) { o.UsePathStyle = true })
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	fmt.Println("account-level:")
	_, err = cl.ListBuckets(ctx, &s3.ListBucketsInput{})
	report("ListBuckets", err)

	for label, b := range map[string]string{"private": priv, "public": pub} {
		if b == "" {
			continue
		}
		fmt.Printf("\nbucket %q (%s):\n", b, label)

		_, err = cl.HeadBucket(ctx, &s3.HeadBucketInput{Bucket: aws.String(b)})
		report("HeadBucket", err)

		_, err = cl.ListObjectsV2(ctx, &s3.ListObjectsV2Input{Bucket: aws.String(b), MaxKeys: aws.Int32(1)})
		report("ListObjectsV2", err)

		key := "_r2probe/permission-check.txt"
		_, err = cl.PutObject(ctx, &s3.PutObjectInput{
			Bucket: aws.String(b), Key: aws.String(key),
			Body: bytes.NewReader([]byte("probe")), ContentType: aws.String("text/plain"),
		})
		report("PutObject  (_r2probe/…)", err)
		putOK := err == nil

		_, err = cl.GetObject(ctx, &s3.GetObjectInput{Bucket: aws.String(b), Key: aws.String(key)})
		report("GetObject  (_r2probe/…)", err)

		if putOK {
			_, err = cl.DeleteObject(ctx, &s3.DeleteObjectInput{Bucket: aws.String(b), Key: aws.String(key)})
			report("DeleteObject (cleanup)", err)
		}
	}
}
