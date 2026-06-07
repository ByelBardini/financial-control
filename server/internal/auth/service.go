package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"financial-control/server/internal/store"
)

// UserStore é a dependência de dados do auth (lookup por e-mail e por id).
type UserStore interface {
	FindUserByEmail(ctx context.Context, email string) (store.UserCredentials, error)
	GetUserByID(ctx context.Context, userID string) (store.User, error)
}

// TTLs define a validade do token conforme o "lembre de mim" do login.
type TTLs struct {
	Default  time.Duration // sessão curta (sem lembrar) — ex.: 24h
	Remember time.Duration // sessão longa (lembrar)      — ex.: 30 dias
}

// User é o usuário exposto pra fora (sem hash de senha). Tags json batem com o client.
type User struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
}

// ErrInvalidCredentials é o erro genérico de login/sessão: não distingue e-mail
// inexistente, senha errada ou conta inativa (anti-enumeração).
var ErrInvalidCredentials = errors.New("credenciais inválidas")

// Service faz login (emite token) e valida sessão (verifica token + liveness).
type Service struct {
	users  UserStore
	tokens *TokenIssuer
	ttls   TTLs
	now    func() time.Time
}

// NewService injeta o store de usuários, o emissor de token e os TTLs.
func NewService(users UserStore, tokens *TokenIssuer, ttls TTLs) *Service {
	return &Service{users: users, tokens: tokens, ttls: ttls, now: time.Now}
}

// Login valida e-mail+senha e devolve um token assinado + o usuário. Erro sempre
// genérico (ErrInvalidCredentials) pra e-mail inexistente, senha errada ou conta
// inativa; roda bcrypt mesmo no e-mail inexistente pra não vazar timing.
func (s *Service) Login(ctx context.Context, email, password string, rememberMe bool) (string, User, error) {
	cred, err := s.users.FindUserByEmail(ctx, email)
	if errors.Is(err, store.ErrUserNotFound) {
		checkPassword(string(dummyHash), password) // gasta tempo, não denuncia a ausência
		return "", User{}, ErrInvalidCredentials
	}
	if err != nil {
		return "", User{}, fmt.Errorf("auth: login: %w", err)
	}
	if !checkPassword(cred.PasswordHash, password) || !cred.IsActive {
		return "", User{}, ErrInvalidCredentials
	}

	ttl := s.ttls.Default
	if rememberMe {
		ttl = s.ttls.Remember
	}
	token, err := s.tokens.Issue(cred.ID, s.now(), ttl)
	if err != nil {
		return "", User{}, fmt.Errorf("auth: login: %w", err)
	}
	return token, User{ID: cred.ID, Email: cred.Email, Name: cred.Name}, nil
}

// Authenticate valida o token e confirma que o usuário existe e está ativo
// (liveness). Usado pelo middleware: devolve o usuário pra injetar o id no ctx.
// Qualquer erro (token inválido/expirado, usuário sumido ou inativo) é falha 401.
func (s *Service) Authenticate(ctx context.Context, token string) (User, error) {
	userID, err := s.tokens.Parse(token)
	if err != nil {
		return User{}, err
	}
	u, err := s.users.GetUserByID(ctx, userID)
	if err != nil {
		return User{}, err
	}
	if !u.IsActive {
		return User{}, ErrInvalidCredentials
	}
	return User{ID: u.ID, Email: u.Email, Name: u.Name}, nil
}

// UserByID carrega o usuário atual (pro GET /auth/me, já atrás do RequireAuth).
func (s *Service) UserByID(ctx context.Context, userID string) (User, error) {
	u, err := s.users.GetUserByID(ctx, userID)
	if err != nil {
		return User{}, fmt.Errorf("auth: carregar usuário: %w", err)
	}
	return User{ID: u.ID, Email: u.Email, Name: u.Name}, nil
}
