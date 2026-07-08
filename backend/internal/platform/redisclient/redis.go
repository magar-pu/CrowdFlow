package redisclient

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

type Config struct {
	Addr string
}

func Connect(cfg Config) (*redis.Client, error) {
	client := redis.NewClient(&redis.Options{
		Addr: cfg.Addr,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		client.Close()
		return nil, err
	}
	return client, nil
}
