# build the optimized binary
FROM golang:1.26.2-alpine AS builder
WORKDIR /app
COPY go.mod go.su[m] ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# final minimal runtime
FROM alpine:3.18
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /root
COPY --from=builder /app/main .
EXPOSE 8080
CMD ["./main"]
