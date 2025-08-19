# Docker Setup for KasApp

This guide explains how to set up PostgreSQL using Docker for the KasApp project.

## Prerequisites

- Docker and Docker Compose installed on your system
- Node.js and npm/yarn installed

## Quick Start

1. **Start PostgreSQL with Docker Compose:**
   ```bash
   docker-compose up -d postgres
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Run Prisma migrations:**
   ```bash
   npm run migrate
   ```

4. **Seed the database (optional):**
   ```bash
   npm run seed
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

## Services

### PostgreSQL Database
- **Container name:** `kasapp-postgres`
- **Port:** `5432`
- **Database:** `kasapp`
- **Username:** `kasapp_user`
- **Password:** `kasapp_password`
- **Connection URL:** `postgresql://kasapp_user:kasapp_password@localhost:5432/kasapp?schema=public`

### pgAdmin (Optional)
- **Container name:** `kasapp-pgadmin`
- **Port:** `8080`
- **URL:** http://localhost:8080
- **Email:** `admin@kasapp.com`
- **Password:** `admin123`

## Useful Commands

```bash
# Start all services
docker-compose up -d

# Start only PostgreSQL
docker-compose up -d postgres

# Stop all services
docker-compose down

# View logs
docker-compose logs postgres

# Access PostgreSQL CLI
docker-compose exec postgres psql -U kasapp_user -d kasapp

# Reset database (WARNING: This will delete all data)
docker-compose down -v
docker-compose up -d postgres
npm run migrate
```

## Environment Variables

The `.env.local` file has been configured with the correct DATABASE_URL for the Docker setup. Make sure to update other environment variables as needed for your specific configuration.

## Troubleshooting

- If you get connection errors, make sure the PostgreSQL container is running: `docker-compose ps`
- If the database doesn't exist, the container will create it automatically on first run
- For permission issues, try: `docker-compose down -v && docker-compose up -d`