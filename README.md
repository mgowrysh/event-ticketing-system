# Event Ticketing System - Web Application

**Group 18 | SE3309 Fall 2025**

## What This Is

A web-based event ticketing management system that lets you handle everything from browsing upcoming events to checking people in at the door. Built with a clean interface and powered by a MySQL database with some pretty complex queries under the hood.

## Getting Started

### What You'll Need
- Node.js (v14 or newer)
- MySQL running on your machine
- The database dump (in the DUMP folder)

### How to Run This

**1. Navigate to the project**
```bash
cd assignment-4-group18
```

**2. Install the packages**
```bash
cd SRC
npm install
```

**3. Load the database**
```bash
mysql -u root -p < ../DUMP/Assignment3_3309.sql
```

**4. Set up your database connection**

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Then edit `.env` with your MySQL credentials:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=Assignment3_3309
```

**5. Start the server**
```bash
npm start
```

**6. Open the app**

Go to `http://localhost:3000` in your browser.

## The 7 Features

We implemented 7 unique functionalities (one more than the required 6):

### 1. Browse Events 🎫
Search and filter events by venue, status, or date range. Results show detailed info about each event including available seats.

- **SQL**: JOIN between Event and Venue, WHERE filtering, ORDER BY
- **Validation**: All matching events displayed in a sortable table

### 2. Purchase Tickets 💳
Buy tickets for events with automatic seat allocation and QR code generation.

- **SQL**: Transaction with INSERT and UPDATE, subquery validation for seat availability
- **Validation**: Ticket details displayed with unique QR code, seats updated to SOLD in database

### 3. Customer Purchase History 📋
Look up any customer's complete ticket purchase history with spending statistics.

- **SQL**: 4-table JOIN (Customer, Person, Ticket, Event), GROUP BY, COUNT and SUM aggregations
- **Validation**: Shows all tickets, loyalty tier, total spent, and purchase counts

### 4. Check-In Tickets ✅
Check customers in at the venue using their QR codes, with duplicate prevention.

- **SQL**: INSERT with JOIN validation, prevents multiple check-ins
- **Validation**: Displays check-in confirmation, shows error if already checked in

### 5. Sales Reports 📊
Generate detailed sales analytics for events including revenue, ticket counts, and check-in rates.

- **SQL**: Multiple JOINs, GROUP BY, HAVING clause, multiple aggregates (COUNT, SUM, AVG)
- **Validation**: Comprehensive statistics displayed with filtering options

### 6. Update Loyalty Tiers ⭐
Batch upgrade customer loyalty tiers based on their purchase history.

- **SQL**: UPDATE with subquery, GROUP BY, HAVING, aggregate functions
- **Validation**: Shows list of customers who were upgraded with before/after tiers

### 7. Manage Event Status ⚙️
Update event status (SCHEDULED/CANCELLED/COMPLETED) with validation.

- **SQL**: UPDATE with JOIN to verify event exists
- **Validation**: Shows before and after comparison of event details

## How This Meets the Rubric

**Interface Design (4 points):**
- Clean, intuitive navigation with 7 clearly labeled sections
- Responsive design that works on different screen sizes
- Consistent styling and user-friendly forms
- Proper error messages that don't crash the app

**5 Basic Functionalities (5 points):**
- ✅ Browse Events (query)
- ✅ Purchase Tickets (insert)
- ✅ Purchase History (query)
- ✅ Check-In (insert)
- ✅ Manage Event Status (update)
- Plus 2 more (Sales Reports, Loyalty Updates)

**Complex Features (5 points):**
- 6 out of 7 use JOINs across multiple tables
- Subqueries for validation and filtering
- GROUP BY with aggregations (COUNT, SUM, AVG)
- Transactions for data integrity
- HAVING clauses for advanced filtering

**Input Validation (3 points):**
- Frontend form validation (required fields, proper types)
- Backend validation with proper error messages
- SQL injection prevention via parameterized queries
- Results displayed clearly in tables and cards

**Cohesiveness & Suitability (3 points):**
- All features relate to event ticketing workflow
- Logical progression from browsing → purchasing → checking in
- Database design supports all operations
- Each feature validates through the web interface

## Project Structure

```
assignment-4-group18/
├── SRC/
│   ├── server.js          # Backend with all API endpoints
│   ├── package.json       # Dependencies
│   ├── .env.example       # Config template
│   ├── .gitignore         # Git ignores
│   └── public/
│       ├── index.html     # Main page
│       ├── styles.css     # Styling
│       └── app.js         # Frontend logic
├── DUMP/
│   └── Assignment3_3309.sql  # Database dump
└── README.md              # This file
```

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: MySQL 9.0
- **Frontend**: HTML, CSS, JavaScript
- **API**: REST endpoints
- **Error Handling**: Try-catch blocks throughout

## API Endpoints

- `GET  /api/events` - Browse events with optional filters
- `POST /api/purchase` - Purchase tickets (with transaction)
- `GET  /api/history/:email` - Customer purchase history
- `POST /api/checkin` - Check in tickets
- `GET  /api/reports/sales` - Sales analytics
- `POST /api/loyalty/update` - Update customer tiers
- `PUT  /api/events/status` - Change event status

## Database Tables Used

- `Person` - Personal information
- `Customer` - Customer accounts with loyalty tiers
- `Venue` - Event locations
- `Event` - Event details and status
- `Seat` - Venue seating layout
- `EventSeat` - Event-specific pricing and availability
- `Ticket` - Purchased tickets with QR codes
- `CheckIn` - Check-in records

## For the Demo

Each feature can be demonstrated independently:

1. **Browse** - Show filtering by different criteria
2. **Purchase** - Buy a ticket and see the seat become unavailable
3. **History** - Look up a customer's complete purchase record
4. **Check-In** - Scan a QR code and prevent duplicate entry
5. **Reports** - Show aggregated sales statistics
6. **Loyalty** - Batch update multiple customers
7. **Status** - Change an event from scheduled to completed

## If Something Breaks

**Can't connect to database?**
- Make sure MySQL is running: `mysql.server status`
- Check your `.env` has the right credentials
- Verify the database exists: `SHOW DATABASES;`

**Port 3000 in use?**
- Change PORT in `.env` to 3001 or another port
- Or kill the process: `lsof -ti:3000 | xargs kill`

**Module errors?**
- Run `npm install` again
- Delete `node_modules` and reinstall if needed

## Contributors

**Group 18** - SE3309 Database Management Systems, Fall 2025
