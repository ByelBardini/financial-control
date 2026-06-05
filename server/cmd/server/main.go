package main

import (
	"log"
	"net/http"
	"os"

	"financial-control/server/internal/router"
)

func main() {
	port := getenv("PORT", "8080")
	addr := ":" + port

	log.Printf("server ouvindo em http://localhost%s", addr)
	if err := http.ListenAndServe(addr, router.New()); err != nil {
		log.Fatal(err)
	}
}

// getenv lê uma variável de ambiente, caindo no fallback quando vazia.
//
//	port := getenv("PORT", "8080")
func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
