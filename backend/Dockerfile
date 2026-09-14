# Build stage
FROM golang:1.26-alpine AS builder

RUN apk add --no-cache ca-certificates
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /bin/api ./cmd/server

# Runtime stage
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata \
    && adduser -D -H -u 10001 appuser

COPY --from=builder /bin/api /bin/api

USER appuser
EXPOSE 8000
ENTRYPOINT ["/bin/api"]