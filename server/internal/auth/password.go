package auth

import (
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

// dummyHash é um hash bcrypt válido qualquer, gerado no init. Serve pra gastar o
// mesmo tempo de comparação quando o e-mail não existe (anti-enumeração/timing):
// o login roda bcrypt mesmo sem usuário, então a resposta não denuncia a ausência.
var dummyHash, _ = bcrypt.GenerateFromPassword([]byte("anti-timing-dummy"), bcrypt.DefaultCost)

// HashPassword gera o hash bcrypt (cost default = 10, igual ao seed via pgcrypto).
//
//	hash, err := auth.HashPassword("12345")
func HashPassword(password string) (string, error) {
	h, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("auth: hashear senha: %w", err)
	}
	return string(h), nil
}

// checkPassword compara a senha com o hash bcrypt; true se confere.
func checkPassword(hash, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}
