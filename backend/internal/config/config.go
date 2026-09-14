package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL string
	JWTSecret   string
	JWTTTL      time.Duration
	Port        string
}

func getEnv(key string, fallback ...string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	if len(fallback) > 0 {
		return fallback[0]
	}
	return ""
}

func Load() *Config {
	_ = godotenv.Load()

	ttlMin, err := strconv.Atoi(getEnv("JWT_EXPIRE_MINUTES"))
	if err != nil || ttlMin <= 0 {
		ttlMin = 1440
	}

	return &Config{
		DatabaseURL: getEnv("DATABASE_URL"),
		JWTSecret:   getEnv("JWT_SECRET"),
		JWTTTL:      time.Duration(ttlMin) * time.Minute,
		Port:        getEnv("PORT", "8000"),
	}
}