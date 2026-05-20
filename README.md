# 🏨 Hostel Portal

A full-stack **Hostel Management System** built with **Spring Boot** and a vanilla JS frontend. Designed for college hostels, it provides role-based access for Students, Faculty (Floor Incharges), and Admins — covering everything from attendance and outpass to complaints, menus, and facility access.

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Spring Boot 4.0.6, Java 21 |
| Security | Spring Security + JWT (JJWT 0.12.5) |
| Database | PostgreSQL |
| ORM | Spring Data JPA / Hibernate |
| QR Code | ZXing (Google) 3.5.3 |
| Frontend | HTML, CSS, Vanilla JS (served as static files) |
| Build Tool | Maven |

---

## 👥 User Roles

| Role | Access |
|---|---|
| **STUDENT** | Mark attendance, submit outpass, raise complaints, access gym/court, view menu & circulars |
| **FACULTY** | Generate QR codes, view attendance, manage complaints, publish circulars |
| **ADMIN** | Full access — manage users, students, menus, outpass approvals, all reports |

---

## ✨ Features

### 🔐 Authentication
- JWT-based stateless authentication
- Role-based route protection on every API endpoint

### 📋 Attendance
- Faculty generates a time-limited QR code for their floor
- Students scan the QR via the app to mark attendance
- Daily attendance summary views for Faculty and Admin

### 🚪 Outpass Management
- Students submit outpass requests (destination, reason, date/time)
- Floor incharges review and approve/reject per floor
- Full outpass history visible to students and admins

### 📣 Complaint System
- Students raise complaints with category (`GENERAL` / `PERSONAL`) and optional emergency flag
- Complaint lifecycle: `PENDING → IN_PROGRESS → RESOLVED`
- Faculty see only their assigned complaints; Admins see all
- Repeat complaint tracking with `repeatCount`

### 🍽️ Menu Management
- Admin creates and updates weekly/daily hostel menus
- All users can view the current menu

### 📰 Circulars
- Admin and Faculty can publish announcements/circulars
- Role-filtered views — faculty see circulars relevant to them

### 🏋️ Gym & 🎾 Indoor Court Access
- QR-scan-based entry registration for the gym and indoor tennis court
- Student profile auto-populated on scan (reg no, name, room, mobile)
- Real-time status check endpoint

### 🍴 Food Feedback
- Students submit feedback on hostel food (with optional image upload)
- Admins view all feedback

### 👤 Student & Faculty Data
- Admin can manage student profiles (name, reg no, room, phone)
- Faculty profile management

---

## 📁 Project Structure

```
hostel_management/
├── config/
│   ├── JwtFilter.java          # JWT request filter
│   ├── SecurityConfig.java     # Spring Security config
│   └── WebConfig.java          # CORS config
├── controller/                 # REST endpoints
│   ├── AttendanceController
│   ├── CircularController
│   ├── ComplaintController
│   ├── FacultyController
│   ├── FoodFeedbackController
│   ├── GymAccessController
│   ├── IndoorCourtController
│   ├── LoginController
│   ├── MenuController
│   ├── OutpassController
│   ├── StudentDataController
│   └── UserController
├── dto/                        # Data Transfer Objects
├── model/                      # JPA Entities
├── repository/                 # Spring Data repositories
├── service/                    # Business logic layer
└── HostelManagementApplication.java
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Java 21+
- Maven 3.9+
- PostgreSQL (running locally)

### 1. Clone the repository
```bash
git clone https://github.com/your-username/Hostel-Portal.git
cd Hostel-Portal
```

### 2. Configure the database

Create a PostgreSQL database:
```sql
CREATE DATABASE HostelManagement;
```

Update `src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/HostelManagement
spring.datasource.username=your_username
spring.datasource.password=your_password
```

### 3. Run the application
```bash
./mvnw spring-boot:run
```

The server starts at **http://localhost:8080**

---

## 🔌 API Endpoints Overview

| Module | Endpoint | Method | Access |
|---|---|---|---|
| Auth | `/login` | POST | Public |
| Attendance | `/attendance/generate-qr` | GET | FACULTY |
| Attendance | `/attendance/mark` | POST | STUDENT |
| Outpass | `/outpass/submit` | POST | STUDENT |
| Outpass | `/outpass/floor/{floorNo}/pending` | GET | ADMIN |
| Complaint | `/complaint` | POST | STUDENT, ADMIN |
| Complaint | `/complaint/{id}/status` | PATCH | FACULTY, ADMIN |
| Menu | `/menu` | GET | ALL |
| Menu | `/menu` | POST | ADMIN |
| Circular | `/circular/publish` | POST | FACULTY, ADMIN |
| Gym | `/gym/scan` | POST | STUDENT, ADMIN |
| Indoor Court | `/indoorcourt/scan` | POST | STUDENT, ADMIN |
| Food Feedback | `/feedback` | POST | STUDENT |

---

## 🛡️ Security Notes

- All endpoints (except `/login`) require a valid JWT in the `Authorization: Bearer <token>` header.
- Role checks are enforced at the service level using `SecurityUtil`.
- Students can only access their own data — cross-user access is blocked.

---

## 🗄️ Database

Tables are auto-created/updated via Hibernate (`ddl-auto=update`). Key entities:

- `users` — login credentials and roles
- `student` — student profiles
- `faculty` — faculty profiles
- `complaint` — hostel complaints with status lifecycle
- `outpass` — outpass requests
- `attendance` — daily attendance records
- `menu` — hostel food menu
- `circular` — announcements
- `gym_access` / `indoor_court` — facility access logs
- `food_feedback` — meal feedback with image support

---

## 📸 Frontend

A lightweight static frontend (HTML + CSS + JS) is served from `/src/main/resources/static/`. It communicates with the backend REST APIs via `fetch()`.

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

---

## 📄 License

This project is developed as part of a college PBL (Project-Based Learning) initiative.