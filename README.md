# Event Ticketing System

A full-stack event ticketing system built with Node.js and MySQL, featuring transactional workflows, complex SQL queries, and RESTful API endpoints for purchases, check-ins, and analytics.

## What This Is

This web application supports an end-to-end ticketing workflow:

* Browse and filter events
* Purchase tickets with automatic seat allocation
* View customer purchase history
* Check in tickets using QR codes with duplicate prevention
* Generate sales analytics and reporting
* Batch update customer loyalty tiers
* Manage event status (scheduled, cancelled, completed)

The backend is powered by MySQL and uses JOINs, subqueries, GROUP BY aggregations, HAVING filters, and transactions to ensure data integrity.

## Getting Started

### Prerequisites

* Node.js (v14 or newer)
* MySQL running locally
* Database dump located in `DUMP/`

### Setup & Run

**1. Clone and navigate to the project**

```bash
git clone https://github.com/mgowrysh/event-ticketing-system.git
cd event-ticketing-system
```

**2. Install dependencies**

```bash
cd SRC
npm install
```

**3. Load the database**

```bash
mysql -u root -p < ../DUMP/Assignment3_3309.sql
```

**4. Configure environment variables**

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your MySQL credentials:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=Assignment3_3309
```

**5. Start the server**

```bash
npm start
```

**6. Open the application**

```
http://localhost:3000
```

## Key Features

### 1. Browse Events

Search and filter events by venue, status, or date range, including seat availability.
**SQL:** JOINs, WHERE filters, ORDER BY

### 2. Purchase Tickets

Purchase tickets with automatic seat allocation and QR code generation.
**SQL:** Transactions with INSERT/UPDATE and availability validation

### 3. Customer Purchase History

View complete purchase history with spending statistics.
**SQL:** Multi-table JOINs, GROUP BY, COUNT, SUM

### 4. Ticket Check-In

Check customers in using QR codes with duplicate prevention.
**SQL:** INSERT with validation to prevent multiple check-ins

### 5. Sales Reports

Generate sales analytics including revenue, ticket counts, and check-in rates.
**SQL:** JOINs, GROUP BY, HAVING, multiple aggregates

### 6. Update Loyalty Tiers

Batch update customer loyalty tiers based on purchase history.
**SQL:** UPDATE with subqueries, GROUP BY, HAVING

### 7. Manage Event Status

Update event status with validation and before/after confirmation.
**SQL:** UPDATE with JOIN validation

## Project Structure

```text
event-ticketing-system/
├── SRC/
│   ├── server.js            # Express server and API endpoints
│   ├── package.json         # Dependencies and scripts
│   ├── .env.example         # Environment configuration template
│   ├── .gitignore           # Git ignore rules
│   └── public/
│       ├── index.html       # Frontend entry
│       ├── styles.css       # Styling
│       └── app.js           # Frontend logic
├── DUMP/
│   └── Assignment3_3309.sql # Database dump
└── README.md
```

## Tech Stack

* **Backend:** Node.js + Express
* **Database:** MySQL
* **Frontend:** HTML, CSS, JavaScript
* **API:** RESTful endpoints
* **Data Integrity:** Transactions for purchase workflows

## API Endpoints

* `GET  /api/events` — Browse events with optional filters
* `POST /api/purchase` — Purchase tickets (transactional)
* `GET  /api/history/:email` — Customer purchase history
* `POST /api/checkin` — Ticket check-in
* `GET  /api/reports/sales` — Sales analytics
* `POST /api/loyalty/update` — Batch loyalty tier updates
* `PUT  /api/events/status` — Update event status

## Database Tables

* `Person` — Personal information
* `Customer` — Customer accounts and loyalty tiers
* `Venue` — Event locations
* `Event` — Event details and status
* `Seat` — Venue seating layout
* `EventSeat` — Event-specific seat availability and pricing
* `Ticket` — Purchased tickets with QR codes
* `CheckIn` — Check-in records

## Troubleshooting

**Database connection issues**

* Ensure MySQL is running: `mysql.server status`
* Verify `.env` credentials
* Confirm database exists: `SHOW DATABASES;`

**Port 3000 already in use**

```bash
lsof -ti:3000 | xargs kill
```

**Dependency errors**

```bash
cd SRC
rm -rf node_modules package-lock.json
npm install
```

## Notes

This repository is maintained as a portfolio-focused version of the project with a clean commit history.
