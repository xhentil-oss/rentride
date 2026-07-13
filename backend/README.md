# 🚗 Rent Ride — Backend API

Node.js + Express + MySQL — REST API i plotë për sistemin e menaxhimit të makinave me qira.

---

## 🚀 Setup i shpejtë

### 1. Instaloni dependencies
```bash
cd backend
npm install
```

### 2. Konfiguroni `.env`
```bash
cp .env.example .env
nano .env   # plotësoni DB_USER, DB_PASSWORD, JWT_SECRET, etj.
```

### 3. Krijoni databazën MySQL
```sql
CREATE DATABASE rental_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'rental_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON rental_db.* TO 'rental_user'@'localhost';
FLUSH PRIVILEGES;
```

### 4. Ekzekutoni migrimet (krijoni tabelat)
```bash
npm run migrate
```

### 5. Seed — krijoni admin user-in fillestar
```bash
npm run seed
```
**Admin i krijuar:** `admin@rentalalb.com` / `Admin@1234`  
⚠️ **Ndryshoni fjalëkalimin menjëherë pas kyçjes!**

### 6. Startoni serverin
```bash
# Production
npm start

# Development (me auto-reload)
npm run dev
```

---

## 📡 Endpoints

### Auth
| Method | Endpoint | Auth | Përshkrim |
|--------|----------|------|-----------|
| POST | `/api/auth/register` | ❌ | Regjistrim i ri |
| POST | `/api/auth/login` | ❌ | Kyçje |
| POST | `/api/auth/refresh` | ❌ | Refresh token |
| POST | `/api/auth/logout` | ✅ | Shkyçje |
| GET  | `/api/auth/me` | ✅ | Profili aktual |
| POST | `/api/auth/change-password` | ✅ | Ndrysho fjalëkalimin |

### Entities (të gjitha)
| Method | Endpoint | Auth |
|--------|----------|------|
| GET/POST | `/api/cars` | GET: publik |
| GET/PUT/DELETE | `/api/cars/:id` | PUT/DELETE: admin |
| GET/POST/PUT/DELETE | `/api/customers` | ✅ |
| GET/POST/PUT/DELETE | `/api/reservations` | POST: publik |
| GET/POST/PUT/DELETE | `/api/invoices` | ✅ |
| GET/POST/DELETE | `/api/reviews` | POST: publik |
| GET/POST/PUT/DELETE | `/api/pricing-rules` | ✅ |
| GET/POST/PUT/DELETE | `/api/fleet/maintenance` | ✅ |
| GET/POST/PUT | `/api/fleet/insurance` | ✅ |
| GET/POST/PUT | `/api/fleet/registration` | ✅ |
| GET/POST | `/api/fleet/fuel` | ✅ |
| GET/POST/PUT | `/api/fleet/damage` | ✅ |
| GET/POST/PUT/DELETE | `/api/users` | admin only |
| GET | `/api/activity-logs` | admin/manager |

---

## 🔐 Auth Flow

```
Login → accessToken (7 ditë) + refreshToken (30 ditë)
       ↓
Request me: Authorization: Bearer <accessToken>
       ↓
Token skadon → POST /api/auth/refresh → accessToken i ri
```

---

## 🛡️ Roles & Permissions

| Role | Akses |
|------|-------|
| `admin` | Gjithçka |
| `manager` | Gjithçka përveç fshirjes së users |
| `staff` | Rezervime, klientë, mirëmbajtje |
| `accountant` | Fatura, raporte |

---

## 🌐 PM2 (Production)

```bash
npm install -g pm2
pm2 start server.js --name rental-api
pm2 startup
pm2 save
```

## 🔒 Nginx (Reverse Proxy)

```nginx
location /api {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_cache_bypass $http_upgrade;
}
```
