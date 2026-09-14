# 💰 Meu Bolso — Controle Financeiro Pessoal

Sistema completo de controle financeiro pessoal com **React + TypeScript** no frontend, **Go** no backend e **PostgreSQL** como banco de dados, com autenticação via JWT. Tudo rodando em **Docker Compose**.

## ✨ Funcionalidades

- 🔐 **Autenticação de usuários** — cadastro, login e logout com JWT (senhas com hash bcrypt)
- 📊 **Dashboard** — saldo total, receitas/despesas do mês, comparação com mês anterior, orçamento mensal (com barra de progresso) e consumo por categoria
- 💳 **Transações** — criar, editar, excluir e filtrar (por mês, tipo, categoria e busca por descrição)
- 🗂️ **Categorias** — personalizadas por usuário, com cor e ícone (lucide-react); categorias padrão criadas automaticamente no cadastro
- 📈 **Relatórios** — evolução mensal (barras + linha de resultado), composição por categoria e participação percentual
- ⚙️ **Configurações** — atualizar perfil, orçamento mensal, alterar senha e excluir a conta

## 🛠️ Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + React Router + Axios + Recharts + lucide-react |
| Backend | Go + chi (router) + pgx (PostgreSQL) + golang-jwt + bcrypt |
| Banco | PostgreSQL 17 |
| Infra | Docker Compose (imagens `postgres:17-alpine`, `golang:1.25-alpine` e `node:22-alpine` → `nginx:1.27-alpine`) |

## 🚀 Como rodar (Docker)

### 1. Pré-requisitos

- Docker Engine + Docker Compose (neste ambiente: Docker Desktop — inicie o daemon antes)
- Alternativa (rodar sem Docker): Go 1.22+, Node 20+, PostgreSQL local — ver seções abaixo

### 2. Subir tudo

```bash
docker compose up --build -d
```

O Compose cria três serviços:

| Serviço | Porta | Descrição |
|---------|-------|-----------|
| `db` | 5432 | PostgreSQL 17 (banco `teste`, usuário/senha `teste` / `teste`) |
| `backend` | 8000 | API Go (aplica o schema automaticamente na primeira subida) |
| `frontend` | 5173 | nginx servindo o build do React (proxy `/api/` → `backend:8000`) |

Acesse **http://localhost:5173**.

### 3. Configuração (variáveis de ambiente)

```bash
cp .env.example .env        # raiz do projeto — variáveis do docker-compose
```

Gere um segredo forte para o JWT antes de subir (use um valor diferente em cada ambiente):

```bash
openssl rand -hex 32
```

#### Variáveis (raiz — docker-compose)

| Variável          | Descrição                          |
|-------------------|------------------------------------|
| `POSTGRES_USER`   | Usuário do banco PostgreSQL        |
| `POSTGRES_PASSWORD` | Senha do banco PostgreSQL        |
| `POSTGRES_DB`     | Nome do banco PostgreSQL           |
| `JWT_SECRET`      | Chave secreta de assinatura do JWT |

#### Variáveis (`backend/.env` — API)

| Variável             | Descrição                                     |
|----------------------|-----------------------------------------------|
| `DATABASE_URL`       | URI de conexão do PostgreSQL                  |
| `JWT_SECRET`         | Chave secreta de assinatura do JWT            |
| `JWT_EXPIRE_MINUTES` | Tempo de expiração do token em minutos        |
| `PORT`               | Porta em que a API escuta (padrão `8000`)     |

### 4. Logs e parada

```bash
docker compose logs -f backend    # acompanhar a API
docker compose down               # parar os serviços
docker compose down -v            # parar e apagar o volume do banco
```

## 🧑‍💻 Desenvolvimento local (sem Docker)

### Backend

```bash
cd backend
go build ./...                      # compila
go run ./cmd/server                 # API em http://localhost:8000
```

Exija um PostgreSQL local. Preencha as variáveis em `backend/.env` (veja
`backend/.env.example`) e aponte `DATABASE_URL` para o seu banco.

### Frontend

```bash
cd frontend
npm install
npm run dev                         # http://localhost:5173 (proxy /api -> localhost:8000)
npm run build                       # tsc --noEmit + vite build
```

## 🔌 API (resumo)

Todas as rotas são prefixadas com `/api`.

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Health check |
| POST | `/auth/register` | Cadastro de usuário |
| POST | `/auth/login` | Login (e-mail ou username + senha) |
| GET | `/auth/me` | Dados do usuário autenticado |
| GET/POST | `/categories` | Listar / criar categorias |
| PUT/DELETE | `/categories/{id}` | Atualizar / excluir categoria |
| GET/POST | `/transactions` | Listar (filtros: `year`, `month`, `type`, `category_id`, `q`, `limit`) / criar transação |
| PUT/DELETE | `/transactions/{id}` | Atualizar / excluir transação |
| GET | `/dashboard/stats` | Resumo financeiro (`?year=&month=`) |
| GET | `/dashboard/monthly-series` | Série mensal para relatórios (`?months=N`) |
| GET/PUT/DELETE | `/users/me` | Gerenciar própria conta |

**Autenticação:** envie `Authorization: Bearer <token>` nas rotas protegidas.

## 📁 Estrutura do projeto

```
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── cmd/server/main.go         # entrypoint da API
│   ├── internal/
│   │   ├── config/                # variáveis de ambiente
│   │   ├── database/              # pool pgx + migrations (schema.sql embutido)
│   │   ├── handler/               # auth, users, categories, transactions, dashboard
│   │   ├── middleware/            # autenticação JWT
│   │   ├── server/                # router chi
│   │   └── store/                 # acesso a dados e regras (SQL)
│   ├── Dockerfile
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── api/                   # cliente Axios + interceptores JWT
    │   ├── components/            # Layout, modais, gráficos
    │   ├── context/               # AuthContext (login/logout/JWT)
    │   ├── pages/                 # Dashboard, Transações, Categorias, Relatórios, Configurações
    │   ├── utils/                 # formatação pt-BR
    │   └── types/                 # contratos TypeScript
    ├── Dockerfile                 # multi-stage: build → nginx
    ├── nginx.conf
    └── package.json
```