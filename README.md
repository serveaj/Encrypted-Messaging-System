# SecureComm — Encrypted Messaging System

A full stack real time messaging application with end-to-end encryption powered by AWS KMS. Messages are encrypted before being stored in the database and can only be decrypted by the intended recipient.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│  Encryption │────▶│  AWS KMS   │
│  React/Nginx│     │  Node.js +  │     │  Java Spring│     │ RSA-2048   │
│   Port 80   │     │  Socket.io  │     │    Boot     │     │ Key Pairs  │
│             │     │  Port 5000  │     │  Port 8080  │     │            │
└─────────────┘     └──────┬──────┘     └─────────────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │  PostgreSQL │
                    │  Port 5432  │
                    └─────────────┘
```

All four services run as Docker containers managed by Docker Compose.

## Encryption Model

Each user gets two AWS KMS RSA-2048 key pairs on registration:

- **Encryption key** — used to encrypt session keys for that user (RSAES_OAEP_SHA_256)
- **Signing key** — used to sign and verify messages (RSASSA_PSS_SHA_256)

**Direct messages** use hybrid encryption:
1. A random AES-256-GCM session key encrypts the message payload
2. The session key is encrypted with the receiver's RSA public key via AWS KMS
3. The sender signs the combined ciphertext with their KMS signing key

**Group messages** use the same scheme, but the session key is encrypted separately for each group member so each member can independently decrypt.

Messages are stored encrypted in the database. Decryption happens server side via the encryption microservice when message history is fetched.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, Socket.io-client, Axios |
| Backend | Node.js, Express, Socket.io, pg |
| Encryption | Java 21, Spring Boot 3.4.1, AWS SDK v2 |
| Database | PostgreSQL 15 |
| Serving | Nginx |
| Deployment | Docker, Docker Compose, AWS EC2 |

## Features

- Real-time messaging via WebSockets (Socket.io)
- End-to-end encryption for direct and group messages
- Group chat with per-member encrypted session keys
- Contact and friend request system
- File sharing
- Online presence indicators
- Message history with automatic decryption
- Encrypted message previews in the sidebar

## Project Structure

```
├── src/                        # React frontend
│   ├── App.jsx
│   ├── Dashboard.jsx
│   ├── Landing.jsx
│   ├── Login.jsx
│   ├── Register.jsx
│   └── utils/
│       ├── AuthContext.jsx
│       └── emojiProcessor.js
├── server/                     # Node.js backend
│   ├── index.js                # Express + Socket.io entry point
│   ├── db.js                   # PostgreSQL connection + schema
│   ├── routes/
│   │   ├── auth.js
│   │   ├── messages.js
│   │   ├── groups.js
│   │   └── contacts.js
│   └── middleware/
│       └── auth.js
├── encryption/                 # Java Spring Boot encryption microservice
│   └── src/main/java/com/example/securemessaging/
│       ├── controller/CryptoController.java
│       ├── service/KmsService.java
│       └── security/
│           ├── HybridEncryptionService.java
│           ├── AESService.java
│           ├── RSAService.java
│           └── EncryptedMessage.java
├── Dockerfile                  # Frontend multi-stage build
├── nginx.conf                  # Reverse proxies /api and /socket.io to backend
└── docker-compose.yml
```

## Prerequisites

- AWS account with an EC2 instance (Amazon Linux 2023 recommended)
- EC2 IAM role with the following KMS permissions:
  - `kms:CreateKey`
  - `kms:GetPublicKey`
  - `kms:Decrypt`
  - `kms:Sign`
  - `kms:Verify`
  - `kms:DescribeKey`
- Docker and Docker Compose installed on the EC2 instance

## Deployment (AWS EC2 — Amazon Linux)

### 1. Install dependencies

```bash
sudo dnf update -y
sudo dnf install -y git docker
sudo systemctl enable docker --now
sudo usermod -aG docker ec2-user
newgrp docker

# Docker Compose plugin
DOCKER_CONFIG=${DOCKER_CONFIG:-$HOME/.docker}
mkdir -p $DOCKER_CONFIG/cli-plugins
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o $DOCKER_CONFIG/cli-plugins/docker-compose
chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose
```

### 2. Add swap (recommended for t3.micro to prevent OOM during build)

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 3. Clone the repo

```bash
git clone https://github.com/serveaj/Encrypted-Messaging-System ~/Encrypted-Messaging-System
cd ~/Encrypted-Messaging-System
```

### 4. Create environment files

**`server/.env`**
```env
PORT=5000
DATABASE_URL=postgresql://postgres:localpassword@db:5432/securecomm
JWT_SECRET=your_jwt_secret_here
FRONTEND_URL=http://<your-ec2-public-ip>
```

**`.env`** (root — baked into the React build at build time)
```env
REACT_APP_API_URL=http://<your-ec2-public-ip>
```

### 5. Build and start

```bash
docker compose up --build -d
```

The app will be available at `http://<your-ec2-public-ip>`.

### Deploying updates

```bash
git pull && docker compose up --build -d
```

If the EC2 public IP changes (e.g. after a restart), update `REACT_APP_API_URL` in `.env` and rebuild with `--no-cache`.

## EC2 Security Group

Required inbound rules:

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22 | TCP | Your IP | SSH |
| 80 | TCP | Anywhere | Frontend |
| 5000 | TCP | Anywhere | Backend API |

## Encryption Service API

The encryption microservice is internal to Docker (not exposed publicly) and is called by the backend only:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/crypto/register` | Creates two KMS key pairs for a new user |
| POST | `/crypto/encrypt` | Encrypts a direct message |
| POST | `/crypto/decrypt` | Decrypts a direct message |
| POST | `/crypto/encrypt-group` | Encrypts a group message for all members |
| POST | `/crypto/decrypt-group` | Decrypts a group message for one member |

## Environment Variables

| Variable | File | Description |
|----------|------|-------------|
| `DATABASE_URL` | `server/.env` | PostgreSQL connection string |
| `JWT_SECRET` | `server/.env` | Secret for signing JWT tokens |
| `FRONTEND_URL` | `server/.env` | Allowed CORS origin |
| `REACT_APP_API_URL` | `.env` (root) | Backend URL baked into the React build |
